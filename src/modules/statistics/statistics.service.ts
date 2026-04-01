import { and, eq, gte, lte, ne } from 'drizzle-orm';
import dayjs from 'dayjs';
import * as schema from '../../db/schema';
import type {
  CategorySalesData,
  CostProductRankingItem,
  CostOverviewResponse,
  CustomerAnalysisResponse,
  DailySalesData,
  ProductSalesRanking,
  StatisticsSummary,
} from '../../types';

type DateRange = { start: string; end: string };

type PaidOrderRow = {
  id: number;
  customerId: number | null;
  customerPhone: string;
  finalAmount: number;
  paidAt: Date;
};

type PaidOrderItemRow = {
  orderId: number;
  productId: number;
  productCode: string;
  productName: string;
  image?: string | null;
  categoryId: number;
  categoryName: string;
  price: number;
  costPriceSnapshot: number;
  quantity: number;
};

type ProductCostRow = {
  productId: number;
  skuId: number;
  productCode: string;
  skuCode: string;
  productName: string;
  color: string;
  size: string;
  image?: string | null;
  categoryId: number;
  categoryName: string;
  stock: number;
  costPrice: number;
  cumulativeInboundQuantity: number;
  cumulativeCostAmount: number;
};

export class StatisticsService {
  constructor(private db: any) {}

  private isSchemaCompatibilityError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes('paid_at') ||
      message.includes('customer_id') ||
      message.includes('cost_price_snapshot') ||
      message.includes('customers') ||
      message.includes('customer_age_buckets') ||
      message.includes('cumulative_inbound_quantity') ||
      message.includes('cumulative_cost_amount')
    );
  }

  private buildValidPaidOrdersDateRangeWhere(dateRange: DateRange, useLegacyCreatedAt = false) {
    return and(
      eq(schema.orders.paymentStatus, 'paid'),
      ne(schema.orders.status, 'cancelled'),
      ne(schema.orders.status, 'refunded'),
      gte(useLegacyCreatedAt ? schema.orders.createdAt : schema.orders.paidAt, new Date(dateRange.start)),
      lte(useLegacyCreatedAt ? schema.orders.createdAt : schema.orders.paidAt, new Date(`${dateRange.end} 23:59:59`))
    );
  }

  private getPreviousPeriod(dateRange: DateRange): DateRange {
    const start = dayjs(dateRange.start);
    const end = dayjs(dateRange.end);
    const duration = Math.max(end.diff(start, 'day') + 1, 1);
    return {
      start: start.subtract(duration, 'day').format('YYYY-MM-DD'),
      end: end.subtract(duration, 'day').format('YYYY-MM-DD'),
    };
  }

  private async getValidPaidOrders(dateRange: DateRange): Promise<PaidOrderRow[]> {
    try {
      const rows = await this.db
        .select({
          id: schema.orders.id,
          customerId: schema.orders.customerId,
          customerPhone: schema.orders.customerPhone,
          finalAmount: schema.orders.finalAmount,
          paidAt: schema.orders.paidAt,
        })
        .from(schema.orders)
        .where(this.buildValidPaidOrdersDateRangeWhere(dateRange));

      return rows.map((row: any) => ({
        id: Number(row.id),
        customerId: row.customerId ? Number(row.customerId) : null,
        customerPhone: row.customerPhone ?? '',
        finalAmount: Number(row.finalAmount ?? 0),
        paidAt: row.paidAt,
      }));
    } catch (error) {
      if (!this.isSchemaCompatibilityError(error)) {
        throw error;
      }

      const rows = await this.db
        .select({
          id: schema.orders.id,
          customerPhone: schema.orders.customerPhone,
          finalAmount: schema.orders.finalAmount,
          createdAt: schema.orders.createdAt,
        })
        .from(schema.orders)
        .where(this.buildValidPaidOrdersDateRangeWhere(dateRange, true));

      return rows.map((row: any) => ({
        id: Number(row.id),
        customerId: null,
        customerPhone: row.customerPhone ?? '',
        finalAmount: Number(row.finalAmount ?? 0),
        paidAt: row.createdAt,
      }));
    }
  }

  private async getValidPaidOrderItems(dateRange: DateRange): Promise<PaidOrderItemRow[]> {
    try {
      const rows = await this.db
        .select({
          orderId: schema.orderItems.orderId,
          productId: schema.orderItems.productId,
          productCode: schema.products.productCode,
          productName: schema.orderItems.productName,
          image: schema.orderItems.image,
          categoryId: schema.products.categoryId,
          categoryName: schema.productCategories.name,
          price: schema.orderItems.price,
          costPriceSnapshot: schema.orderItems.costPriceSnapshot,
          quantity: schema.orderItems.quantity,
        })
        .from(schema.orderItems)
        .innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
        .innerJoin(schema.products, eq(schema.orderItems.productId, schema.products.id))
        .innerJoin(schema.productCategories, eq(schema.products.categoryId, schema.productCategories.id))
        .where(this.buildValidPaidOrdersDateRangeWhere(dateRange));

      return rows.map((row: any) => ({
        orderId: Number(row.orderId),
        productId: Number(row.productId),
        productCode: row.productCode,
        productName: row.productName,
        image: row.image ?? null,
        categoryId: Number(row.categoryId),
        categoryName: row.categoryName,
        price: Number(row.price ?? 0),
        costPriceSnapshot: Number(row.costPriceSnapshot ?? 0),
        quantity: Number(row.quantity ?? 0),
      }));
    } catch (error) {
      if (!this.isSchemaCompatibilityError(error)) {
        throw error;
      }

      const rows = await this.db
        .select({
          orderId: schema.orderItems.orderId,
          productId: schema.orderItems.productId,
          productCode: schema.products.productCode,
          productName: schema.orderItems.productName,
          image: schema.orderItems.image,
          categoryId: schema.products.categoryId,
          categoryName: schema.productCategories.name,
          price: schema.orderItems.price,
          costPrice: schema.productSkus.costPrice,
          quantity: schema.orderItems.quantity,
        })
        .from(schema.orderItems)
        .innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
        .innerJoin(schema.products, eq(schema.orderItems.productId, schema.products.id))
        .innerJoin(schema.productSkus, eq(schema.orderItems.skuId, schema.productSkus.id))
        .innerJoin(schema.productCategories, eq(schema.products.categoryId, schema.productCategories.id))
        .where(this.buildValidPaidOrdersDateRangeWhere(dateRange, true));

      return rows.map((row: any) => ({
        orderId: Number(row.orderId),
        productId: Number(row.productId),
        productCode: row.productCode,
        productName: row.productName,
        image: row.image ?? null,
        categoryId: Number(row.categoryId),
        categoryName: row.categoryName,
        price: Number(row.price ?? 0),
        costPriceSnapshot: Number(row.costPrice ?? 0),
        quantity: Number(row.quantity ?? 0),
      }));
    }
  }

  private async getCustomersMap(customerIds: number[]) {
    if (!customerIds.length) {
      return new Map<number, any>();
    }

    try {
      const rows = await this.db.select().from(schema.customers);
      return new Map(
        rows
          .filter((row: any) => customerIds.includes(Number(row.id)))
          .map((row: any) => [Number(row.id), row])
      );
    } catch (error) {
      if (!this.isSchemaCompatibilityError(error)) {
        throw error;
      }
      return new Map<number, any>();
    }
  }

  private async getProductCostRows(): Promise<ProductCostRow[]> {
    let rows: any[] = [];

    try {
      rows = await this.db
        .select({
          productId: schema.products.id,
          skuId: schema.productSkus.id,
          productCode: schema.products.productCode,
          skuCode: schema.productSkus.skuCode,
          productName: schema.products.name,
          color: schema.productSkus.color,
          size: schema.productSkus.size,
          image: schema.products.mainImages,
          categoryId: schema.products.categoryId,
          categoryName: schema.productCategories.name,
          stock: schema.productSkus.stock,
          costPrice: schema.productSkus.costPrice,
          cumulativeInboundQuantity: schema.productSkus.cumulativeInboundQuantity,
          cumulativeCostAmount: schema.productSkus.cumulativeCostAmount,
        })
        .from(schema.productSkus)
        .innerJoin(schema.products, eq(schema.productSkus.productId, schema.products.id))
        .innerJoin(schema.productCategories, eq(schema.products.categoryId, schema.productCategories.id));
    } catch (error) {
      if (!this.isSchemaCompatibilityError(error)) {
        throw error;
      }

      rows = await this.db
        .select({
          productId: schema.products.id,
          skuId: schema.productSkus.id,
          productCode: schema.products.productCode,
          skuCode: schema.productSkus.skuCode,
          productName: schema.products.name,
          color: schema.productSkus.color,
          size: schema.productSkus.size,
          image: schema.products.mainImages,
          categoryId: schema.products.categoryId,
          categoryName: schema.productCategories.name,
          stock: schema.productSkus.stock,
          costPrice: schema.productSkus.costPrice,
        })
        .from(schema.productSkus)
        .innerJoin(schema.products, eq(schema.productSkus.productId, schema.products.id))
        .innerJoin(schema.productCategories, eq(schema.products.categoryId, schema.productCategories.id));
    }

    return rows.map((row: any) => {
      const normalizedImages = Array.isArray(row.image)
        ? row.image
        : typeof row.image === 'string'
          ? (() => {
              try {
                const parsed = JSON.parse(row.image);
                return Array.isArray(parsed) ? parsed : [];
              } catch {
                return [];
              }
            })()
          : [];

      return {
        productId: Number(row.productId),
        skuId: Number(row.skuId),
        productCode: row.productCode,
        skuCode: row.skuCode,
        productName: row.productName,
        color: row.color,
        size: row.size,
        image: normalizedImages[0] ?? null,
        categoryId: Number(row.categoryId),
        categoryName: row.categoryName,
        stock: Number(row.stock ?? 0),
        costPrice: Number(row.costPrice ?? 0),
        cumulativeInboundQuantity: Number(row.cumulativeInboundQuantity ?? row.stock ?? 0),
        cumulativeCostAmount:
          row.cumulativeCostAmount !== undefined
            ? Number(row.cumulativeCostAmount ?? 0)
            : Number(row.stock ?? 0) * Number(row.costPrice ?? 0),
      };
    });
  }

  private buildInventoryCostRanking(rows: ProductCostRow[]): CostProductRankingItem[] {
    return rows.map((row) => ({
      productId: row.productId,
      skuId: row.skuId,
      productCode: row.productCode,
      skuCode: row.skuCode,
      productName: row.productName,
      color: row.color,
      size: row.size,
      image: row.image ?? null,
      stock: row.stock,
      costPrice: row.costPrice,
      totalCost: row.cumulativeCostAmount,
      cumulativeInboundQuantity: row.cumulativeInboundQuantity,
    }));
  }

  private buildInventoryCostCategoryAggregates(rows: ProductCostRow[]): CategorySalesData[] {
    const categoryMap = new Map<number, CategorySalesData>();

    rows.forEach((row) => {
      const current = categoryMap.get(row.categoryId) ?? {
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        revenue: 0,
        cost: 0,
        orders: 0,
        quantity: 0,
        grossProfit: 0,
        grossMargin: 0,
        revenuePercentage: 0,
        costPercentage: 0,
      };

      current.quantity += row.cumulativeInboundQuantity;
      current.cost += row.cumulativeCostAmount;

      categoryMap.set(row.categoryId, current);
    });

    const totalCost = Array.from(categoryMap.values()).reduce((sum, item) => sum + item.cost, 0);

    return Array.from(categoryMap.values())
      .map((item) => ({
        ...item,
        costPercentage: totalCost > 0 ? Number(((item.cost / totalCost) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.cost - a.cost);
  }

  private async getLegacyCustomerSegments(dateRange: DateRange) {
    const currentOrders = await this.getValidPaidOrders(dateRange);
    const previousOrders = await this.getValidPaidOrders({
      start: '2024-01-01',
      end: dayjs(dateRange.start).subtract(1, 'day').format('YYYY-MM-DD'),
    });

    const currentPhones = Array.from(new Set(currentOrders.map((item) => item.customerPhone).filter(Boolean)));
    const previousPhones = new Set(previousOrders.map((item) => item.customerPhone).filter(Boolean));

    const newCustomers = currentPhones.filter((phone) => !previousPhones.has(phone)).length;
    const returningCustomers = currentPhones.filter((phone) => previousPhones.has(phone)).length;

    return {
      totalCustomers: currentPhones.length,
      newCustomers,
      returningCustomers,
      ageDistribution: [
        {
          ageBucketId: null,
          ageBucketName: '未知',
          customerCount: currentPhones.length,
          percentage: currentPhones.length > 0 ? 100 : 0,
        },
      ],
    };
  }

  private buildProductAggregates(items: PaidOrderItemRow[]): ProductSalesRanking[] {
    const rankingMap = new Map<number, ProductSalesRanking>();

    items.forEach((item) => {
      const current = rankingMap.get(item.productId) ?? {
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        image: item.image ?? null,
        quantity: 0,
        revenue: 0,
        cost: 0,
        grossProfit: 0,
        grossMargin: 0,
      };

      current.quantity += item.quantity;
      current.revenue += item.price * item.quantity;
      current.cost += item.costPriceSnapshot * item.quantity;
      current.grossProfit = current.revenue - current.cost;
      current.grossMargin = current.revenue > 0 ? Number(((current.grossProfit / current.revenue) * 100).toFixed(1)) : 0;

      rankingMap.set(item.productId, current);
    });

    return Array.from(rankingMap.values());
  }

  private buildCategoryAggregates(items: PaidOrderItemRow[]): CategorySalesData[] {
    const categoryMap = new Map<number, CategorySalesData & { orderIds: Set<number> }>();

    items.forEach((item) => {
      const current = categoryMap.get(item.categoryId) ?? {
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        revenue: 0,
        cost: 0,
        orders: 0,
        quantity: 0,
        grossProfit: 0,
        grossMargin: 0,
        revenuePercentage: 0,
        costPercentage: 0,
        orderIds: new Set<number>(),
      };

      current.revenue += item.price * item.quantity;
      current.cost += item.costPriceSnapshot * item.quantity;
      current.quantity += item.quantity;
      current.grossProfit = current.revenue - current.cost;
      current.grossMargin = current.revenue > 0 ? Number(((current.grossProfit / current.revenue) * 100).toFixed(1)) : 0;
      current.orderIds.add(item.orderId);

      categoryMap.set(item.categoryId, current);
    });

    const totalRevenue = Array.from(categoryMap.values()).reduce((sum, item) => sum + item.revenue, 0);
    const totalCost = Array.from(categoryMap.values()).reduce((sum, item) => sum + item.cost, 0);

    return Array.from(categoryMap.values())
      .map((item) => ({
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        revenue: item.revenue,
        cost: item.cost,
        orders: item.orderIds.size,
        quantity: item.quantity,
        grossProfit: item.grossProfit,
        grossMargin: item.grossMargin,
        revenuePercentage: totalRevenue > 0 ? Number(((item.revenue / totalRevenue) * 100).toFixed(1)) : 0,
        costPercentage: totalCost > 0 ? Number(((item.cost / totalCost) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  async getSalesOverview(dateRange: DateRange): Promise<StatisticsSummary> {
    const [orders, items, previousOrders, previousItems] = await Promise.all([
      this.getValidPaidOrders(dateRange),
      this.getValidPaidOrderItems(dateRange),
      this.getValidPaidOrders(this.getPreviousPeriod(dateRange)),
      this.getValidPaidOrderItems(this.getPreviousPeriod(dateRange)),
    ]);

    const totalRevenue = orders.reduce((sum, item) => sum + item.finalAmount, 0);
    const totalCost = items.reduce((sum, item) => sum + item.costPriceSnapshot * item.quantity, 0);
    const totalGrossProfit = totalRevenue - totalCost;
    const totalOrders = orders.length;
    let totalCustomers = 0;
    let newCustomers = 0;
    let returningCustomers = 0;

    try {
      const customers = await this.db.select().from(schema.customers);
      const customerIds = Array.from(new Set(orders.map((item) => item.customerId).filter(Boolean))) as number[];
      totalCustomers = customerIds.length;
      const customerMap = new Map(customers.map((item: any) => [Number(item.id), item]));
      newCustomers = customerIds.filter((customerId) => {
        const customer = customerMap.get(customerId);
        if (!customer?.firstPaidOrderAt) {
          return false;
        }
        const firstPaidAt = dayjs(customer.firstPaidOrderAt);
        return firstPaidAt.isSame(dayjs(dateRange.start), 'day') || (firstPaidAt.isAfter(dayjs(dateRange.start)) && firstPaidAt.isBefore(dayjs(dateRange.end).endOf('day')));
      }).length;
      returningCustomers = Math.max(totalCustomers - newCustomers, 0);
    } catch (error) {
      if (!this.isSchemaCompatibilityError(error)) {
        throw error;
      }
      const legacySegments = await this.getLegacyCustomerSegments(dateRange);
      totalCustomers = legacySegments.totalCustomers;
      newCustomers = legacySegments.newCustomers;
      returningCustomers = legacySegments.returningCustomers;
    }
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const avgCostPerOrder = totalOrders > 0 ? totalCost / totalOrders : 0;

    const previousRevenue = previousOrders.reduce((sum, item) => sum + item.finalAmount, 0);
    const previousCost = previousItems.reduce((sum, item) => sum + item.costPriceSnapshot * item.quantity, 0);
    const previousGrossProfit = previousRevenue - previousCost;

    return {
      totalRevenue,
      totalCost,
      totalGrossProfit,
      totalOrders,
      totalCustomers,
      newCustomers,
      returningCustomers,
      avgOrderValue,
      avgCostPerOrder,
      revenueGrowth: previousRevenue > 0 ? Number((((totalRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1)) : 0,
      costGrowth: previousCost > 0 ? Number((((totalCost - previousCost) / previousCost) * 100).toFixed(1)) : 0,
      grossProfitGrowth: previousGrossProfit !== 0 ? Number((((totalGrossProfit - previousGrossProfit) / Math.abs(previousGrossProfit)) * 100).toFixed(1)) : 0,
      ordersGrowth: previousOrders.length > 0 ? Number((((totalOrders - previousOrders.length) / previousOrders.length) * 100).toFixed(1)) : 0,
    };
  }

  async getDailySales(dateRange: DateRange): Promise<DailySalesData[]> {
    const [orders, items] = await Promise.all([
      this.getValidPaidOrders(dateRange),
      this.getValidPaidOrderItems(dateRange),
    ]);

    const dailyData = new Map<string, DailySalesData>();
    const customerMap = new Map<string, Set<number>>();

    let current = dayjs(dateRange.start);
    while (current.isBefore(dayjs(dateRange.end).add(1, 'day'))) {
      const date = current.format('YYYY-MM-DD');
      dailyData.set(date, {
        date,
        revenue: 0,
        cost: 0,
        grossProfit: 0,
        orders: 0,
        customers: 0,
      });
      current = current.add(1, 'day');
    }

    orders.forEach((order) => {
      const date = dayjs(order.paidAt).format('YYYY-MM-DD');
      const currentRow = dailyData.get(date);
      if (!currentRow) return;

      currentRow.revenue += order.finalAmount;
      currentRow.orders += 1;
      if (order.customerId) {
        const set = customerMap.get(date) ?? new Set<number>();
        set.add(order.customerId);
        customerMap.set(date, set);
      }
    });

    items.forEach((item) => {
      const order = orders.find((currentOrder) => currentOrder.id === item.orderId);
      if (!order) return;
      const date = dayjs(order.paidAt).format('YYYY-MM-DD');
      const currentRow = dailyData.get(date);
      if (!currentRow) return;
      currentRow.cost += item.costPriceSnapshot * item.quantity;
      currentRow.grossProfit = currentRow.revenue - currentRow.cost;
    });

    Array.from(dailyData.keys()).forEach((date) => {
      dailyData.get(date)!.customers = (customerMap.get(date) ?? new Set<number>()).size;
    });

    return Array.from(dailyData.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  async getSalesCustomerAnalysis(dateRange: DateRange): Promise<CustomerAnalysisResponse> {
    const orders = await this.getValidPaidOrders(dateRange);

    try {
      const customerIds = Array.from(new Set(orders.map((item) => item.customerId).filter(Boolean))) as number[];
      const customersMap = await this.getCustomersMap(customerIds);

      const ageDistributionMap = new Map<string, { ageBucketId?: number | null; ageBucketName: string; customerCount: number }>();
      let newCustomers = 0;
      let returningCustomers = 0;

      customerIds.forEach((customerId) => {
        const customer = customersMap.get(customerId);
        if (!customer) return;
        const isNewCustomer = customer.firstPaidOrderAt
          ? dayjs(customer.firstPaidOrderAt).isSame(dayjs(dateRange.start), 'day') ||
            (dayjs(customer.firstPaidOrderAt).isAfter(dayjs(dateRange.start)) && dayjs(customer.firstPaidOrderAt).isBefore(dayjs(dateRange.end).endOf('day')))
          : false;

        if (isNewCustomer) {
          newCustomers += 1;
        } else {
          returningCustomers += 1;
        }

        const ageKey = customer.ageBucketId ? String(customer.ageBucketId) : 'unknown';
        const current = ageDistributionMap.get(ageKey) ?? {
          ageBucketId: customer.ageBucketId ? Number(customer.ageBucketId) : null,
          ageBucketName: customer.ageBucketId ? `bucket-${customer.ageBucketId}` : '未知',
          customerCount: 0,
        };
        current.customerCount += 1;
        ageDistributionMap.set(ageKey, current);
      });

      const ageBuckets = await this.db.select().from(schema.customerAgeBuckets);
      const ageBucketMap = new Map(ageBuckets.map((item: any) => [String(item.id), item.name]));
      const totalCustomers = customerIds.length;

      return {
        customerCount: totalCustomers,
        newCustomers,
        returningCustomers,
        ageDistribution: Array.from(ageDistributionMap.entries())
          .map(([key, value]) => ({
            ageBucketId: value.ageBucketId ?? null,
            ageBucketName: key === 'unknown' ? '未知' : ageBucketMap.get(key) ?? '未命名年龄段',
            customerCount: value.customerCount,
            percentage: totalCustomers > 0 ? Number(((value.customerCount / totalCustomers) * 100).toFixed(1)) : 0,
          }))
          .sort((a, b) => b.customerCount - a.customerCount),
      };
    } catch (error) {
      if (!this.isSchemaCompatibilityError(error)) {
        throw error;
      }
      const legacySegments = await this.getLegacyCustomerSegments(dateRange);
      return {
        customerCount: legacySegments.totalCustomers,
        newCustomers: legacySegments.newCustomers,
        returningCustomers: legacySegments.returningCustomers,
        ageDistribution: legacySegments.ageDistribution,
      };
    }
  }

  async getSalesCategoryAnalysis(dateRange: DateRange): Promise<CategorySalesData[]> {
    const items = await this.getValidPaidOrderItems(dateRange);
    return this.buildCategoryAggregates(items);
  }

  async getSalesProductRanking(dateRange: DateRange, limit = 10): Promise<ProductSalesRanking[]> {
    const items = await this.getValidPaidOrderItems(dateRange);
    return this.buildProductAggregates(items).sort((a, b) => b.revenue - a.revenue).slice(0, limit);
  }

  async getSalesGrossProfitAnalysis(dateRange: DateRange, limit = 10): Promise<ProductSalesRanking[]> {
    const items = await this.getValidPaidOrderItems(dateRange);
    return this.buildProductAggregates(items).sort((a, b) => b.grossProfit - a.grossProfit).slice(0, limit);
  }

  async getCostOverview(dateRange: DateRange): Promise<CostOverviewResponse> {
    const items = await this.getProductCostRows();
    return {
      totalCost: items.reduce((sum, item) => sum + item.cumulativeCostAmount, 0),
    };
  }

  async getCostCategoryAnalysis(dateRange: DateRange): Promise<CategorySalesData[]> {
    const items = await this.getProductCostRows();
    return this.buildInventoryCostCategoryAggregates(items);
  }

  async getCostProductRanking(dateRange: DateRange, limit = 10): Promise<CostProductRankingItem[]> {
    const items = await this.getProductCostRows();
    return this.buildInventoryCostRanking(items)
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, limit);
  }

  async getProductRankings(params: { dateRange?: DateRange; limit?: number }): Promise<ProductSalesRanking[]> {
    const dateRange = params.dateRange ?? {
      start: '2024-01-01',
      end: dayjs().format('YYYY-MM-DD'),
    };
    return this.getSalesProductRanking(dateRange, params.limit ?? 10);
  }

  async getCategorySales(dateRange: DateRange): Promise<CategorySalesData[]> {
    return this.getSalesCategoryAnalysis(dateRange);
  }
}
