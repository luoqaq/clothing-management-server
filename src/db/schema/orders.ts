import { mysqlTable, serial, varchar, text, decimal, int, datetime, mysqlEnum, json } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const orders = mysqlTable('orders', {
  id: serial('id').primaryKey(),
  orderNo: varchar('order_no', { length: 50 }).notNull().unique(),
  customerName: varchar('customer_name', { length: 100 }).notNull(),
  customerPhone: varchar('customer_phone', { length: 20 }).notNull(),
  customerEmail: varchar('customer_email', { length: 100 }),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).default('0'),
  finalAmount: decimal('final_amount', { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum('status', ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded']).default('pending'),
  address: json('address').notNull(),
  note: text('note'),
  paymentMethod: varchar('payment_method', { length: 50 }),
  paymentStatus: mysqlEnum('payment_status', ['unpaid', 'paid', 'refunded']).default('unpaid'),
  shippedAt: datetime('shipped_at'),
  deliveredAt: datetime('delivered_at'),
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const orderItems = mysqlTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: int('order_id').notNull(),
  productId: int('product_id').notNull(),
  productName: varchar('product_name', { length: 200 }).notNull(),
  image: varchar('image', { length: 500 }),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  quantity: int('quantity').notNull(),
  size: mysqlEnum('size', ['S', 'M', 'L', 'XL', 'XXL']),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;
