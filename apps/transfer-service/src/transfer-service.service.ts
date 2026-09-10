import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountSnapshot,
  accountSnapshots,
  NewTransfer,
  Transfer,
  TransferDatabaseService,
  TransferRequest,
  transferRequests,
  transfers,
} from '@app/database/transfer';
import {
  CreateTransferDto,
  TransferFilterQueryDto,
} from '@app/common/dto/transfer';
import { SortOrder } from '@app/common/dto/pagination';
import { Currency, TransferStatus } from '@app/common/enums';
import {
  IAccountSnapshotEventData,
  ITransferCreatedEventData,
} from '@app/common/interfaces/events';
import { IPaginatedResult } from '@app/common/interfaces/api';
import {
  buildEvent,
  EVENT_SOURCES,
  KAFKA_SERVICE,
  KAFKA_TOPICS,
} from '@app/kafka';
import type { ClientKafka } from '@nestjs/microservices';
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  lt,
  lte,
  or,
  SQL,
} from 'drizzle-orm';
import * as crypto from 'crypto';

const PG_UNIQUE_VIOLATION = '23505';

type NextStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED';

const ALLOWED_PREVIOUS_STATUS: Record<NextStatus, TransferStatus[]> = {
  PROCESSING: [TransferStatus.PENDING],
  COMPLETED: [TransferStatus.PENDING, TransferStatus.PROCESSING],
  FAILED: [TransferStatus.PENDING, TransferStatus.PROCESSING],
};

function isUniqueViolation(error: unknown): boolean {
  const cause = (error as { cause?: unknown } | undefined)?.cause;
  return [error, cause].some(
    (e) => (e as { code?: string } | undefined)?.code === PG_UNIQUE_VIOLATION,
  );
}

@Injectable()
export class TransferServiceService {
  private readonly logger = new Logger(TransferServiceService.name);

  constructor(
    private readonly transferDB: TransferDatabaseService,
    @Inject(KAFKA_SERVICE) private readonly kafkaClient: ClientKafka,
  ) {}

  private generateReference(): string {
    const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `TRX-${Date.now()}-${suffix}`;
  }

  private async findAccount(
    accountId: string,
  ): Promise<AccountSnapshot | undefined> {
    const [account] = await this.transferDB.db
      .select()
      .from(accountSnapshots)
      .where(eq(accountSnapshots.accountId, accountId))
      .limit(1);

    return account;
  }

  private async findTransfer(
    transferId: string,
  ): Promise<Transfer | undefined> {
    const [transfer] = await this.transferDB.db
      .select()
      .from(transfers)
      .where(eq(transfers.id, transferId))
      .limit(1);

    return transfer;
  }

  private async findRequestByKey(
    idempotencyKey: string,
  ): Promise<TransferRequest | undefined> {
    const [request] = await this.transferDB.db
      .select()
      .from(transferRequests)
      .where(eq(transferRequests.idempotencyKey, idempotencyKey))
      .limit(1);

    return request;
  }

  private async getUserAccountIds(userId: string): Promise<string[]> {
    const rows = await this.transferDB.db
      .select({ accountId: accountSnapshots.accountId })
      .from(accountSnapshots)
      .where(eq(accountSnapshots.userId, userId));

    return rows.map((row) => row.accountId);
  }

  private toCreateResult(transfer: Transfer | undefined) {
    return {
      message: 'Transfer created successfully',
      transfer,
    };
  }

  // Same key from the same user returns the original transfer. The key is
  // globally unique, so a key already used by someone else is rejected.
  private async replay(request: TransferRequest, userId: string) {
    if (request.userId !== userId) {
      throw new ConflictException('Idempotency-Key has already been used');
    }

    return this.toCreateResult(await this.findTransfer(request.transferId));
  }

  private async validateAccounts(userId: string, dto: CreateTransferDto) {
    if (dto.fromAccountId === dto.toAccountId) {
      throw new BadRequestException(
        'Source and destination accounts must be different',
      );
    }

    const from = await this.findAccount(dto.fromAccountId);

    if (!from || from.userId !== userId) {
      throw new NotFoundException('Source account not found');
    }

    if (from.status !== 'ACTIVE') {
      throw new ForbiddenException('Source account is not active');
    }

    const to = await this.findAccount(dto.toAccountId);

    if (!to) {
      throw new NotFoundException('Destination account not found');
    }

    if (to.status !== 'ACTIVE') {
      throw new ForbiddenException('Destination account is not active');
    }

    if (
      (from.currency as Currency) !== dto.currency ||
      (to.currency as Currency) !== dto.currency
    ) {
      throw new BadRequestException(
        'Transfer currency must match both accounts',
      );
    }
  }

  async createTransfer(
    userId: string,
    idempotencyKey: string,
    dto: CreateTransferDto,
  ) {
    const existingRequest = await this.findRequestByKey(idempotencyKey);

    if (existingRequest) {
      return this.replay(existingRequest, userId);
    }

    await this.validateAccounts(userId, dto);

    let transfer: Transfer;

    try {
      transfer = await this.transferDB.db.transaction(async (tx) => {
        const [created] = await tx
          .insert(transfers)
          .values({
            id: crypto.randomUUID(),
            reference: this.generateReference(),
            fromAccountId: dto.fromAccountId,
            toAccountId: dto.toAccountId,
            amount: dto.amount,
            currency: dto.currency,
            status: 'PENDING',
            description: dto.description,
          })
          .returning();

        await tx.insert(transferRequests).values({
          id: crypto.randomUUID(),
          userId,
          idempotencyKey,
          transferId: created.id,
        });

        return created;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        const request = await this.findRequestByKey(idempotencyKey);

        if (request) {
          return this.replay(request, userId);
        }
      }

      throw error;
    }

    this.kafkaClient.emit(KAFKA_TOPICS.TRANSFER_CREATED, {
      key: transfer.fromAccountId,
      value: buildEvent<ITransferCreatedEventData>(
        KAFKA_TOPICS.TRANSFER_CREATED,
        EVENT_SOURCES.TRANSFER_SERVICE,
        {
          transferId: transfer.id,
          reference: transfer.reference,
          fromAccountId: transfer.fromAccountId,
          toAccountId: transfer.toAccountId,
          amount: transfer.amount,
          currency: transfer.currency as Currency,
          description: transfer.description ?? undefined,
          createdAt: transfer.createdAt.toISOString(),
        },
      ),
    });

    this.logger.log(
      `Transfer ${transfer.reference} created: ${transfer.amount} ${transfer.currency}`,
    );

    return this.toCreateResult(transfer);
  }

  async getTransferById(userId: string, transferId: string) {
    const transfer = await this.findTransfer(transferId);

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    const myAccountIds = await this.getUserAccountIds(userId);

    if (
      !myAccountIds.includes(transfer.fromAccountId) &&
      !myAccountIds.includes(transfer.toAccountId)
    ) {
      throw new NotFoundException('Transfer not found');
    }

    return { transfer };
  }

  async getTransfers(
    userId: string,
    query: TransferFilterQueryDto,
  ): Promise<IPaginatedResult<Transfer>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const myAccountIds = await this.getUserAccountIds(userId);

    if (query.accountId && !myAccountIds.includes(query.accountId)) {
      throw new NotFoundException('Account not found');
    }

    const accountIds = query.accountId ? [query.accountId] : myAccountIds;

    if (accountIds.length === 0) {
      return this.paginate([], 0, page, limit);
    }

    const conditions: (SQL | undefined)[] = [
      or(
        inArray(transfers.fromAccountId, accountIds),
        inArray(transfers.toAccountId, accountIds),
      ),
    ];

    if (query.status) {
      conditions.push(eq(transfers.status, query.status));
    }
    if (query.startDate) {
      conditions.push(gte(transfers.createdAt, new Date(query.startDate)));
    }
    if (query.endDate) {
      conditions.push(lte(transfers.createdAt, new Date(query.endDate)));
    }

    const where = and(...conditions);
    const sortColumn =
      query.sortBy === 'amount' ? transfers.amount : transfers.createdAt;
    const orderBy =
      query.sortOrder === SortOrder.ASC ? asc(sortColumn) : desc(sortColumn);

    const [items, totalItems] = await Promise.all([
      this.transferDB.db
        .select()
        .from(transfers)
        .where(where)
        .orderBy(orderBy)
        .limit(limit)
        .offset((page - 1) * limit),
      this.transferDB.db.$count(transfers, where),
    ]);

    return this.paginate(items, totalItems, page, limit);
  }

  private paginate<T>(
    items: T[],
    totalItems: number,
    page: number,
    limit: number,
  ): IPaginatedResult<T> {
    const totalPages = Math.ceil(totalItems / limit);

    return {
      items,
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  private async transition(
    transferId: string,
    next: NextStatus,
    changes: Partial<NewTransfer> = {},
  ) {
    const [updated] = await this.transferDB.db
      .update(transfers)
      .set({ ...changes, status: next })
      .where(
        and(
          eq(transfers.id, transferId),
          inArray(transfers.status, ALLOWED_PREVIOUS_STATUS[next]),
        ),
      )
      .returning({ reference: transfers.reference });

    if (updated) {
      this.logger.log(`Transfer ${updated.reference} is now ${next}`);
    } else {
      this.logger.warn(
        `Ignored ${next} for transfer ${transferId}: unknown or already past that status`,
      );
    }
  }

  markProcessing(transferId: string) {
    return this.transition(transferId, 'PROCESSING');
  }

  markCompleted(transferId: string, completedAt: Date) {
    return this.transition(transferId, 'COMPLETED', { completedAt });
  }

  markFailed(transferId: string, failureReason: string) {
    return this.transition(transferId, 'FAILED', {
      failureReason: failureReason.slice(0, 255),
    });
  }

  async upsertAccountSnapshot(data: IAccountSnapshotEventData) {
    const sourceUpdatedAt = new Date(data.updatedAt);

    await this.transferDB.db
      .insert(accountSnapshots)
      .values({
        accountId: data.accountId,
        customerId: data.customerId,
        userId: data.userId,
        accountNumber: data.accountNumber,
        currency: data.currency,
        status: data.status,
        sourceUpdatedAt,
      })
      .onConflictDoUpdate({
        target: accountSnapshots.accountId,
        set: {
          status: data.status,
          sourceUpdatedAt,
          syncedAt: new Date(),
        },
        setWhere: lt(accountSnapshots.sourceUpdatedAt, sourceUpdatedAt),
      });

    this.logger.log(
      `Synced account snapshot ${data.accountId} (${data.status})`,
    );
  }
}
