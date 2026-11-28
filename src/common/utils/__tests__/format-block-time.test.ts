/** @jest-environment ./jest.dst-environment.js */
import { formatBlockTime } from '../time-utils';

// This file runs in America/New_York so a local-time formatter would give a different answer.
describe('formatBlockTime', () => {
  it('formats the time in UTC and labels it, whatever the local timezone is', () => {
    // 2024-06-01 12:34:56 UTC is 08:34:56 in New York
    expect(formatBlockTime(1717245296)).toBe('2024-06-01 12:34:56 (UTC)');
  });

  it('uses the UTC date when the local date is different', () => {
    // 2024-01-01 02:00:00 UTC is still Dec 31 in New York
    expect(formatBlockTime(1704074400)).toBe('2024-01-01 02:00:00 (UTC)');
  });
});
