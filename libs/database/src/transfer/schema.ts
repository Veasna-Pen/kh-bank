import {
  pgTable,
  varchar,
  numeric,
  timestamp,
  uuid,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations, InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { primaryUuid, timestamps } from '../common';

export const transferStatusEnum = pgEnum('transfer_status', [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
]);

export const currencyEnum = pgEnum('currency', ['USD', 'KHR']);

export const transfers = pgTable('transfers', {
  id: primaryUuid(),
  reference: varchar('reference', { length: 64 }).unique().notNull(),
  fromAccountId: uuid('from_account_id').notNull(),
  toAccountId: uuid('to_account_id').notNull(),
  amount: numeric('amount', { precision: 19, scale: 4 }).notNull(),
  currency: currencyEnum('currency').notNull(),
  status: transferStatusEnum('status').default('PENDING').notNull(),
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
