import { describe, expect, it } from 'bun:test';
import { OrdersService } from './orders.service';
import type { Order } from '../../types';
import * as schema from '../../db/schema';

function createOrdersDbMock(orders: any[], orderItems: any[]) {
  const tracker = {
    orderByArgsLength: 0,
  };

  return {
    tracker,
    select(fields?: unknown) {
      return {
        from(table: unknown) {
          if (fields) {
            return {
              where: async () => [{ count: orders.length }],
            };
          }

          if (table === schema.orders) {
            return {
              where: () => ({
                orderBy: (...args: unknown[]) => {
                  tracker.orderByArgsLength = args.length;
                  return {
                  limit: (pageSize: number) => ({
                    offset: async (offset: number) =>
                      orders.slice(offset, offset + pageSize),
                  }),
                };
                },
              }),
            };
          }

          if (table === schema.orderItems) {
            return {
              where: async () => orderItems,
            };
          }

          return {
            where: async () => [],
          };
        },
      };
    },
  };
}

describe('OrdersService.getOrders', () => {
  it('returns paginated orders with items and total count', async () => {
    const orders = [
      {
        id: 1,
        orderNo: '202603200001',
        customerName: 'Alice',
        customerPhone: '13800000001',
        finalAmount: '199.00',
        paymentStatus: 'paid',
        status: 'pending',
        createdAt: new Date(),
      },
      {
        id: 2,
        orderNo: '202603200002',
        customerName: 'Bob',
        customerPhone: '13800000002',
        finalAmount: '299.00',
        paymentStatus: 'paid',
        status: 'confirmed',
        createdAt: new Date(),
      },
    ];

    const orderItems = [
      {
        id: 1,
        orderId: 2,
        productId: 10,
        productName: 'Jacket',
        price: '299.00',
        quantity: 1,
      },
    ];

    const dbMock = createOrdersDbMock(orders, orderItems);
    const service = new OrdersService(dbMock as any);

    const result = await service.getOrders({ page: 2, pageSize: 1 });

    expect(result.total).toBe(2);
    expect(result.items.length).toBe(1);
    expect(result.items[0].id).toBe(2);
    expect(Array.isArray((result.items[0] as Order).items)).toBe(true);
  });

  it('formats order datetime fields as stable database-style strings', async () => {
    const orders = [
      {
        id: 1,
        orderNo: '202604050001',
        customerName: 'Alice',
        customerPhone: '13800000001',
        customerEmail: 'alice@example.com',
        totalAmount: '199.00',
        discountAmount: '0.00',
        finalAmount: '199.00',
        paymentStatus: 'paid',
        status: 'pending',
        address: {},
        note: null,
        paymentMethod: 'cash',
        shippingCompany: null,
        trackingNumber: null,
        cancelReason: null,
        refundReason: null,
        paidAt: new Date('2026-04-05T11:53:00'),
        shippedAt: null,
        deliveredAt: null,
        createdAt: new Date('2026-04-05T11:53:00'),
        updatedAt: new Date('2026-04-05T12:10:00'),
      },
    ];

    const dbMock = createOrdersDbMock(orders, []);
    const service = new OrdersService(dbMock as any);

    const result = await service.getOrders({ page: 1, pageSize: 1 });

    expect(result.items[0].createdAt).toBe('2026-04-05 11:53:00');
    expect(result.items[0].updatedAt).toBe('2026-04-05 12:10:00');
    expect(result.items[0].paidAt).toBe('2026-04-05 11:53:00');
  });

  it('uses a stable secondary sort key for paginated order queries', async () => {
    const createdAt = new Date('2026-04-07T10:00:00');
    const orders = [
      {
        id: 3,
        orderNo: '202604070003',
        customerName: 'Alice',
        customerPhone: '13800000001',
        finalAmount: '199.00',
        paymentStatus: 'paid',
        status: 'pending',
        createdAt,
      },
      {
        id: 2,
        orderNo: '202604070002',
        customerName: 'Bob',
        customerPhone: '13800000002',
        finalAmount: '299.00',
        paymentStatus: 'paid',
        status: 'confirmed',
        createdAt,
      },
    ];

    const dbMock = createOrdersDbMock(orders, []);
    const service = new OrdersService(dbMock as any);

    await service.getOrders({ page: 1, pageSize: 1 });

    expect(dbMock.tracker.orderByArgsLength).toBe(2);
  });
});
