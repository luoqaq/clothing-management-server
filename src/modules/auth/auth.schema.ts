import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '旧密码不能为空'),
  newPassword: z.string().min(6, '新密码至少需要6个字符'),
});

export const createSalesUserSchema = z.object({
  username: z.string().min(1, '用户名不能为空').max(50, '用户名不能超过50个字符'),
  password: z.string().min(6, '密码至少需要6个字符'),
  name: z.string().max(100, '姓名不能超过100个字符').optional(),
});

export const updateSalesUserSchema = z.object({
  username: z.string().min(1, '用户名不能为空').max(50, '用户名不能超过50个字符').optional(),
  password: z.string().min(6, '密码至少需要6个字符').optional(),
  name: z.string().max(100, '姓名不能超过100个字符').optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: '至少需要修改一个字段',
});
