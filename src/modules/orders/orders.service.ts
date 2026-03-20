import { eq, like, and, or, gte, lte, count } from 'drizzle-orm';
import * as schema from '../../db/schema';
import type { Order, OrderFilters, OrderStatus } from '../../types';
import dayjs from 'dayjs';

export class OrdersService {
  constructor(private db: any) {}

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
      whereConditions.push(or(
        like(schema.orders.customerName, `%${search}%`),
        like(schema.orders.customerPhone, `%${search}%`),
        like(schema.orders.orderNo, `%${search}%`),
      ));
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
      whereConditions.push(lte(schema.orders.createdAt, new Date(endDate + ' 23:59:59')));
    }
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const orders = await this.db
      .select()
      .from(schema.orders)
      .where(whereClause)
      .orderBy(schema.orders.createdAt, 'desc')
      .limit(pageSize)
      .offset(offset);

    const totalQuery = await this.db
      .select({ count: count() })
      .from(schema.orders)
      .where(whereClause);

    const total = totalQuery[0]?.count ?? 0;

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await this.db
          .select()
          .from(schema.orderItems)
          .where(eq(schema.orderItems.orderId, order.id));

        return {
          ...order,
          items,
        };
      })
    );

    return {
      items: ordersWithItems as unknown as Order[],
      total: Number(total),
    };
  }

  async getOrder(id: number): Promise<Order | null> {
    const orders = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, id))
      .limit(1);

    if (orders.length === 0) {
      return null;
    }

    const items = await this.db
      .select()
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, id));

    return {
      ...orders[0],
      items,
    } as unknown as Order;
  }

  async createOrder(data: Omit<Order, 'id' | 'orderNo' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    const orderNo = this.generateOrderNo();

    const orderData = {
      ...data,
      orderNo,
    };

    const [order] = await this.db
      .insert(schema.orders)
      .values(orderData)
      .returning();

    const orderItemsData = data.items.map((item) => ({
      orderId: order.id,
      ...item,
    }));

    await this.db
      .insert(schema.orderItems)
      .values(orderItemsData);

    const items = await this.db
      .select()
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, order.id));

    return {
      ...order,
      items,
    } as unknown as Order;
  }

  async updateOrderStatus(id: number, status: OrderStatus): Promise<Order | null> {
    const updates: any = { status };

    if (status === 'shipped') {
      updates.shippedAt = new Date();
    } else if (status === 'delivered') {
      updates.deliveredAt = new Date();
    }

    const [order] = await this.db
      .update(schema.orders)
      .set(updates)
      .where(eq(schema.orders.id, id))
      .returning();

    if (!order) {
      return null;
    }

    const items = await this.db
      .select()
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, order.id));

    return {
      ...order,
      items,
    } as unknown as Order;
  }

  async shipOrder(id: number, shippingInfo: { trackingNumber?: string; shippingCompany?: string }): Promise<Order | null> {
    return this.updateOrderStatus(id, 'shipped');
  }

  async cancelOrder(id: number, reason?: string): Promise<Order | null> {
    return this.updateOrderStatus(id, 'cancelled');
  }

  async refundOrder(id: number, data: { amount: number; reason?: string }): Promise<Order | null> {
    const [order] = await this.db
      .update(schema.orders)
      .set({
        status: 'refunded',
        paymentStatus: 'refunded',
      })
      .where(eq(schema.orders.id, id))
      .returning();

    if (!order) {
      return null;
    }

    const items = await this.db
      .select()
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, order.id));

    return {
      ...order,
      items,
    } as unknown as Order;
  }

  private generateOrderNo(): string {
    const date = dayjs().format('YYYYMMDD');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `${date}${random}`;
  }
}
