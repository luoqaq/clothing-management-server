import { Hono } from 'hono';
import { OrdersController } from './orders.controller';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../db/schema';
import { authMiddleware } from '../../middleware/auth.middleware';

export function createOrdersRoutes(db: MySql2Database<typeof schema>) {
  const controller = new OrdersController(db);
  const orders = new Hono();

  orders.use('*', authMiddleware);

  orders.get('/', (c) => controller.getOrders(c));
  orders.get('/export', (c) => controller.exportOrders(c));
  orders.get('/:id', (c) => controller.getOrder(c));
  orders.post('/', (c) => controller.createOrder(c));
  orders.patch('/:id/status', (c) => controller.updateOrderStatus(c));
  orders.post('/:id/ship', (c) => controller.shipOrder(c));
  orders.post('/:id/cancel', (c) => controller.cancelOrder(c));
  orders.post('/:id/refund', (c) => controller.refundOrder(c));

  return orders;
}
