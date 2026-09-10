import { pgTable, varchar, uuid, pgEnum, timestamp } from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { primaryUuid, timestamps } from '../common';

export const accountTypeEnum = pgEnum('account_type', ['SAVINGS']);

export const currencyEnum = pgEnum('currency', ['USD', 'KHR']);

export const accountStatusEnum = pgEnum('account_status', [
  'ACTIVE',
  'BLOCKED',
  'CLOSED',
]);

export const customerStatusEnum = pgEnum('customer_status', [
  'ACTIVE',
  'BLOCKED',
  'SUSPENDED',
]);

export const kycStatusEnum = pgEnum('kyc_status', [
  'PENDING',
  'VERIFIED',
  'REJECTED',
]);

export const accounts = pgTable('accounts', {
  id: primaryUuid(),
  customerId: uuid('customer_id').notNull(),
  accountNumber: varchar('account_number', { length: 32 }).unique().notNull(),
  type: accountTypeEnum('type').default('SAVINGS').notNull(),
  currency: currencyEnum('currency').notNull(),
  status: accountStatusEnum('status').default('ACTIVE').notNull(),
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
