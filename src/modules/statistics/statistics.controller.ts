import { Context } from 'hono';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../db/schema';
import { StatisticsService } from './statistics.service';
import { success, error } from '../../utils/response';
import { logger } from '../../utils/logger';

export class StatisticsController {
  private service: StatisticsService;

  constructor(db: MySql2Database<typeof schema>) {
    this.service = new StatisticsService(db);
  }

  private parseDateRange(c: Context) {
    const query = c.req.query();
    return {
      start: query.start || '2024-01-01',
      end: query.end || new Date().toISOString().split('T')[0],
    };
  }

  private parseLimit(c: Context) {
    const query = c.req.query();
    return query.limit ? parseInt(query.limit, 10) : 10;
  }

  async getSalesOverview(c: Context) {
    try {
      const result = await this.service.getSalesOverview(this.parseDateRange(c));
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Get sales overview error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async getDailySales(c: Context) {
    try {
      const result = await this.service.getDailySales(this.parseDateRange(c));
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Get daily sales error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async getSalesCustomerAnalysis(c: Context) {
    try {
      const result = await this.service.getSalesCustomerAnalysis(this.parseDateRange(c));
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Get sales customer analysis error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async getSalesCategoryAnalysis(c: Context) {
    try {
      const result = await this.service.getSalesCategoryAnalysis(this.parseDateRange(c));
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Get sales category analysis error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async getSalesProductRanking(c: Context) {
    try {
      const result = await this.service.getSalesProductRanking(this.parseDateRange(c), this.parseLimit(c));
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Get sales product ranking error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async getSalesGrossProfitAnalysis(c: Context) {
    try {
      const result = await this.service.getSalesGrossProfitAnalysis(this.parseDateRange(c), this.parseLimit(c));
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Get sales gross profit analysis error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async getCostOverview(c: Context) {
    try {
      const result = await this.service.getCostOverview(this.parseDateRange(c));
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Get cost overview error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async getCostCategoryAnalysis(c: Context) {
    try {
      const result = await this.service.getCostCategoryAnalysis(this.parseDateRange(c));
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Get cost category analysis error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async getCostProductRanking(c: Context) {
    try {
      const result = await this.service.getCostProductRanking(this.parseDateRange(c), this.parseLimit(c));
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Get cost product ranking error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async getProductRankings(c: Context) {
    try {
      const result = await this.service.getProductRankings({ dateRange: this.parseDateRange(c), limit: this.parseLimit(c) });
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Get product rankings error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async getCategorySales(c: Context) {
    try {
      const result = await this.service.getCategorySales(this.parseDateRange(c));
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Get category sales error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async exportStatistics(c: Context) {
    try {
      return c.json(success(null, '导出功能待实现'));
    } catch (err: any) {
      logger.error('Export statistics error:', err);
      return c.json(error(err.message), 400);
    }
  }
}
