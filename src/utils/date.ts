import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

// 启用 UTC 插件
dayjs.extend(utc);

/**
 * 将日期格式化为时间字符串
 * 返回格式：2024-01-01 12:00:00
 *
 * 注意：数据库存储的是东八区时间，但我们直接用 utc 模式格式化，
 * 避免 dayjs 进行任何时区转换，保持与数据库原始值一致
 */
export function formatDateTime(value: unknown): string | null {
  if (!value) {
    return null;
  }

  // 使用 utc 模式，不进行任何时区转换，直接格式化
  const date = dayjs.utc(value);
  if (!date.isValid()) {
    return null;
  }

  return date.format('YYYY-MM-DD HH:mm:ss');
}
