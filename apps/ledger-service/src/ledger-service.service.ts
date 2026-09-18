import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  LedgerDatabaseService,
  ledgerEntries,
  ledgerTransactions,
  processedEvents,
} from '@app/database/ledger';
import { isUniqueViolation } from '@app/database';
import {
  Currency,
  LedgerEntryDirection,
  LedgerTransactionStatus,
  LedgerTransactionType,
} from '@app/common/enums';
import { DepositDto } from '@app/common/dto/ledger';
import { SYSTEM_CLEARING_ACCOUNT_ID } from '@app/common';
import { ITransferCreatedEvent } from '@app/common/interfaces/events';
import { EventPublisher, KAFKA_TOPICS } from '@app/kafka';
import { and, eq, sql, SQL } from 'drizzle-orm';
import * as crypto from 'crypto';

export function toScaledBigInt(amount: string): bigint {
  const [intPart, fracPart = ''] = amount.trim().split('.');
  const paddedFrac = fracPart.padEnd(4, '0').slice(0, 4);
  const isNegative = intPart.startsWith('-');
  const cleanInt = isNegative ? intPart.slice(1) : intPart;
  const combined = BigInt(cleanInt + paddedFrac);
  return isNegative ? -combined : combined;
}

@Injectable()
export class LedgerServiceService {
  private readonly logger = new Logger(LedgerServiceService.name);

  constructor(
    private readonly ledgerDB: LedgerDatabaseService,
    private readonly events: EventPublisher,
  ) {}

  private generateReference(prefix: string): string {
    const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `${prefix}-${Date.now()}-${suffix}`;
  }

  async deposit(dto: DepositDto) {
    if (toScaledBigInt(dto.amount) <= 0n) {
      throw new BadRequestException('Deposit amount must be greater than zero');
    }

    const reference = this.generateReference('DEP');
    const txId = crypto.randomUUID();

    const transaction = await this.ledgerDB.db.transaction(async (tx) => {
      const [createdTx] = await tx
        .insert(ledgerTransactions)
        .values({
          id: txId,
          reference,
          type: LedgerTransactionType.DEPOSIT,
          status: LedgerTransactionStatus.COMPLETED,
          currency: dto.currency,
          description: dto.description ?? 'Admin deposit',
          completedAt: new Date(),
        })
        .returning();

      await tx.insert(ledgerEntries).values([
        {
          id: crypto.randomUUID(),
          transactionId: txId,
          accountId: SYSTEM_CLEARING_ACCOUNT_ID,
          direction: LedgerEntryDirection.DEBIT,
          amount: dto.amount,
          currency: dto.currency,
        },
        {
          id: crypto.randomUUID(),
          transactionId: txId,
          accountId: dto.accountId,
          direction: LedgerEntryDirection.CREDIT,
          amount: dto.amount,
          currency: dto.currency,
        },
      ]);

      return createdTx;
    });

    this.logger.log(
      `Deposit ${reference}: ${dto.amount} ${dto.currency} credited to account ${dto.accountId}`,
    );

    return {
      message: 'Deposit recorded successfully',
      transaction,
    };
  }

  async getAccountBalance(accountId: string, currency?: Currency) {
    const conditions: (SQL | undefined)[] = [
      eq(ledgerEntries.accountId, accountId),
    ];

    if (currency) {
      conditions.push(eq(ledgerEntries.currency, currency));
    }

    const [row] = await this.ledgerDB.db
      .select({
        balance: sql<string>`COALESCE(
          SUM(
            CASE
              WHEN ${ledgerEntries.direction} = 'CREDIT' THEN ${ledgerEntries.amount}::numeric
              WHEN ${ledgerEntries.direction} = 'DEBIT' THEN -${ledgerEntries.amount}::numeric
              ELSE 0
            END
          ),
          0
        )::text`,
      })
      .from(ledgerEntries)
      .where(and(...conditions));

    const balanceStr = row?.balance ?? '0';

    return {
      accountId,
      balance: Number(balanceStr).toFixed(4),
      currency: currency ?? null,
    };
  }

  async processTransfer(event: ITransferCreatedEvent) {
    const { eventId, eventType, data } = event;

    // Fast check for idempotency
    const [alreadyProcessed] = await this.ledgerDB.db
      .select()
      .from(processedEvents)
      .where(eq(processedEvents.eventId, eventId))
      .limit(1);

    if (alreadyProcessed) {
      this.logger.warn(
        `Event ${eventId} already processed by ledger-service, skipping`,
      );
      return;
    }

    // Publish processing event
    this.events.publish(
      KAFKA_TOPICS.TRANSFER_PROCESSING,
      {
        transferId: data.transferId,
        reference: data.reference,
        processingAt: new Date().toISOString(),
      },
      data.fromAccountId,
    );

    interface ITransferProcessSuccess {
      kind: 'success';
      completedAt: Date;
    }

    interface ITransferProcessFailure {
      kind: 'failure';
      reason: string;
    }

    interface ITransferProcessDuplicate {
      kind: 'duplicate';
    }

    type TransferProcessResult =
      | ITransferProcessSuccess
      | ITransferProcessFailure
      | ITransferProcessDuplicate;

    let result: TransferProcessResult;

    try {
      result = await this.ledgerDB.db.transaction(
        async (tx): Promise<TransferProcessResult> => {
          // Concurrency control: acquire transaction-level advisory lock on fromAccountId
          await tx.execute(
            sql`SELECT pg_advisory_xact_lock(hashtext(${data.fromAccountId}::text))`,
          );

          // Record processed event within transaction to ensure atomic execution
          try {
            await tx.insert(processedEvents).values({
              id: crypto.randomUUID(),
              eventId,
              eventType,
              consumer: 'ledger-service',
            });
          } catch (error) {
            if (isUniqueViolation(error)) {
              this.logger.warn(
                `Event ${eventId} was processed concurrently, skipping`,
              );
              return { kind: 'duplicate' };
            }
            throw error;
          }

          // Calculate current balance of the source account
          const [balanceRow] = await tx
            .select({
              balance: sql<string>`COALESCE(
                SUM(
                  CASE
                    WHEN ${ledgerEntries.direction} = 'CREDIT' THEN ${ledgerEntries.amount}::numeric
                    WHEN ${ledgerEntries.direction} = 'DEBIT' THEN -${ledgerEntries.amount}::numeric
                    ELSE 0
                  END
                ),
                0
              )::text`,
            })
            .from(ledgerEntries)
            .where(
              and(
                eq(ledgerEntries.accountId, data.fromAccountId),
                eq(ledgerEntries.currency, data.currency),
              ),
            );

          const currentBalance = balanceRow?.balance ?? '0';
          const hasSufficientFunds =
            toScaledBigInt(currentBalance) >= toScaledBigInt(data.amount);

          if (!hasSufficientFunds) {
            await tx.insert(ledgerTransactions).values({
              id: crypto.randomUUID(),
              reference: data.reference,
              type: LedgerTransactionType.TRANSFER,
              status: LedgerTransactionStatus.FAILED,
              currency: data.currency,
              description: 'Insufficient funds',
            });

            return { kind: 'failure', reason: 'Insufficient funds' };
          }

          const txId = crypto.randomUUID();
          const completedAt = new Date();

          await tx.insert(ledgerTransactions).values({
            id: txId,
            reference: data.reference,
            type: LedgerTransactionType.TRANSFER,
            status: LedgerTransactionStatus.COMPLETED,
            currency: data.currency,
            description: data.description,
            completedAt,
          });

          await tx.insert(ledgerEntries).values([
            {
              id: crypto.randomUUID(),
              transactionId: txId,
              accountId: data.fromAccountId,
              direction: LedgerEntryDirection.DEBIT,
              amount: data.amount,
              currency: data.currency,
            },
            {
              id: crypto.randomUUID(),
              transactionId: txId,
              accountId: data.toAccountId,
              direction: LedgerEntryDirection.CREDIT,
              amount: data.amount,
              currency: data.currency,
            },
          ]);

          return { kind: 'success', completedAt };
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to process transfer ${data.reference}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }

    if (result.kind === 'duplicate') {
      return;
    }

    if (result.kind === 'success') {
      this.events.publish(
        KAFKA_TOPICS.TRANSFER_COMPLETED,
        {
          transferId: data.transferId,
          reference: data.reference,
          completedAt: result.completedAt.toISOString(),
        },
        data.fromAccountId,
      );
      this.logger.log(
        `Transfer ${data.reference} completed: ${data.amount} ${data.currency}`,
      );
    } else {
      this.events.publish(
        KAFKA_TOPICS.TRANSFER_FAILED,
        {
          transferId: data.transferId,
          reference: data.reference,
          failureReason: result.reason,
          failedAt: new Date().toISOString(),
        },
        data.fromAccountId,
      );
      this.logger.warn(`Transfer ${data.reference} failed: ${result.reason}`);
    }
  }
}
