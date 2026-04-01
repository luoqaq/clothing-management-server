import {
  mysqlTable,
  serial,
  varchar,
  text,
  decimal,
  int,
  datetime,
  mysqlEnum,
  json,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const orders = mysqlTable('orders', {
  id: serial('id').primaryKey(),
  orderNo: varchar('order_no', { length: 50 }).notNull().unique(),
  source: mysqlEnum('source', ['admin_web', 'staff_miniapp']).default('admin_web').notNull(),
  customerId: int('customer_id'),
  customerName: varchar('customer_name', { length: 100 }).notNull(),
  customerPhone: varchar('customer_phone', { length: 20 }).notNull(),
  customerEmail: varchar('customer_email', { length: 100 }),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).default('0'),
  finalAmount: decimal('final_amount', { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum('status', ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'])
    .default('pending')
    .notNull(),
  address: json('address').notNull(),
  note: text('note'),
  paymentMethod: varchar('payment_method', { length: 50 }),
  paymentStatus: mysqlEnum('payment_status', ['unpaid', 'paid', 'refunded']).default('unpaid').notNull(),
  shippingCompany: varchar('shipping_company', { length: 100 }),
  trackingNumber: varchar('tracking_number', { length: 100 }),
  cancelReason: varchar('cancel_reason', { length: 255 }),
  refundReason: varchar('refund_reason', { length: 255 }),
  paidAt: datetime('paid_at'),
  shippedAt: datetime('shipped_at'),
  deliveredAt: datetime('delivered_at'),
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const orderItems = mysqlTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: int('order_id').notNull(),
  productId: int('product_id').notNull(),
  skuId: int('sku_id').notNull(),
  productName: varchar('product_name', { length: 200 }).notNull(),
  skuCode: varchar('sku_code', { length: 100 }).notNull(),
  image: varchar('image', { length: 500 }),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  costPriceSnapshot: decimal('cost_price_snapshot', { precision: 10, scale: 2 }).notNull().default('0'),
  quantity: int('quantity').notNull(),
  color: varchar('color', { length: 50 }),
  size: varchar('size', { length: 50 }),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;
