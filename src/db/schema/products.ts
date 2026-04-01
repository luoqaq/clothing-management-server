import {
  mysqlTable,
  serial,
  varchar,
  text,
  decimal,
  int,
  json,
  datetime,
  mysqlEnum,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const productCategories = mysqlTable('product_categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  parentId: int('parent_id'),
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const suppliers = mysqlTable('suppliers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const products = mysqlTable('products', {
  id: serial('id').primaryKey(),
  productCode: varchar('product_code', { length: 100 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  categoryId: int('category_id').notNull(),
  supplierId: int('supplier_id'),
  mainImages: json('main_images'),
  detailImages: json('detail_images'),
  tags: json('tags'),
  status: mysqlEnum('status', ['draft', 'active', 'inactive']).default('draft').notNull(),
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const productSkus = mysqlTable('product_skus', {
  id: serial('id').primaryKey(),
  productId: int('product_id').notNull(),
  skuCode: varchar('sku_code', { length: 100 }).notNull().unique(),
  barcode: varchar('barcode', { length: 100 }),
  color: varchar('color', { length: 50 }).notNull(),
  size: varchar('size', { length: 50 }).notNull(),
  salePrice: decimal('sale_price', { precision: 10, scale: 2 }).notNull(),
  costPrice: decimal('cost_price', { precision: 10, scale: 2 }).notNull(),
  stock: int('stock').default(0).notNull(),
  reservedStock: int('reserved_stock').default(0).notNull(),
  status: mysqlEnum('status', ['active', 'inactive']).default('active').notNull(),
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type ProductCategory = typeof productCategories.$inferSelect;
export type InsertProductCategory = typeof productCategories.$inferInsert;

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

export type ProductSku = typeof productSkus.$inferSelect;
export type InsertProductSku = typeof productSkus.$inferInsert;
