import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './src/db/schema';
import { eq, sql } from 'drizzle-orm';

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'sh-cynosdbmysql-grp-jv20n0ae.sql.tencentcdb.com',
    port: parseInt(process.env.DB_PORT || '21680'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Chuchu90403',
    database: process.env.DB_NAME || 'closthin-system-test',
  });

  const db = drizzle(connection, { schema, mode: 'default' });

  try {
    // 更新已有的订单项，将 sold_price 设置为 price
    const result = await db.update(schema.orderItems)
      .set({ soldPrice: sql`price` })
      .where(eq(schema.orderItems.soldPrice, '0'));
    
    console.log('Migration completed successfully!');
    console.log('Updated rows:', result);
    
    // 验证
    const [rows] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN sold_price > 0 THEN 1 ELSE 0 END) as with_sold_price
      FROM order_items
    `);
    console.log('Verification:', rows);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

migrate();
