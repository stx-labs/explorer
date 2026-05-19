import type { SeverityLevel } from '@sentry/nextjs';

export class ApiError extends Error {
  readonly status?: number;
  readonly endpoint: string;
  readonly method: string;

  constructor(params: { message: string; status?: number; endpoint: string; method: string }) {
    super(params.message);
    // tsconfig target is ES5; extending built-ins like Error breaks the
    // prototype chain after transpile, which makes `instanceof ApiError`
    // return false. Restore the prototype explicitly.
    Object.setPrototypeOf(this, ApiError.prototype);
    this.name = 'ApiError';
    this.status = params.status;
    this.endpoint = params.endpoint;
    this.method = params.method;
  }
}

export function getApiErrorSeverity(status?: number): SeverityLevel {
  if (status === undefined) return 'error';
  if (status >= 500) return 'error';
  if (status >= 400) return 'warning';
  return 'info';
}

export function getApiErrorFingerprint(
  endpoint: string,
  method: string,
  status?: number
): string[] {
  return ['api', method, endpoint, status !== undefined ? String(status) : 'no-status'];
}
