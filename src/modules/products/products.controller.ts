import { Context } from 'hono';
import { ProductsService } from './products.service';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../db/schema';
import {
  brandSchema,
  categorySchema,
  productFiltersSchema,
  productSchema,
  updateStockSchema,
} from './products.schema';
import { error, success, successPaginated } from '../../utils/response';
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
      const { search, categoryId, brandId, status, minPrice, maxPrice, page, pageSize } = validQuery;

      const result = await this.service.getProducts({
        page: page ? parseInt(page, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize, 10) : 20,
        filters: {
          search,
          categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
          brandId: brandId ? parseInt(brandId, 10) : undefined,
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
      logger.error('Get products error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async getProduct(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0', 10);
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
      const id = parseInt(c.req.param('id') || '0', 10);
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
      const id = parseInt(c.req.param('id') || '0', 10);
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

  async updateSpecificationStock(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0', 10);
      const data = await c.req.json();
      updateStockSchema.parse(data);

      const product = await this.service.updateSpecificationStock(id, data.stock);
      if (!product) {
        return c.json(error('规格不存在'), 404);
      }

      return c.json(success(product));
    } catch (err: any) {
      logger.error('Update specification stock error:', err);
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
      const id = parseInt(c.req.param('id') || '0', 10);
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
      const id = parseInt(c.req.param('id') || '0', 10);
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

  async getBrands(c: Context) {
    try {
      const brands = await this.service.getBrands();
      return c.json(success(brands));
    } catch (err: any) {
      logger.error('Get brands error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async createBrand(c: Context) {
    try {
      const data = await c.req.json();
      brandSchema.parse(data);
      const brand = await this.service.createBrand(data);
      return c.json(success(brand), 201);
    } catch (err: any) {
      logger.error('Create brand error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async updateBrand(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0', 10);
      const data = await c.req.json();
      brandSchema.partial().parse(data);

      const brand = await this.service.updateBrand(id, data);
      if (!brand) {
        return c.json(error('品牌不存在'), 404);
      }

      return c.json(success(brand));
    } catch (err: any) {
      logger.error('Update brand error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async deleteBrand(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0', 10);
      const deleted = await this.service.deleteBrand(id);
      if (!deleted) {
        return c.json(error('品牌不存在'), 404);
      }

      return c.json(success(null, '删除成功'));
    } catch (err: any) {
      logger.error('Delete brand error:', err);
      return c.json(error(err.message), 400);
    }
  }
}
