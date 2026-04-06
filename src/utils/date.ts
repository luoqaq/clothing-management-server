import dayjs from 'dayjs';

/**
 * 将日期格式化为 ISO 格式字符串，供前端统一处理显示
 * 返回 ISO 8601 格式（如：2024-01-01T12:00:00.000Z），保留时区信息
 */
export function formatDateTime(value: unknown): string | null {
  if (!value) {
    return null;
  }

  const date = dayjs(value);
  if (!date.isValid()) {
    return null;
  }

  // 返回 ISO 格式字符串，由前端统一格式化显示
  return date.toISOString();
}
