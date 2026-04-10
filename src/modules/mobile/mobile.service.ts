import { eq } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { AuthService } from '../auth/auth.service';
import { CustomersService } from '../customers/customers.service';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';

export class MobileService {
  private authService: AuthService;
  private customersService: CustomersService;
  private productsService: ProductsService;
  private ordersService: OrdersService;

  constructor(private db: any) {
    this.authService = new AuthService(db);
    this.customersService = new CustomersService(db);
    this.productsService = new ProductsService(db);
    this.ordersService = new OrdersService(db);
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

  getOrdersService() {
    return this.ordersService;
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
