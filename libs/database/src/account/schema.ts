import { pgTable, varchar, uuid, pgEnum, timestamp } from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import {
  AccountStatus,
  AccountType,
  Currency,
  CustomerStatus,
  KycStatus,
} from '@app/common/enums';
import { primaryUuid, timestamps } from '../common';

export const accountTypeEnum = pgEnum('account_type', AccountType);

export const currencyEnum = pgEnum('currency', Currency);

export const accountStatusEnum = pgEnum('account_status', AccountStatus);

export const customerStatusEnum = pgEnum('customer_status', CustomerStatus);

export const kycStatusEnum = pgEnum('kyc_status', KycStatus);

export const accounts = pgTable('accounts', {
  id: primaryUuid(),
  customerId: uuid('customer_id').notNull(),
  accountNumber: varchar('account_number', { length: 32 }).unique().notNull(),
  type: accountTypeEnum('type').default(AccountType.SAVINGS).notNull(),
  currency: currencyEnum('currency').notNull(),
  status: accountStatusEnum('status').default(AccountStatus.ACTIVE).notNull(),
  ...timestamps,
});

export const customerSnapshots = pgTable('customer_snapshots', {
  customerId: uuid('customer_id').primaryKey(),
  userId: uuid('user_id').unique().notNull(),
  status: customerStatusEnum('status').notNull(),
  kycStatus: kycStatusEnum('kyc_status').notNull(),
  sourceUpdatedAt: timestamp('source_updated_at', {
    withTimezone: true,
    mode: 'date',
  }).notNull(),
  syncedAt: timestamp('synced_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
});

export type Account = InferSelectModel<typeof accounts>;
export type NewAccount = InferInsertModel<typeof accounts>;

export type CustomerSnapshot = InferSelectModel<typeof customerSnapshots>;
export type NewCustomerSnapshot = InferInsertModel<typeof customerSnapshots>;
