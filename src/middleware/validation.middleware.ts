import { Context, Next } from 'hono';
import { z } from 'zod';
import { error } from '../utils/response';

export async function validateBody<T extends z.ZodTypeAny>(
  c: Context,
  schema: T,
  next: Next
): Promise<Response | void> {
  try {
    const data = await c.req.json();
    schema.parse(data);
    c.set('validatedData', data);
    await next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return c.json(error(err.issues[0].message), 400);
    }
    return c.json(error('请求数据格式错误'), 400);
  }
}

export async function validateQuery<T extends z.ZodTypeAny>(
  c: Context,
  schema: T,
  next: Next
): Promise<Response | void> {
  try {
    const query = c.req.query();
    schema.parse(query);
    c.set('validatedQuery', query);
    await next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return c.json(error(err.issues[0].message), 400);
    }
    return c.json(error('查询参数格式错误'), 400);
  }
}
