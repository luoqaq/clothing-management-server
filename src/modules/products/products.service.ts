import { and, count, desc, eq, inArray, like, ne, or } from 'drizzle-orm';
import * as schema from '../../db/schema';
import type {
  Product,
  ProductCategory,
  ProductFilters,
  ProductLabelItem,
  ProductSpecification,
  ScannedSkuProduct,
  Supplier,
} from '../../types';
import { isAdminRole } from '../../utils/role';
import { formatDateTime } from '../../utils/date';

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

  static buildBarcodeValue(skuId: number): string {
    return `SKU${String(skuId).padStart(10, '0')}`;
  }

  private buildPendingBarcode(productId: number, index: number): string {
    return `TMP-${productId}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
  }

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

  private buildSkuCode(productId: number, productCode: string, size: string, color: string): string {
    const parts = [productCode, size, color].map((item) => String(item ?? '').trim()).filter(Boolean);
    return [...parts, `P${productId}`].join('-');
  }

  private normalizeProductCode(code: unknown): string {
    return String(code ?? '').trim();
  }

  private async ensureProductCodeAvailable(code: unknown, excludeId?: number): Promise<string> {
    const normalizedCode = this.normalizeProductCode(code);

    if (!normalizedCode) {
      throw new Error('款号不能为空');
    }

    const exists = await this.checkProductCodeExists(normalizedCode, excludeId);
    if (exists) {
      throw new Error(`款号 ${normalizedCode} 已存在`);
    }

    return normalizedCode;
  }

  private normalizeSpecification(row: any): ProductSpecification {
    const stock = Number(row.stock ?? 0);
    const reservedStock = Number(row.reservedStock ?? 0);
    const cumulativeInboundQuantity = Number(row.cumulativeInboundQuantity ?? row.stock ?? 0);
    const cumulativeCostAmount = Number(row.cumulativeCostAmount ?? 0);

    return {
      id: Number(row.id),
      productId: Number(row.productId),
      skuCode: row.skuCode,
      barcode: row.barcode || ProductsService.buildBarcodeValue(Number(row.id)),
      color: row.color,
      size: row.size,
      salePrice: Number(row.salePrice ?? 0),
      costPrice: Number(row.costPrice ?? 0),
      stock,
      reservedStock,
      availableStock: Math.max(stock - reservedStock, 0),
      cumulativeInboundQuantity,
      cumulativeCostAmount,
      status: row.status,
      createdAt: formatDateTime(row.createdAt) ?? '',
      updatedAt: formatDateTime(row.updatedAt) ?? '',
    };
  }

  private async assignGeneratedBarcodesByProductId(productId: number): Promise<void> {
    const specificationRows = await this.db
      .select()
      .from(schema.productSkus)
      .where(eq(schema.productSkus.productId, productId));

    for (const specification of specificationRows) {
      const currentBarcode = String(specification.barcode ?? '').trim();
      if (currentBarcode && !currentBarcode.startsWith('TMP-')) {
        continue;
      }

      await this.db
        .update(schema.productSkus)
        .set({ barcode: ProductsService.buildBarcodeValue(Number(specification.id)) })
        .where(eq(schema.productSkus.id, Number(specification.id)));
    }
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
            createdAt: formatDateTime(productRow.createdAt) ?? '',
      updatedAt: formatDateTime(productRow.updatedAt) ?? '',
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
      const likeName = like(schema.products.name, `%${search}%`);
      const likeCode = like(schema.products.productCode, `%${search}%`);
      const supplierRows = await this.db
        .select({ id: schema.suppliers.id })
        .from(schema.suppliers)
        .where(like(schema.suppliers.name, `%${search}%`));
      if (supplierRows.length > 0) {
        whereConditions.push(
          or(
            likeName,
            likeCode,
            inArray(schema.products.supplierId, supplierRows.map((s) => s.id))
          )
        );
      } else {
        whereConditions.push(or(likeName, likeCode));
      }
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

  async checkProductCodeExists(code: string, excludeId?: number): Promise<boolean> {
    const normalizedCode = this.normalizeProductCode(code);
    if (!normalizedCode) {
      throw new Error('款号不能为空');
    }

    const whereClause = excludeId
      ? and(
          eq(schema.products.productCode, normalizedCode),
          ne(schema.products.id, excludeId)
        )
      : eq(schema.products.productCode, normalizedCode);

    const rows = await this.db
      .select({ count: count() })
      .from(schema.products)
      .where(whereClause);

    return Number(rows[0]?.count ?? 0) > 0;
  }

  async createProduct(data: ProductPayload): Promise<Product> {
    const normalizedProductCode = await this.ensureProductCodeAvailable(data.productCode);

    const result = await this.db
      .insert(schema.products)
      .values({
        productCode: normalizedProductCode,
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
      data.specifications.map((item, index) => ({
        productId: insertedId,
        skuCode: this.buildSkuCode(insertedId, normalizedProductCode, item.size, item.color),
        barcode: this.buildPendingBarcode(insertedId, index),
        color: item.color,
        size: item.size,
        salePrice: String(item.salePrice),
        costPrice: String(item.costPrice),
        stock: item.stock,
        reservedStock: item.reservedStock ?? 0,
        cumulativeInboundQuantity: item.stock,
        cumulativeCostAmount: String(item.stock * item.costPrice),
        status: item.status ?? 'active',
      }))
    );

    await this.assignGeneratedBarcodesByProductId(insertedId);

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

    const nextProductCode =
      data.productCode !== undefined
        ? await this.ensureProductCodeAvailable(data.productCode, id)
        : existing.productCode;

    const productUpdates: Record<string, unknown> = {};
    if (data.productCode !== undefined) productUpdates.productCode = nextProductCode;
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

    const specificationsToPersist = data.specifications ?? existing.specifications;
    const existingBarcodeMap = new Map(
      existing.specifications.map((item) => [Number(item.id), item.barcode])
    );
    const existingSpecificationMap = new Map(
      existing.specifications.map((item) => [
        Number(item.id),
        {
          color: item.color,
          size: item.size,
          reservedStock: item.reservedStock,
          cumulativeInboundQuantity: item.cumulativeInboundQuantity,
          cumulativeCostAmount: item.cumulativeCostAmount,
        },
      ])
    );

    if (data.specifications || data.productCode !== undefined) {
      await this.db.delete(schema.productSkus).where(eq(schema.productSkus.productId, id));
      await this.db.insert(schema.productSkus).values(
        specificationsToPersist.map((item, index) => ({
          productId: id,
          skuCode: this.buildSkuCode(id, nextProductCode, item.size, item.color),
          barcode:
            item.id && existingBarcodeMap.get(Number(item.id))
              ? existingBarcodeMap.get(Number(item.id))!
              : this.buildPendingBarcode(id, index),
          color: item.color,
          size: item.size,
          salePrice: String(item.salePrice),
          costPrice: String(item.costPrice),
          stock: item.stock,
          reservedStock:
            item.id &&
            existingSpecificationMap.get(Number(item.id))?.color === item.color &&
            existingSpecificationMap.get(Number(item.id))?.size === item.size
              ? Number(existingSpecificationMap.get(Number(item.id))?.reservedStock ?? 0)
              : 0,
          cumulativeInboundQuantity:
            item.id && existingSpecificationMap.get(Number(item.id))?.cumulativeInboundQuantity !== undefined
              ? existingSpecificationMap.get(Number(item.id))?.cumulativeInboundQuantity
              : item.cumulativeInboundQuantity ?? item.stock,
          cumulativeCostAmount:
            item.id && existingSpecificationMap.get(Number(item.id))?.cumulativeCostAmount !== undefined
              ? String(existingSpecificationMap.get(Number(item.id))?.cumulativeCostAmount)
              : String(item.cumulativeCostAmount ?? item.stock * item.costPrice),
          status: item.status ?? 'active',
        }))
      );
      await this.assignGeneratedBarcodesByProductId(id);
    }

    return this.getProduct(id);
  }

  async getProductLabels(productId: number): Promise<ProductLabelItem[] | null> {
    const product = await this.getProduct(productId, 'admin');
    if (!product) {
      return null;
    }

    return product.specifications.map((specification) => ({
      skuId: specification.id,
      productId: product.id,
      productCode: product.productCode,
      productName: product.name,
      barcode: specification.barcode,
      skuCode: specification.skuCode,
      color: specification.color,
      size: specification.size,
      salePrice: specification.salePrice,
      image: product.mainImages[0] ?? null,
    }));
  }

  async getScannedSkuByCode(code: string): Promise<ScannedSkuProduct | null> {
    const normalizedCode = String(code ?? '').trim();
    if (!normalizedCode) {
      throw new Error('标签码不能为空');
    }

    const skuRows = await this.db
      .select()
      .from(schema.productSkus)
      .where(eq(schema.productSkus.barcode, normalizedCode));
    const sku = this.firstRow(skuRows);

    if (!sku) {
      return null;
    }

    const productRows = await this.db
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, Number(sku.productId)));
    const product = this.firstRow(productRows);

    if (!product) {
      return null;
    }

    const stock = Number(sku.stock ?? 0);
    const reservedStock = Number(sku.reservedStock ?? 0);
    const availableStock = Math.max(stock - reservedStock, 0);

    return {
      skuId: Number(sku.id),
      productId: Number(product.id),
      productCode: product.productCode,
      productName: product.name,
      barcode: sku.barcode || ProductsService.buildBarcodeValue(Number(sku.id)),
      skuCode: sku.skuCode,
      color: sku.color,
      size: sku.size,
      salePrice: Number(sku.salePrice ?? 0),
      stock,
      reservedStock,
      availableStock,
      status: sku.status,
      productStatus: product.status,
      image: Array.isArray(product.mainImages) ? product.mainImages[0] ?? null : null,
    };
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

    const currentStock = Number(specification.stock ?? 0);
    const increaseAmount = Math.max(stock - currentStock, 0);
    const currentCumulativeInboundQuantity = Number(specification.cumulativeInboundQuantity ?? currentStock);
    const currentCumulativeCostAmount = Number(specification.cumulativeCostAmount ?? 0);
    const costPrice = Number(specification.costPrice ?? 0);

    await this.db
      .update(schema.productSkus)
      .set({
        stock,
        cumulativeInboundQuantity: currentCumulativeInboundQuantity + increaseAmount,
        cumulativeCostAmount: String(currentCumulativeCostAmount + increaseAmount * costPrice),
      })
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
