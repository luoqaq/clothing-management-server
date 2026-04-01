export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'sales';
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

export interface Supplier {
  id: number;
  name: string;
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
  supplierId?: number | null;
  category?: ProductCategory;
  supplier?: Supplier | null;
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

export type ImportSourceType = 'excel' | 'image';
export type ImportIssueLevel = 'error' | 'warning';

export interface ImportDraftSpecification {
  rowKey: string;
  barcode?: string | null;
  color: string;
  size: string;
  salePrice: number;
  costPrice: number;
  stock: number;
  status: ProductSpecificationStatus;
}

export interface ImportDraftProduct {
  rowKey: string;
  source: ImportSourceType;
  productCode: string;
  name: string;
  description?: string | null;
  categoryId?: number | null;
  categoryName?: string | null;
  supplierId?: number | null;
  supplierName?: string | null;
  tags: string[];
  status: ProductStatus;
  specifications: ImportDraftSpecification[];
}

export interface ImportIssue {
  level: ImportIssueLevel;
  rowKey: string;
  field: string;
  message: string;
  specRowKey?: string;
}

export interface ImportParseResult {
  drafts: ImportDraftProduct[];
  issues: ImportIssue[];
}

export interface BulkCreateProductsResultItem {
  rowKey: string;
  productCode: string;
  status: 'success' | 'failed';
  message: string;
  productId?: number;
}

export interface BulkCreateProductsResponse {
  successCount: number;
  failureCount: number;
  results: BulkCreateProductsResultItem[];
}

export interface ProductFilters {
  search?: string;
  categoryId?: number;
  supplierId?: number;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type OrderSource = 'admin_web' | 'staff_miniapp';

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
  source: OrderSource;
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
  source?: OrderSource;
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
