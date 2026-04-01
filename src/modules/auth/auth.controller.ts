import { Context } from 'hono';
import { AuthService } from './auth.service';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../db/schema';
import {
  loginSchema,
  changePasswordSchema,
  createSalesUserSchema,
  updateSalesUserSchema,
} from './auth.schema';
import { success, error } from '../../utils/response';
import { logger } from '../../utils/logger';

export class AuthController {
  private service: AuthService;

  constructor(db: MySql2Database<typeof schema>) {
    this.service = new AuthService(db);
  }

  async login(c: Context) {
    try {
      const data = await c.req.json();
      loginSchema.parse(data);

      const result = await this.service.login(data);
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Login error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async logout(c: Context) {
    // 对于 JWT 认证，这通常是一个简单的端点
    // 实际的 token 失效处理需要在客户端完成
    return c.json(success(null, '登出成功'));
  }

  async getCurrentUser(c: Context) {
    try {
      const user = c.get('user');
      const currentUser = await this.service.getCurrentUser(user.userId);
      return c.json(success(currentUser));
    } catch (err: any) {
      logger.error('Get current user error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async changePassword(c: Context) {
    try {
      const data = await c.req.json();
      changePasswordSchema.parse(data);

      const user = c.get('user');
      await this.service.changePassword(
        user.userId,
        data.oldPassword,
        data.newPassword
      );

      return c.json(success(null, '密码修改成功'));
    } catch (err: any) {
      logger.error('Change password error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async listSalesUsers(c: Context) {
    try {
      const users = await this.service.listSalesUsers();
      return c.json(success(users));
    } catch (err: any) {
      logger.error('List sales users error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async createSalesUser(c: Context) {
    try {
      const data = createSalesUserSchema.parse(await c.req.json());
      const user = await this.service.createSalesUser(data);
      return c.json(success(user), 201);
    } catch (err: any) {
      logger.error('Create sales user error:', err);
      return c.json(error(err.message), 400);
    }
  }

  async updateSalesUser(c: Context) {
    try {
      const id = parseInt(c.req.param('id') || '0', 10);
      const data = updateSalesUserSchema.parse(await c.req.json());
      const user = await this.service.updateSalesUser(id, data);
      return c.json(success(user));
    } catch (err: any) {
      logger.error('Update sales user error:', err);
      return c.json(error(err.message), 400);
    }
  }
}
