import { and, eq, gte, lte } from 'drizzle-orm';
import * as schema from '../../db/schema';
import type { StatisticsSummary, DailySalesData, ProductSalesRanking, CategorySalesData, RegionSalesData } from '../../types';
import dayjs from 'dayjs';

export class StatisticsService {
  constructor(private db: any) {}

  private buildPaidOrdersDateRangeWhere(dateRange: { start: string; end: string }) {
    return and(
      gte(schema.orders.createdAt, new Date(dateRange.start)),
      lte(schema.orders.createdAt, new Date(`${dateRange.end} 23:59:59`)),
      eq(schema.orders.paymentStatus, 'paid')
    );
  }

  async getSalesOverview(dateRange: { start: string; end: string }): Promise<StatisticsSummary> {
    const orders = await this.db
      .select({
        finalAmount: schema.orders.finalAmount,
        customerName: schema.orders.customerName,
        customerPhone: schema.orders.customerPhone,
      })
      .from(schema.orders)
      .where(this.buildPaidOrdersDateRangeWhere(dateRange));

    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.finalAmount), 0);
    const totalOrders = orders.length;
    const uniqueCustomers = new Set(orders.map(order => order.customerPhone)).size;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // 计算增长幅度（简单实现）
    const previousPeriod = {
      start: dayjs(dateRange.start).subtract(1, 'month').format('YYYY-MM-DD'),
      end: dayjs(dateRange.end).subtract(1, 'month').format('YYYY-MM-DD'),
    };

    const previousOrders = await this.db
      .select({
        finalAmount: schema.orders.finalAmount,
        customerName: schema.orders.customerName,
        customerPhone: schema.orders.customerPhone,
      })
      .from(schema.orders)
      .where(this.buildPaidOrdersDateRangeWhere(previousPeriod));

    const previousRevenue = previousOrders.reduce((sum, order) => sum + Number(order.finalAmount), 0);
    const previousOrdersCount = previousOrders.length;

    const revenueGrowth = previousRevenue > 0
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
      : 0;
    const ordersGrowth = previousOrdersCount > 0
      ? ((totalOrders - previousOrdersCount) / previousOrdersCount) * 100
      : 0;

    return {
      totalRevenue,
      totalOrders,
      totalCustomers: uniqueCustomers,
      avgOrderValue,
      revenueGrowth: Number(revenueGrowth.toFixed(1)),
      ordersGrowth: Number(ordersGrowth.toFixed(1)),
    };
  }

  async getDailySales(dateRange: { start: string; end: string }): Promise<DailySalesData[]> {
    const orders = await this.db
      .select({
        finalAmount: schema.orders.finalAmount,
        customerName: schema.orders.customerName,
        customerPhone: schema.orders.customerPhone,
        createdAt: schema.orders.createdAt,
      })
      .from(schema.orders)
      .where(this.buildPaidOrdersDateRangeWhere(dateRange));

    const dailyData: Record<string, DailySalesData> = {};

    // 初始化日期范围
    let currentDate = dayjs(dateRange.start);
    while (currentDate.isBefore(dayjs(dateRange.end).add(1, 'day'))) {
      const dateStr = currentDate.format('YYYY-MM-DD');
      dailyData[dateStr] = {
        date: dateStr,
        revenue: 0,
        orders: 0,
        customers: 0,
      };
      currentDate = currentDate.add(1, 'day');
    }

    // 统计数据
    const customerMap: Record<string, Record<string, boolean>> = {};

    orders.forEach(order => {
      const date = dayjs(order.createdAt).format('YYYY-MM-DD');
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          revenue: 0,
          orders: 0,
          customers: 0,
        };
      }

      dailyData[date].revenue += Number(order.finalAmount);
      dailyData[date].orders += 1;

      if (!customerMap[date]) {
        customerMap[date] = {};
      }
      customerMap[date][order.customerPhone] = true;
    });

    // 计算客户数量
    Object.keys(dailyData).forEach(date => {
      dailyData[date].customers = Object.keys(customerMap[date] || {}).length;
    });

    return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
  }

  async getProductRankings(params: {
    dateRange?: { start: string; end: string };
    limit?: number;
  }): Promise<ProductSalesRanking[]> {
    const { dateRange, limit = 10 } = params;

    let itemsQuery = this.db
      .select({
        productId: schema.orderItems.productId,
        productName: schema.orderItems.productName,
        image: schema.orderItems.image,
        price: schema.orderItems.price,
        quantity: schema.orderItems.quantity,
      })
      .from(schema.orderItems)
      .innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id));

    if (dateRange) {
      itemsQuery = itemsQuery.where(this.buildPaidOrdersDateRangeWhere(dateRange));
    } else {
      itemsQuery = itemsQuery.where(eq(schema.orders.paymentStatus, 'paid'));
    }

    const items = await itemsQuery;

    const rankings: Record<number, ProductSalesRanking> = {};

    items.forEach(item => {
      if (!rankings[item.productId]) {
        rankings[item.productId] = {
          productId: item.productId,
          productName: item.productName,
          sku: `SKU-${item.productId}`,
          image: item.image,
          quantity: 0,
          revenue: 0,
        };
      }

      rankings[item.productId].quantity += Number(item.quantity);
      rankings[item.productId].revenue += Number(item.price) * Number(item.quantity);
    });

    return Object.values(rankings)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  async getCategorySales(dateRange: { start: string; end: string }): Promise<CategorySalesData[]> {
    // 简化实现：从产品分类关系计算
    // 实际项目中需要优化查询效率
    const categories = await this.db.select().from(schema.productCategories);
    const items = await this.db
      .select({
        productId: schema.orderItems.productId,
        price: schema.orderItems.price,
        quantity: schema.orderItems.quantity,
      })
      .from(schema.orderItems)
      .innerJoin(schema.products, eq(schema.orderItems.productId, schema.products.id))
      .innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
      .where(this.buildPaidOrdersDateRangeWhere(dateRange));

    const productCategoryMap: Record<number, number> = {};
    for (const category of categories) {
      const productsInCategory = await this.db
        .select({ id: schema.products.id })
        .from(schema.products)
        .where(eq(schema.products.categoryId, category.id));

      productsInCategory.forEach(p => {
        productCategoryMap[p.id] = category.id;
      });
    }

    const categorySales: Record<number, { categoryId: number; categoryName: string; revenue: number; orders: number }> = {};
    categories.forEach(category => {
      categorySales[category.id] = {
        categoryId: category.id,
        categoryName: category.name,
        revenue: 0,
        orders: 0,
      };
    });

    items.forEach(item => {
      const categoryId = productCategoryMap[item.productId];
      if (categoryId && categorySales[categoryId]) {
        categorySales[categoryId].revenue += Number(item.price) * Number(item.quantity);
        categorySales[categoryId].orders += 1;
      }
    });

    const totalRevenue = Object.values(categorySales).reduce((sum, data) => sum + data.revenue, 0);

    return Object.values(categorySales)
      .map(data => ({
        ...data,
        percentage: totalRevenue > 0 ? Number(((data.revenue / totalRevenue) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  async getRegionSales(dateRange: { start: string; end: string }): Promise<RegionSalesData[]> {
    // 从地址中提取省份信息
    const orders = await this.db
      .select({
        finalAmount: schema.orders.finalAmount,
        address: schema.orders.address,
      })
      .from(schema.orders)
      .where(this.buildPaidOrdersDateRangeWhere(dateRange));

    const regionSales: Record<string, { region: string; revenue: number; orders: number }> = {};

    orders.forEach(order => {
      const address = typeof order.address === 'string' ? JSON.parse(order.address) : order.address;
      const province = address.province || '其他';
      const region = province.replace(/省|自治区|直辖市|特别行政区/g, ''); // 简化省份名称

      if (!regionSales[region]) {
        regionSales[region] = {
          region,
          revenue: 0,
          orders: 0,
        };
      }

      regionSales[region].revenue += Number(order.finalAmount);
      regionSales[region].orders += 1;
    });

    const totalRevenue = Object.values(regionSales).reduce((sum, data) => sum + data.revenue, 0);

    return Object.values(regionSales)
      .map(data => ({
        ...data,
        percentage: totalRevenue > 0 ? Number(((data.revenue / totalRevenue) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }
}
