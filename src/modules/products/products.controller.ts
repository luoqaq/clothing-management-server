import { Context } from 'hono';
import { ProductsService } from './products.service';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../db/schema';
import {
  categorySchema,
  productFiltersSchema,
  productSchema,
  supplierSchema,
  updateStockSchema,
} from './products.schema';
import { bulkCreateProductsSchema, parseExcelImportSchema } from './product-import.schema';
import { error, success, successPaginated } from '../../utils/response';
import { logger } from '../../utils/logger';
import { ProductImportService } from './product-import.service';

export class ProductsController {
  private service: ProductsService;
  private importService: ProductImportService;

  constructor(db: MySql2Database<typeof schema>) {
    this.service = new ProductsService(db);
    this.importService = new ProductImportService(db);
  }

  async getProducts(c: Context) {
    try {
      const query = c.req.query();
      const validQuery = productFiltersSchema.parse(query);
      const { search, categoryId, supplierId, status, minPrice, maxPrice, page, pageSize } = validQuery;

      const result = await this.service.getProducts({
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
      logger.error('Get products error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async getProduct(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0', 10);
      const product = await this.service.getProduct(id, c.get('user')?.role);

      if (!product) {
        return c.json(error('商品不存在'), 404);
      }

      return c.json(success(product));
    } catch (err: any) {
      logger.error('Get product error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async getProductLabels(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0', 10);
      const labels = await this.service.getProductLabels(id);

      if (!labels) {
        return c.json(error('商品不存在'), 404);
      }

      return c.json(success(labels));
    } catch (err: any) {
      logger.error('Get product labels error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async createProduct(c: Context) {
    try {
      const data = await c.req.json();
      const payload = productSchema.parse(data);

      const product = await this.service.createProduct(payload as any);
      return c.json(success(product), 201);
    } catch (err: any) {
      logger.error('Create product error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async parseExcelImport(c: Context) {
    try {
      const data = await c.req.json();
      const payload = parseExcelImportSchema.parse(data);
      const result = await this.importService.parseExcelImport(payload);
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Parse excel import error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async parseImageImport(c: Context) {
    try {
      const body = await c.req.parseBody();
      const file = body.file;

      if (!(file instanceof File)) {
        return c.json(error('请上传图片文件'), 400);
      }

      const result = await this.importService.parseImageImport(file);
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Parse image import error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async bulkCreateProducts(c: Context) {
    try {
      const data = await c.req.json();
      const payload = bulkCreateProductsSchema.parse(data);
      const result = await this.importService.bulkCreateProducts(payload.products, payload.createMissingSuppliers);
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Bulk create products error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async updateProduct(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0', 10);
      const data = await c.req.json();
      const payload = productSchema.partial().parse(data);

      const product = await this.service.updateProduct(id, payload as any);
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

  async getSuppliers(c: Context) {
    try {
      const suppliers = await this.service.getSuppliers();
      return c.json(success(suppliers));
    } catch (err: any) {
      logger.error('Get suppliers error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async createSupplier(c: Context) {
    try {
      const data = await c.req.json();
      supplierSchema.parse(data);
      const supplier = await this.service.createSupplier(data);
      return c.json(success(supplier), 201);
    } catch (err: any) {
      logger.error('Create supplier error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async updateSupplier(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0', 10);
      const data = await c.req.json();
      supplierSchema.partial().parse(data);

      const supplier = await this.service.updateSupplier(id, data);
      if (!supplier) {
        return c.json(error('供应商不存在'), 404);
      }

      return c.json(success(supplier));
    } catch (err: any) {
      logger.error('Update supplier error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async deleteSupplier(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0', 10);
      const deleted = await this.service.deleteSupplier(id);
      if (!deleted) {
        return c.json(error('供应商不存在'), 404);
      }

      return c.json(success(null, '删除成功'));
    } catch (err: any) {
      logger.error('Delete supplier error:', err);
      return c.json(error(err.message), 400);
    }
  }
}
