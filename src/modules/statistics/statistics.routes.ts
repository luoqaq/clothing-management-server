import { Hono } from 'hono';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../db/schema';
import { StatisticsController } from './statistics.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRoles } from '../../middleware/role.middleware';

export function createStatisticsRoutes(db: MySql2Database<typeof schema>) {
  const statistics = new Hono();
  const controller = new StatisticsController(db);

  statistics.use('*', authMiddleware);
  statistics.use('*', requireRoles(['admin']));

  statistics.get('/overview', (c) => controller.getSalesOverview(c));
  statistics.get('/daily-sales', (c) => controller.getDailySales(c));
  statistics.get('/product-rankings', (c) => controller.getProductRankings(c));
  statistics.get('/category-sales', (c) => controller.getCategorySales(c));

  statistics.get('/sales/overview', (c) => controller.getSalesOverview(c));
  statistics.get('/sales/customer-analysis', (c) => controller.getSalesCustomerAnalysis(c));
  statistics.get('/sales/category-analysis', (c) => controller.getSalesCategoryAnalysis(c));
  statistics.get('/sales/product-ranking', (c) => controller.getSalesProductRanking(c));
  statistics.get('/sales/gross-profit-analysis', (c) => controller.getSalesGrossProfitAnalysis(c));

  statistics.get('/cost/overview', (c) => controller.getCostOverview(c));
  statistics.get('/cost/category-analysis', (c) => controller.getCostCategoryAnalysis(c));
  statistics.get('/cost/product-ranking', (c) => controller.getCostProductRanking(c));

  statistics.get('/operating-profit/overview', (c) => controller.getOperatingProfitOverview(c));
  statistics.get('/operating-profit/daily', (c) => controller.getDailyOperatingProfit(c));

  statistics.get('/export', (c) => controller.exportStatistics(c));

  return statistics;
}
