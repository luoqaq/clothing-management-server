import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getCORSConfig } from './config/cors';
import { errorHandler } from './middleware/error.middleware';
import { success, error } from './utils/response';
import { checkDatabaseHealth, connectToDatabase } from './config/database';
import { logger } from './utils/logger';

// 导入路由
import { createAuthRoutes } from './modules/auth/auth.routes';
import { createAssetsRoutes } from './modules/assets/assets.routes';
import { createProductsRoutes } from './modules/products/products.routes';
import { createOrdersRoutes } from './modules/orders/orders.routes';
import { createStatisticsRoutes } from './modules/statistics/statistics.routes';
import { createMobileRoutes } from './modules/mobile/mobile.routes';
import { createDashboardRoutes } from './modules/dashboard/dashboard.routes';
import { createCustomersRoutes } from './modules/customers/customers.routes';

const app = new Hono();
const PORT = parseInt(Bun.env.PORT || '3000');
const HOST = Bun.env.HOST || (Bun.env.NODE_ENV === 'production' ? '127.0.0.1' : '0.0.0.0');

async function initializeApp() {
  // 连接数据库
  const db = await connectToDatabase();
  logger.info('数据库连接成功');

  // 配置 CORS
  const corsConfig = getCORSConfig();
  app.use('*', cors({
    origin: corsConfig.origin,
    allowHeaders: ['Origin', 'Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }));

  // 健康检查
  app.get('/health', async (c) => {
    try {
      await checkDatabaseHealth();
      return c.json(success('OK'));
    } catch (err) {
      logger.error({ err }, 'Health check failed');
      return c.json(error('数据库连接异常'), 503);
    }
  });

  // 注册路由
  app.route('/api/auth', createAuthRoutes(db));
  app.route('/api/assets', createAssetsRoutes());
  app.route('/api/products', createProductsRoutes(db));
  app.route('/api/orders', createOrdersRoutes(db));
  app.route('/api/customers', createCustomersRoutes(db));
  app.route('/api/statistics', createStatisticsRoutes(db));
  app.route('/api/dashboard', createDashboardRoutes(db));
  app.route('/api/mobile', createMobileRoutes(db));

  // 全局错误处理
  app.onError(errorHandler);

  Bun.serve({
    hostname: HOST,
    port: PORT,
    fetch: app.fetch,
  });

  logger.info(`服务器启动成功，监听在 http://${HOST}:${PORT}`);
}

// 启动应用
initializeApp().catch((err) => {
  console.error('应用初始化失败:', err);
  logger.error('应用初始化失败:', err);
  process.exit(1);
});
