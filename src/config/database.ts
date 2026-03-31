import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../db/schema';

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export async function getDatabaseConfig(): Promise<DatabaseConfig> {
  return {
    host: Bun.env.DB_HOST || 'localhost',
    port: parseInt(Bun.env.DB_PORT || '3306'),
    user: Bun.env.DB_USER || 'root',
    password: Bun.env.DB_PASSWORD || '',
    database: Bun.env.DB_NAME || 'clothing_management',
  };
}

let pool: mysql.Pool | null = null;
let database: MySql2Database<typeof schema> | null = null;

export async function connectToDatabase() {
  if (!pool || !database) {
    const config = await getDatabaseConfig();
    pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 10,
      idleTimeout: 60000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });

    // Tencent Cloud MySQL rejects prepared statements with `limit ?`.
    // Drizzle's mysql2 adapter uses `execute`, so route it through `query`
    // for compatibility with the current database instance.
    (pool as any).execute = pool.query.bind(pool);
    database = drizzle(pool, { schema, mode: 'default' });
  }

  return database;
}

export async function checkDatabaseHealth() {
  if (!pool) {
    await connectToDatabase();
  }

  const currentPool = pool;
  if (!currentPool) {
    throw new Error('数据库连接池未初始化');
  }

  await currentPool.query('select 1');
  return true;
}
