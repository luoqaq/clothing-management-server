import pino from 'pino';

export const logger: any = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      timestampKey: 'time',
      ignore: 'pid,hostname',
    },
  },
  level: Bun.env.NODE_ENV === 'production' ? 'info' : 'debug',
});
