import { z } from 'zod';

export const orderSchema = z.object({
  customerName: z.string().min(1, '客户姓名不能为空'),
  customerPhone: z.string().min(1, '客户电话不能为空'),
  customerEmail: z.string().email('邮箱格式不正确').optional(),
  items: z
    .array(
      z.object({
        skuId: z.number().min(1),
        quantity: z.number().int().min(1),
      })
    )
    .min(1, '订单至少需要一个商品'),
  totalAmount: z.number().min(0, '订单金额不能为负数'),
  discountAmount: z.number().min(0).optional(),
  finalAmount: z.number().min(0, '实付金额不能为负数'),
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded']).optional(),
  address: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    province: z.string().min(1),
    city: z.string().min(1),
    district: z.string().min(1),
    detail: z.string().min(1),
    postalCode: z.string().optional(),
  }),
  note: z.string().optional(),
  paymentMethod: z.string().optional(),
  paymentStatus: z.enum(['unpaid', 'paid', 'refunded']).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded']),
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
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});
