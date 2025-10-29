import {
  formatTimestamp,
  formatTimestampLocalized,
  formatTimestampTo12HourTime,
  formatTimestampToRelativeTime,
} from '../time-utils';

describe('Timezones', () => {
  it('should always be UTC', () => {
    expect(new Date().getTimezoneOffset()).toBe(0);
  });
});

describe('formatTimestampTo12HourTime', () => {
  it('formats timestamp as 12-hour time in UTC by default', () => {
    const timestamp = 1718064000;
    expect(formatTimestampTo12HourTime(timestamp)).toBe('12:00:00 AM (UTC)');
  });

  it('formats timestamp as 12-hour time in UTC (explicit)', () => {
    const timestamp = 1718101530;
    expect(
      formatTimestampTo12HourTime(timestamp, { useLocalTime: false, includeSeconds: true })
    ).toBe('10:25:30 AM (UTC)');
  });

  it('formats timestamp as 12-hour time in local time', () => {
    const timestamp = 1718101530;
    const originalDate = global.Date;

    // Mock Date to return consistent values
    global.Date = class extends Date {
      constructor() {
        super();
      }
      getHours() {
        return 5;
      }
      getMinutes() {
        return 25;
      }
      getSeconds() {
        return 30;
      }
    } as any;

    expect(
      formatTimestampTo12HourTime(timestamp, { useLocalTime: true, includeSeconds: true })
    ).toBe('5:25:30 AM');

    // Restore original Date
    global.Date = originalDate;
  });
});

// Helper to get a timestamp N seconds ago
const secondsAgo = (s: number) => Math.floor(Date.now() / 1000) - s;

describe('formatTimestampToRelativeTime', () => {
  beforeAll(() => {
    // Freeze time for consistent test results
    jest.spyOn(Date, 'now').mockImplementation(() => new Date('2024-06-01T12:34:56Z').getTime());
  });

  afterAll(() => {
    // Restore Date.now
    (Date.now as jest.Mock).mockRestore();
  });

  it('formats a timestamp to relative time', () => {
    // 10 minutes ago from the frozen time
    const tenMinutesAgo = Math.floor(new Date('2024-06-01T12:24:56Z').getTime() / 1000);
    expect(formatTimestampToRelativeTime(tenMinutesAgo)).toBe('10 minutes ago');
  });

  // The time ranges used here are simply the time ranges used in the formatDistanceToNow function from date-fns
  it('returns "<1 minute ago" for times less than 30 seconds ago', () => {
    // 10 seconds ago
    expect(formatTimestampToRelativeTime(secondsAgo(10))).toBe('<1 minute ago');
    // 29 seconds ago
    expect(formatTimestampToRelativeTime(secondsAgo(29))).toBe('<1 minute ago');
  });

  it('returns "1 minute ago" for times between 30 and 90 seconds ago', () => {
    // 31 seconds ago
    expect(formatTimestampToRelativeTime(secondsAgo(31))).toBe('1 minute ago');
    // 89 seconds ago
    expect(formatTimestampToRelativeTime(secondsAgo(89))).toBe('1 minute ago');
  });

  it('returns "[2..44] minutes ago" for times between 1.5 and 44.5 minutes ago', () => {
    // 2 minutes ago
    expect(formatTimestampToRelativeTime(secondsAgo(2 * 60))).toBe('2 minutes ago');
    // 44 minutes ago
    expect(formatTimestampToRelativeTime(secondsAgo(44 * 60))).toBe('44 minutes ago');
  });

  it('returns "~1 hour ago" for times between 44.5 and 89.5 minutes ago', () => {
    // 45 minutes ago
    expect(formatTimestampToRelativeTime(secondsAgo(45 * 60))).toBe('~1 hour ago');
    // 89 minutes ago
    expect(formatTimestampToRelativeTime(secondsAgo(89 * 60))).toBe('~1 hour ago');
  });

  it('returns "~2 hours ago" for times between 89.5 minutes and 24 hours ago', () => {
    // 2 hours ago
    expect(formatTimestampToRelativeTime(secondsAgo(2 * 60 * 60))).toBe('~2 hours ago');
    // 23 hours ago
    expect(formatTimestampToRelativeTime(secondsAgo(23 * 60 * 60))).toBe('~23 hours ago');
  });

  it('returns "1 day ago" for times between 24 and 42 hours ago', () => {
    // 25 hours ago
    expect(formatTimestampToRelativeTime(secondsAgo(25 * 60 * 60))).toBe('1 day ago');
  });

  it('returns ">1 year ago" for times between 1 year 3 months and 1 year 9 months ago', () => {
    // 1 year 4 months ago (approx 16 months)
    const months = 16;
    expect(formatTimestampToRelativeTime(secondsAgo(months * 30 * 24 * 60 * 60))).toMatch(
      /^>1 year ago$/
    );
  });

  it('returns "~2 years ago" for times between 1 year 9 months and 2 years ago', () => {
    // 1 year 10 months ago (approx 22 months)
    const months = 22;
    expect(formatTimestampToRelativeTime(secondsAgo(months * 30 * 24 * 60 * 60))).toMatch(
      /^~2 years ago$/
    );
  });
});

describe('formatTimestamp', () => {
  it('formats a timestamp to the default format', () => {
    // 2024-06-01 12:34:56 UTC
    const timestamp = 1717248896;
    // The expected string is what you would get from new Date(1717248896 * 1000)
    expect(formatTimestamp(timestamp)).toBe('2024-06-01 13:34:56');
  });

  it('formats a timestamp to a custom format', () => {
    const timestamp = 1717248896;
    expect(formatTimestamp(timestamp, 'MM/dd/yyyy')).toBe('06/01/2024');
  });

  it('formats a timestamp with locale format using Intl.DateTimeFormat', () => {
    const timestamp = 1717248896; // 2024-06-01 12:34:56 UTC
    const result = formatTimestamp(timestamp, 'locale', true);

    expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // numeric date
    expect(result).toMatch(/\d{2}:\d{2}:\d{2}/); // time with colons
    expect(result).toMatch(/[A-Z]{3,4}/); // timezone abbreviation
  });

  it('formats a timestamp with locale format without timezone', () => {
    const timestamp = 1717248896;
    const result = formatTimestamp(timestamp, 'locale', false);

    expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
    expect(result).not.toMatch(/[A-Z]{3,4}$/);
  });
});

describe('formatTimestampLocalized', () => {
  it('returns numeric localized timestamp with timezone', () => {
    const timestamp = 1717248896; // 2024-06-01 12:34:56 UTC
    const result = formatTimestampLocalized(timestamp);

    expect(result).not.toMatch(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
    expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
    expect(result).toMatch(/[A-Z]{3,4}/);
  });
});
