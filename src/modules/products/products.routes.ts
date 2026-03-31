import { Hono } from 'hono';
import { ProductsController } from './products.controller';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../db/schema';
import { authMiddleware } from '../../middleware/auth.middleware';

export function createProductsRoutes(db: MySql2Database<typeof schema>) {
  const controller = new ProductsController(db);
  const products = new Hono();

  products.use('*', authMiddleware);

  products.get('/', (c) => controller.getProducts(c));
  products.post('/import/parse-excel', (c) => controller.parseExcelImport(c));
  products.post('/import/parse-image', (c) => controller.parseImageImport(c));
  products.post('/import/bulk-create', (c) => controller.bulkCreateProducts(c));
  products.get('/categories', (c) => controller.getCategories(c));
  products.post('/categories', (c) => controller.createCategory(c));
  products.put('/categories/:id', (c) => controller.updateCategory(c));
  products.delete('/categories/:id', (c) => controller.deleteCategory(c));
  products.get('/suppliers', (c) => controller.getSuppliers(c));
  products.post('/suppliers', (c) => controller.createSupplier(c));
  products.put('/suppliers/:id', (c) => controller.updateSupplier(c));
  products.delete('/suppliers/:id', (c) => controller.deleteSupplier(c));
  products.patch('/specifications/:id/stock', (c) => controller.updateSpecificationStock(c));
  products.get('/:id', (c) => controller.getProduct(c));
  products.post('/', (c) => controller.createProduct(c));
  products.put('/:id', (c) => controller.updateProduct(c));
  products.delete('/:id', (c) => controller.deleteProduct(c));

  return products;
}
