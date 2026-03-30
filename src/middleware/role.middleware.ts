import type { Context, Next } from 'hono';
import { error } from '../utils/response';

export function requireRoles(roles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');

    if (!user?.role) {
      return c.json(error('用户角色信息不存在'), 401);
    }

    if (!roles.includes(user.role)) {
      return c.json(error('当前角色无权执行此操作'), 403);
    }

    await next();
  };
}
