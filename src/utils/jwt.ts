import jwt from 'jsonwebtoken';
import { getJWTConfig } from '../config/jwt';

export interface JwtPayload {
  userId: number;
  username: string;
  role: 'admin' | 'sales';
}

export function generateToken(payload: JwtPayload): string {
  const config = getJWTConfig();
  return jwt.sign(payload, config.secret, {
    expiresIn: config.expiresIn as any,
  });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const config = getJWTConfig();
    return jwt.verify(token, config.secret) as JwtPayload;
  } catch (error) {
    return null;
  }
}
