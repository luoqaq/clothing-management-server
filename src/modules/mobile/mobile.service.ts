import { eq, gte } from 'drizzle-orm';
import dayjs from 'dayjs';
import * as schema from '../../db/schema';
import { AuthService } from '../auth/auth.service';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';

export class MobileService {
  private authService: AuthService;
  private productsService: ProductsService;
  private ordersService: OrdersService;

  constructor(private db: any) {
    this.authService = new AuthService(db);
    this.productsService = new ProductsService(db);
    this.ordersService = new OrdersService(db);
  }

  getAuthService() {
    return this.authService;
  }

  getProductsService() {
    return this.productsService;
  }

  getOrdersService() {
    return this.ordersService;
  }

  async getDashboardSummary() {
    const todayStart = dayjs().startOf('day').toDate();

    const [todayOrders, pendingOrders, products, activeSkus] = await Promise.all([
      this.db
        .select({ id: schema.orders.id })
        .from(schema.orders)
        .where(gte(schema.orders.createdAt, todayStart)),
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
      pageSize: 5,
    });

    return {
      todayOrderCount: todayOrders.length,
      pendingOrderCount: pendingOrders.length,
      lowStockCount,
      totalProductCount: products.length,
      latestOrders: latestOrders.items,
    };
  }

  async getProductOptions() {
    const [categories, suppliers] = await Promise.all([
      this.productsService.getCategories(),
      this.productsService.getSuppliers(),
    ]);

    return {
      categories,
      suppliers,
      productStatuses: ['draft', 'active', 'inactive'],
      specificationStatuses: ['active', 'inactive'],
    };
  }
}
