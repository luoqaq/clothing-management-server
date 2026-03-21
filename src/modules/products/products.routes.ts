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
  products.get('/brands', (c) => controller.getBrands(c));
  products.post('/brands', (c) => controller.createBrand(c));
  products.put('/brands/:id', (c) => controller.updateBrand(c));
  products.delete('/brands/:id', (c) => controller.deleteBrand(c));
  products.patch('/specifications/:id/stock', (c) => controller.updateSpecificationStock(c));
  products.get('/:id', (c) => controller.getProduct(c));
  products.post('/', (c) => controller.createProduct(c));
  products.put('/:id', (c) => controller.updateProduct(c));
  products.delete('/:id', (c) => controller.deleteProduct(c));

  return products;
}
