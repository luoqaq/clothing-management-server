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
  products.get('/categories', (c) => controller.getCategories(c));
  products.post('/categories', (c) => controller.createCategory(c));
  products.put('/categories/:id', (c) => controller.updateCategory(c));
  products.delete('/categories/:id', (c) => controller.deleteCategory(c));
  products.get('/:id', (c) => controller.getProduct(c));
  products.post('/', (c) => controller.createProduct(c));
  products.put('/:id', (c) => controller.updateProduct(c));
  products.delete('/:id', (c) => controller.deleteProduct(c));
  products.patch('/:id/stock', (c) => controller.updateStock(c));

  return products;
}
