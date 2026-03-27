import { z } from 'zod';

export const updateProductImagesSchema = z
  .object({
    mainImages: z.array(z.string().url('主图链接格式不正确')).optional(),
    detailImages: z.array(z.string().url('详情图链接格式不正确')).optional(),
  })
  .refine((value) => value.mainImages !== undefined || value.detailImages !== undefined, {
    message: '至少需要提交一组图片',
  });

export type UpdateProductImagesInput = z.infer<typeof updateProductImagesSchema>;
