import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';
import { hashPassword } from '../utils/password';

async function seed() {
  console.log('开始初始化数据...');

  const connection = await mysql.createConnection({
    host: Bun.env.DB_HOST || 'localhost',
    port: parseInt(Bun.env.DB_PORT || '3306'),
    user: Bun.env.DB_USER || 'root',
    password: Bun.env.DB_PASSWORD || '',
    database: Bun.env.DB_NAME || 'clothing_management',
  });

  const db = drizzle(connection, { schema, mode: 'default' });
  const dbAny = db as any;

  // 检查是否有用户
  const existingUsers = await db.select().from(schema.users);
  if (existingUsers.length > 0) {
    console.log('数据已存在，跳过初始化');
    await connection.end();
    return;
  }

  // 创建管理员用户
  const passwordHash = await hashPassword('chuchu0510');
  await dbAny.insert(schema.users).values({
    username: 'chuchu',
    passwordHash,
    name: '系统管理员',
    email: 'chuchu@clothing.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chuchu',
    role: 'admin',
  });

  console.log('✓ 创建管理员用户: chuchu / chuchu0510');

  // 创建分类
  await dbAny.insert(schema.productCategories).values([
    { name: '上衣', code: 'TOP', parentId: null },
    { name: '外套', code: 'OUTER', parentId: null },
    { name: '裤子', code: 'PANTS', parentId: null },
    { name: '裙子', code: 'SKIRT', parentId: null },
    { name: '内衣', code: 'UNDERWEAR', parentId: null },
    { name: '配饰', code: 'ACCESSORIES', parentId: null },
    { name: '连衣裙', code: 'DRESS', parentId: 1 },
    { name: 'T恤', code: 'T_SHIRT', parentId: 1 },
    { name: '衬衫', code: 'SHIRT', parentId: 1 },
    { name: '牛仔裤', code: 'JEANS', parentId: 3 },
  ]);

  console.log('✓ 创建商品分类');

  await dbAny.insert(schema.suppliers).values([
    { name: '华东成衣供应商' },
    { name: '深圳针织供应商' },
    { name: '广州牛仔供应商' },
    { name: '上海基础款供应商' },
  ]);

  console.log('✓ 创建供应商');

  // 创建示例商品
  const productIds = await dbAny.insert(schema.products).values([
    {
      productCode: 'TOP001',
      name: '经典白色T恤',
      description: '简约百搭的白色T恤，舒适透气，适合日常穿着',
      categoryId: 8,
      supplierId: 4,
      mainImages: ['https://api.dicebear.com/7.x/avataaars/svg?seed=1'],
      detailImages: ['https://api.dicebear.com/7.x/avataaars/svg?seed=1'],
      status: 'active',
      tags: ['经典', '百搭', '舒适'],
    },
    {
      productCode: 'OUTER001',
      name: '牛仔外套',
      description: '时尚牛仔外套，复古风格，四季皆宜',
      categoryId: 2,
      supplierId: 1,
      mainImages: ['https://api.dicebear.com/7.x/avataaars/svg?seed=2'],
      detailImages: ['https://api.dicebear.com/7.x/avataaars/svg?seed=2'],
      status: 'active',
      tags: ['牛仔', '时尚', '百搭'],
    },
  ]).$returningId();

  console.log('✓ 创建示例商品');

  await dbAny.insert(schema.productSkus).values([
    {
      productId: productIds[0].id,
      skuCode: 'TOP001-M-白色',
      color: '白色',
      size: 'M',
      salePrice: '99.00',
      costPrice: '50.00',
      stock: 200,
      reservedStock: 0,
      status: 'active',
    },
    {
      productId: productIds[1].id,
      skuCode: 'OUTER001-L-蓝色',
      color: '蓝色',
      size: 'L',
      salePrice: '399.00',
      costPrice: '150.00',
      stock: 150,
      reservedStock: 0,
      status: 'active',
    },
  ]);

  console.log('✓ 创建示例商品规格');

  await connection.end();
  console.log('数据初始化完成!');
}

seed().catch((err) => {
  console.error('初始化数据失败:', err);
  process.exit(1);
});
