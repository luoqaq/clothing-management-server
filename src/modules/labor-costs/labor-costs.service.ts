import { and, count, desc, eq, ne, sql } from 'drizzle-orm';
import dayjs from 'dayjs';
import * as schema from '../../db/schema';
import type {
  LaborCostRecord,
  LaborCostSummary,
  PartTimeWorker,
} from '../../types';
import { formatDateTime } from '../../utils/date';

type LaborCostRecordPayload = {
  workDate: string;
  workerId?: number | null;
  workerName?: string | null;
  coverageType?: 'self' | 'part_time';
  dailyWage?: number;
  paidAmount?: number;
  paymentMethod?: string | null;
  paidAt?: string | null;
  note?: string | null;
  createdBy?: number | null;
};

type LaborCostFilters = {
  start?: string;
  end?: string;
  coverageType?: 'self' | 'part_time';
};

export class LaborCostsService {
  constructor(private db: any) {}

  private normalizeDate(value: unknown): string {
    const parsed = dayjs(value as any);
    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : String(value ?? '');
  }

  private normalizeDateRange(filters?: LaborCostFilters) {
    const today = dayjs().format('YYYY-MM-DD');
    return {
      start: filters?.start || '2000-01-01',
      end: filters?.end || today,
    };
  }

  private normalizePaidAt(value?: string | null): Date | null | undefined {
    if (typeof value === 'undefined') {
      return undefined;
    }
    if (!value) {
      return null;
    }
    const parsed = dayjs(value);
    if (!parsed.isValid()) {
      throw new Error(`Invalid paidAt value: ${value}`);
    }
    return parsed.toDate();
  }

  private buildWhere(filters?: LaborCostFilters) {
    const range = this.normalizeDateRange(filters);
    const conditions: any[] = [
      sql`${schema.laborCostRecords.workDate} >= ${range.start}`,
      sql`${schema.laborCostRecords.workDate} <= ${range.end}`,
    ];

    if (filters?.coverageType) {
      conditions.push(eq(schema.laborCostRecords.coverageType, filters.coverageType));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  private mapWorker(row: any): PartTimeWorker {
    const displayName = String(row.name || row.username || '').trim();

    return {
      id: Number(row.id),
      username: row.username ?? null,
      name: displayName || `销售账号 ${row.id}`,
      phone: row.phone ?? null,
      defaultDailyWage: Number(row.defaultDailyWage ?? 0),
      status: row.status ?? 'active',
      note: row.note ?? null,
      createdAt: formatDateTime(row.createdAt) ?? '',
      updatedAt: formatDateTime(row.updatedAt) ?? '',
    };
  }

  private mapRecord(row: any): LaborCostRecord {
    return {
      id: Number(row.id),
      workDate: this.normalizeDate(row.workDate),
      workerId: row.workerId ? Number(row.workerId) : null,
      workerNameSnapshot: row.workerNameSnapshot ?? null,
      coverageType: row.coverageType,
      dailyWage: Number(row.dailyWage ?? 0),
      paidAmount: Number(row.paidAmount ?? 0),
      paymentMethod: row.paymentMethod ?? null,
      paidAt: formatDateTime(row.paidAt),
      note: row.note ?? null,
      createdBy: row.createdBy ? Number(row.createdBy) : null,
      createdAt: formatDateTime(row.createdAt) ?? '',
      updatedAt: formatDateTime(row.updatedAt) ?? '',
    };
  }

  private async findWorker(id?: number | null): Promise<any | null> {
    if (!id) {
      return null;
    }

    const rows = await this.db.select().from(schema.users).where(eq(schema.users.id, id));
    const user = rows[0] ?? null;
    if (!user || user.role === 'admin') {
      return null;
    }

    return {
      ...user,
      defaultDailyWage: 0,
      status: 'active',
    };
  }

  private async buildRecordValues(payload: LaborCostRecordPayload) {
    const coverageType = payload.coverageType ?? 'part_time';
    const worker = await this.findWorker(payload.workerId);
    if (payload.workerId && !worker) {
      throw new Error('兼职人员不存在');
    }

    const workerName = String(payload.workerName ?? '').trim();
    if (coverageType === 'part_time' && !worker && !workerName) {
      throw new Error('兼职记录需要选择兼职人员或填写姓名');
    }

    const defaultWage = worker ? Number(worker.defaultDailyWage ?? 0) : 0;
    const workerDisplayName = worker ? String(worker.name || worker.username || '').trim() : '';
    const paidAmount =
      coverageType === 'self'
        ? Number(payload.paidAmount ?? 0)
        : Number(payload.paidAmount ?? payload.dailyWage ?? defaultWage ?? 0);
    const dailyWage =
      coverageType === 'self'
        ? Number(payload.dailyWage ?? 0)
        : Number(payload.dailyWage ?? paidAmount ?? defaultWage ?? 0);
    const paidAt = this.normalizePaidAt(payload.paidAt);

    return {
      workDate: payload.workDate,
      workerId: worker ? Number(worker.id) : null,
      workerNameSnapshot: coverageType === 'self' ? '自己看店' : workerDisplayName || workerName,
      coverageType,
      dailyWage: String(dailyWage),
      paidAmount: String(paidAmount),
      paymentMethod: payload.paymentMethod || null,
      ...(typeof paidAt !== 'undefined' ? { paidAt } : { paidAt: paidAmount > 0 ? new Date() : null }),
      note: payload.note || null,
      ...(typeof payload.createdBy !== 'undefined' ? { createdBy: payload.createdBy } : {}),
    };
  }

  async listWorkers(status?: 'active' | 'inactive'): Promise<PartTimeWorker[]> {
    if (status === 'inactive') {
      return [];
    }

    const rows = await this.db
      .select()
      .from(schema.users)
      .where(ne(schema.users.role, 'admin'))
      .orderBy(schema.users.name, schema.users.username, schema.users.id);
    return rows.map((row: any) => this.mapWorker(row));
  }

  async listRecords(params?: { page?: number; pageSize?: number; filters?: LaborCostFilters }) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const whereClause = this.buildWhere(params?.filters);

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(schema.laborCostRecords)
        .where(whereClause)
        .orderBy(desc(schema.laborCostRecords.workDate), desc(schema.laborCostRecords.id))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ count: count() }).from(schema.laborCostRecords).where(whereClause),
    ]);

    return {
      items: rows.map((row: any) => this.mapRecord(row)),
      total: Number(totalRows[0]?.count ?? 0),
    };
  }

  async createRecord(payload: LaborCostRecordPayload): Promise<LaborCostRecord> {
    const values = await this.buildRecordValues(payload);
    const inserted = await this.db.insert(schema.laborCostRecords).values(values).$returningId();
    const rows = await this.db.select().from(schema.laborCostRecords).where(eq(schema.laborCostRecords.id, inserted[0]?.id));
    return this.mapRecord(rows[0]);
  }

  async updateRecord(id: number, payload: Partial<LaborCostRecordPayload>): Promise<LaborCostRecord | null> {
    const existingRows = await this.db.select().from(schema.laborCostRecords).where(eq(schema.laborCostRecords.id, id));
    const existing = existingRows[0];
    if (!existing) {
      return null;
    }

    const values = await this.buildRecordValues({
      workDate: payload.workDate ?? this.normalizeDate(existing.workDate),
      workerId: typeof payload.workerId !== 'undefined' ? payload.workerId : existing.workerId,
      workerName: typeof payload.workerName !== 'undefined' ? payload.workerName : existing.workerNameSnapshot,
      coverageType: payload.coverageType ?? existing.coverageType,
      dailyWage: typeof payload.dailyWage !== 'undefined' ? payload.dailyWage : Number(existing.dailyWage ?? 0),
      paidAmount: typeof payload.paidAmount !== 'undefined' ? payload.paidAmount : Number(existing.paidAmount ?? 0),
      paymentMethod: typeof payload.paymentMethod !== 'undefined' ? payload.paymentMethod : existing.paymentMethod,
      paidAt: typeof payload.paidAt !== 'undefined' ? payload.paidAt : formatDateTime(existing.paidAt),
      note: typeof payload.note !== 'undefined' ? payload.note : existing.note,
      createdBy: existing.createdBy,
    });

    await this.db.update(schema.laborCostRecords).set({
      ...values,
      updatedAt: new Date(),
    }).where(eq(schema.laborCostRecords.id, id));

    const rows = await this.db.select().from(schema.laborCostRecords).where(eq(schema.laborCostRecords.id, id));
    return this.mapRecord(rows[0]);
  }

  async deleteRecord(id: number): Promise<void> {
    await this.db.delete(schema.laborCostRecords).where(eq(schema.laborCostRecords.id, id));
  }

  async getSummary(filters?: LaborCostFilters): Promise<LaborCostSummary> {
    const result = await this.listRecords({
      page: 1,
      pageSize: 10000,
      filters,
    });
    const records = result.items;
    const laborCost = records.reduce((sum, item) => sum + item.paidAmount, 0);
    const partTimeDates = new Set(
      records
        .filter((item) => item.coverageType === 'part_time')
        .map((item) => item.workDate)
    );
    const selfDates = new Set(
      records
        .filter((item) => item.coverageType === 'self')
        .map((item) => item.workDate)
    );

    return {
      totalLaborCost: laborCost,
      partTimeDays: partTimeDates.size,
      selfDays: selfDates.size,
      recordCount: records.length,
      avgLaborCostPerPartTimeDay: partTimeDates.size > 0 ? laborCost / partTimeDates.size : 0,
    };
  }

  async getDailyLaborCostMap(filters?: LaborCostFilters): Promise<Map<string, { laborCost: number; partTimeRecordCount: number }>> {
    const result = await this.listRecords({
      page: 1,
      pageSize: 10000,
      filters,
    });
    const map = new Map<string, { laborCost: number; partTimeRecordCount: number }>();

    result.items.forEach((record) => {
      const current = map.get(record.workDate) ?? { laborCost: 0, partTimeRecordCount: 0 };
      current.laborCost += record.paidAmount;
      if (record.coverageType === 'part_time') {
        current.partTimeRecordCount += 1;
      }
      map.set(record.workDate, current);
    });

    return map;
  }
}
