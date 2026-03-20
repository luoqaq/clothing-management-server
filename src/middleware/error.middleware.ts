import { Context } from 'hono';
import { logger } from '../utils/logger';
import { error } from '../utils/response';

export function errorHandler(err: unknown, c: Context) {
  const status = typeof (err as { status?: unknown })?.status === 'number'
    ? ((err as { status: number }).status)
    : 500;

  logger.error({ err, status }, 'Unhandled error');

  const message = status >= 500
    ? '内部服务器错误'
    : ((err as { message?: string })?.message || '请求处理失败');

  return c.json(error(message), status as any);
}
