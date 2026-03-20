import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { authMiddleware } from './auth.middleware';
import { generateToken } from '../utils/jwt';

describe('authMiddleware', () => {
  it('returns 401 when Authorization header is missing', async () => {
    Bun.env.JWT_SECRET = 'test-secret';

    const app = new Hono();
    app.get('/secure', authMiddleware, (c) => c.json({ success: true }));

    const res = await app.request('http://localhost/secure');
    expect(res.status).toBe(401);
  });

  it('allows request with a valid bearer token', async () => {
    Bun.env.JWT_SECRET = 'test-secret';

    const token = generateToken({
      userId: 1,
      username: 'admin',
      role: 'admin',
    });

    const app = new Hono();
    app.get('/secure', authMiddleware, (c) => {
      const user = (c as any).get('user');
      return c.json({ success: true, username: user.username });
    });

    const res = await app.request('http://localhost/secure', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.username).toBe('admin');
  });
});
