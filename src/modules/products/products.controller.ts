import { Context } from 'hono';
import { ProductsService } from './products.service';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../db/schema';
import {
  productSchema,
  categorySchema,
  updateStockSchema,
  productFiltersSchema,
} from './products.schema';
import { success, successPaginated, error } from '../../utils/response';
import { logger } from '../../utils/logger';

export class ProductsController {
  private service: ProductsService;

  constructor(db: MySql2Database<typeof schema>) {
    this.service = new ProductsService(db);
  }

  async getProducts(c: Context) {
    try {
      const query = c.req.query();
      const validQuery = productFiltersSchema.parse(query);

      const { search, categoryId, status, minPrice, maxPrice, page, pageSize } = validQuery;

      const result = await this.service.getProducts({
        page: page ? parseInt(page) : 1,
        pageSize: pageSize ? parseInt(pageSize) : 20,
        filters: {
          search,
          categoryId: categoryId ? parseInt(categoryId) : undefined,
          status,
          minPrice: minPrice ? parseFloat(minPrice) : undefined,
          maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        },
      });

      return c.json(successPaginated(
        result.items,
        result.total,
        page ? parseInt(page) : 1,
        pageSize ? parseInt(pageSize) : 20
      ));
    } catch (err: any) {
      logger.error('Get products error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async getProduct(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0');
      const product = await this.service.getProduct(id);

      if (!product) {
        return c.json(error('商品不存在'), 404);
      }

      return c.json(success(product));
    } catch (err: any) {
      logger.error('Get product error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async createProduct(c: Context) {
    try {
      const data = await c.req.json();
      productSchema.parse(data);

      const product = await this.service.createProduct(data);
      return c.json(success(product), 201);
    } catch (err: any) {
      logger.error('Create product error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async updateProduct(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0');
      const data = await c.req.json();
      productSchema.partial().parse(data);

      const product = await this.service.updateProduct(id, data);
      if (!product) {
        return c.json(error('商品不存在'), 404);
      }

      return c.json(success(product));
    } catch (err: any) {
      logger.error('Update product error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async deleteProduct(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0');
      const deleted = await this.service.deleteProduct(id);
      if (!deleted) {
        return c.json(error('商品不存在'), 404);
      }

      return c.json(success(null, '删除成功'));
    } catch (err: any) {
      logger.error('Delete product error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async updateStock(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0');
      const data = await c.req.json();
      updateStockSchema.parse(data);

      const product = await this.service.updateStock(id, data.stock);
      if (!product) {
        return c.json(error('商品不存在'), 404);
      }

      return c.json(success(product));
    } catch (err: any) {
      logger.error('Update stock error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async getCategories(c: Context) {
    try {
      const categories = await this.service.getCategories();
      return c.json(success(categories));
    } catch (err: any) {
      logger.error('Get categories error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async createCategory(c: Context) {
    try {
      const data = await c.req.json();
      categorySchema.parse(data);

      const category = await this.service.createCategory(data);
      return c.json(success(category), 201);
    } catch (err: any) {
      logger.error('Create category error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async updateCategory(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0');
      const data = await c.req.json();
      categorySchema.partial().parse(data);

      const category = await this.service.updateCategory(id, data);
      if (!category) {
        return c.json(error('分类不存在'), 404);
      }

      return c.json(success(category));
    } catch (err: any) {
      logger.error('Update category error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async deleteCategory(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0');
      const deleted = await this.service.deleteCategory(id);
      if (!deleted) {
        return c.json(error('分类不存在'), 404);
      }

      return c.json(success(null, '删除成功'));
    } catch (err: any) {
      logger.error('Delete category error:', err);
      return c.json(error(err.message), 400);
    }
  }
}
