import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AccountDatabaseService, accounts } from '@app/database/account';
import { CustomerDatabaseService, customers } from '@app/database/customer';
import { CreateAccountDto } from '@app/common/dto/account';
import {
  EVENT_SOURCES,
  KAFKA_SERVICE,
  KAFKA_TOPICS,
} from '@app/kafka/constants/kafka.constants';
import type { ClientKafka } from '@nestjs/microservices';
import { and, eq } from 'drizzle-orm';
import * as crypto from 'crypto';

@Injectable()
export class AccountServiceService {
  private readonly logger = new Logger(AccountServiceService.name);

  constructor(
    private readonly accountDB: AccountDatabaseService,
    private readonly customerDB: CustomerDatabaseService,
    @Inject(KAFKA_SERVICE) private readonly kafkaClient: ClientKafka,
  ) {}

  private async generateAccountNumber(): Promise<string> {
    let accountNumber = '';
    let isUnique = false;

    while (!isUnique) {
      accountNumber = crypto.randomInt(100000000000, 999999999999).toString();
      const [existing] = await this.accountDB.db
        .select()
        .from(accounts)
        .where(eq(accounts.accountNumber, accountNumber))
        .limit(1);

      if (!existing) {
        isUnique = true;
      }
    }

    return accountNumber;
  }

  async createAccount(userId: string, dto: CreateAccountDto) {
    const [customer] = await this.customerDB.db
      .select()
      .from(customers)
      .where(
        and(eq(customers.id, dto.customerId), eq(customers.userId, userId)),
      )
      .limit(1);

    if (!customer) {
      throw new ForbiddenException(
        'Customer profile not found or does not belong to you',
      );
    }

    if (customer.status !== 'ACTIVE' || customer.kycStatus !== 'VERIFIED') {
      throw new ForbiddenException(
        'Account creation requires an active customer profile with VERIFIED KYC status',
      );
    }

    const accountNumber = await this.generateAccountNumber();
    const accountId = crypto.randomUUID();

    const [newAccount] = await this.accountDB.db
      .insert(accounts)
      .values({
        id: accountId,
        customerId: customer.id,
        accountNumber,
        type: dto.type,
        currency: dto.currency,
        status: 'ACTIVE',
      })
      .returning();

    this.kafkaClient.emit(KAFKA_TOPICS.ACCOUNT_CREATED, {
      eventId: crypto.randomUUID(),
      version: 1,
      occurredAt: new Date().toISOString(),
      source: EVENT_SOURCES.ACCOUNT_SERVICE,
      data: {
        accountId: newAccount.id,
        customerId: newAccount.customerId,
        accountNumber: newAccount.accountNumber,
        currency: newAccount.currency,
        status: newAccount.status,
      },
    });

    this.logger.log(
      `Created new ${newAccount.currency} account for customer ${customer.id}`,
    );

    return {
      message: 'Account created successfully',
      account: newAccount,
    };
  }

  async getMyAccounts(userId: string) {
    const [customer] = await this.customerDB.db
      .select()
      .from(customers)
      .where(eq(customers.userId, userId))
      .limit(1);

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    const myAccounts = await this.accountDB.db
      .select()
      .from(accounts)
      .where(eq(accounts.customerId, customer.id));

    return {
      accounts: myAccounts,
      total: myAccounts.length,
    };
  }

  async getAccountById(userId: string, accountId: string) {
    const [customer] = await this.customerDB.db
      .select()
      .from(customers)
      .where(eq(customers.userId, userId))
      .limit(1);

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    const [account] = await this.accountDB.db
      .select()
      .from(accounts)
      .where(
        and(eq(accounts.id, accountId), eq(accounts.customerId, customer.id)),
      )
      .limit(1);

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return {
      account,
    };
  }

  async updateStatus(accountId: string, status: string) {
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
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(accounts.id, accountId))
      .returning();

    this.logger.log(`Account ${accountId} status updated to ${status}`);

    return {
      message: 'Account status updated successfully',
      account: updated,
    };
  }
}
