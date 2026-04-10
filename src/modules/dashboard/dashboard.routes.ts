import { Hono } from 'hono';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../db/schema';
import { authMiddleware } from '../../middleware/auth.middleware';
import { DashboardController } from './dashboard.controller';

export function createDashboardRoutes(db: MySql2Database<typeof schema>) {
  const controller = new DashboardController(db);
  const dashboard = new Hono();

  dashboard.use('*', authMiddleware);
  dashboard.get('/summary', (c) => controller.getDashboardSummary(c));

  return dashboard;
}
