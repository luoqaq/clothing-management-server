import {
  date,
  datetime,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  serial,
  text,
  varchar,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const partTimeWorkers = mysqlTable('part_time_workers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 30 }),
  defaultDailyWage: decimal('default_daily_wage', { precision: 10, scale: 2 }).default('0.00').notNull(),
  status: mysqlEnum('status', ['active', 'inactive']).default('active').notNull(),
  note: text('note'),
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const laborCostRecords = mysqlTable('labor_cost_records', {
  id: serial('id').primaryKey(),
  workDate: date('work_date', { mode: 'string' }).notNull(),
  workerId: int('worker_id'),
  workerNameSnapshot: varchar('worker_name_snapshot', { length: 100 }),
  coverageType: mysqlEnum('coverage_type', ['self', 'part_time']).default('part_time').notNull(),
  dailyWage: decimal('daily_wage', { precision: 10, scale: 2 }).default('0.00').notNull(),
  paidAmount: decimal('paid_amount', { precision: 10, scale: 2 }).default('0.00').notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }),
  paidAt: datetime('paid_at'),
  note: text('note'),
  createdBy: int('created_by'),
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type PartTimeWorker = typeof partTimeWorkers.$inferSelect;
export type InsertPartTimeWorker = typeof partTimeWorkers.$inferInsert;

export type LaborCostRecord = typeof laborCostRecords.$inferSelect;
export type InsertLaborCostRecord = typeof laborCostRecords.$inferInsert;
