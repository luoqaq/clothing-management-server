import { and, count, desc, eq, gte, inArray, like, lte } from 'drizzle-orm';
import * as schema from '../../db/schema';
import type {
  Product,
  ProductBrand,
  ProductCategory,
  ProductFilters,
  ProductSpecification,
} from '../../types';

type ProductPayload = Omit<
  Product,
  | 'id'
  | 'category'
  | 'brand'
  | 'specCount'
  | 'totalStock'
  | 'reservedStock'
  | 'availableStock'
  | 'minPrice'
  | 'maxPrice'
  | 'createdAt'
  | 'updatedAt'
>;

export class ProductsService {
  constructor(private db: any) {}

  private normalizeSpecification(row: any): ProductSpecification {
    const stock = Number(row.stock ?? 0);
    const reservedStock = Number(row.reservedStock ?? 0);

    return {
      id: Number(row.id),
      productId: Number(row.productId),
      skuCode: row.skuCode,
      barcode: row.barcode ?? null,
      color: row.color,
      size: row.size,
      salePrice: Number(row.salePrice ?? 0),
      costPrice: Number(row.costPrice ?? 0),
      stock,
      reservedStock,
      availableStock: Math.max(stock - reservedStock, 0),
      status: row.status,
      createdAt: String(row.createdAt),
      updatedAt: String(row.updatedAt),
    };
  }

  private buildProduct(productRow: any, categories: ProductCategory[], brands: ProductBrand[], specificationRows: any[]): Product {
    const specifications = specificationRows.map((item) => this.normalizeSpecification(item));
    const prices = specifications.map((item) => item.salePrice);
    const totalStock = specifications.reduce((sum, item) => sum + item.stock, 0);
    const reservedStock = specifications.reduce((sum, item) => sum + item.reservedStock, 0);

    return {
      id: Number(productRow.id),
      name: productRow.name,
      description: productRow.description ?? '',
      categoryId: Number(productRow.categoryId),
      brandId: productRow.brandId ? Number(productRow.brandId) : null,
      category: categories.find((item) => item.id === Number(productRow.categoryId)),
      brand: brands.find((item) => item.id === Number(productRow.brandId)) ?? null,
      mainImages: Array.isArray(productRow.mainImages) ? productRow.mainImages : [],
      detailImages: Array.isArray(productRow.detailImages) ? productRow.detailImages : [],
      tags: Array.isArray(productRow.tags) ? productRow.tags : [],
      status: productRow.status,
      specifications,
      specCount: specifications.length,
      totalStock,
      reservedStock,
      availableStock: Math.max(totalStock - reservedStock, 0),
      minPrice: prices.length > 0 ? Math.min(...prices) : 0,
      maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
      createdAt: String(productRow.createdAt),
      updatedAt: String(productRow.updatedAt),
    };
  }

  private async getProductsWithRelations(productRows: any[]): Promise<Product[]> {
    if (productRows.length === 0) {
      return [];
    }

    const productIds = productRows.map((item) => Number(item.id));
    const [categories, brands, specifications] = await Promise.all([
      this.getCategories(),
      this.getBrands(),
      this.db.select().from(schema.productSkus).where(inArray(schema.productSkus.productId, productIds)),
    ]);

    return productRows.map((productRow) =>
      this.buildProduct(
        productRow,
        categories,
        brands,
        specifications.filter((item: any) => Number(item.productId) === Number(productRow.id))
      )
    );
  }

  async getProducts(params?: {
    page?: number;
    pageSize?: number;
    filters?: ProductFilters;
  }): Promise<{ items: Product[]; total: number }> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const { search, categoryId, brandId, status, minPrice, maxPrice } = params?.filters || {};
    const offset = (page - 1) * pageSize;

    const whereConditions: any[] = [];

    if (search) {
      whereConditions.push(like(schema.products.name, `%${search}%`));
    }

    if (categoryId) {
      whereConditions.push(eq(schema.products.categoryId, Number(categoryId)));
    }

    if (brandId) {
      whereConditions.push(eq(schema.products.brandId, Number(brandId)));
    }

    if (status) {
      whereConditions.push(eq(schema.products.status as any, status as any));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const rows = await this.db
      .select()
      .from(schema.products)
      .where(whereClause)
      .orderBy(desc(schema.products.id))
      .limit(pageSize)
      .offset(offset);

    let products = await this.getProductsWithRelations(rows);

    if (typeof minPrice === 'number') {
      products = products.filter((item) => item.maxPrice >= minPrice);
    }

    if (typeof maxPrice === 'number') {
      products = products.filter((item) => item.minPrice <= maxPrice);
    }

    const totalQuery = await this.db
      .select({ count: count() })
      .from(schema.products)
      .where(whereClause);

    return {
      items: products,
      total: Number(totalQuery[0]?.count ?? 0),
    };
  }

  async getProduct(id: number): Promise<Product | null> {
    const rows = await this.db.select().from(schema.products).where(eq(schema.products.id, id)).limit(1);
    const products = await this.getProductsWithRelations(rows);
    return products[0] ?? null;
  }

  async createProduct(data: ProductPayload): Promise<Product> {
    const result = await this.db
      .insert(schema.products)
      .values({
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        brandId: data.brandId ?? null,
        mainImages: data.mainImages ?? [],
        detailImages: data.detailImages ?? [],
        tags: data.tags ?? [],
        status: data.status ?? 'draft',
      })
      .$returningId();

    const insertedId = result[0]?.id;
    if (!insertedId) {
      throw new Error('创建商品失败');
    }

    await this.db.insert(schema.productSkus).values(
      data.specifications.map((item) => ({
        productId: insertedId,
        skuCode: item.skuCode,
        barcode: item.barcode ?? null,
        color: item.color,
        size: item.size,
        salePrice: String(item.salePrice),
        costPrice: String(item.costPrice),
        stock: item.stock,
        reservedStock: item.reservedStock ?? 0,
        status: item.status ?? 'active',
      }))
    );

    const product = await this.getProduct(insertedId);
    if (!product) {
      throw new Error('创建商品失败');
    }

    return product;
  }

  async updateProduct(id: number, data: Partial<ProductPayload>): Promise<Product | null> {
    const existing = await this.getProduct(id);
    if (!existing) {
      return null;
    }

    const productUpdates: Record<string, unknown> = {};
    if (data.name !== undefined) productUpdates.name = data.name;
    if (data.description !== undefined) productUpdates.description = data.description;
    if (data.categoryId !== undefined) productUpdates.categoryId = data.categoryId;
    if (data.brandId !== undefined) productUpdates.brandId = data.brandId;
    if (data.mainImages !== undefined) productUpdates.mainImages = data.mainImages;
    if (data.detailImages !== undefined) productUpdates.detailImages = data.detailImages;
    if (data.tags !== undefined) productUpdates.tags = data.tags;
    if (data.status !== undefined) productUpdates.status = data.status;

    if (Object.keys(productUpdates).length > 0) {
      await this.db.update(schema.products).set(productUpdates).where(eq(schema.products.id, id));
    }

    if (data.specifications) {
      await this.db.delete(schema.productSkus).where(eq(schema.productSkus.productId, id));
      await this.db.insert(schema.productSkus).values(
        data.specifications.map((item) => ({
          productId: id,
          skuCode: item.skuCode,
          barcode: item.barcode ?? null,
          color: item.color,
          size: item.size,
          salePrice: String(item.salePrice),
          costPrice: String(item.costPrice),
          stock: item.stock,
          reservedStock: item.reservedStock ?? 0,
          status: item.status ?? 'active',
        }))
      );
    }

    return this.getProduct(id);
  }

  async deleteProduct(id: number): Promise<boolean> {
    const existing = await this.getProduct(id);
    if (!existing) {
      return false;
    }

    await this.db.delete(schema.productSkus).where(eq(schema.productSkus.productId, id));
    await this.db.delete(schema.products).where(eq(schema.products.id, id));
    return true;
  }

  async updateSpecificationStock(specificationId: number, stock: number): Promise<Product | null> {
    const rows = await this.db
      .select()
      .from(schema.productSkus)
      .where(eq(schema.productSkus.id, specificationId))
      .limit(1);

    const specification = rows[0];
    if (!specification) {
      return null;
    }

    await this.db
      .update(schema.productSkus)
      .set({ stock })
      .where(eq(schema.productSkus.id, specificationId));

    return this.getProduct(Number(specification.productId));
  }

  async reserveSpecificationStock(specificationId: number, quantity: number): Promise<void> {
    const rows = await this.db
      .select()
      .from(schema.productSkus)
      .where(eq(schema.productSkus.id, specificationId))
      .limit(1);

    const specification = rows[0];
    if (!specification) {
      throw new Error('规格不存在');
    }

    const stock = Number(specification.stock ?? 0);
    const reservedStock = Number(specification.reservedStock ?? 0);
    const availableStock = stock - reservedStock;

    if (availableStock < quantity) {
      throw new Error(`规格 ${specification.skuCode} 可售库存不足`);
    }

    await this.db
      .update(schema.productSkus)
      .set({ reservedStock: reservedStock + quantity })
      .where(eq(schema.productSkus.id, specificationId));
  }

  async releaseSpecificationStock(specificationId: number, quantity: number): Promise<void> {
    const rows = await this.db
      .select()
      .from(schema.productSkus)
      .where(eq(schema.productSkus.id, specificationId))
      .limit(1);

    const specification = rows[0];
    if (!specification) {
      throw new Error('规格不存在');
    }

    const reservedStock = Number(specification.reservedStock ?? 0);

    await this.db
      .update(schema.productSkus)
      .set({ reservedStock: Math.max(reservedStock - quantity, 0) })
      .where(eq(schema.productSkus.id, specificationId));
  }

  async finalizeShippedStock(specificationId: number, quantity: number): Promise<void> {
    const rows = await this.db
      .select()
      .from(schema.productSkus)
      .where(eq(schema.productSkus.id, specificationId))
      .limit(1);

    const specification = rows[0];
    if (!specification) {
      throw new Error('规格不存在');
    }

    const stock = Number(specification.stock ?? 0);
    const reservedStock = Number(specification.reservedStock ?? 0);

    await this.db
      .update(schema.productSkus)
      .set({
        stock: Math.max(stock - quantity, 0),
        reservedStock: Math.max(reservedStock - quantity, 0),
      })
      .where(eq(schema.productSkus.id, specificationId));
  }

  async restoreSpecificationStock(specificationId: number, quantity: number): Promise<void> {
    const rows = await this.db
      .select()
      .from(schema.productSkus)
      .where(eq(schema.productSkus.id, specificationId))
      .limit(1);

    const specification = rows[0];
    if (!specification) {
      throw new Error('规格不存在');
    }

    const stock = Number(specification.stock ?? 0);
    const reservedStock = Number(specification.reservedStock ?? 0);

    await this.db
      .update(schema.productSkus)
      .set({
        stock: stock + quantity,
        reservedStock: Math.max(reservedStock - quantity, 0),
      })
      .where(eq(schema.productSkus.id, specificationId));
  }

  async getCategories(): Promise<ProductCategory[]> {
    const rows = await this.db.select().from(schema.productCategories).orderBy(schema.productCategories.name);
    return rows as ProductCategory[];
  }

  async createCategory(data: Omit<ProductCategory, 'id'>): Promise<ProductCategory> {
    const result = await this.db.insert(schema.productCategories).values(data).$returningId();
    const insertedId = result[0]?.id;
    const rows = await this.db
      .select()
      .from(schema.productCategories)
      .where(eq(schema.productCategories.id, insertedId))
      .limit(1);
    return rows[0] as ProductCategory;
  }

  async updateCategory(id: number, data: Partial<Omit<ProductCategory, 'id'>>): Promise<ProductCategory | null> {
    await this.db.update(schema.productCategories).set(data).where(eq(schema.productCategories.id, id));
    const rows = await this.db
      .select()
      .from(schema.productCategories)
      .where(eq(schema.productCategories.id, id))
      .limit(1);
    return (rows[0] as ProductCategory | undefined) ?? null;
  }

  async deleteCategory(id: number): Promise<boolean> {
    const rows = await this.db
      .select()
      .from(schema.productCategories)
      .where(eq(schema.productCategories.id, id))
      .limit(1);

    if (rows.length === 0) {
      return false;
    }

    await this.db.delete(schema.productCategories).where(eq(schema.productCategories.id, id));
    return true;
  }

  async getBrands(): Promise<ProductBrand[]> {
    const rows = await this.db.select().from(schema.productBrands).orderBy(schema.productBrands.name);
    return rows as ProductBrand[];
  }

  async createBrand(data: Omit<ProductBrand, 'id'>): Promise<ProductBrand> {
    const result = await this.db.insert(schema.productBrands).values(data).$returningId();
    const insertedId = result[0]?.id;
    const rows = await this.db
      .select()
      .from(schema.productBrands)
      .where(eq(schema.productBrands.id, insertedId))
      .limit(1);
    return rows[0] as ProductBrand;
  }

  async updateBrand(id: number, data: Partial<Omit<ProductBrand, 'id'>>): Promise<ProductBrand | null> {
    await this.db.update(schema.productBrands).set(data).where(eq(schema.productBrands.id, id));
    const rows = await this.db
      .select()
      .from(schema.productBrands)
      .where(eq(schema.productBrands.id, id))
      .limit(1);
    return (rows[0] as ProductBrand | undefined) ?? null;
  }

  async deleteBrand(id: number): Promise<boolean> {
    const rows = await this.db
      .select()
      .from(schema.productBrands)
      .where(eq(schema.productBrands.id, id))
      .limit(1);

    if (rows.length === 0) {
      return false;
    }

    await this.db.delete(schema.productBrands).where(eq(schema.productBrands.id, id));
    return true;
  }
}
