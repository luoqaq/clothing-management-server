import { and, eq, ne, sql } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { toDbRangeEnd, toDbRangeStart } from '../../utils/date';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';

export class DashboardService {
  private ordersService: OrdersService;
  private productsService: ProductsService;

  constructor(private db: any) {
    this.ordersService = new OrdersService(db);
    this.productsService = new ProductsService(db);
  }

  async getDashboardSummary(params?: { startDate?: string; endDate?: string }) {
    const start = toDbRangeStart(params?.startDate);
    const end = toDbRangeEnd(params?.endDate);

    const dateRangeCondition = and(
      sql`${schema.orders.createdAt} >= ${start}`,
      sql`${schema.orders.createdAt} <= ${end}`
    );

    const [allOrders, validOrders, cancelledOrders, pendingOrders, products, activeSkus] = await Promise.all([
      this.db
        .select({ id: schema.orders.id })
        .from(schema.orders)
        .where(dateRangeCondition),
      this.db
        .select({ id: schema.orders.id, finalAmount: schema.orders.finalAmount })
        .from(schema.orders)
        .where(
          and(
            dateRangeCondition,
            ne(schema.orders.status, 'cancelled')
          )
        ),
      this.db
        .select({ id: schema.orders.id })
        .from(schema.orders)
        .where(
          and(
            dateRangeCondition,
            eq(schema.orders.status, 'cancelled')
          )
        ),
      this.db
        .select({ id: schema.orders.id })
        .from(schema.orders)
        .where(eq(schema.orders.status, 'pending')),
      this.db
        .select({ id: schema.products.id })
        .from(schema.products),
      this.db
        .select({
          stock: schema.productSkus.stock,
          reservedStock: schema.productSkus.reservedStock,
        })
        .from(schema.productSkus)
        .where(eq(schema.productSkus.status, 'active')),
    ]);

    const lowStockCount = activeSkus.filter((item: any) => {
      const stock = Number(item.stock ?? 0);
      const reservedStock = Number(item.reservedStock ?? 0);
      return Math.max(stock - reservedStock, 0) <= 10;
    }).length;

    const latestOrders = await this.ordersService.getOrders({
      page: 1,
      pageSize: 20,
      filters: {
        startDate: start,
        endDate: end,
      },
    });

    const salesAmount = validOrders.reduce((sum: number, order: any) => sum + Number(order.finalAmount ?? 0), 0);

    return {
      orderCount: allOrders.length,
      salesAmount,
      cancelledCount: cancelledOrders.length,
      pendingOrderCount: pendingOrders.length,
      lowStockCount,
      totalProductCount: products.length,
      latestOrders: latestOrders.items,
    };
  }
}
