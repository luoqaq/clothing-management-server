import { Hono } from 'hono';
import { ProductsController } from './products.controller';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../db/schema';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRoles } from '../../middleware/role.middleware';

export function createProductsRoutes(db: MySql2Database<typeof schema>) {
  const controller = new ProductsController(db);
  const products = new Hono();

  products.use('*', authMiddleware);

  products.get('/', (c) => controller.getProducts(c));
  products.get('/check-code', (c) => controller.checkProductCode(c));
  products.post('/import/parse-excel', requireRoles(['admin']), (c) => controller.parseExcelImport(c));
  products.post('/import/parse-excel-file', requireRoles(['admin']), (c) => controller.parseExcelImportFile(c));
  products.post('/import/parse-image', requireRoles(['admin']), (c) => controller.parseImageImport(c));
  products.post('/import/bulk-create', requireRoles(['admin']), (c) => controller.bulkCreateProducts(c));
  products.get('/categories', (c) => controller.getCategories(c));
  products.post('/categories', requireRoles(['admin']), (c) => controller.createCategory(c));
  products.put('/categories/:id', requireRoles(['admin']), (c) => controller.updateCategory(c));
  products.delete('/categories/:id', requireRoles(['admin']), (c) => controller.deleteCategory(c));
  products.get('/suppliers', requireRoles(['admin']), (c) => controller.getSuppliers(c));
  products.post('/suppliers', requireRoles(['admin']), (c) => controller.createSupplier(c));
  products.put('/suppliers/:id', requireRoles(['admin']), (c) => controller.updateSupplier(c));
  products.delete('/suppliers/:id', requireRoles(['admin']), (c) => controller.deleteSupplier(c));
  products.patch('/specifications/:id/stock', (c) => controller.updateSpecificationStock(c));
  products.get('/:id/labels', requireRoles(['admin']), (c) => controller.getProductLabels(c));
  products.get('/:id', (c) => controller.getProduct(c));
  products.post('/', requireRoles(['admin']), (c) => controller.createProduct(c));
  products.put('/:id', requireRoles(['admin']), (c) => controller.updateProduct(c));
  products.delete('/:id', requireRoles(['admin']), (c) => controller.deleteProduct(c));

  return products;
}
