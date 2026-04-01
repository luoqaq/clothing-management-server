import { z } from 'zod';

export const customerAgeBucketSchema = z.object({
  name: z.string().trim().min(1, '年龄段名称不能为空'),
  sortOrder: z.number().int().min(0, '排序不能为负数').default(0),
});

export const updateCustomerSchema = z.object({
  name: z.string().trim().min(1, '客户姓名不能为空').optional(),
  email: z.union([z.string().email('邮箱格式不正确'), z.literal(''), z.null()]).optional(),
  ageBucketId: z.number().int().min(1).nullable().optional(),
});
