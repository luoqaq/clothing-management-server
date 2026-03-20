import { Context, Next } from 'hono';
import { verifyToken, type JwtPayload } from '../utils/jwt';
import { error } from '../utils/response';

declare module 'hono' {
  interface ContextRenderer {
    user: JwtPayload;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    return c.json(error('缺少认证令牌'), 401);
  }

  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    return c.json(error('无效的认证令牌'), 401);
  }

  const payload = verifyToken(token);

  if (!payload) {
    return c.json(error('认证令牌已过期或无效'), 401);
  }

  c.set('user', payload);

  await next();
}
