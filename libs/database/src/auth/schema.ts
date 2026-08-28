import {
  pgTable,
  varchar,
  text,
  integer,
  timestamp,
  uuid,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations, InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { primaryUuid, timestamps } from '../common';

export const userStatusEnum = pgEnum('user_status', [
  'ACTIVE',
  'BLOCKED',
  'SUSPENDED',
]);

export const otpPurposeEnum = pgEnum('otp_purpose', [
  'REGISTRATION',
  'LOGIN',
  'RESET_PIN',
  'TRANSFER',
]);

export const users = pgTable('users', {
  id: primaryUuid(),
  phone: varchar('phone', { length: 32 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  status: userStatusEnum('status').default('ACTIVE').notNull(),
  ...timestamps,
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: primaryUuid(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  tokenHash: varchar('token_hash', { length: 255 }).unique().notNull(),
  deviceId: varchar('device_id', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at', {
    withTimezone: true,
    mode: 'date',
  }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
});

export const otpCodes = pgTable('otp_codes', {
  id: primaryUuid(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  codeHash: varchar('code_hash', { length: 255 }).notNull(),
  purpose: otpPurposeEnum('purpose').notNull(),
  expiresAt: timestamp('expires_at', {
    withTimezone: true,
    mode: 'date',
  }).notNull(),
  verifiedAt: timestamp('verified_at', { withTimezone: true, mode: 'date' }),
  attempts: integer('attempts').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
});

export const sessions = pgTable('sessions', {
  id: primaryUuid(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  deviceId: varchar('device_id', { length: 255 }).notNull(),
  ipAddress: varchar('ip_address', { length: 64 }).notNull(),
  userAgent: text('user_agent').notNull(),
  lastActiveAt: timestamp('last_active_at', {
    withTimezone: true,
    mode: 'date',
  })
    .defaultNow()
    .notNull(),
  expiresAt: timestamp('expires_at', {
    withTimezone: true,
    mode: 'date',
  }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
  otpCodes: many(otpCodes),
  sessions: many(sessions),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const otpCodesRelations = relations(otpCodes, ({ one }) => ({
  user: one(users, {
    fields: [otpCodes.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type RefreshToken = InferSelectModel<typeof refreshTokens>;
export type NewRefreshToken = InferInsertModel<typeof refreshTokens>;

export type OtpCode = InferSelectModel<typeof otpCodes>;
export type NewOtpCode = InferInsertModel<typeof otpCodes>;

export type Session = InferSelectModel<typeof sessions>;
export type NewSession = InferInsertModel<typeof sessions>;
