import { Hono } from 'hono';
import { AuthController } from './auth.controller';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../db/schema';
import { authMiddleware } from '../../middleware/auth.middleware';

export function createAuthRoutes(db: MySql2Database<typeof schema>) {
  const controller = new AuthController(db);
  const auth = new Hono();

  auth.post('/login', (c) => controller.login(c));
  auth.post('/logout', authMiddleware, (c) => controller.logout(c));
  auth.get('/me', authMiddleware, (c) => controller.getCurrentUser(c));
  auth.post('/change-password', authMiddleware, (c) => controller.changePassword(c));

  return auth;
}
