import { ApiError, getApiErrorFingerprint, getApiErrorSeverity } from '../ApiError';

describe('getApiErrorSeverity', () => {
  test.each([
    [undefined, 'error'],
    [200, 'info'],
    [301, 'info'],
    [400, 'warning'],
    [404, 'warning'],
    [429, 'warning'],
    [499, 'warning'],
    [500, 'error'],
    [502, 'error'],
    [503, 'error'],
  ] as const)('status=%s → %s', (status, expected) => {
    expect(getApiErrorSeverity(status)).toBe(expected);
  });
});

describe('getApiErrorFingerprint', () => {
  test('uses path template (not interpolated path) for stable grouping', () => {
    expect(getApiErrorFingerprint('/extended/v2/blocks/{height_or_hash}', 'GET', 404)).toEqual([
      'api',
      'GET',
      '/extended/v2/blocks/{height_or_hash}',
      '404',
    ]);
  });

  test('encodes missing status distinctly', () => {
    expect(getApiErrorFingerprint('/extended/v2/blocks/', 'GET', undefined)).toEqual([
      'api',
      'GET',
      '/extended/v2/blocks/',
      'no-status',
    ]);
  });
});

describe('ApiError', () => {
  test('exposes status, endpoint, method and is an Error', () => {
    const err = new ApiError({
      message: 'Not Found (404)',
      status: 404,
      endpoint: '/extended/v2/blocks/{height_or_hash}',
      method: 'GET',
    });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.name).toBe('ApiError');
    expect(err.message).toBe('Not Found (404)');
    expect(err.status).toBe(404);
    expect(err.endpoint).toBe('/extended/v2/blocks/{height_or_hash}');
    expect(err.method).toBe('GET');
  });
});
