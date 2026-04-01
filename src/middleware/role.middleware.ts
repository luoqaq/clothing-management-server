import type { Context, Next } from 'hono';
import { error } from '../utils/response';
import { normalizeRole } from '../utils/role';

export function requireRoles(roles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');

    if (!user?.role) {
      return c.json(error('用户角色信息不存在'), 401);
    }

    const normalizedRole = normalizeRole(user.role);

    if (!roles.includes(normalizedRole)) {
      return c.json(error('当前角色无权执行此操作'), 403);
    }

    await next();
  };
}
