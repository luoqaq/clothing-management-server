import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().min(1, '商品名称不能为空'),
  description: z.string().optional(),
  categoryId: z.number().min(1, '分类不能为空'),
  price: z.number().min(0, '价格不能为负数'),
  costPrice: z.number().min(0, '成本价不能为负数'),
  stock: z.number().int().min(0, '库存不能为负数'),
  images: z.array(z.string()).optional(),
  size: z.enum(['S', 'M', 'L', 'XL', 'XXL']).optional(),
  status: z.enum(['active', 'inactive', 'out_of_stock']).optional(),
  tags: z.array(z.string()).optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1, '分类名称不能为空'),
  code: z.string().min(1, '分类代码不能为空'),
  parentId: z.number().optional().nullable(),
});



export const updateStockSchema = z.object({
  stock: z.number().int().min(0, '库存不能为负数'),
});

export const productFiltersSchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});
