import { Hono } from 'hono';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../db/schema';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRoles } from '../../middleware/role.middleware';
import { CustomersController } from './customers.controller';

export function createCustomersRoutes(db: MySql2Database<typeof schema>) {
  const customers = new Hono();
  const controller = new CustomersController(db);

  customers.use('*', authMiddleware);
  customers.use('*', requireRoles(['admin']));

  customers.get('/age-buckets', (c) => controller.getAgeBuckets(c));
  customers.post('/age-buckets', (c) => controller.createAgeBucket(c));
  customers.put('/age-buckets/:id', (c) => controller.updateAgeBucket(c));
  customers.delete('/age-buckets/:id', (c) => controller.deleteAgeBucket(c));
  customers.get('/', (c) => controller.getCustomers(c));
  customers.patch('/:id', (c) => controller.updateCustomer(c));

  return customers;
}
