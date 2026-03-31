import { z } from 'zod';

const cellValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const parseExcelImportSchema = z.object({
  fileName: z.string().min(1, '文件名不能为空'),
  headers: z.array(z.string()).min(1, '表头不能为空'),
  rows: z.array(z.record(z.string(), cellValueSchema)).min(1, '至少需要一行数据'),
});

export const draftSpecificationSchema = z.object({
  rowKey: z.string().min(1),
  barcode: z.string().optional().nullable(),
  color: z.string().trim().min(1, '颜色不能为空'),
  size: z.string().trim().min(1, '尺码不能为空'),
  salePrice: z.number().min(0, '售价不能为负数'),
  costPrice: z.number().min(0, '成本价不能为负数'),
  stock: z.number().int().min(0, '库存不能为负数'),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const draftProductSchema = z.object({
  rowKey: z.string().min(1),
  source: z.enum(['excel', 'image']),
  productCode: z.string().trim(),
  name: z.string().trim(),
  description: z.string().optional().nullable(),
  categoryId: z.number().optional().nullable(),
  categoryName: z.string().optional().nullable(),
  supplierId: z.number().optional().nullable(),
  supplierName: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  status: z.enum(['draft', 'active', 'inactive']).default('active'),
  specifications: z.array(draftSpecificationSchema).min(1, '至少需要一个规格'),
});

export const bulkCreateProductsSchema = z.object({
  products: z.array(draftProductSchema).min(1, '至少需要一条商品草稿'),
  createMissingSuppliers: z.boolean().default(false),
});

