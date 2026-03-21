import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getCORSConfig } from './config/cors';
import { errorHandler } from './middleware/error.middleware';
import { success } from './utils/response';
import { connectToDatabase } from './config/database';
import { logger } from './utils/logger';

// 导入路由
import { createAuthRoutes } from './modules/auth/auth.routes';
import { createAssetsRoutes } from './modules/assets/assets.routes';
import { createProductsRoutes } from './modules/products/products.routes';
import { createOrdersRoutes } from './modules/orders/orders.routes';
import { createStatisticsRoutes } from './modules/statistics/statistics.routes';

const app = new Hono();
const PORT = parseInt(Bun.env.PORT || '3000');

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
  app.get('/health', (c) => c.json(success('OK')));

  // 注册路由
  app.route('/api/auth', createAuthRoutes(db));
  app.route('/api/assets', createAssetsRoutes());
  app.route('/api/products', createProductsRoutes(db));
  app.route('/api/orders', createOrdersRoutes(db));
  app.route('/api/statistics', createStatisticsRoutes(db));

  // 全局错误处理
  app.onError(errorHandler);

  Bun.serve({
    port: PORT,
    fetch: app.fetch,
  });

  logger.info(`服务器启动成功，监听在 http://localhost:${PORT}`);
  logger.info('默认账户: admin / admin123');
}

// 启动应用
initializeApp().catch((err) => {
  logger.error('应用初始化失败:', err);
  process.exit(1);
});
