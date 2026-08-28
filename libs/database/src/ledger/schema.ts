import {
  pgTable,
  varchar,
  numeric,
  timestamp,
  uuid,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations, InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { primaryUuid } from '../common';

export const ledgerTxTypeEnum = pgEnum('ledger_tx_type', [
  'TRANSFER',
  'PAYMENT',
  'DEPOSIT',
  'WITHDRAWAL',
  'REVERSAL',
]);

export const ledgerTxStatusEnum = pgEnum('ledger_tx_status', [
  'PENDING',
  'COMPLETED',
  'FAILED',
  'REVERSED',
]);

export const directionEnum = pgEnum('direction', ['DEBIT', 'CREDIT']);

export const currencyEnum = pgEnum('currency', ['USD', 'KHR']);

export const ledgerTransactions = pgTable('ledger_transactions', {
  id: primaryUuid(),
  reference: varchar('reference', { length: 64 }).unique().notNull(),
  type: ledgerTxTypeEnum('type').default('TRANSFER').notNull(),
  status: ledgerTxStatusEnum('status').default('PENDING').notNull(),
  currency: currencyEnum('currency').notNull(),
  description: varchar('description', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),
});

export const ledgerEntries = pgTable('ledger_entries', {
  id: primaryUuid(),
  transactionId: uuid('transaction_id')
    .references(() => ledgerTransactions.id, { onDelete: 'cascade' })
    .notNull(),
  accountId: uuid('account_id').notNull(), 
  direction: directionEnum('direction').notNull(),
  amount: numeric('amount', { precision: 19, scale: 4 }).notNull(),
  currency: currencyEnum('currency').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
});

export const processedEvents = pgTable('processed_events', {
  id: primaryUuid(),
  eventId: uuid('event_id').unique().notNull(),
  eventType: varchar('event_type', { length: 128 }).notNull(),
  consumer: varchar('consumer', { length: 128 }).notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
});

export const ledgerTransactionsRelations = relations(
  ledgerTransactions,
  ({ many }) => ({
    entries: many(ledgerEntries),
  }),
);

export const ledgerEntriesRelations = relations(ledgerEntries, ({ one }) => ({
  transaction: one(ledgerTransactions, {
    fields: [ledgerEntries.transactionId],
    references: [ledgerTransactions.id],
  }),
}));

export type LedgerTransaction = InferSelectModel<typeof ledgerTransactions>;
export type NewLedgerTransaction = InferInsertModel<typeof ledgerTransactions>;

export type LedgerEntry = InferSelectModel<typeof ledgerEntries>;
export type NewLedgerEntry = InferInsertModel<typeof ledgerEntries>;

export type ProcessedEvent = InferSelectModel<typeof processedEvents>;
export type NewProcessedEvent = InferInsertModel<typeof processedEvents>;
