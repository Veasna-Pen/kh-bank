import {
  BadGatewayException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SERVICE_PORTS } from '@app/common';

import {
  Account,
  AccountDatabaseService,
  accounts,
  customerSnapshots,
  CustomerSnapshot,
  NewAccount,
} from '@app/database/account';
import { isUniqueViolation } from '@app/database';
import { CreateAccountDto } from '@app/common/dto/account';
import { AccountStatus, CustomerStatus, KycStatus } from '@app/common/enums';
import { ICustomerSnapshotEventData } from '@app/common/interfaces/events';
import { EventPublisher, KAFKA_TOPICS } from '@app/kafka';
import { and, eq, lt } from 'drizzle-orm';
import * as crypto from 'crypto';

const ACCOUNT_NUMBER_ATTEMPTS = 5;

type AccountSnapshotTopic =
  | typeof KAFKA_TOPICS.ACCOUNT_CREATED
  | typeof KAFKA_TOPICS.ACCOUNT_STATUS_UPDATED;

@Injectable()
export class AccountServiceService {
  private readonly logger = new Logger(AccountServiceService.name);

  constructor(
    private readonly accountDB: AccountDatabaseService,
    private readonly events: EventPublisher,
  ) {}

  private publishAccountSnapshot(
    topic: AccountSnapshotTopic,
    account: Account,
    userId: string,
  ) {
    this.events.publish(
      topic,
      {
        accountId: account.id,
        customerId: account.customerId,
        userId,
        accountNumber: account.accountNumber,
        type: account.type,
        currency: account.currency,
        status: account.status,
        updatedAt: account.updatedAt.toISOString(),
      },
      account.id,
    );
  }

  private async insertAccount(
    values: Omit<NewAccount, 'accountNumber'>,
  ): Promise<Account> {
    for (let attempt = 1; ; attempt++) {
      const accountNumber = crypto
        .randomInt(100000000000, 999999999999)
        .toString();

      try {
        const [account] = await this.accountDB.db
          .insert(accounts)
          .values({ ...values, accountNumber })
          .returning();

        return account;
      } catch (error) {
        if (!isUniqueViolation(error) || attempt >= ACCOUNT_NUMBER_ATTEMPTS) {
          throw error;
        }
      }
    }
  }

  private async findCustomerByUserId(
    userId: string,
  ): Promise<CustomerSnapshot> {
    const [customer] = await this.accountDB.db
      .select()
      .from(customerSnapshots)
      .where(eq(customerSnapshots.userId, userId))
      .limit(1);

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    return customer;
  }

  async createAccount(userId: string, dto: CreateAccountDto) {
    const [customer] = await this.accountDB.db
      .select()
      .from(customerSnapshots)
      .where(
        and(
          eq(customerSnapshots.customerId, dto.customerId),
          eq(customerSnapshots.userId, userId),
        ),
      )
      .limit(1);

    if (!customer) {
      throw new ForbiddenException(
        'Customer profile not found or does not belong to you',
      );
    }

    if (
      customer.status !== CustomerStatus.ACTIVE ||
      customer.kycStatus !== KycStatus.VERIFIED
    ) {
      throw new ForbiddenException(
        'Account creation requires an active customer profile with VERIFIED KYC status',
      );
    }

    const newAccount = await this.insertAccount({
      id: crypto.randomUUID(),
      customerId: customer.customerId,
      type: dto.type,
      currency: dto.currency,
      status: AccountStatus.ACTIVE,
    });

    this.publishAccountSnapshot(
      KAFKA_TOPICS.ACCOUNT_CREATED,
      newAccount,
      customer.userId,
    );

    this.logger.log(
      `Created new ${newAccount.currency} account for customer ${customer.customerId}`,
    );

    return {
      message: 'Account created successfully',
      account: newAccount,
    };
  }

  async getMyAccounts(userId: string) {
    const customer = await this.findCustomerByUserId(userId);

    const myAccounts = await this.accountDB.db
      .select()
      .from(accounts)
      .where(eq(accounts.customerId, customer.customerId));

    return {
      accounts: myAccounts,
      total: myAccounts.length,
    };
  }

  async getAccountById(userId: string, accountId: string) {
    const customer = await this.findCustomerByUserId(userId);

    const [account] = await this.accountDB.db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.id, accountId),
          eq(accounts.customerId, customer.customerId),
        ),
      )
      .limit(1);

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return {
      account,
    };
  }

  async getAccountBalance(userId: string, accountId: string) {
    const { account } = await this.getAccountById(userId, accountId);

    const ledgerBaseUrl =
      process.env.LEDGER_SERVICE_URL ??
      `http://localhost:${SERVICE_PORTS.LEDGER_SERVICE}`;

    try {
      const res = await fetch(
        `${ledgerBaseUrl}/ledger/accounts/${accountId}/balance?currency=${account.currency}`,
      );

      if (!res.ok) {
        this.logger.error(
          `Ledger service returned ${res.status} when fetching balance for account ${accountId}`,
        );
        throw new BadGatewayException('Failed to retrieve balance from ledger');
      }

      const data = (await res.json()) as { balance: string };

      return {
        accountId: account.id,
        accountNumber: account.accountNumber,
        currency: account.currency,
        balance: data.balance,
      };
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }
      this.logger.error(
        `Error connecting to ledger service: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadGatewayException('Ledger service unreachable');
    }
  }

  async updateStatus(accountId: string, status: AccountStatus) {
    const [account] = await this.accountDB.db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const [updated] = await this.accountDB.db
      .update(accounts)
      .set({ status, updatedAt: new Date() })
      .where(eq(accounts.id, accountId))
      .returning();

    const [owner] = await this.accountDB.db
      .select()
      .from(customerSnapshots)
      .where(eq(customerSnapshots.customerId, updated.customerId))
      .limit(1);

    if (owner) {
      this.publishAccountSnapshot(
        KAFKA_TOPICS.ACCOUNT_STATUS_UPDATED,
        updated,
        owner.userId,
      );
    } else {
      this.logger.warn(
        `No customer snapshot for account ${accountId}; status change not published`,
      );
    }

    this.logger.log(`Account ${accountId} status updated to ${status}`);

    return {
      message: 'Account status updated successfully',
      account: updated,
    };
  }

  async upsertCustomerSnapshot(data: ICustomerSnapshotEventData) {
    const sourceUpdatedAt = new Date(data.updatedAt);

    await this.accountDB.db
      .insert(customerSnapshots)
      .values({
        customerId: data.customerId,
        userId: data.userId,
        status: data.status,
        kycStatus: data.kycStatus,
        sourceUpdatedAt,
      })
      .onConflictDoUpdate({
        target: customerSnapshots.customerId,
        set: {
          status: data.status,
          kycStatus: data.kycStatus,
          sourceUpdatedAt,
          syncedAt: new Date(),
        },
        setWhere: lt(customerSnapshots.sourceUpdatedAt, sourceUpdatedAt),
      });

    this.logger.log(
      `Synced customer snapshot ${data.customerId} (kyc: ${data.kycStatus})`,
    );
  }
}
