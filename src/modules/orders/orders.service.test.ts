import { describe, expect, it } from 'bun:test';
import { OrdersService } from './orders.service';
import type { Order } from '../../types';
import * as schema from '../../db/schema';

function createOrdersDbMock(orders: any[], orderItems: any[]) {
  return {
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
                orderBy: () => ({
                  limit: (pageSize: number) => ({
                    offset: async (offset: number) =>
                      orders.slice(offset, offset + pageSize),
                  }),
                }),
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
});

