import { z } from 'zod';

const specificationSchema = z.object({
  skuCode: z.string().optional(),
  barcode: z.string().optional().nullable(),
  color: z.string().min(1, '颜色不能为空'),
  size: z.string().min(1, '尺码不能为空'),
  salePrice: z.number().min(0, '售价不能为负数'),
  costPrice: z.number().min(0, '成本价不能为负数'),
  stock: z.number().int().min(0, '库存不能为负数'),
  reservedStock: z.number().int().min(0).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const productSchema = z.object({
  productCode: z.string().trim().min(1, '款号不能为空'),
  name: z.string().min(1, '商品名称不能为空'),
  description: z.string().optional(),
  categoryId: z.number().min(1, '分类不能为空'),
  brandId: z.number().optional().nullable(),
  mainImages: z.array(z.string()).optional(),
  detailImages: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'active', 'inactive']).optional(),
  specifications: z.array(specificationSchema).min(1, '至少需要一个规格'),
});

export const categorySchema = z.object({
  name: z.string().min(1, '分类名称不能为空'),
  code: z.string().min(1, '分类代码不能为空'),
  parentId: z.number().optional().nullable(),
});

export const brandSchema = z.object({
  name: z.string().min(1, '品牌名称不能为空'),
  logo: z.string().optional(),
});

export const updateStockSchema = z.object({
  stock: z.number().int().min(0, '库存不能为负数'),
});

export const productFiltersSchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  status: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});
