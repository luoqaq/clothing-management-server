import { eq, like, and, gte, lte, count } from 'drizzle-orm';
import * as schema from '../../db/schema';
import type { Product, ProductCategory, ProductFilters } from '../../types';

export class ProductsService {
  constructor(private db: any) {}

  async getProducts(params?: {
    page?: number;
    pageSize?: number;
    filters?: ProductFilters;
  }): Promise<{ items: Product[]; total: number }> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const { search, categoryId, status, minPrice, maxPrice } = params?.filters || {};

    const offset = (page - 1) * pageSize;

    const whereConditions: any[] = [];

    if (search) {
      whereConditions.push(like(schema.products.name, `%${search}%`));
    }

    if (categoryId) {
      whereConditions.push(eq(schema.products.categoryId, Number(categoryId)));
    }

    if (status) {
      whereConditions.push(eq(schema.products.status as any, status as any));
    }

    if (minPrice) {
      whereConditions.push(gte(schema.products.price, String(minPrice)));
    }

    if (maxPrice) {
      whereConditions.push(lte(schema.products.price, String(maxPrice)));
    }
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const products = await this.db
      .select()
      .from(schema.products)
      .where(whereClause)
      .orderBy(schema.products.createdAt)
      .limit(pageSize)
      .offset(offset);

    const totalQuery = await this.db
      .select({ count: count() })
      .from(schema.products)
      .where(whereClause);

    const total = totalQuery[0]?.count ?? 0;

    return {
      items: products as unknown as Product[],
      total: Number(total),
    };
  }

  async getProduct(id: number): Promise<Product | null> {
    const products = await this.db
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, id))
      .limit(1);

    return products[0] as unknown as Product | null;
  }

  async createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const result = await this.db
      .insert(schema.products)
      .values(data)
      .returning();

    return result[0] as unknown as Product;
  }

  async updateProduct(id: number, data: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Product | null> {
    const result = await this.db
      .update(schema.products)
      .set(data)
      .where(eq(schema.products.id, id))
      .returning();

    return result[0] as unknown as Product | null;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await this.db
      .delete(schema.products)
      .where(eq(schema.products.id, id))
      .returning();

    return result.length > 0;
  }

  async updateStock(id: number, stock: number): Promise<Product | null> {
    const result = await this.db
      .update(schema.products)
      .set({ stock })
      .where(eq(schema.products.id, id))
      .returning();

    return result[0] as unknown as Product | null;
  }

  async getCategories(): Promise<ProductCategory[]> {
    const categories = await this.db
      .select()
      .from(schema.productCategories)
      .orderBy(schema.productCategories.name);

    return categories as unknown as ProductCategory[];
  }

  async createCategory(data: Omit<ProductCategory, 'id'>): Promise<ProductCategory> {
    const result = await this.db
      .insert(schema.productCategories)
      .values(data)
      .returning();

    return result[0] as unknown as ProductCategory;
  }

  async updateCategory(id: number, data: Partial<Omit<ProductCategory, 'id'>>): Promise<ProductCategory | null> {
    const result = await this.db
      .update(schema.productCategories)
      .set(data)
      .where(eq(schema.productCategories.id, id))
      .returning();

    return result[0] as unknown as ProductCategory | null;
  }

  async deleteCategory(id: number): Promise<boolean> {
    const result = await this.db
      .delete(schema.productCategories)
      .where(eq(schema.productCategories.id, id))
      .returning();

    return result.length > 0;
  }
}
