import {
  pgTable,
  varchar,
  text,
  boolean,
  date,
  uuid,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations, InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { primaryUuid, timestamps } from '../common';

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

export const genderEnum = pgEnum('gender', ['MALE', 'FEMALE', 'OTHER']);

export const customers = pgTable('customers', {
  id: primaryUuid(),
  userId: uuid('user_id').unique().notNull(), 
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  dateOfBirth: date('date_of_birth'),
  gender: genderEnum('gender'),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 32 }).notNull(),
  status: customerStatusEnum('status').default('ACTIVE').notNull(),
  kycStatus: kycStatusEnum('kyc_status').default('PENDING').notNull(),
  ...timestamps,
});

export const customerAddresses = pgTable('customer_addresses', {
  id: primaryUuid(),
  customerId: uuid('customer_id')
    .references(() => customers.id, { onDelete: 'cascade' })
    .notNull(),
  addressLine: text('address_line').notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  province: varchar('province', { length: 100 }).notNull(),
  country: varchar('country', { length: 100 }).notNull(),
  postalCode: varchar('postal_code', { length: 20 }),
  isPrimary: boolean('is_primary').default(false).notNull(),
  ...timestamps,
});

export const customersRelations = relations(customers, ({ many }) => ({
  addresses: many(customerAddresses),
}));

export const customerAddressesRelations = relations(
  customerAddresses,
  ({ one }) => ({
    customer: one(customers, {
      fields: [customerAddresses.customerId],
      references: [customers.id],
    }),
  }),
);

export type Customer = InferSelectModel<typeof customers>;
export type NewCustomer = InferInsertModel<typeof customers>;

export type CustomerAddress = InferSelectModel<typeof customerAddresses>;
export type NewCustomerAddress = InferInsertModel<typeof customerAddresses>;
