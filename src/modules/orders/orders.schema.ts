import { z } from 'zod';

export const orderSchema = z.object({
  source: z.enum(['admin_web', 'staff_miniapp']).optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.union([z.string().email('邮箱格式不正确'), z.literal('')]).optional(),
  ageBucketId: z.number().int().min(1).nullable().optional(),
  items: z
    .array(
      z.object({
        skuId: z.number().min(1),
        quantity: z.number().int().min(1),
        soldPrice: z.number().min(0, '售出价格不能为负数').optional(),
      })
    )
    .min(1, '订单至少需要一个商品'),
  totalAmount: z.number().min(0, '订单金额不能为负数').optional(),
  discountAmount: z.number().min(0).optional(),
  finalAmount: z.number().min(0, '实付金额不能为负数').optional(),
  status: z.enum(['confirmed']).optional(),
  address: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    province: z.string().optional(),
    city: z.string().optional(),
    district: z.string().optional(),
    detail: z.string().optional(),
    postalCode: z.string().optional(),
  }).optional(),
  note: z.string().optional(),
  paymentMethod: z.string().optional(),
  paymentStatus: z.enum(['unpaid', 'paid', 'refunded']).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['confirmed']),
});

export const shipOrderSchema = z.object({
  trackingNumber: z.string().min(1, '运单号不能为空'),
  shippingCompany: z.string().min(1, '物流公司不能为空'),
});

export const cancelOrderSchema = z.object({
  reason: z.string().min(1, '取消原因不能为空'),
});

export const refundOrderSchema = z.object({
  amount: z.number().min(0, '退款金额不能为负数'),
  reason: z.string().min(1, '退款原因不能为空'),
});

export const orderFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
  source: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});
