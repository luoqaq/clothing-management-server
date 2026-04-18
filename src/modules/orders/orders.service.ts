import { and, asc, count, desc, eq, like, ne, or, sql } from 'drizzle-orm';
import * as schema from '../../db/schema';
import type { Order, OrderFilters, OrderItem, OrderSource, OrderStatus } from '../../types';
import dayjs from 'dayjs';
import { formatDateTime as formatDateTimeUtil, toDbRangeEnd, toDbRangeStart } from '../../utils/date';
import { ProductsService } from '../products/products.service';

type CreateOrderPayload = Omit<Order, 'id' | 'orderNo' | 'createdAt' | 'updatedAt' | 'items'> & {
  items: Array<{ skuId: number; quantity: number; soldPrice?: number }>;
};

export class OrdersService {
  private productsService: ProductsService;

  constructor(private db: any) {
    this.productsService = new ProductsService(db);
  }

  private firstRow<T>(rows: T[]): T | null {
    return rows[0] ?? null;
  }

  private formatDateTime(value: unknown): string | undefined {
    return formatDateTimeUtil(value) ?? undefined;
  }

  private normalizeOrderStatus(status: unknown): 'confirmed' | 'cancelled' {
    return ['cancelled', 'refunded'].includes(String(status ?? '')) ? 'cancelled' : 'confirmed';
  }

  private isSchemaCompatibilityError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes('customer_id') ||
      message.includes('paid_at') ||
      message.includes('cost_price_snapshot') ||
      message.includes('sold_price') ||
      message.includes('customers')
    );
  }

  private buildValidPaidOrderWhereByPhone(phone: string) {
    return and(
      eq(schema.orders.customerPhone, phone),
      eq(schema.orders.paymentStatus, 'paid'),
      ne(schema.orders.status, 'cancelled'),
      ne(schema.orders.status, 'refunded')
    );
  }

  private async syncCustomerProfileByOrder(orderId: number, ageBucketId?: number | null) {
    let orderRows: any[] = [];
    try {
      orderRows = await this.db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
    } catch (error) {
      if (this.isSchemaCompatibilityError(error)) {
        return;
      }
      throw error;
    }
    const order = this.firstRow(orderRows);
    if (!order?.customerPhone || order.paymentStatus !== 'paid' || ['cancelled', 'refunded'].includes(order.status)) {
      return;
    }

    let existingCustomers: any[] = [];
    try {
      existingCustomers = await this.db
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.phone, order.customerPhone));
    } catch (error) {
      if (this.isSchemaCompatibilityError(error)) {
        return;
      }
      throw error;
    }

    let customerId = this.firstRow(existingCustomers)?.id;
    if (!customerId) {
      const inserted = await this.db.insert(schema.customers).values({
        phone: order.customerPhone,
        name: order.customerName ?? '',
        email: order.customerEmail ?? null,
        ...(typeof ageBucketId !== 'undefined' ? { ageBucketId } : {}),
      }).$returningId();
      customerId = inserted[0]?.id;
    }

    if (!customerId) {
      return;
    }

    const paidOrders = await this.db
      .select({
        id: schema.orders.id,
        paidAt: schema.orders.paidAt,
        customerName: schema.orders.customerName,
        customerEmail: schema.orders.customerEmail,
      })
      .from(schema.orders)
      .where(this.buildValidPaidOrderWhereByPhone(order.customerPhone));

    const paidOrderTimes = paidOrders
      .map((item: any) => item.paidAt)
      .filter(Boolean)
      .map((item: Date) => item.getTime())
      .sort((a, b) => a - b);

    await this.db.update(schema.customers).set({
      name: order.customerName ?? '',
      email: order.customerEmail ?? null,
      ...(typeof ageBucketId !== 'undefined' ? { ageBucketId } : {}),
      firstPaidOrderAt: paidOrderTimes[0] ? new Date(paidOrderTimes[0]) : null,
      lastPaidOrderAt: paidOrderTimes[paidOrderTimes.length - 1] ? new Date(paidOrderTimes[paidOrderTimes.length - 1]) : null,
      paidOrderCount: paidOrders.length,
    }).where(eq(schema.customers.id, customerId));

    await this.db.update(schema.orders).set({ customerId }).where(eq(schema.orders.id, orderId));
  }

  private async syncCustomerProfileByPhone(phone?: string) {
    if (!phone) {
      return;
    }

    let rows: any[] = [];
    try {
      rows = await this.db.select({ id: schema.orders.id }).from(schema.orders).where(eq(schema.orders.customerPhone, phone)).orderBy(schema.orders.updatedAt, 'desc').limit(1);
    } catch (error) {
      if (this.isSchemaCompatibilityError(error)) {
        return;
      }
      throw error;
    }
    const order = this.firstRow(rows);
    if (!order) {
      return;
    }

    await this.syncCustomerProfileByOrder(Number(order.id));
  }

  private async buildOrder(orderRow: any, normalizeStatus = true): Promise<Order | null> {
    if (!orderRow) {
      return null;
    }

    let itemRows: any[] = [];
    try {
      itemRows = await this.db
        .select()
        .from(schema.orderItems)
        .where(eq(schema.orderItems.orderId, orderRow.id));
    } catch (error) {
      if (!this.isSchemaCompatibilityError(error)) {
        throw error;
      }
      itemRows = await this.db
        .select({
          id: schema.orderItems.id,
          productId: schema.orderItems.productId,
          skuId: schema.orderItems.skuId,
          productName: schema.orderItems.productName,
          skuCode: schema.orderItems.skuCode,
          image: schema.orderItems.image,
          price: schema.orderItems.price,
          quantity: schema.orderItems.quantity,
          color: schema.orderItems.color,
          size: schema.orderItems.size,
        })
        .from(schema.orderItems)
        .where(eq(schema.orderItems.orderId, orderRow.id));
    }

    const items: OrderItem[] = itemRows.map((item: any) => ({
      id: Number(item.id),
      productId: Number(item.productId),
      skuId: Number(item.skuId),
      productName: item.productName,
      skuCode: item.skuCode,
      image: item.image ?? null,
      price: Number(item.price ?? 0),
      soldPrice: item.soldPrice ? Number(item.soldPrice) : Number(item.price ?? 0),
      costPriceSnapshot: Number(item.costPriceSnapshot ?? 0),
      quantity: Number(item.quantity ?? 0),
      color: item.color ?? null,
      size: item.size ?? null,
    }));

    return {
      id: Number(orderRow.id),
      orderNo: orderRow.orderNo,
      source: (orderRow.source ?? 'admin_web') as OrderSource,
      customerId: orderRow.customerId ? Number(orderRow.customerId) : null,
      customerName: orderRow.customerName,
      customerPhone: orderRow.customerPhone,
      customerEmail: orderRow.customerEmail ?? undefined,
      items,
      totalAmount: Number(orderRow.totalAmount ?? 0),
      discountAmount: Number(orderRow.discountAmount ?? 0),
      finalAmount: Number(orderRow.finalAmount ?? 0),
      status: (normalizeStatus ? this.normalizeOrderStatus(orderRow.status) : orderRow.status) as OrderStatus,
      address: (typeof orderRow.address === 'string' ? JSON.parse(orderRow.address) : orderRow.address) ?? {},
      note: orderRow.note ?? undefined,
      paymentMethod: orderRow.paymentMethod ?? undefined,
      paymentStatus: orderRow.paymentStatus,
      shippingCompany: orderRow.shippingCompany ?? null,
      trackingNumber: orderRow.trackingNumber ?? null,
      cancelReason: orderRow.cancelReason ?? null,
      refundReason: orderRow.refundReason ?? null,
      paidAt: this.formatDateTime(orderRow.paidAt),
      shippedAt: this.formatDateTime(orderRow.shippedAt),
      deliveredAt: this.formatDateTime(orderRow.deliveredAt),
      createdAt: this.formatDateTime(orderRow.createdAt) ?? '',
      updatedAt: this.formatDateTime(orderRow.updatedAt) ?? '',
    };
  }

  async getOrders(params?: {
    page?: number;
    pageSize?: number;
    filters?: OrderFilters;
  }): Promise<{ items: Order[]; total: number }> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const { search, status, paymentStatus, source, startDate, endDate, sortBy, sortOrder } = params?.filters || {};
    const offset = (page - 1) * pageSize;
    const isCreatedAtAsc = sortBy === 'createdAt' && sortOrder === 'asc';
    const orderByClause = isCreatedAtAsc
      ? [asc(schema.orders.createdAt), asc(schema.orders.id)]
      : [desc(schema.orders.createdAt), desc(schema.orders.id)];

    const whereConditions: any[] = [];

    if (search) {
      whereConditions.push(
        or(
          like(schema.orders.customerName, `%${search}%`),
          like(schema.orders.customerPhone, `%${search}%`),
          like(schema.orders.orderNo, `%${search}%`)
        )
      );
    }

    if (status === 'confirmed') {
      whereConditions.push(
        and(
          ne(schema.orders.status, 'cancelled'),
          ne(schema.orders.status, 'refunded')
        )
      );
    } else if (status === 'cancelled') {
      whereConditions.push(
        or(
          eq(schema.orders.status, 'cancelled'),
          eq(schema.orders.status, 'refunded')
        )
      );
    } else if (status) {
      whereConditions.push(eq(schema.orders.status, status));
    }

    if (paymentStatus) {
      whereConditions.push(eq(schema.orders.paymentStatus as any, paymentStatus as any));
    }

    if (source) {
      whereConditions.push(eq(schema.orders.source as any, source as any));
    }

    if (startDate) {
      whereConditions.push(sql`${schema.orders.createdAt} >= ${toDbRangeStart(startDate)}`);
    }

    if (endDate) {
      whereConditions.push(sql`${schema.orders.createdAt} <= ${toDbRangeEnd(endDate)}`);
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    let rows: any[] = [];
    try {
      rows = await this.db
        .select()
        .from(schema.orders)
        .where(whereClause)
        .orderBy(...orderByClause)
        .limit(pageSize)
        .offset(offset);
    } catch (error) {
      if (!this.isSchemaCompatibilityError(error)) {
        throw error;
      }
      rows = await this.db
        .select({
          id: schema.orders.id,
          orderNo: schema.orders.orderNo,
          source: schema.orders.source,
          customerName: schema.orders.customerName,
          customerPhone: schema.orders.customerPhone,
          customerEmail: schema.orders.customerEmail,
          totalAmount: schema.orders.totalAmount,
          discountAmount: schema.orders.discountAmount,
          finalAmount: schema.orders.finalAmount,
          status: schema.orders.status,
          address: schema.orders.address,
          note: schema.orders.note,
          paymentMethod: schema.orders.paymentMethod,
          paymentStatus: schema.orders.paymentStatus,
          shippingCompany: schema.orders.shippingCompany,
          trackingNumber: schema.orders.trackingNumber,
          cancelReason: schema.orders.cancelReason,
          refundReason: schema.orders.refundReason,
          shippedAt: schema.orders.shippedAt,
          deliveredAt: schema.orders.deliveredAt,
          createdAt: schema.orders.createdAt,
          updatedAt: schema.orders.updatedAt,
        })
        .from(schema.orders)
        .where(whereClause)
        .orderBy(...orderByClause)
        .limit(pageSize)
        .offset(offset);
    }

    const items = (await Promise.all(rows.map((row: any) => this.buildOrder(row, true)))).filter(Boolean) as Order[];
    
    const totalQuery = await this.db.select({ count: count() }).from(schema.orders).where(whereClause);

    return {
      items,
      total: Number(totalQuery[0]?.count ?? 0),
    };
  }

  async getOrder(id: number): Promise<Order | null> {
    try {
      const rows = await this.db.select().from(schema.orders).where(eq(schema.orders.id, id));
      return this.buildOrder(this.firstRow(rows), true);
    } catch (error) {
      if (!this.isSchemaCompatibilityError(error)) {
        throw error;
      }
      const rows = await this.db
        .select({
          id: schema.orders.id,
          orderNo: schema.orders.orderNo,
          source: schema.orders.source,
          customerName: schema.orders.customerName,
          customerPhone: schema.orders.customerPhone,
          customerEmail: schema.orders.customerEmail,
          totalAmount: schema.orders.totalAmount,
          discountAmount: schema.orders.discountAmount,
          finalAmount: schema.orders.finalAmount,
          status: schema.orders.status,
          address: schema.orders.address,
          note: schema.orders.note,
          paymentMethod: schema.orders.paymentMethod,
          paymentStatus: schema.orders.paymentStatus,
          shippingCompany: schema.orders.shippingCompany,
          trackingNumber: schema.orders.trackingNumber,
          cancelReason: schema.orders.cancelReason,
          refundReason: schema.orders.refundReason,
          shippedAt: schema.orders.shippedAt,
          deliveredAt: schema.orders.deliveredAt,
          createdAt: schema.orders.createdAt,
          updatedAt: schema.orders.updatedAt,
        })
        .from(schema.orders)
        .where(eq(schema.orders.id, id));
      return this.buildOrder(this.firstRow(rows), true);
    }
  }

  private async getOrderForMutation(id: number): Promise<Order | null> {
    try {
      const rows = await this.db.select().from(schema.orders).where(eq(schema.orders.id, id));
      return this.buildOrder(this.firstRow(rows), false);
    } catch (error) {
      if (!this.isSchemaCompatibilityError(error)) {
        throw error;
      }
      const rows = await this.db
        .select({
          id: schema.orders.id,
          orderNo: schema.orders.orderNo,
          source: schema.orders.source,
          customerName: schema.orders.customerName,
          customerPhone: schema.orders.customerPhone,
          customerEmail: schema.orders.customerEmail,
          totalAmount: schema.orders.totalAmount,
          discountAmount: schema.orders.discountAmount,
          finalAmount: schema.orders.finalAmount,
          status: schema.orders.status,
          address: schema.orders.address,
          note: schema.orders.note,
          paymentMethod: schema.orders.paymentMethod,
          paymentStatus: schema.orders.paymentStatus,
          shippingCompany: schema.orders.shippingCompany,
          trackingNumber: schema.orders.trackingNumber,
          cancelReason: schema.orders.cancelReason,
          refundReason: schema.orders.refundReason,
          shippedAt: schema.orders.shippedAt,
          deliveredAt: schema.orders.deliveredAt,
          createdAt: schema.orders.createdAt,
          updatedAt: schema.orders.updatedAt,
        })
        .from(schema.orders)
        .where(eq(schema.orders.id, id));
      return this.buildOrder(this.firstRow(rows), false);
    }
  }

  async createOrder(data: CreateOrderPayload): Promise<Order> {
    const orderNo = this.generateOrderNo();
    const deductedItems: Array<{ skuId: number; quantity: number }> = [];

    try {
      const enrichedItems = await Promise.all(
        data.items.map(async (item) => {
          const skuRows = await this.db
            .select()
            .from(schema.productSkus)
            .where(eq(schema.productSkus.id, item.skuId));

          const sku = this.firstRow(skuRows);
          if (!sku) {
            throw new Error('规格不存在');
          }

          const productRows = await this.db
            .select()
            .from(schema.products)
            .where(eq(schema.products.id, sku.productId));

          const product = this.firstRow(productRows);
          if (!product) {
            throw new Error('商品不存在');
          }

          await this.productsService.deductSpecificationStock(Number(sku.id), item.quantity);
          deductedItems.push({ skuId: Number(sku.id), quantity: item.quantity });

          const originalPrice = Number(sku.salePrice ?? 0);
          const soldPrice = item.soldPrice ?? originalPrice;
          return {
            productId: Number(product.id),
            skuId: Number(sku.id),
            productName: product.name,
            skuCode: sku.skuCode,
            image: sku.image ?? (Array.isArray(product.mainImages) ? product.mainImages[0] ?? null : null),
            price: originalPrice,
            soldPrice: soldPrice,
            costPriceSnapshot: Number(sku.costPrice ?? 0),
            quantity: item.quantity,
            color: sku.color,
            size: sku.size,
          };
        })
      );

      const totalAmount = enrichedItems.reduce((sum, item) => sum + item.soldPrice * item.quantity, 0);
      const finalAmount = totalAmount;
      const nextStatus = 'confirmed';
      const paymentStatus = data.paymentStatus ?? 'paid';
      const paidAt = paymentStatus === 'paid' ? new Date() : null;

      let inserted: Array<{ id: number }> = [];
      try {
        inserted = await this.db
          .insert(schema.orders)
          .values({
            orderNo,
            source: data.source ?? 'admin_web',
            customerId: null,
            customerName: data.customerName ?? '',
            customerPhone: data.customerPhone ?? '',
            customerEmail: data.customerEmail || null,
            totalAmount: String(totalAmount),
            discountAmount: '0',
            finalAmount: String(finalAmount),
            status: nextStatus,
            address: data.address ?? {},
            note: data.note,
            paymentMethod: data.paymentMethod,
            paymentStatus,
            paidAt,
          })
          .$returningId();
      } catch (error) {
        if (!this.isSchemaCompatibilityError(error)) {
          throw error;
        }

        inserted = await this.db
          .insert(schema.orders)
          .values({
            orderNo,
            source: data.source ?? 'admin_web',
            customerName: data.customerName ?? '',
            customerPhone: data.customerPhone ?? '',
            customerEmail: data.customerEmail || null,
            totalAmount: String(totalAmount),
            discountAmount: '0',
            finalAmount: String(finalAmount),
            status: nextStatus,
            address: data.address ?? {},
            note: data.note,
            paymentMethod: data.paymentMethod,
            paymentStatus,
          })
          .$returningId();
      }

      const orderId = inserted[0]?.id;
      if (!orderId) {
        throw new Error('创建订单失败');
      }

      try {
        await this.db.insert(schema.orderItems).values(
          enrichedItems.map((item) => ({
            orderId,
            productId: item.productId,
            skuId: item.skuId,
            productName: item.productName,
            skuCode: item.skuCode,
            image: item.image,
            price: String(item.price),
            soldPrice: String(item.soldPrice ?? item.price),
            costPriceSnapshot: String(item.costPriceSnapshot),
            quantity: item.quantity,
            color: item.color,
            size: item.size,
          }))
        );
      } catch (error) {
        if (!this.isSchemaCompatibilityError(error)) {
          throw error;
        }

        await this.db.insert(schema.orderItems).values(
          enrichedItems.map((item) => ({
            orderId,
            productId: item.productId,
            skuId: item.skuId,
            productName: item.productName,
            skuCode: item.skuCode,
            image: item.image,
            price: String(item.price),
            quantity: item.quantity,
            color: item.color,
            size: item.size,
          }))
        );
      }

      if (paymentStatus === 'paid' && data.customerPhone) {
        await this.syncCustomerProfileByOrder(orderId, typeof data.ageBucketId === 'number' ? data.ageBucketId : null);
      }

      const order = await this.getOrder(orderId);
      if (!order) {
        throw new Error('创建订单失败');
      }

      return order;
    } catch (error) {
      for (const item of deductedItems.reverse()) {
        try {
          await this.productsService.restoreSpecificationStock(item.skuId, item.quantity);
        } catch {
          // Best-effort rollback for compatibility-mode failures.
        }
      }
      throw error;
    }
  }

  async updateOrderStatus(id: number, status: OrderStatus): Promise<Order | null> {
    const order = await this.getOrderForMutation(id);
    if (!order) {
      return null;
    }

    if (status !== 'confirmed') {
      throw new Error('门店订单仅支持已确认或已取消');
    }

    if (order.status === 'cancelled' || order.status === 'refunded') {
      throw new Error('已取消订单不能再修改状态');
    }

    if (order.status === 'pending') {
      for (const item of order.items) {
        await this.productsService.finalizeShippedStock(item.skuId, item.quantity);
      }
    }

    await this.db.update(schema.orders).set({ status: 'confirmed' }).where(eq(schema.orders.id, id));
    return this.getOrder(id);
  }

  async shipOrder(
    id: number,
    _shippingInfo: { trackingNumber: string; shippingCompany: string }
  ): Promise<Order | null> {
    const order = await this.getOrderForMutation(id);
    if (!order) {
      return null;
    }

    throw new Error('门店订单流程不包含发货状态');
  }

  async cancelOrder(id: number, reason: string): Promise<Order | null> {
    const order = await this.getOrderForMutation(id);
    if (!order) {
      return null;
    }

    if (['cancelled', 'refunded'].includes(order.status)) {
      throw new Error('当前订单状态不可取消');
    }

    for (const item of order.items) {
      if (order.status === 'confirmed') {
        await this.productsService.restoreSpecificationStock(item.skuId, item.quantity);
      } else {
        await this.productsService.releaseSpecificationStock(item.skuId, item.quantity);
      }
    }

    await this.db
      .update(schema.orders)
      .set({
        status: 'cancelled',
        cancelReason: reason,
      })
      .where(eq(schema.orders.id, id));

    if (order.customerPhone) {
      await this.syncCustomerProfileByPhone(order.customerPhone);
    }

    return this.getOrder(id);
  }

  async refundOrder(id: number, _data: { amount: number; reason: string }): Promise<Order | null> {
    const order = await this.getOrderForMutation(id);
    if (!order) {
      return null;
    }
    throw new Error('门店订单流程不包含退款状态');
  }

  private generateOrderNo(): string {
    const date = dayjs().format('YYYYMMDD');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `${date}${random}`;
  }
}
