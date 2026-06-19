import type { Context } from 'hono';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../db/schema';
import { error, success, successPaginated } from '../../utils/response';
import { logger } from '../../utils/logger';
import {
  laborCostQuerySchema,
  laborCostRecordSchema,
  laborDateRangeSchema,
} from './labor-costs.schema';
import { LaborCostsService } from './labor-costs.service';

export class LaborCostsController {
  private service: LaborCostsService;

  constructor(db: MySql2Database<typeof schema>) {
    this.service = new LaborCostsService(db);
  }

  async getWorkers(c: Context) {
    try {
      const status = c.req.query('status') as 'active' | 'inactive' | undefined;
      const result = await this.service.listWorkers(status);
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Get part-time workers error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async getRecords(c: Context) {
    try {
      const query = laborCostQuerySchema.parse(c.req.query());
      const page = query.page ? parseInt(query.page, 10) : 1;
      const pageSize = query.pageSize ? parseInt(query.pageSize, 10) : 20;
      const result = await this.service.listRecords({
        page,
        pageSize,
        filters: {
          start: query.start,
          end: query.end,
          coverageType: query.coverageType,
        },
      });
      return c.json(successPaginated(result.items, result.total, page, pageSize));
    } catch (err: any) {
      logger.error('Get labor cost records error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async getSummary(c: Context) {
    try {
      const query = laborDateRangeSchema.parse(c.req.query());
      const result = await this.service.getSummary(query);
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Get labor cost summary error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async createRecord(c: Context) {
    try {
      const payload = laborCostRecordSchema.parse(await c.req.json());
      const user = c.get('user');
      const result = await this.service.createRecord({
        ...payload,
        createdBy: user?.userId,
      });
      return c.json(success(result), 201);
    } catch (err: any) {
      logger.error('Create labor cost record error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async updateRecord(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0', 10);
      const payload = laborCostRecordSchema.partial().parse(await c.req.json());
      const result = await this.service.updateRecord(id, payload);
      if (!result) {
        return c.json(error('兼职成本记录不存在'), 404);
      }
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Update labor cost record error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async deleteRecord(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0', 10);
      await this.service.deleteRecord(id);
      return c.json(success(true));
    } catch (err: any) {
      logger.error('Delete labor cost record error:', err);
      return c.json(error(err.message), 400);
    }
  }
}
