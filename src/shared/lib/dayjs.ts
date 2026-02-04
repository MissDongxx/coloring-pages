/**
 * dayjs 配置 - 替代 moment.js 以减少 bundle 大小
 * moment: ~300KB, dayjs: ~2KB
 */

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import 'dayjs/locale/zh-cn';

// 扩展 dayjs 功能
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

export { dayjs };

/**
 * 格式化日期为相对时间（如 "3 hours ago"）
 */
export function fromNow(date: string | Date | null | undefined, locale?: string): string {
  if (!date) return '';
  const loc = locale === 'zh' ? 'zh-cn' : locale || 'en';
  return dayjs(date).locale(loc).fromNow();
}

/**
 * 格式化日期
 */
export function formatDate(
  date: string | Date | null | undefined,
  format: string = 'YYYY-MM-DD',
  locale?: string
): string {
  if (!date) return '';
  const loc = locale === 'zh' ? 'zh-cn' : locale || 'en';
  return dayjs(date).locale(loc).format(format);
}

/**
 * 获取博客文章日期格式 - 兼容原 moment 调用方式
 */
export function getPostDate({
  created_at,
  locale,
}: {
  created_at: string | Date | null | undefined;
  locale?: string;
}): string {
  if (!created_at) return '';
  const loc = locale === 'zh' ? 'zh-cn' : locale || 'en';
  const format = locale === 'zh' ? 'YYYY/MM/DD' : 'MMM D, YYYY';
  return dayjs(created_at).locale(loc).format(format);
}
