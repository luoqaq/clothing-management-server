export interface JWTConfig {
  secret: string;
  expiresIn: string;
}

const fallbackSecret = crypto.randomUUID();
let warnedForFallback = false;

export function getJWTConfig(): JWTConfig {
  const envSecret = Bun.env.JWT_SECRET;
  if (!envSecret && !warnedForFallback) {
    warnedForFallback = true;
    console.warn('[JWT] JWT_SECRET 未配置，正在使用临时密钥（重启后现有 token 会失效）');
  }

  return {
    secret: envSecret || fallbackSecret,
    expiresIn: Bun.env.JWT_EXPIRES_IN || '7d',
  };
}
