import { and, count, desc, eq, inArray, like, or } from 'drizzle-orm';
import * as schema from '../../db/schema';
import type {
  Product,
  ProductCategory,
  ProductFilters,
  ProductSpecification,
  Supplier,
} from '../../types';
import { isAdminRole } from '../../utils/role';

type ProductPayload = Omit<
  Product,
  | 'id'
  | 'category'
  | 'supplier'
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

  private firstRow<T>(rows: T[]): T | null {
    return rows[0] ?? null;
  }

  private normalizeJsonStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map((item) => String(item));
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
      } catch {
        return [];
      }
    }

    return [];
  }

  private buildSkuCode(productCode: string, size: string, color: string): string {
    return [productCode, size, color].map((item) => String(item ?? '').trim()).join('-');
  }

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

  private sanitizeSpecification(specification: ProductSpecification, role?: string): ProductSpecification {
    if (isAdminRole(role)) {
      return specification;
    }

    return {
      ...specification,
      costPrice: undefined as unknown as number,
    };
  }

  private sanitizeProduct(product: Product, role?: string): Product {
    if (isAdminRole(role)) {
      return product;
    }

    return {
      ...product,
      supplierId: null,
      supplier: null,
      specifications: product.specifications.map((item) => this.sanitizeSpecification(item, role)),
    };
  }

  private buildProduct(
    productRow: any,
    categories: ProductCategory[],
    suppliers: Supplier[],
    specificationRows: any[]
  ): Product {
    const specifications = specificationRows.map((item) => this.normalizeSpecification(item));
    const prices = specifications.map((item) => item.salePrice);
    const totalStock = specifications.reduce((sum, item) => sum + item.stock, 0);
    const reservedStock = specifications.reduce((sum, item) => sum + item.reservedStock, 0);

    return {
      id: Number(productRow.id),
      productCode: productRow.productCode,
      name: productRow.name,
      description: productRow.description ?? '',
      categoryId: Number(productRow.categoryId),
      supplierId: productRow.supplierId ? Number(productRow.supplierId) : null,
      category: categories.find((item) => item.id === Number(productRow.categoryId)),
      supplier: suppliers.find((item) => item.id === Number(productRow.supplierId)) ?? null,
      mainImages: this.normalizeJsonStringArray(productRow.mainImages),
      detailImages: this.normalizeJsonStringArray(productRow.detailImages),
      tags: this.normalizeJsonStringArray(productRow.tags),
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

  private async getProductsWithRelations(productRows: any[], role?: string): Promise<Product[]> {
    if (productRows.length === 0) {
      return [];
    }

    const productIds = productRows.map((item) => Number(item.id));
    const [categories, suppliers, specifications] = await Promise.all([
      this.getCategories(),
      this.getSuppliers(),
      this.db.select().from(schema.productSkus).where(inArray(schema.productSkus.productId, productIds)),
    ]);

    return productRows.map((productRow) =>
      this.sanitizeProduct(this.buildProduct(
        productRow,
        categories,
        suppliers,
        specifications.filter((item: any) => Number(item.productId) === Number(productRow.id))
      ), role)
    );
  }

  async getProducts(params?: {
    page?: number;
    pageSize?: number;
    filters?: ProductFilters;
    role?: string;
  }): Promise<{ items: Product[]; total: number }> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const { search, categoryId, supplierId, status, minPrice, maxPrice } = params?.filters || {};
    const role = params?.role;
    const offset = (page - 1) * pageSize;

    const whereConditions: any[] = [];

    if (search) {
      whereConditions.push(
        or(like(schema.products.name, `%${search}%`), like(schema.products.productCode, `%${search}%`))
      );
    }

    if (categoryId) {
      whereConditions.push(eq(schema.products.categoryId, Number(categoryId)));
    }

    if (supplierId && isAdminRole(role)) {
      whereConditions.push(eq(schema.products.supplierId, Number(supplierId)));
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

    let products = await this.getProductsWithRelations(rows, role);

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

  async getProduct(id: number, role?: string): Promise<Product | null> {
    const rows = await this.db.select().from(schema.products).where(eq(schema.products.id, id));
    const products = await this.getProductsWithRelations(rows, role);
    return products[0] ?? null;
  }

  async createProduct(data: ProductPayload): Promise<Product> {
    const result = await this.db
      .insert(schema.products)
      .values({
        productCode: data.productCode,
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        supplierId: data.supplierId ?? null,
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
        skuCode: this.buildSkuCode(data.productCode, item.size, item.color),
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

  async updateProductImages(
    id: number,
    images: {
      mainImages?: string[];
      detailImages?: string[];
    }
  ): Promise<Product | null> {
    if (images.mainImages === undefined && images.detailImages === undefined) {
      throw new Error('至少需要更新一组图片');
    }

    return this.updateProduct(id, {
      mainImages: images.mainImages,
      detailImages: images.detailImages,
    });
  }

  async updateProduct(id: number, data: Partial<ProductPayload>): Promise<Product | null> {
    const existing = await this.getProduct(id);
    if (!existing) {
      return null;
    }

    const productUpdates: Record<string, unknown> = {};
    if (data.productCode !== undefined) productUpdates.productCode = data.productCode;
    if (data.name !== undefined) productUpdates.name = data.name;
    if (data.description !== undefined) productUpdates.description = data.description;
    if (data.categoryId !== undefined) productUpdates.categoryId = data.categoryId;
    if (data.supplierId !== undefined) productUpdates.supplierId = data.supplierId;
    if (data.mainImages !== undefined) productUpdates.mainImages = data.mainImages;
    if (data.detailImages !== undefined) productUpdates.detailImages = data.detailImages;
    if (data.tags !== undefined) productUpdates.tags = data.tags;
    if (data.status !== undefined) productUpdates.status = data.status;

    if (Object.keys(productUpdates).length > 0) {
      await this.db.update(schema.products).set(productUpdates).where(eq(schema.products.id, id));
    }

    const nextProductCode = data.productCode ?? existing.productCode;
    const specificationsToPersist = data.specifications ?? existing.specifications;

    if (data.specifications || data.productCode !== undefined) {
      await this.db.delete(schema.productSkus).where(eq(schema.productSkus.productId, id));
      await this.db.insert(schema.productSkus).values(
        specificationsToPersist.map((item) => ({
          productId: id,
          skuCode: this.buildSkuCode(nextProductCode, item.size, item.color),
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
    const rows = await this.db.select().from(schema.productSkus).where(eq(schema.productSkus.id, specificationId));
    const specification = this.firstRow(rows);
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
    const rows = await this.db.select().from(schema.productSkus).where(eq(schema.productSkus.id, specificationId));
    const specification = this.firstRow(rows);
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
    const rows = await this.db.select().from(schema.productSkus).where(eq(schema.productSkus.id, specificationId));
    const specification = this.firstRow(rows);
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
    const rows = await this.db.select().from(schema.productSkus).where(eq(schema.productSkus.id, specificationId));
    const specification = this.firstRow(rows);
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
    const rows = await this.db.select().from(schema.productSkus).where(eq(schema.productSkus.id, specificationId));
    const specification = this.firstRow(rows);
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
    const rows = await this.db.select().from(schema.productCategories).where(eq(schema.productCategories.id, insertedId));
    return this.firstRow(rows) as ProductCategory;
  }

  async updateCategory(id: number, data: Partial<Omit<ProductCategory, 'id'>>): Promise<ProductCategory | null> {
    await this.db.update(schema.productCategories).set(data).where(eq(schema.productCategories.id, id));
    const rows = await this.db.select().from(schema.productCategories).where(eq(schema.productCategories.id, id));
    return (this.firstRow(rows) as ProductCategory | undefined) ?? null;
  }

  async deleteCategory(id: number): Promise<boolean> {
    const rows = await this.db.select().from(schema.productCategories).where(eq(schema.productCategories.id, id));

    if (rows.length === 0) {
      return false;
    }

    await this.db.delete(schema.productCategories).where(eq(schema.productCategories.id, id));
    return true;
  }

  async getSuppliers(): Promise<Supplier[]> {
    const rows = await this.db.select().from(schema.suppliers).orderBy(schema.suppliers.name);
    return rows as Supplier[];
  }

  async createSupplier(data: Omit<Supplier, 'id'>): Promise<Supplier> {
    const result = await this.db.insert(schema.suppliers).values(data).$returningId();
    const insertedId = result[0]?.id;
    const rows = await this.db.select().from(schema.suppliers).where(eq(schema.suppliers.id, insertedId));
    return this.firstRow(rows) as Supplier;
  }

  async updateSupplier(id: number, data: Partial<Omit<Supplier, 'id'>>): Promise<Supplier | null> {
    await this.db.update(schema.suppliers).set(data).where(eq(schema.suppliers.id, id));
    const rows = await this.db.select().from(schema.suppliers).where(eq(schema.suppliers.id, id));
    return (this.firstRow(rows) as Supplier | undefined) ?? null;
  }

  async deleteSupplier(id: number): Promise<boolean> {
    const rows = await this.db.select().from(schema.suppliers).where(eq(schema.suppliers.id, id));

    if (rows.length === 0) {
      return false;
    }

    await this.db.delete(schema.suppliers).where(eq(schema.suppliers.id, id));
    return true;
  }
}
