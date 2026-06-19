import { eq } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { AuthService } from '../auth/auth.service';
import { CustomersService } from '../customers/customers.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { LaborCostsService } from '../labor-costs/labor-costs.service';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';
import { StatisticsService } from '../statistics/statistics.service';

export class MobileService {
  private authService: AuthService;
  private customersService: CustomersService;
  private dashboardService: DashboardService;
  private laborCostsService: LaborCostsService;
  private productsService: ProductsService;
  private ordersService: OrdersService;
  private statisticsService: StatisticsService;

  constructor(private db: any) {
    this.authService = new AuthService(db);
    this.customersService = new CustomersService(db);
    this.dashboardService = new DashboardService(db);
    this.laborCostsService = new LaborCostsService(db);
    this.productsService = new ProductsService(db);
    this.ordersService = new OrdersService(db);
    this.statisticsService = new StatisticsService(db);
  }

  getAuthService() {
    return this.authService;
  }

  getProductsService() {
    return this.productsService;
  }

  getCustomersService() {
    return this.customersService;
  }

  getDashboardService() {
    return this.dashboardService;
  }

  getOrdersService() {
    return this.ordersService;
  }

  getLaborCostsService() {
    return this.laborCostsService;
  }

  getStatisticsService() {
    return this.statisticsService;
  }

  async getLatestOrders() {
    return this.ordersService.getOrders({
      page: 1,
      pageSize: 5,
    });
  }

  async getProductOptions(role?: string) {
    const categories = await this.productsService.getCategories();

    return {
      categories,
      suppliers: role === 'admin' ? await this.productsService.getSuppliers() : [],
      productStatuses: ['draft', 'active', 'inactive'],
      specificationStatuses: ['active', 'inactive'],
    };
  }
}
