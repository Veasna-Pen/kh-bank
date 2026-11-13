import {
  pgTable,
  varchar,
  numeric,
  timestamp,
  uuid,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { relations, InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { AccountStatus, Currency, TransferStatus } from '@app/common/enums';
import { primaryUuid, timestamps } from '../common';

export const transferStatusEnum = pgEnum('transfer_status', TransferStatus);

export const currencyEnum = pgEnum('currency', Currency);

export const accountStatusEnum = pgEnum('account_status', AccountStatus);

export const transfers = pgTable('transfers', {
  id: primaryUuid(),
  reference: varchar('reference', { length: 64 }).unique().notNull(),
  fromAccountId: uuid('from_account_id').notNull(),
  toAccountId: uuid('to_account_id').notNull(),
  amount: numeric('amount', { precision: 19, scale: 4 }).notNull(),
  currency: currencyEnum('currency').notNull(),
  status: transferStatusEnum('status')
    .default(TransferStatus.PENDING)
    .notNull(),
  description: varchar('description', { length: 255 }),
  failureReason: varchar('failure_reason', { length: 255 }),
  ...timestamps,
  completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),
});

export const transferRequests = pgTable('transfer_requests', {
  id: primaryUuid(),
  userId: uuid('user_id').notNull(), // Logical reference to auth_db
  idempotencyKey: varchar('idempotency_key', { length: 255 })
    .unique()
    .notNull(),
  transferId: uuid('transfer_id')
    .references(() => transfers.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
});

export const accountSnapshots = pgTable(
  'account_snapshots',
  {
    accountId: uuid('account_id').primaryKey(),
    customerId: uuid('customer_id').notNull(),
    userId: uuid('user_id').notNull(),
    accountNumber: varchar('account_number', { length: 32 }).notNull(),
    currency: currencyEnum('currency').notNull(),
    status: accountStatusEnum('status').notNull(),
    sourceUpdatedAt: timestamp('source_updated_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    syncedAt: timestamp('synced_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('account_snapshots_user_id_idx').on(table.userId)],
);

export const transfersRelations = relations(transfers, ({ many }) => ({
  requests: many(transferRequests),
}));

export const transferRequestsRelations = relations(
  transferRequests,
  ({ one }) => ({
    transfer: one(transfers, {
      fields: [transferRequests.transferId],
      references: [transfers.id],
    }),
  }),
);

export type Transfer = InferSelectModel<typeof transfers>;
export type NewTransfer = InferInsertModel<typeof transfers>;

export type TransferRequest = InferSelectModel<typeof transferRequests>;
export type NewTransferRequest = InferInsertModel<typeof transferRequests>;

export type AccountSnapshot = InferSelectModel<typeof accountSnapshots>;
export type NewAccountSnapshot = InferInsertModel<typeof accountSnapshots>;
