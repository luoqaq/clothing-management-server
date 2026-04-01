import { Context } from 'hono';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../db/schema';
import { success, error } from '../../utils/response';
import { logger } from '../../utils/logger';
import { CustomersService } from './customers.service';
import { customerAgeBucketSchema, updateCustomerSchema } from './customers.schema';

export class CustomersController {
  private service: CustomersService;

  constructor(db: MySql2Database<typeof schema>) {
    this.service = new CustomersService(db);
  }

  async getAgeBuckets(c: Context) {
    try {
      const data = await this.service.getAgeBuckets();
      return c.json(success(data));
    } catch (err: any) {
      logger.error('Get customer age buckets error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async createAgeBucket(c: Context) {
    try {
      const data = customerAgeBucketSchema.parse(await c.req.json());
      const result = await this.service.createAgeBucket(data);
      return c.json(success(result), 201);
    } catch (err: any) {
      logger.error('Create customer age bucket error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async updateAgeBucket(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0', 10);
      const data = customerAgeBucketSchema.partial().parse(await c.req.json());
      const result = await this.service.updateAgeBucket(id, data);
      if (!result) {
        return c.json(error('年龄段不存在'), 404);
      }
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Update customer age bucket error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async deleteAgeBucket(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0', 10);
      await this.service.deleteAgeBucket(id);
      return c.json(success(true));
    } catch (err: any) {
      logger.error('Delete customer age bucket error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async getCustomers(c: Context) {
    try {
      const data = await this.service.getCustomers();
      return c.json(success(data));
    } catch (err: any) {
      logger.error('Get customers error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async updateCustomer(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0', 10);
      const payload = updateCustomerSchema.parse(await c.req.json());
      const result = await this.service.updateCustomer(id, {
        name: payload.name,
        email: payload.email === '' ? null : payload.email,
        ageBucketId: payload.ageBucketId,
      });
      if (!result) {
        return c.json(error('客户不存在'), 404);
      }
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Update customer error:', err);
      return c.json(error(err.message), 400);
    }
  }
}
