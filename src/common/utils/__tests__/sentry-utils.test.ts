import type { ErrorEvent } from '@sentry/core';

import { addCustomFingerprint } from '../sentry-utils';

describe('addCustomFingerprint', () => {
  it('groups API errors by status code', () => {
    const mockEvent = {
      exception: {
        values: [{ value: 'AxiosError: Request failed with status code 500' }],
      },
    } as ErrorEvent;

    const result = addCustomFingerprint(mockEvent);
    expect(result.fingerprint).toEqual(['api-error', '500']);
  });

  it('groups network errors', () => {
    const mockEvent = {
      exception: {
        values: [{ value: 'TypeError: Failed to fetch' }],
      },
    } as ErrorEvent;

    const result = addCustomFingerprint(mockEvent);
    expect(result.fingerprint).toEqual(['network-error']);
  });

  it('falls back to default fingerprint for unknown errors', () => {
    const mockEvent = {
      exception: {
        values: [{ value: 'Some random UI error occurred' }],
      },
    } as ErrorEvent;

    const result = addCustomFingerprint(mockEvent);
    expect(result.fingerprint).toEqual(['{{ default }}']);
  });
});
