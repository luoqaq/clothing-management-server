import { describe, expect, it } from 'bun:test';
import * as schema from '../../db/schema';
import { StatisticsService } from './statistics.service';

function createStatisticsDbMock(customers: any[]) {
  return {
    select() {
      return {
        from(table: unknown) {
          if (table === schema.customers) {
            return Promise.resolve(customers);
          }
          return Promise.resolve([]);
        },
      };
    },
  };
}

describe('StatisticsService.getSalesOverview', () => {
  it('calculates new/returning customers and gross profit using paid orders and cost snapshots', async () => {
    const customers = [
      {
        id: 1,
        phone: '13800000001',
        firstPaidOrderAt: new Date('2026-03-10 10:00:00'),
      },
      {
        id: 2,
        phone: '13800000002',
        firstPaidOrderAt: new Date('2026-01-15 10:00:00'),
      },
    ];

    const service = new StatisticsService(createStatisticsDbMock(customers) as any) as any;
    service.getValidPaidOrders = async (dateRange: { start: string }) => {
      if (dateRange.start === '2026-03-01') {
        return [
          { id: 1, customerId: 1, customerPhone: '13800000001', finalAmount: 200, paidAt: new Date('2026-03-10 10:00:00') },
          { id: 2, customerId: 2, customerPhone: '13800000002', finalAmount: 100, paidAt: new Date('2026-03-12 10:00:00') },
        ];
      }

      return [
        { id: 3, customerId: 2, customerPhone: '13800000002', finalAmount: 80, paidAt: new Date('2026-02-10 10:00:00') },
      ];
    };
    service.getValidPaidOrderItems = async (dateRange: { start: string }) => {
      if (dateRange.start === '2026-03-01') {
        return [
          { orderId: 1, productId: 1, productCode: 'A-1', productName: '连衣裙', image: null, categoryId: 1, categoryName: '裙装', price: 100, costPriceSnapshot: 60, quantity: 2 },
          { orderId: 2, productId: 2, productCode: 'B-1', productName: '衬衫', image: null, categoryId: 2, categoryName: '上装', price: 100, costPriceSnapshot: 50, quantity: 1 },
        ];
      }

      return [
        { orderId: 3, productId: 3, productCode: 'C-1', productName: '外套', image: null, categoryId: 3, categoryName: '外套', price: 80, costPriceSnapshot: 40, quantity: 1 },
      ];
    };

    const result = await service.getSalesOverview({ start: '2026-03-01', end: '2026-03-31' });

    expect(result.totalRevenue).toBe(300);
    expect(result.totalCost).toBe(170);
    expect(result.totalGrossProfit).toBe(130);
    expect(result.totalCustomers).toBe(2);
    expect(result.newCustomers).toBe(1);
    expect(result.returningCustomers).toBe(1);
  });
});
