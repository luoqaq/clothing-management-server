import type { Context } from 'hono';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../db/schema';
import { logger } from '../../utils/logger';
import { error, success, successPaginated } from '../../utils/response';
import { loginSchema } from '../auth/auth.schema';
import { orderFiltersSchema, orderSchema, shipOrderSchema, updateStatusSchema, cancelOrderSchema } from '../orders/orders.schema';
import { productFiltersSchema, productSchema } from '../products/products.schema';
import { MobileService } from './mobile.service';
import { updateProductImagesSchema } from './mobile.schema';

export class MobileController {
  private service: MobileService;

  constructor(db: MySql2Database<typeof schema>) {
    this.service = new MobileService(db);
  }

  async login(c: Context) {
    try {
      const payload = loginSchema.parse(await c.req.json());
      const result = await this.service.getAuthService().login(payload);
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Mobile login error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async getCurrentUser(c: Context) {
    try {
      const user = c.get('user');
      const result = await this.service.getAuthService().getCurrentUser(Number(user.userId));
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Get mobile current user error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async logout(c: Context) {
    return c.json(success(null, '退出成功'));
  }

  async getDashboardSummary(c: Context) {
    try {
      const result = await this.service.getDashboardSummary();
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Get mobile dashboard summary error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async getProducts(c: Context) {
    try {
      const query = productFiltersSchema.parse(c.req.query());
      const { search, categoryId, supplierId, status, minPrice, maxPrice, page, pageSize } = query;
      const result = await this.service.getProductsService().getProducts({
        page: page ? parseInt(page, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize, 10) : 20,
        role: c.get('user')?.role,
        filters: {
          search,
          categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
          supplierId: supplierId ? parseInt(supplierId, 10) : undefined,
          status,
          minPrice: minPrice ? parseFloat(minPrice) : undefined,
          maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        },
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
      logger.error('Get mobile products error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async getProduct(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0', 10);
      const product = await this.service.getProductsService().getProduct(id, c.get('user')?.role);

      if (!product) {
        return c.json(error('商品不存在'), 404);
      }

      return c.json(success(product));
    } catch (err: any) {
      logger.error('Get mobile product error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async getProductByCode(c: Context) {
    try {
      const code = c.req.query('code') || '';
      const product = await this.service.getProductsService().getScannedSkuByCode(code);

      if (!product) {
        return c.json(error('未找到对应标签商品'), 404);
      }

      if (product.productStatus !== 'active') {
        return c.json(error('该商品已下架，暂不可销售'), 409);
      }

      if (product.status !== 'active') {
        return c.json(error('该规格已停用，暂不可销售'), 409);
      }

      if (product.availableStock <= 0) {
        return c.json(error('该规格当前无可售库存'), 409);
      }

      return c.json(success(product));
    } catch (err: any) {
      logger.error('Get mobile product by code error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async getProductOptions(c: Context) {
    try {
      const result = await this.service.getProductOptions(c.get('user')?.role);
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Get mobile product options error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async getAgeBuckets(c: Context) {
    try {
      const result = await this.service.getCustomersService().getAgeBuckets();
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Get mobile age buckets error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async createProduct(c: Context) {
    try {
      const payload = productSchema.parse(await c.req.json());
      const product = await this.service.getProductsService().createProduct(payload as any);
      return c.json(success(product), 201);
    } catch (err: any) {
      logger.error('Create mobile product error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async updateProductImages(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0', 10);
      const payload = updateProductImagesSchema.parse(await c.req.json());
      const product = await this.service.getProductsService().updateProductImages(id, payload);

      if (!product) {
        return c.json(error('商品不存在'), 404);
      }

      return c.json(success(product));
    } catch (err: any) {
      logger.error('Update mobile product images error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async getOrders(c: Context) {
    try {
      const query = orderFiltersSchema.parse(c.req.query());
      const { search, status, paymentStatus, source, startDate, endDate, page, pageSize } = query;
      const result = await this.service.getOrdersService().getOrders({
        page: page ? parseInt(page, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize, 10) : 20,
        filters: {
          search,
          status: status as any,
          paymentStatus,
          source: source as any,
          startDate,
          endDate,
        },
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
      logger.error('Get mobile orders error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async getOrder(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0', 10);
      const order = await this.service.getOrdersService().getOrder(id);

      if (!order) {
        return c.json(error('订单不存在'), 404);
      }

      return c.json(success(order));
    } catch (err: any) {
      logger.error('Get mobile order error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async createOrder(c: Context) {
    try {
      const payload = orderSchema.parse(await c.req.json());
      const order = await this.service.getOrdersService().createOrder({
        ...payload,
        source: 'staff_miniapp',
      } as any);
      return c.json(success(order), 201);
    } catch (err: any) {
      logger.error('Create mobile order error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async updateOrderStatus(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0', 10);
      const payload = updateStatusSchema.parse(await c.req.json());
      const order = await this.service.getOrdersService().updateOrderStatus(id, payload.status);

      if (!order) {
        return c.json(error('订单不存在'), 404);
      }

      return c.json(success(order));
    } catch (err: any) {
      logger.error('Update mobile order status error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async shipOrder(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0', 10);
      const payload = shipOrderSchema.parse(await c.req.json());
      const order = await this.service.getOrdersService().shipOrder(id, payload);

      if (!order) {
        return c.json(error('订单不存在'), 404);
      }

      return c.json(success(order));
    } catch (err: any) {
      logger.error('Ship mobile order error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async cancelOrder(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0', 10);
      const payload = cancelOrderSchema.parse(await c.req.json());
      const order = await this.service.getOrdersService().cancelOrder(id, payload.reason);

      if (!order) {
        return c.json(error('订单不存在'), 404);
      }

      return c.json(success(order));
    } catch (err: any) {
      logger.error('Cancel mobile order error:', err);
      return c.json(error(err.message), 400);
    }
  }
}
