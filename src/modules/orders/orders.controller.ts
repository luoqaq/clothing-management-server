import { Context } from 'hono';
import { OrdersService } from './orders.service';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../db/schema';
import {
  cancelOrderSchema,
  orderFiltersSchema,
  orderSchema,
  refundOrderSchema,
  shipOrderSchema,
  updateStatusSchema,
} from './orders.schema';
import { error, success, successPaginated } from '../../utils/response';
import { logger } from '../../utils/logger';

export class OrdersController {
  private service: OrdersService;

  constructor(db: MySql2Database<typeof schema>) {
    this.service = new OrdersService(db);
  }

  async getOrders(c: Context) {
    try {
      const query = c.req.query();
      const validQuery = orderFiltersSchema.parse(query);
      const { search, status, paymentStatus, source, startDate, endDate, sortBy, sortOrder, page, pageSize } = validQuery;

      const result = await this.service.getOrders({
        page: page ? parseInt(page, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize, 10) : 20,
        filters: {
          search,
          status: status as any,
          paymentStatus,
          source: source as any,
          startDate,
          endDate,
          sortBy,
          sortOrder,
        },
        role: c.get('user')?.role,
      });

      return c.json(
        successPaginated(
          result.items,
          result.total,
          page ? parseInt(page, 10) : 1,
          pageSize ? parseInt(pageSize, 10) : 20
        )
      );
    } catch (err: any) {
      logger.error('Get orders error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async getOrder(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0', 10);
      const order = await this.service.getOrder(id, c.get('user')?.role);

      if (!order) {
        return c.json(error('订单不存在'), 404);
      }

      return c.json(success(order));
    } catch (err: any) {
      logger.error('Get order error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async createOrder(c: Context) {
    try {
      const data = await c.req.json();
      orderSchema.parse(data);

      const order = await this.service.createOrder(data);
      return c.json(success(this.service.sanitizeOrderForRole(order, c.get('user')?.role)), 201);
    } catch (err: any) {
      logger.error('Create order error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async updateOrderStatus(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0', 10);
      const data = await c.req.json();
      updateStatusSchema.parse(data);

      const order = await this.service.updateOrderStatus(id, data.status);
      if (!order) {
        return c.json(error('订单不存在'), 404);
      }

      return c.json(success(this.service.sanitizeOrderForRole(order, c.get('user')?.role)));
    } catch (err: any) {
      logger.error('Update order status error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async shipOrder(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0', 10);
      const data = await c.req.json();
      shipOrderSchema.parse(data);

      const order = await this.service.shipOrder(id, data);
      if (!order) {
        return c.json(error('订单不存在'), 404);
      }

      return c.json(success(this.service.sanitizeOrderForRole(order, c.get('user')?.role)));
    } catch (err: any) {
      logger.error('Ship order error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async cancelOrder(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0', 10);
      const data = await c.req.json();
      cancelOrderSchema.parse(data);

      const order = await this.service.cancelOrder(id, data.reason);
      if (!order) {
        return c.json(error('订单不存在'), 404);
      }

      return c.json(success(this.service.sanitizeOrderForRole(order, c.get('user')?.role)));
    } catch (err: any) {
      logger.error('Cancel order error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async refundOrder(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0', 10);
      const data = await c.req.json();
      refundOrderSchema.parse(data);

      const order = await this.service.refundOrder(id, data);
      if (!order) {
        return c.json(error('订单不存在'), 404);
      }

      return c.json(success(this.service.sanitizeOrderForRole(order, c.get('user')?.role)));
    } catch (err: any) {
      logger.error('Refund order error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async exportOrders(c: Context) {
    try {
      return c.json(success(null, '导出功能待实现'));
    } catch (err: any) {
      logger.error('Export orders error:', err);
      return c.json(error(err.message), 400);
    }
  }
}
