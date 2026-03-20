import { mysqlTable, serial, varchar, text, decimal, int, json, datetime, mysqlEnum } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const productCategories = mysqlTable('product_categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  parentId: int('parent_id'),
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const products = mysqlTable('products', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  categoryId: int('category_id').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  costPrice: decimal('cost_price', { precision: 10, scale: 2 }).notNull(),
  stock: int('stock').default(0),
  images: json('images'),
  size: mysqlEnum('size', ['S', 'M', 'L', 'XL', 'XXL']),
  status: mysqlEnum('status', ['active', 'inactive', 'out_of_stock']).default('active'),
  tags: json('tags'),
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type ProductCategory = typeof productCategories.$inferSelect;
export type InsertProductCategory = typeof productCategories.$inferInsert;

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
