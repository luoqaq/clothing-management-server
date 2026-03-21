import { and, count, eq, gte, like, lte, or } from 'drizzle-orm';
import * as schema from '../../db/schema';
import type { Order, OrderFilters, OrderItem, OrderStatus } from '../../types';
import dayjs from 'dayjs';
import { ProductsService } from '../products/products.service';

type CreateOrderPayload = Omit<Order, 'id' | 'orderNo' | 'createdAt' | 'updatedAt' | 'items'> & {
  items: Array<{ skuId: number; quantity: number }>;
};

export class OrdersService {
  private productsService: ProductsService;

  constructor(private db: any) {
    this.productsService = new ProductsService(db);
  }

  private async buildOrder(orderRow: any): Promise<Order | null> {
    if (!orderRow) {
      return null;
    }

    const itemRows = await this.db
      .select()
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, orderRow.id));

    const items: OrderItem[] = itemRows.map((item: any) => ({
      id: Number(item.id),
      productId: Number(item.productId),
      skuId: Number(item.skuId),
      productName: item.productName,
      skuCode: item.skuCode,
      image: item.image ?? null,
      price: Number(item.price ?? 0),
      quantity: Number(item.quantity ?? 0),
      color: item.color ?? null,
      size: item.size ?? null,
    }));

    return {
      id: Number(orderRow.id),
      orderNo: orderRow.orderNo,
      customerName: orderRow.customerName,
      customerPhone: orderRow.customerPhone,
      customerEmail: orderRow.customerEmail ?? undefined,
      items,
      totalAmount: Number(orderRow.totalAmount ?? 0),
      discountAmount: Number(orderRow.discountAmount ?? 0),
      finalAmount: Number(orderRow.finalAmount ?? 0),
      status: orderRow.status,
      address: typeof orderRow.address === 'string' ? JSON.parse(orderRow.address) : orderRow.address,
      note: orderRow.note ?? undefined,
      paymentMethod: orderRow.paymentMethod ?? undefined,
      paymentStatus: orderRow.paymentStatus,
      shippingCompany: orderRow.shippingCompany ?? null,
      trackingNumber: orderRow.trackingNumber ?? null,
      cancelReason: orderRow.cancelReason ?? null,
      refundReason: orderRow.refundReason ?? null,
      shippedAt: orderRow.shippedAt ? String(orderRow.shippedAt) : undefined,
      deliveredAt: orderRow.deliveredAt ? String(orderRow.deliveredAt) : undefined,
      createdAt: String(orderRow.createdAt),
      updatedAt: String(orderRow.updatedAt),
    };
  }

  async getOrders(params?: {
    page?: number;
    pageSize?: number;
    filters?: OrderFilters;
  }): Promise<{ items: Order[]; total: number }> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const { search, status, paymentStatus, startDate, endDate } = params?.filters || {};
    const offset = (page - 1) * pageSize;

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

    if (status) {
      whereConditions.push(eq(schema.orders.status, status));
    }

    if (paymentStatus) {
      whereConditions.push(eq(schema.orders.paymentStatus as any, paymentStatus as any));
    }

    if (startDate) {
      whereConditions.push(gte(schema.orders.createdAt, new Date(startDate)));
    }

    if (endDate) {
      whereConditions.push(lte(schema.orders.createdAt, new Date(`${endDate} 23:59:59`)));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const rows = await this.db
      .select()
      .from(schema.orders)
      .where(whereClause)
      .orderBy(schema.orders.createdAt, 'desc')
      .limit(pageSize)
      .offset(offset);

    const items = (await Promise.all(rows.map((row: any) => this.buildOrder(row)))).filter(Boolean) as Order[];
    const totalQuery = await this.db.select({ count: count() }).from(schema.orders).where(whereClause);

    return {
      items,
      total: Number(totalQuery[0]?.count ?? 0),
    };
  }

  async getOrder(id: number): Promise<Order | null> {
    const rows = await this.db.select().from(schema.orders).where(eq(schema.orders.id, id)).limit(1);
    return this.buildOrder(rows[0]);
  }

  async createOrder(data: CreateOrderPayload): Promise<Order> {
    const orderNo = this.generateOrderNo();

    const enrichedItems = await Promise.all(
      data.items.map(async (item) => {
        const skuRows = await this.db
          .select()
          .from(schema.productSkus)
          .where(eq(schema.productSkus.id, item.skuId))
          .limit(1);

        const sku = skuRows[0];
        if (!sku) {
          throw new Error('规格不存在');
        }

        const productRows = await this.db
          .select()
          .from(schema.products)
          .where(eq(schema.products.id, sku.productId))
          .limit(1);

        const product = productRows[0];
        if (!product) {
          throw new Error('商品不存在');
        }

        await this.productsService.reserveSpecificationStock(Number(sku.id), item.quantity);

        return {
          productId: Number(product.id),
          skuId: Number(sku.id),
          productName: product.name,
          skuCode: sku.skuCode,
          image: Array.isArray(product.mainImages) ? product.mainImages[0] ?? null : null,
          price: Number(sku.salePrice ?? 0),
          quantity: item.quantity,
          color: sku.color,
          size: sku.size,
        };
      })
    );

    const totalAmount = enrichedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountAmount = Number(data.discountAmount ?? 0);
    const finalAmount = Math.max(totalAmount - discountAmount, 0);

    const inserted = await this.db
      .insert(schema.orders)
      .values({
        orderNo,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        totalAmount: String(totalAmount),
        discountAmount: String(discountAmount),
        finalAmount: String(finalAmount),
        status: data.status ?? 'pending',
        address: data.address,
        note: data.note,
        paymentMethod: data.paymentMethod,
        paymentStatus: data.paymentStatus ?? 'unpaid',
      })
      .$returningId();

    const orderId = inserted[0]?.id;
    if (!orderId) {
      throw new Error('创建订单失败');
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

    const order = await this.getOrder(orderId);
    if (!order) {
      throw new Error('创建订单失败');
    }

    return order;
  }

  async updateOrderStatus(id: number, status: OrderStatus): Promise<Order | null> {
    const order = await this.getOrder(id);
    if (!order) {
      return null;
    }

    if (status === 'cancelled' || status === 'refunded') {
      throw new Error('请使用专用的取消或退款接口');
    }

    if (status === 'shipped') {
      throw new Error('请使用发货接口');
    }

    const updates: Record<string, unknown> = { status };
    if (status === 'delivered') {
      updates.deliveredAt = new Date();
    }

    await this.db.update(schema.orders).set(updates).where(eq(schema.orders.id, id));
    return this.getOrder(id);
  }

  async shipOrder(
    id: number,
    shippingInfo: { trackingNumber: string; shippingCompany: string }
  ): Promise<Order | null> {
    const order = await this.getOrder(id);
    if (!order) {
      return null;
    }

    if (order.status !== 'confirmed') {
      throw new Error('只有已确认订单才能发货');
    }

    for (const item of order.items) {
      await this.productsService.finalizeShippedStock(item.skuId, item.quantity);
    }

    await this.db
      .update(schema.orders)
      .set({
        status: 'shipped',
        shippingCompany: shippingInfo.shippingCompany,
        trackingNumber: shippingInfo.trackingNumber,
        shippedAt: new Date(),
      })
      .where(eq(schema.orders.id, id));

    return this.getOrder(id);
  }

  async cancelOrder(id: number, reason: string): Promise<Order | null> {
    const order = await this.getOrder(id);
    if (!order) {
      return null;
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      throw new Error('当前订单状态不可取消');
    }

    for (const item of order.items) {
      await this.productsService.releaseSpecificationStock(item.skuId, item.quantity);
    }

    await this.db
      .update(schema.orders)
      .set({
        status: 'cancelled',
        cancelReason: reason,
      })
      .where(eq(schema.orders.id, id));

    return this.getOrder(id);
  }

  async refundOrder(id: number, data: { amount: number; reason: string }): Promise<Order | null> {
    const order = await this.getOrder(id);
    if (!order) {
      return null;
    }

    if (!['delivered', 'shipped'].includes(order.status)) {
      throw new Error('当前订单状态不可退款');
    }

    await this.db
      .update(schema.orders)
      .set({
        status: 'refunded',
        paymentStatus: 'refunded',
        refundReason: data.reason,
      })
      .where(eq(schema.orders.id, id));

    return this.getOrder(id);
  }

  private generateOrderNo(): string {
    const date = dayjs().format('YYYYMMDD');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `${date}${random}`;
  }
}
