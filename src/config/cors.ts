export interface CORSConfig {
  origin: string[];
}

export function getCORSConfig(): CORSConfig {
  const originEnv = Bun.env.CORS_ORIGIN || 'http://localhost:5173';
  return {
    origin: originEnv.split(',').map(s => s.trim()),
  };
}
