import { UTCDate } from '@date-fns/utc';
import { format, formatDistanceToNow } from 'date-fns';

import { isStringNumber } from './number-utils';

export function getReadableTimestamp(ts: number): string {
  return ts
    ? `${new Date(ts * 1000).toLocaleTimeString()} ${new Date(ts * 1000).toLocaleDateString()}`
    : '';
}

export function parseTimestamp(ts: string): number | null {
  return isStringNumber(ts) ? Number(ts) : null;
}

export function getUTCDate(ts: number): UTCDate {
  return new UTCDate(ts * 1000);
}

export function parseUTCDate(ts: string): UTCDate | null {
  const parsedTs = parseTimestamp(ts);
  return parsedTs ? getUTCDate(parsedTs) : null;
}

export const formatDate = (
  date: UTCDate,
  options: Intl.DateTimeFormatOptions = { month: '2-digit', day: '2-digit', year: 'numeric' },
  locale: string | string[] = 'en-US'
): string => {
  return date.toLocaleDateString(locale, options);
};

export function formatTimestampTo12HourTime(
  timestampInSeconds: number,
  options: { useLocalTime?: boolean; includeSeconds?: boolean } | undefined = {
    useLocalTime: false,
    includeSeconds: true,
  }
) {
  const date = new Date(timestampInSeconds * 1000);

  let hours = options?.useLocalTime ? date.getHours() : date.getUTCHours();
  let minutes = options?.useLocalTime ? date.getMinutes() : date.getUTCMinutes();
  let seconds = options?.useLocalTime ? date.getSeconds() : date.getUTCSeconds();

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;

  const paddedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  const paddedSeconds = options?.includeSeconds ? (seconds < 10 ? `0${seconds}` : seconds) : '';

  const tzLabel = options?.useLocalTime ? '' : '(UTC)';

  return `${hours}:${paddedMinutes}${options?.includeSeconds ? `:${paddedSeconds}` : ''}${ampm ? ` ${ampm}` : ''}${tzLabel ? ` ${tzLabel}` : ''}`;
}

const FALLBACK_LOCALE = 'en-US';

/**
 * The first browser locale `Intl.DateTimeFormat` supports, else `en-US`. An unsupported or
 * malformed tag (e.g. `C`, `en-US@posix`) makes `new Intl.DateTimeFormat` throw a RangeError, which
 * would take down every table rendering a localized timestamp.
 */
export function getSupportedBrowserLocale(): string {
  if (typeof navigator === 'undefined') return FALLBACK_LOCALE;
  const candidates = navigator.languages?.length
    ? navigator.languages
    : navigator.language
      ? [navigator.language]
      : [];
  for (const candidate of candidates) {
    try {
      if (Intl.DateTimeFormat.supportedLocalesOf(candidate).length > 0) return candidate;
    } catch {
      // Structurally invalid tag: supportedLocalesOf throws a RangeError. Try the next one.
    }
  }
  return FALLBACK_LOCALE;
}

export function formatTimestamp(
  timestampInSeconds: number,
  formatString: string = 'yyyy-MM-dd HH:mm:ss',
  includeTimezone: boolean = false
): string {
  const date = new Date(timestampInSeconds * 1000);

  if (formatString !== 'locale') {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZoneName: 'short',
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find(part => part.type === 'timeZoneName');

    const formatted = format(date, formatString);
    return includeTimezone ? `${formatted} ${tzPart?.value}` : formatted;
  }

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    ...(includeTimezone && { timeZoneName: 'short' }),
  };

  const formatter = new Intl.DateTimeFormat(getSupportedBrowserLocale(), options);
  return formatter.format(date);
}

export function formatTimestampLocalized(timestampInSeconds: number): string {
  return formatTimestamp(timestampInSeconds, 'locale', true);
}

export function formatTimestampToRelativeTime(timestampInSeconds: number): string {
  const date = new Date(timestampInSeconds * 1000);
  let relativeTime = formatDistanceToNow(date, { addSuffix: true });
  if (relativeTime.startsWith('less than a minute')) {
    relativeTime = relativeTime.replace('less than a minute', '<1 minute');
  }
  if (relativeTime.startsWith('about ')) {
    relativeTime = relativeTime.replace('about ', '~');
  }
  if (relativeTime.startsWith('almost ')) {
    relativeTime = relativeTime.replace('almost ', '~');
  }
  if (relativeTime.startsWith('over ')) {
    relativeTime = relativeTime.replace('over ', '>');
  }
  return relativeTime;
}

export function formatBlockTime(timestampInSeconds: number): string {
  const date = new Date(timestampInSeconds * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function formatTimestampToDateString(timestampInSeconds: number): string {
  return new Date(timestampInSeconds * 1000).toISOString().split('T')[0];
}
