import { useLocale } from 'next-intl';

import { dayjs, formatDate, fromNow } from '@/shared/lib/dayjs';

export function Time({
  value,
  placeholder,
  metadata,
  className,
}: {
  value: string | Date;
  placeholder?: string;
  metadata?: Record<string, any>;
  className?: string;
}) {
  if (!value) {
    if (placeholder) {
      return <div className={className}>{placeholder}</div>;
    }

    return null;
  }

  const locale = useLocale();

  return (
    <div className={className}>
      {metadata?.format
        ? formatDate(value, metadata?.format, locale)
        : fromNow(value, locale)}
    </div>
  );
}
