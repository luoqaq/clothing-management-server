import { z } from 'zod';

export const uploadPolicySchema = z.object({
  biz: z.enum(['product', 'brand', 'avatar']),
  scene: z.enum(['main', 'detail', 'logo', 'avatar']),
  fileName: z.string().min(1, '文件名不能为空'),
  contentType: z.string().min(1, '文件类型不能为空'),
  size: z.number().int().positive('文件大小必须大于 0'),
});

export type UploadPolicyInput = z.infer<typeof uploadPolicySchema>;
