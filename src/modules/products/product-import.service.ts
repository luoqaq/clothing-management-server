import OpenAI from 'openai';
import * as XLSX from 'xlsx';
import * as schema from '../../db/schema';
import type {
  BulkCreateProductsResponse,
  ExcelImportPayload,
  ImportDraftProduct,
  ImportDraftSpecification,
  ImportIssue,
  ImportParseResult,
  Product,
  ProductStatus,
  Supplier,
} from '../../types';
import { ProductsService } from './products.service';
import { logger } from '../../utils/logger';

type ExcelRow = Record<string, string | number | boolean | null>;

interface ImageAiProduct {
  productCode?: string;
  name?: string;
  categoryName?: string;
  supplierName?: string;
  description?: string;
  tags?: string[] | string;
  status?: ProductStatus;
  specifications?: Array<{
    barcode?: string | null;
    color?: string;
    size?: string;
    salePrice?: number | string;
    costPrice?: number | string;
    stock?: number | string;
    status?: 'active' | 'inactive';
  }>;
}

const EXCEL_MIME_TYPES = new Set([
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
]);

export class ProductImportService {
  private productsService: ProductsService;
  private openaiClient: OpenAI | null = null;

  constructor(private db: any) {
    this.productsService = new ProductsService(db);
  }

  private normalizeText(value: unknown): string {
    return String(value ?? '').trim();
  }

  private normalizeLookup(value: unknown): string {
    return this.normalizeText(value).replace(/\s+/g, '').toLowerCase();
  }

  private parseNumber(value: unknown): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    const cleaned = this.normalizeText(value).replace(/[,\s￥¥]/g, '');
    if (!cleaned) {
      return 0;
    }

    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private parseInteger(value: unknown): number {
    return Math.max(0, Math.round(this.parseNumber(value)));
  }

  private splitTags(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeText(item)).filter(Boolean);
    }

    return this.normalizeText(value)
      .split(/[，,、/]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private ensureArray<T>(value: T | T[] | null | undefined): T[] {
    if (Array.isArray(value)) {
      return value;
    }

    if (value == null) {
      return [];
    }

    return [value];
  }

  private isExcelFile(file: File): boolean {
    const normalizedName = this.normalizeText(file.name).toLowerCase();
    const hasValidExtension = normalizedName.endsWith('.xlsx') || normalizedName.endsWith('.xls');
    const normalizedType = this.normalizeText(file.type).toLowerCase();
    const hasValidMimeType = !normalizedType || EXCEL_MIME_TYPES.has(normalizedType);
    return hasValidExtension && hasValidMimeType;
  }

  private buildExcelImportPayloadFromRows(
    fileName: string,
    rows: Array<Array<string | number | boolean | null>>
  ): ExcelImportPayload {
    const [headerRow, ...dataRows] = rows;
    const headers = (headerRow ?? []).map((item) => String(item ?? '').trim()).filter(Boolean);

    if (!headers.length) {
      throw new Error('Excel 表头不能为空');
    }

    const normalizedRows = dataRows
      .filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''))
      .map((row) =>
        headers.reduce<Record<string, string | number | boolean | null>>((acc, header, index) => {
          acc[header] = row[index] ?? '';
          return acc;
        }, {})
      );

    if (!normalizedRows.length) {
      throw new Error('Excel 没有可导入的数据行');
    }

    return {
      fileName,
      headers,
      rows: normalizedRows,
    };
  }

  private async buildExcelImportPayloadFromFile(file: File): Promise<ExcelImportPayload> {
    if (!this.isExcelFile(file)) {
      throw new Error('仅支持上传 .xlsx 或 .xls 文件');
    }

    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new Error('Excel 中没有可读取的工作表');
    }

    const rows = XLSX.utils.sheet_to_json<Array<string | number | boolean | null>>(workbook.Sheets[sheetName], {
      header: 1,
      raw: true,
      defval: '',
    });

    return this.buildExcelImportPayloadFromRows(file.name, rows);
  }

  private findCategoryId(categoryName: string, categories: Array<{ id: number; name: string }>): number | null {
    if (!categoryName) {
      return null;
    }

    const normalized = this.normalizeLookup(categoryName);
    const matched = categories.find((item) => this.normalizeLookup(item.name) === normalized);
    return matched ? Number(matched.id) : null;
  }

  private findSupplier(supplierName: string, suppliers: Supplier[]): Supplier | null {
    if (!supplierName) {
      return null;
    }

    const normalized = this.normalizeLookup(supplierName);
    return suppliers.find((item) => this.normalizeLookup(item.name) === normalized) ?? null;
  }

  private createDraftSpecification(
    productRowKey: string,
    index: number,
    data: Partial<ImportDraftSpecification>
  ): ImportDraftSpecification {
    const normalizedSize = this.normalizeText(data.size) || 'F';

    return {
      rowKey: `${productRowKey}-spec-${index + 1}`,
      barcode: this.normalizeText(data.barcode) || null,
      color: this.normalizeText(data.color),
      size: normalizedSize,
      salePrice: this.parseNumber(data.salePrice),
      costPrice: this.parseNumber(data.costPrice),
      stock: this.parseInteger(data.stock),
      status: data.status === 'inactive' ? 'inactive' : 'active',
    };
  }

  private normalizeDraftProduct(
    draft: ImportDraftProduct,
    categories: Array<{ id: number; name: string }>,
    suppliers: Supplier[]
  ): ImportDraftProduct {
    const categoryName = this.normalizeText(draft.categoryName);
    const supplierName = this.normalizeText(draft.supplierName);
    const matchedSupplier = draft.supplierId ? suppliers.find((item) => Number(item.id) === Number(draft.supplierId)) ?? null : this.findSupplier(supplierName, suppliers);

    return {
      rowKey: draft.rowKey,
      source: draft.source,
      productCode: this.normalizeText(draft.productCode),
      name: this.normalizeText(draft.name),
      description: this.normalizeText(draft.description) || '',
      categoryId: draft.categoryId ?? this.findCategoryId(categoryName, categories),
      categoryName: categoryName || null,
      supplierId: draft.supplierId ?? matchedSupplier?.id ?? null,
      supplierName: supplierName || matchedSupplier?.name || null,
      tags: this.splitTags(draft.tags),
      status: draft.status ?? 'active',
      specifications: (draft.specifications ?? []).map((spec, index) =>
        this.createDraftSpecification(draft.rowKey, index, spec)
      ),
    };
  }

  private validateDrafts(drafts: ImportDraftProduct[]): ImportIssue[] {
    const issues: ImportIssue[] = [];

    for (const draft of drafts) {
      if (!draft.productCode) {
        issues.push({ level: 'error', rowKey: draft.rowKey, field: 'productCode', message: '款号不能为空' });
      }

      if (!draft.name) {
        issues.push({ level: 'error', rowKey: draft.rowKey, field: 'name', message: '商品名称不能为空' });
      }

      if (!draft.categoryId) {
        issues.push({ level: 'error', rowKey: draft.rowKey, field: 'categoryId', message: '分类未匹配，请手动选择' });
      }

      if (draft.supplierName && !draft.supplierId) {
        issues.push({ level: 'warning', rowKey: draft.rowKey, field: 'supplierId', message: '供应商未匹配，可在提交时选择自动创建' });
      }

      if (!draft.specifications.length) {
        issues.push({ level: 'error', rowKey: draft.rowKey, field: 'specifications', message: '至少需要一个规格' });
      }

      const specKeys = new Map<string, string[]>();

      draft.specifications.forEach((spec) => {
        const specKey = this.normalizeLookup(`${spec.color}-${spec.size}`);
        if (specKey) {
          specKeys.set(specKey, [...(specKeys.get(specKey) ?? []), spec.rowKey]);
        }

        if (!spec.color) {
          issues.push({ level: 'error', rowKey: draft.rowKey, specRowKey: spec.rowKey, field: 'color', message: '颜色不能为空' });
        }
        if (!spec.size) {
          issues.push({ level: 'error', rowKey: draft.rowKey, specRowKey: spec.rowKey, field: 'size', message: '尺码不能为空' });
        }
        if (spec.salePrice < 0) {
          issues.push({ level: 'error', rowKey: draft.rowKey, specRowKey: spec.rowKey, field: 'salePrice', message: '售价不能为负数' });
        }
        if (spec.costPrice < 0) {
          issues.push({ level: 'error', rowKey: draft.rowKey, specRowKey: spec.rowKey, field: 'costPrice', message: '成本价不能为负数' });
        }
        if (spec.stock < 0) {
          issues.push({ level: 'error', rowKey: draft.rowKey, specRowKey: spec.rowKey, field: 'stock', message: '库存不能为负数' });
        }
      });

      for (const [, rowKeys] of specKeys.entries()) {
        if (rowKeys.length > 1) {
          rowKeys.forEach((specRowKey) => {
            issues.push({ level: 'error', rowKey: draft.rowKey, specRowKey, field: 'specifications', message: '同一商品内颜色和尺码组合不能重复' });
          });
        }
      }

    }

    return issues;
  }

  private stripJsonBlock(content: string): string {
    return content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  private getOpenAiClient(): OpenAI {
    if (this.openaiClient) {
      return this.openaiClient;
    }

    const baseUrl = Bun.env.AI_IMPORT_BASE_URL;
    const apiKey = Bun.env.AI_IMPORT_API_KEY;

    if (!baseUrl || !apiKey) {
      throw new Error('AI 导入能力未配置，请设置 AI_IMPORT_BASE_URL / AI_IMPORT_API_KEY / AI_IMPORT_MODEL');
    }

    this.openaiClient = new OpenAI({
      baseURL: baseUrl,
      apiKey,
    });

    return this.openaiClient;
  }

  private async callAiJsonCompletion(content: Array<Record<string, unknown>>): Promise<string> {
    const model = Bun.env.AI_IMPORT_MODEL;

    if (!model) {
      throw new Error('AI 导入能力未配置，请设置 AI_IMPORT_BASE_URL / AI_IMPORT_API_KEY / AI_IMPORT_MODEL');
    }

    try {
      const client = this.getOpenAiClient();
      const response = await client.responses.create({
        model,
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text: '你是服装商品导入助手，只能返回可解析的 JSON。',
              },
            ],
          },
          {
            role: 'user',
            content: content.map((item) => {
              if (typeof item.text === 'string') {
                return {
                  type: 'input_text',
                  text: item.text,
                };
              }

              const imagePayload = item.image_url as { url?: string } | undefined;
              if (imagePayload?.url) {
                return {
                  type: 'input_image',
                  image_url: imagePayload.url,
                };
              }

              throw new Error('AI 输入内容格式不受支持');
            }),
          },
        ],
      });

      const messageContent =
        typeof response.output_text === 'string' && response.output_text.trim()
          ? response.output_text
          : '';

      if (!messageContent) {
        throw new Error('AI 服务未返回可用内容');
      }

      return this.stripJsonBlock(messageContent);
    } catch (error: any) {
      const status = error?.status ?? error?.code;
      if (status) {
        throw new Error(`AI 服务请求失败：HTTP ${status}`);
      }

      throw error;
    }
  }

  async parseExcelImport(payload: { fileName: string; headers: string[]; rows: ExcelRow[] }): Promise<ImportParseResult> {
    const [categories, suppliers] = await Promise.all([
      this.productsService.getCategories(),
      this.productsService.getSuppliers(),
    ]);
    const prompt = [
      '你是服装商品导入助手。现在你会收到一个厂家 Excel 解析后的 JSON，请你自己判断列与商品字段的对应关系，并直接提取出可导入的商品草稿。',
      '不要先输出列映射，不要解释，只返回 JSON。',
      '返回格式必须为 {"products":[...]}。',
      'products 数组中每项字段只允许为：productCode,name,categoryName,supplierName,description,tags,status,specifications。',
      'specifications 数组中每项字段只允许为：barcode,color,size,salePrice,costPrice,stock,status。',
      '如果 Excel 中一行代表一个规格，而多行属于同一款商品，请你自行按 productCode 聚合成一个商品并生成多个 specifications。',
      '尺码字段规则：尺码必须使用标准选项 XS、S、M、L、XL、XXL、F；如果导入信息中没有尺码，请默认填 F（均码）。',
      '价格字段识别规则：如果表中只有“价格 / 单价 / 金额 / 拿货价”这类模糊价格字段，默认优先映射到 costPrice（成本价）。只有明确写了“售价 / 零售价 / 销售价 / 吊牌价”时，才映射到 salePrice（售价）。',
      '如果分类或供应商无法明确判断，可以返回空字符串，不要编造。',
      'status 仅可返回 draft、active、inactive，默认优先 active。',
      'tags 可以返回字符串数组，若源数据中没有则返回空数组。',
      '数值字段必须输出数字；库存输出整数。',
      '现有分类列表如下，请尽量使用这些分类名称原文：',
      JSON.stringify(categories.map((item) => item.name)),
      '现有供应商列表如下，请尽量使用这些供应商名称原文：',
      JSON.stringify(suppliers.map((item) => item.name)),
      `文件名：${payload.fileName}`,
      `表头：${JSON.stringify(payload.headers)}`,
      `行数据：${JSON.stringify(payload.rows)}`,
    ].join('\n');

    const content = await this.callAiJsonCompletion([
      { type: 'text', text: prompt },
    ]);
    const parsed = JSON.parse(content) as { products?: ImageAiProduct | ImageAiProduct[] };
    const drafts = this.ensureArray(parsed.products).map((item, index) => {
      const rowKey = `excel-${index + 1}`;
      const categoryName = this.normalizeText(item.categoryName);
      const supplierName = this.normalizeText(item.supplierName);
      const matchedSupplier = this.findSupplier(supplierName, suppliers);

      return this.normalizeDraftProduct({
        rowKey,
        source: 'excel',
        productCode: this.normalizeText(item.productCode),
        name: this.normalizeText(item.name),
        description: this.normalizeText(item.description),
        categoryId: this.findCategoryId(categoryName, categories),
        categoryName,
        supplierId: matchedSupplier?.id ?? null,
        supplierName,
        tags: this.splitTags(item.tags),
        status: item.status === 'draft' || item.status === 'inactive' ? item.status : 'active',
        specifications: this.ensureArray(item.specifications).map((spec, specIndex) => ({
          rowKey: `${rowKey}-spec-${specIndex + 1}`,
          barcode: this.normalizeText(spec.barcode) || null,
          color: this.normalizeText(spec.color),
          size: this.normalizeText(spec.size),
          salePrice: this.parseNumber(spec.salePrice),
          costPrice: this.parseNumber(spec.costPrice),
          stock: this.parseInteger(spec.stock),
          status: spec.status === 'inactive' ? 'inactive' : 'active',
        })),
      }, categories, suppliers);
    });
    return {
      drafts,
      issues: this.validateDrafts(drafts),
    };
  }

  async parseExcelFileImport(file: File): Promise<ImportParseResult> {
    const payload = await this.buildExcelImportPayloadFromFile(file);
    return this.parseExcelImport(payload);
  }

  async parseImageImport(file: File): Promise<ImportParseResult> {
    const [categories, suppliers] = await Promise.all([
      this.productsService.getCategories(),
      this.productsService.getSuppliers(),
    ]);
    const arrayBuffer = await file.arrayBuffer();
    const mimeType = file.type || 'image/png';
    const dataUrl = `data:${mimeType};base64,${Buffer.from(arrayBuffer).toString('base64')}`;

    const prompt = [
      '请识别这张服装货单截图中的商品信息，并输出 JSON。',
      'JSON 格式必须为 {"products":[...]}。',
      'products 数组里的每项字段只允许为：productCode,name,categoryName,supplierName,description,tags,status,specifications。',
      'specifications 每项字段只允许为：barcode,color,size,salePrice,costPrice,stock,status。',
      '尺码字段规则：尺码必须使用标准选项 XS、S、M、L、XL、XXL、F；如果导入信息中没有尺码，请默认填 F（均码）。',
      '价格字段识别规则：如果截图里只出现“价格 / 单价 / 金额 / 拿货价”这类模糊价格信息，默认优先提取为 costPrice（成本价）。只有明确写了“售价 / 零售价 / 销售价 / 吊牌价”时，才提取为 salePrice（售价）。',
      '若截图中没有明确分类，categoryName 设为 ""。',
      '若截图中没有明确供应商，supplierName 设为 ""。',
      '不要输出 markdown，不要解释。',
    ].join('\n');

    const content = await this.callAiJsonCompletion([
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: dataUrl } },
    ]);

    const parsed = JSON.parse(content) as { products?: ImageAiProduct | ImageAiProduct[] };
    const drafts = this.ensureArray(parsed.products).map((item, index) => {
      const rowKey = `image-${index + 1}`;
      const categoryName = this.normalizeText(item.categoryName);
      const supplierName = this.normalizeText(item.supplierName);
      const matchedSupplier = this.findSupplier(supplierName, suppliers);

      return this.normalizeDraftProduct({
        rowKey,
        source: 'image',
        productCode: this.normalizeText(item.productCode),
        name: this.normalizeText(item.name),
        description: this.normalizeText(item.description),
        categoryId: this.findCategoryId(categoryName, categories),
        categoryName,
        supplierId: matchedSupplier?.id ?? null,
        supplierName,
        tags: this.splitTags(item.tags),
        status: item.status === 'draft' || item.status === 'inactive' ? item.status : 'active',
        specifications: this.ensureArray(item.specifications).map((spec, specIndex) => ({
          rowKey: `${rowKey}-spec-${specIndex + 1}`,
          barcode: this.normalizeText(spec.barcode) || null,
          color: this.normalizeText(spec.color),
          size: this.normalizeText(spec.size),
          salePrice: this.parseNumber(spec.salePrice),
          costPrice: this.parseNumber(spec.costPrice),
          stock: this.parseInteger(spec.stock),
          status: spec.status === 'inactive' ? 'inactive' : 'active',
        })),
      }, categories, suppliers);
    });

    return {
      drafts,
      issues: this.validateDrafts(drafts),
    };
  }

  async bulkCreateProducts(
    drafts: ImportDraftProduct[],
    createMissingSuppliers: boolean
  ): Promise<BulkCreateProductsResponse> {
    const [categories, suppliers] = await Promise.all([
      this.productsService.getCategories(),
      this.productsService.getSuppliers(),
    ]);
    const normalizedDrafts = drafts.map((draft) => this.normalizeDraftProduct(draft, categories, suppliers));
    const issues = this.validateDrafts(normalizedDrafts);

    if (issues.some((item) => item.level === 'error')) {
      throw new Error('导入数据校验未通过，请先修正错误项');
    }

    const supplierMap = new Map<string, Supplier>();
    suppliers.forEach((supplier) => supplierMap.set(this.normalizeLookup(supplier.name), supplier));

    if (createMissingSuppliers) {
      const missingSupplierNames = Array.from(
        new Set(
          normalizedDrafts
            .filter((draft) => draft.supplierName && !draft.supplierId)
            .map((draft) => this.normalizeText(draft.supplierName))
            .filter(Boolean)
        )
      );

      for (const supplierName of missingSupplierNames) {
        const normalized = this.normalizeLookup(supplierName);
        if (supplierMap.has(normalized)) {
          continue;
        }

        const created = await this.productsService.createSupplier({ name: supplierName });
        supplierMap.set(normalized, created);
      }
    }

    const results: BulkCreateProductsResponse['results'] = [];

    for (const draft of normalizedDrafts) {
      try {
        const resolvedSupplier = draft.supplierId
          ? suppliers.find((item) => Number(item.id) === Number(draft.supplierId)) ?? null
          : supplierMap.get(this.normalizeLookup(draft.supplierName));

        if (draft.supplierName && !resolvedSupplier) {
          throw new Error(`供应商 ${draft.supplierName} 未匹配，请勾选自动创建缺失供应商`);
        }

        const created = await this.db.transaction(async (tx: any) => {
          const service = new ProductsService(tx);
          return service.createProduct({
            productCode: draft.productCode,
            name: draft.name,
            description: draft.description ?? '',
            categoryId: Number(draft.categoryId),
            supplierId: resolvedSupplier?.id ?? null,
            mainImages: [],
            detailImages: [],
            tags: draft.tags,
            status: draft.status,
            specifications: draft.specifications.map((spec) => ({
              id: 0,
              productId: 0,
              skuCode: '',
              barcode: spec.barcode ?? null,
              color: spec.color,
              size: spec.size,
              salePrice: spec.salePrice,
              costPrice: spec.costPrice,
              stock: spec.stock,
              reservedStock: 0,
              availableStock: spec.stock,
              status: spec.status,
              createdAt: '',
              updatedAt: '',
            })),
            specCount: 0,
            totalStock: 0,
            reservedStock: 0,
            availableStock: 0,
            minPrice: 0,
            maxPrice: 0,
            category: undefined,
            supplier: resolvedSupplier ?? undefined,
          });
        }) as Product;

        results.push({
          rowKey: draft.rowKey,
          productCode: draft.productCode,
          status: 'success',
          message: '创建成功',
          productId: created.id,
        });
      } catch (error: any) {
        logger.warn({ error, productCode: draft.productCode }, '批量导入创建商品失败');
        results.push({
          rowKey: draft.rowKey,
          productCode: draft.productCode,
          status: 'failed',
          message: error?.message || '创建失败',
        });
      }
    }

    return {
      successCount: results.filter((item) => item.status === 'success').length,
      failureCount: results.filter((item) => item.status === 'failed').length,
      results,
    };
  }
}
