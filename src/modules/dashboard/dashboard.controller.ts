import type { Context } from 'hono';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../db/schema';
import { logger } from '../../utils/logger';
import { error, success } from '../../utils/response';
import { isAdminRole } from '../../utils/role';
import { DashboardService } from './dashboard.service';

export class DashboardController {
  private service: DashboardService;

  constructor(db: MySql2Database<typeof schema>) {
    this.service = new DashboardService(db);
  }

  async getDashboardSummary(c: Context) {
    try {
      const { startDate, endDate } = c.req.query();
      const result = await this.service.getDashboardSummary({
        startDate,
        endDate,
        includeProfit: isAdminRole(c.get('user')?.role),
      });
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Get dashboard summary error:', err);
      return c.json(error(err.message), 400);
    }
  }
}
