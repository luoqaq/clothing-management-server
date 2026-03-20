import { Context } from 'hono';
import { StatisticsService } from './statistics.service';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../db/schema';
import { success, error } from '../../utils/response';
import { logger } from '../../utils/logger';

export class StatisticsController {
  private service: StatisticsService;

  constructor(db: MySql2Database<typeof schema>) {
    this.service = new StatisticsService(db);
  }

  async getSalesOverview(c: Context) {
    try {
      const query = c.req.query();
      const start = query.start || '2024-01-01';
      const end = query.end || new Date().toISOString().split('T')[0];

      const result = await this.service.getSalesOverview({ start, end });
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Get sales overview error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async getDailySales(c: Context) {
    try {
      const query = c.req.query();
      const start = query.start || '2024-01-01';
      const end = query.end || new Date().toISOString().split('T')[0];

      const result = await this.service.getDailySales({ start, end });
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Get daily sales error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async getProductRankings(c: Context) {
    try {
      const query = c.req.query();
      const dateRange = query.start && query.end ? {
        start: query.start,
        end: query.end,
      } : undefined;
      const limit = query.limit ? parseInt(query.limit) : 10;

      const result = await this.service.getProductRankings({ dateRange, limit });
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Get product rankings error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async getCategorySales(c: Context) {
    try {
      const query = c.req.query();
      const start = query.start || '2024-01-01';
      const end = query.end || new Date().toISOString().split('T')[0];

      const result = await this.service.getCategorySales({ start, end });
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Get category sales error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async getRegionSales(c: Context) {
    try {
      const query = c.req.query();
      const start = query.start || '2024-01-01';
      const end = query.end || new Date().toISOString().split('T')[0];

      const result = await this.service.getRegionSales({ start, end });
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Get region sales error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async exportStatistics(c: Context) {
    try {
      const query = c.req.query();
      return c.json(success(null, '导出功能待实现'));
    } catch (err: any) {
      logger.error('Export statistics error:', err);
      return c.json(error(err.message), 400);
    }
  }
}
