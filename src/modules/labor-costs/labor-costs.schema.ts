import { z } from 'zod';

export const laborDateRangeSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
});

export const laborCostQuerySchema = laborDateRangeSchema.extend({
  coverageType: z.enum(['self', 'part_time']).optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});

export const laborCostRecordSchema = z.object({
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必须是 YYYY-MM-DD'),
  workerId: z.number().int().min(1).optional().nullable(),
  workerName: z.string().trim().optional().nullable(),
  coverageType: z.enum(['self', 'part_time']).default('part_time'),
  dailyWage: z.number().min(0, '日薪不能为负数').optional(),
  paidAmount: z.number().min(0, '实付金额不能为负数').optional(),
  paymentMethod: z.string().trim().optional().nullable(),
  paidAt: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});
