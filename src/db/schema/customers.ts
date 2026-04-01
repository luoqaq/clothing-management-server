import { mysqlTable, serial, varchar, datetime, int } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const customerAgeBuckets = mysqlTable('customer_age_buckets', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  sortOrder: int('sort_order').notNull().default(0),
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const customers = mysqlTable('customers', {
  id: serial('id').primaryKey(),
  phone: varchar('phone', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull().default(''),
  email: varchar('email', { length: 100 }),
  ageBucketId: int('age_bucket_id'),
  firstPaidOrderAt: datetime('first_paid_order_at'),
  lastPaidOrderAt: datetime('last_paid_order_at'),
  paidOrderCount: int('paid_order_count').notNull().default(0),
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type CustomerAgeBucket = typeof customerAgeBuckets.$inferSelect;
export type InsertCustomerAgeBucket = typeof customerAgeBuckets.$inferInsert;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;
