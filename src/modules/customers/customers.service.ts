import { eq } from 'drizzle-orm';
import * as schema from '../../db/schema';
import type { Customer, CustomerAgeBucket } from '../../types';

export class CustomersService {
  constructor(private db: any) {}

  private readonly migrationRequiredMessage = '当前数据库尚未执行 customer statistics 迁移（drizzle/0005_customer_statistics.sql），暂时无法维护客户年龄段或客户档案。';

  private isSchemaCompatibilityError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes('customer_age_buckets') || message.includes('customers');
  }

  private handleWriteCompatibilityError(error: unknown): never {
    if (this.isSchemaCompatibilityError(error)) {
      throw new Error(this.migrationRequiredMessage);
    }
    throw error;
  }

  async getAgeBuckets(): Promise<CustomerAgeBucket[]> {
    try {
      const rows = await this.db.select().from(schema.customerAgeBuckets).orderBy(schema.customerAgeBuckets.sortOrder, schema.customerAgeBuckets.id);
      return rows.map((row: any) => ({
        id: Number(row.id),
        name: row.name,
        sortOrder: Number(row.sortOrder ?? 0),
        createdAt: String(row.createdAt),
        updatedAt: String(row.updatedAt),
      }));
    } catch (error) {
      if (!this.isSchemaCompatibilityError(error)) {
        throw error;
      }
      return [];
    }
  }

  async createAgeBucket(data: { name: string; sortOrder: number }): Promise<CustomerAgeBucket> {
    try {
      const inserted = await this.db.insert(schema.customerAgeBuckets).values({
        name: data.name,
        sortOrder: data.sortOrder,
      }).$returningId();

      const id = inserted[0]?.id;
      const rows = await this.db.select().from(schema.customerAgeBuckets).where(eq(schema.customerAgeBuckets.id, id));
      return this.mapAgeBucket(rows[0]);
    } catch (error) {
      this.handleWriteCompatibilityError(error);
    }
  }

  async updateAgeBucket(id: number, data: Partial<{ name: string; sortOrder: number }>): Promise<CustomerAgeBucket | null> {
    try {
      const exists = await this.db.select().from(schema.customerAgeBuckets).where(eq(schema.customerAgeBuckets.id, id));
      if (!exists[0]) return null;

      await this.db.update(schema.customerAgeBuckets).set(data).where(eq(schema.customerAgeBuckets.id, id));
      const rows = await this.db.select().from(schema.customerAgeBuckets).where(eq(schema.customerAgeBuckets.id, id));
      return this.mapAgeBucket(rows[0]);
    } catch (error) {
      this.handleWriteCompatibilityError(error);
    }
  }

  async deleteAgeBucket(id: number) {
    try {
      await this.db.update(schema.customers).set({ ageBucketId: null }).where(eq(schema.customers.ageBucketId, id));
      await this.db.delete(schema.customerAgeBuckets).where(eq(schema.customerAgeBuckets.id, id));
    } catch (error) {
      this.handleWriteCompatibilityError(error);
    }
  }

  async getCustomers(): Promise<Customer[]> {
    try {
      const [customers, ageBuckets] = await Promise.all([
        this.db.select().from(schema.customers).orderBy(schema.customers.lastPaidOrderAt, schema.customers.id),
        this.getAgeBuckets(),
      ]);
      const ageBucketMap = new Map(ageBuckets.map((item) => [item.id, item]));

      return customers.map((row: any) => ({
        id: Number(row.id),
        phone: row.phone,
        name: row.name,
        email: row.email ?? null,
        ageBucketId: row.ageBucketId ? Number(row.ageBucketId) : null,
        ageBucket: row.ageBucketId ? ageBucketMap.get(Number(row.ageBucketId)) ?? null : null,
        firstPaidOrderAt: row.firstPaidOrderAt ? String(row.firstPaidOrderAt) : null,
        lastPaidOrderAt: row.lastPaidOrderAt ? String(row.lastPaidOrderAt) : null,
        paidOrderCount: Number(row.paidOrderCount ?? 0),
        createdAt: String(row.createdAt),
        updatedAt: String(row.updatedAt),
      }));
    } catch (error) {
      if (!this.isSchemaCompatibilityError(error)) {
        throw error;
      }
      return [];
    }
  }

  async updateCustomer(id: number, data: Partial<{ name: string; email: string | null; ageBucketId: number | null }>): Promise<Customer | null> {
    try {
      const exists = await this.db.select().from(schema.customers).where(eq(schema.customers.id, id));
      if (!exists[0]) return null;

      await this.db.update(schema.customers).set(data).where(eq(schema.customers.id, id));
      const customers = await this.getCustomers();
      return customers.find((item) => item.id === id) ?? null;
    } catch (error) {
      this.handleWriteCompatibilityError(error);
    }
  }

  private mapAgeBucket(row: any): CustomerAgeBucket {
    return {
      id: Number(row.id),
      name: row.name,
      sortOrder: Number(row.sortOrder ?? 0),
      createdAt: String(row.createdAt),
      updatedAt: String(row.updatedAt),
    };
  }
}
