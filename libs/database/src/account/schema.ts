import { pgTable, varchar, uuid, pgEnum } from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { primaryUuid, timestamps } from '../common';

export const accountTypeEnum = pgEnum('account_type', ['SAVINGS']);

export const currencyEnum = pgEnum('currency', ['USD', 'KHR']);

export const accountStatusEnum = pgEnum('account_status', [
  'ACTIVE',
  'BLOCKED',
  'CLOSED',
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

export type Account = InferSelectModel<typeof accounts>;
export type NewAccount = InferInsertModel<typeof accounts>;
