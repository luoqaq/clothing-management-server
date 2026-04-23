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

function createOrderLifecycleDbMock(orderRow: any, itemRows: any[]) {
  const updates: Array<{ table: unknown; values: Record<string, unknown> }> = [];

  return {
    updates,
    select(fields?: unknown) {
      return {
        from(table: unknown) {
          if (fields) {
            return {
              where: async () => [{ count: 1 }],
            };
          }

          if (table === schema.orders) {
            return {
              where: async () => [orderRow],
            };
          }

          if (table === schema.orderItems) {
            return {
              where: async () => itemRows,
            };
          }

          return {
            where: async () => [],
          };
        },
      };
    },
    update(table: unknown) {
      return {
        set(values: Record<string, unknown>) {
          updates.push({ table, values });
          return {
            where: async () => undefined,
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

  it('keeps original price but hides cost snapshot for sales role', async () => {
    const orders = [
      {
        id: 4,
        orderNo: '202604230004',
        customerName: 'Sales',
        customerPhone: '13800000004',
        totalAmount: '299.00',
        discountAmount: '0.00',
        finalAmount: '199.00',
        paymentStatus: 'paid',
        status: 'confirmed',
        createdAt: new Date('2026-04-23T10:00:00'),
      },
    ];

    const orderItems = [
      {
        id: 4,
        orderId: 4,
        productId: 10,
        skuId: 100,
        productName: 'Jacket',
        skuCode: 'JK-001',
        price: '299.00',
        soldPrice: '199.00',
        costPriceSnapshot: '99.00',
        quantity: 1,
      },
    ];

    const dbMock = createOrdersDbMock(orders, orderItems);
    const service = new OrdersService(dbMock as any);

    const result = await service.getOrders({ page: 1, pageSize: 20, role: 'sales' });
    const item = result.items[0].items[0];

    expect(item.price).toBe(299);
    expect(item.soldPrice).toBe(199);
    expect('costPriceSnapshot' in item).toBe(false);
  });

  it('keeps cost snapshot for admin role', async () => {
    const orders = [
      {
        id: 5,
        orderNo: '202604230005',
        customerName: 'Admin',
        customerPhone: '13800000005',
        totalAmount: '299.00',
        discountAmount: '0.00',
        finalAmount: '199.00',
        paymentStatus: 'paid',
        status: 'confirmed',
        createdAt: new Date('2026-04-23T10:00:00'),
      },
    ];

    const orderItems = [
      {
        id: 5,
        orderId: 5,
        productId: 10,
        skuId: 100,
        productName: 'Jacket',
        skuCode: 'JK-001',
        price: '299.00',
        soldPrice: '199.00',
        costPriceSnapshot: '99.00',
        quantity: 1,
      },
    ];

    const dbMock = createOrdersDbMock(orders, orderItems);
    const service = new OrdersService(dbMock as any);

    const result = await service.getOrders({ page: 1, pageSize: 20, role: 'admin' });

    expect(result.items[0].items[0].costPriceSnapshot).toBe(99);
  });
});

describe('OrdersService inventory transitions', () => {
  it('does not support shipping as an order state transition', async () => {
    const dbMock = createOrderLifecycleDbMock(
      {
        id: 11,
        orderNo: '202604180001',
        source: 'admin_web',
        customerName: 'Alice',
        customerPhone: '13800000001',
        customerEmail: null,
        totalAmount: '199.00',
        discountAmount: '0.00',
        finalAmount: '199.00',
        status: 'confirmed',
        address: {},
        note: null,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        shippingCompany: null,
        trackingNumber: null,
        cancelReason: null,
        refundReason: null,
        paidAt: new Date('2026-04-18T10:00:00'),
        shippedAt: null,
        deliveredAt: null,
        createdAt: new Date('2026-04-18T10:00:00'),
        updatedAt: new Date('2026-04-18T10:00:00'),
      },
      [
        {
          id: 1,
          orderId: 11,
          productId: 101,
          skuId: 201,
          productName: 'Jacket',
          skuCode: 'JK-001',
          image: null,
          price: '199.00',
          soldPrice: '199.00',
          costPriceSnapshot: '99.00',
          quantity: 1,
          color: '黑色',
          size: 'M',
        },
      ]
    );
    const service = new OrdersService(dbMock as any);
    await expect(service.shipOrder(11, { trackingNumber: 'SF123', shippingCompany: '顺丰' })).rejects.toThrow(
      '门店订单流程不包含发货状态'
    );
  });

  it('restores stock when a confirmed order is cancelled', async () => {
    const dbMock = createOrderLifecycleDbMock(
      {
        id: 12,
        orderNo: '202604180002',
        source: 'admin_web',
        customerName: 'Bob',
        customerPhone: '',
        customerEmail: null,
        totalAmount: '299.00',
        discountAmount: '0.00',
        finalAmount: '299.00',
        status: 'confirmed',
        address: {},
        note: null,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        shippingCompany: null,
        trackingNumber: null,
        cancelReason: null,
        refundReason: null,
        paidAt: new Date('2026-04-18T10:00:00'),
        shippedAt: null,
        deliveredAt: null,
        createdAt: new Date('2026-04-18T10:00:00'),
        updatedAt: new Date('2026-04-18T10:00:00'),
      },
      [
        {
          id: 2,
          orderId: 12,
          productId: 102,
          skuId: 202,
          productName: 'Dress',
          skuCode: 'DR-002',
          image: null,
          price: '299.00',
          soldPrice: '299.00',
          costPriceSnapshot: '129.00',
          quantity: 2,
          color: '白色',
          size: 'S',
        },
      ]
    );
    const service = new OrdersService(dbMock as any);
    const restored: Array<{ skuId: number; quantity: number }> = [];

    (service as any).productsService = {
      restoreSpecificationStock: async (skuId: number, quantity: number) => {
        restored.push({ skuId, quantity });
      },
      releaseSpecificationStock: async () => undefined,
    };

    await service.cancelOrder(12, '客户取消');

    expect(restored).toEqual([{ skuId: 202, quantity: 2 }]);
    expect(dbMock.updates[0]?.values.status).toBe('cancelled');
    expect(dbMock.updates[0]?.values.cancelReason).toBe('客户取消');
  });

  it('normalizes legacy active states to confirmed and refund states to cancelled in responses', async () => {
    const orders = [
      {
        id: 21,
        orderNo: '202604180021',
        customerName: 'Alice',
        customerPhone: '13800000001',
        totalAmount: '99.00',
        discountAmount: '0.00',
        finalAmount: '99.00',
        paymentStatus: 'paid',
        status: 'shipped',
        address: {},
        note: null,
        paymentMethod: 'cash',
        shippingCompany: null,
        trackingNumber: null,
        cancelReason: null,
        refundReason: null,
        paidAt: new Date('2026-04-18T10:00:00'),
        shippedAt: new Date('2026-04-18T10:30:00'),
        deliveredAt: null,
        createdAt: new Date('2026-04-18T10:00:00'),
        updatedAt: new Date('2026-04-18T10:30:00'),
      },
      {
        id: 22,
        orderNo: '202604180022',
        customerName: 'Bob',
        customerPhone: '13800000002',
        totalAmount: '88.00',
        discountAmount: '0.00',
        finalAmount: '88.00',
        paymentStatus: 'refunded',
        status: 'refunded',
        address: {},
        note: null,
        paymentMethod: 'cash',
        shippingCompany: null,
        trackingNumber: null,
        cancelReason: null,
        refundReason: '历史退款',
        paidAt: new Date('2026-04-18T11:00:00'),
        shippedAt: null,
        deliveredAt: null,
        createdAt: new Date('2026-04-18T11:00:00'),
        updatedAt: new Date('2026-04-18T11:30:00'),
      },
    ];

    const dbMock = createOrdersDbMock(orders, []);
    const service = new OrdersService(dbMock as any);

    const result = await service.getOrders({ page: 1, pageSize: 20 });

    expect(result.items[0].status).toBe('confirmed');
    expect(result.items[1].status).toBe('cancelled');
  });
});
