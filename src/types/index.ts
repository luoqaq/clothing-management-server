// 用户相关类型
export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'manager' | 'staff';
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

// 商品相关类型
export interface ProductCategory {
  id: number;
  name: string;
  code: string;
  parentId?: number;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  categoryId: number;
  category?: ProductCategory;
  price: number;
  costPrice: number;
  stock: number;
  images: string[];
  size?: 'S' | 'M' | 'L' | 'XL' | 'XXL';
  status: 'active' | 'inactive' | 'out_of_stock';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilters {
  search?: string;
  categoryId?: number;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
}

// 订单相关类型
export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  sku: string;
  image?: string;
  price: number;
  quantity: number;
  color?: string;
  size?: string;
}

export interface OrderAddress {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  postalCode?: string;
}

export interface Order {
  id: number;
  orderNo: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  items: OrderItem[];
  totalAmount: number;
  discountAmount?: number;
  finalAmount: number;
  status: OrderStatus;
  address: OrderAddress;
  note?: string;
  paymentMethod?: string;
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  shippedAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderFilters {
  search?: string;
  status?: OrderStatus;
  paymentStatus?: string;
  startDate?: string;
  endDate?: string;
}

// 统计相关类型
export interface DailySalesData {
  date: string;
  revenue: number;
  orders: number;
  customers: number;
}

export interface ProductSalesRanking {
  productId: number;
  productName: string;
  sku: string;
  image?: string;
  quantity: number;
  revenue: number;
}

export interface CategorySalesData {
  categoryId: number;
  categoryName: string;
  revenue: number;
  orders: number;
  percentage: number;
}

export interface RegionSalesData {
  region: string;
  revenue: number;
  orders: number;
  percentage: number;
}

export interface StatisticsSummary {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  avgOrderValue: number;
  revenueGrowth: number;
  ordersGrowth: number;
}

export interface StatisticsState {
  salesData: DailySalesData[];
  productRankings: ProductSalesRanking[];
  categorySales: CategorySalesData[];
  regionSales: RegionSalesData[];
  summary: StatisticsSummary | null;
  loading: boolean;
  error: string | null;
  dateRange: {
    start: string;
    end: string;
  };
}
