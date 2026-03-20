import { drizzle } from 'drizzle-orm/mysql2';
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

let connection: mysql.Connection | null = null;

export async function connectToDatabase() {
  if (!connection) {
    const config = await getDatabaseConfig();
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
    });
  }
  return drizzle(connection, { schema, mode: 'default' });
}
