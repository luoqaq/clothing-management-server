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

export interface ProductCategory {
  id: number;
  name: string;
  code: string;
  parentId?: number | null;
}

export interface ProductBrand {
  id: number;
  name: string;
  logo?: string | null;
}

export type ProductStatus = 'draft' | 'active' | 'inactive';
export type ProductSpecificationStatus = 'active' | 'inactive';

export interface ProductSpecification {
  id: number;
  productId: number;
  skuCode: string;
  barcode?: string | null;
  color: string;
  size: string;
  salePrice: number;
  costPrice: number;
  stock: number;
  reservedStock: number;
  availableStock: number;
  status: ProductSpecificationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: number;
  productCode: string;
  name: string;
  description?: string | null;
  categoryId: number;
  brandId?: number | null;
  category?: ProductCategory;
  brand?: ProductBrand | null;
  mainImages: string[];
  detailImages: string[];
  tags: string[];
  status: ProductStatus;
  specifications: ProductSpecification[];
  specCount: number;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  minPrice: number;
  maxPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilters {
  search?: string;
  categoryId?: number;
  brandId?: number;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export interface OrderItem {
  id: number;
  productId: number;
  skuId: number;
  productName: string;
  skuCode: string;
  image?: string | null;
  price: number;
  quantity: number;
  color?: string | null;
  size?: string | null;
}

export interface OrderAddress {
  name?: string;
  phone?: string;
  province?: string;
  city?: string;
  district?: string;
  detail?: string;
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
  address?: OrderAddress | null;
  note?: string;
  paymentMethod?: string;
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  shippingCompany?: string | null;
  trackingNumber?: string | null;
  cancelReason?: string | null;
  refundReason?: string | null;
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

export interface DailySalesData {
  date: string;
  revenue: number;
  orders: number;
  customers: number;
}

export interface ProductSalesRanking {
  productId: number;
  productName: string;
  skuCode: string;
  specification: string;
  image?: string | null;
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
