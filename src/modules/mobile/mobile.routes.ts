import { Hono } from 'hono';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../db/schema';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRoles } from '../../middleware/role.middleware';
import { MobileController } from './mobile.controller';

export function createMobileRoutes(db: MySql2Database<typeof schema>) {
  const controller = new MobileController(db);
  const mobile = new Hono();

  mobile.post('/auth/login', (c) => controller.login(c));

  mobile.use('*', authMiddleware);

  mobile.post('/auth/logout', (c) => controller.logout(c));
  mobile.get('/auth/me', (c) => controller.getCurrentUser(c));
  mobile.get('/dashboard/summary', (c) => controller.getDashboardSummary(c));
  mobile.get('/products', (c) => controller.getProducts(c));
  mobile.get('/products/by-code', (c) => controller.getProductByCode(c));
  mobile.get('/products/:id', (c) => controller.getProduct(c));
  mobile.get('/product-options', (c) => controller.getProductOptions(c));
  mobile.get('/customers/age-buckets', (c) => controller.getAgeBuckets(c));
  mobile.post('/products', requireRoles(['admin']), (c) => controller.createProduct(c));
  mobile.patch('/products/:id/images', requireRoles(['admin']), (c) => controller.updateProductImages(c));
  mobile.get('/orders', (c) => controller.getOrders(c));
  mobile.get('/orders/:id', (c) => controller.getOrder(c));
  mobile.post('/orders', (c) => controller.createOrder(c));
  mobile.patch('/orders/:id/status', (c) => controller.updateOrderStatus(c));
  mobile.post('/orders/:id/ship', (c) => controller.shipOrder(c));
  mobile.post('/orders/:id/cancel', (c) => controller.cancelOrder(c));

  return mobile;
}
