import { Hono } from 'hono';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../db/schema';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRoles } from '../../middleware/role.middleware';
import { LaborCostsController } from './labor-costs.controller';

export function createLaborCostsRoutes(db: MySql2Database<typeof schema>) {
  const laborCosts = new Hono();
  const controller = new LaborCostsController(db);

  laborCosts.use('*', authMiddleware);
  laborCosts.use('*', requireRoles(['admin']));

  laborCosts.get('/workers', (c) => controller.getWorkers(c));

  laborCosts.get('/summary', (c) => controller.getSummary(c));
  laborCosts.get('/', (c) => controller.getRecords(c));
  laborCosts.post('/', (c) => controller.createRecord(c));
  laborCosts.put('/:id', (c) => controller.updateRecord(c));
  laborCosts.delete('/:id', (c) => controller.deleteRecord(c));

  return laborCosts;
}
