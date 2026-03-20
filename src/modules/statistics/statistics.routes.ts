import { Hono } from 'hono';
import { StatisticsController } from './statistics.controller';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../db/schema';
import { authMiddleware } from '../../middleware/auth.middleware';

export function createStatisticsRoutes(db: MySql2Database<typeof schema>) {
  const controller = new StatisticsController(db);
  const statistics = new Hono();

  statistics.use('*', authMiddleware);

  statistics.get('/overview', (c) => controller.getSalesOverview(c));
  statistics.get('/daily-sales', (c) => controller.getDailySales(c));
  statistics.get('/product-rankings', (c) => controller.getProductRankings(c));
  statistics.get('/category-sales', (c) => controller.getCategorySales(c));
  statistics.get('/region-sales', (c) => controller.getRegionSales(c));
  statistics.get('/export', (c) => controller.exportStatistics(c));

  return statistics;
}
