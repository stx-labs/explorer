import { isConfiguredApiUrl } from '@/common/utils/network-utils';

export class StacksApiResponseError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly statusText: string,
    readonly retryAfter?: string
  ) {
    super(`${message}: ${status} ${statusText}`);
    this.name = 'StacksApiResponseError';
  }
}

export async function stacksAPIFetch(url: string, options: RequestInit = {}) {
  const reqHeaders = new Headers(options.headers || {});

  // The explorer's key belongs to the configured public API servers only. Several server
  // components derive the URL from a visitor-supplied `api` parameter; that host must never see it.
  if (isConfiguredApiUrl(url)) {
    reqHeaders.set('x-api-key', process.env.EXPLORER_STACKS_API_KEY || '');
  }

  try {
    const { headers: getHeaders } = await import('next/headers');
    const incomingHeaders = await getHeaders();
    const referrer =
      incomingHeaders.get('referer') || incomingHeaders.get('x-forwarded-for') || undefined;
    if (referrer) {
      reqHeaders.set('Referer', referrer);
    }
  } catch {}

  return fetch(url, {
    ...options,
    headers: reqHeaders,
  });
}

export async function stacksAPIFetchJson<T>(
  url: string,
  options: RequestInit = {},
  errorContext = 'Stacks API request failed'
): Promise<T> {
  const response = await stacksAPIFetch(url, options);
  if (!response.ok) {
    throw new StacksApiResponseError(
      errorContext,
      response.status,
      response.statusText,
      response.headers.get('retry-after') ?? undefined
    );
  }
  return (await response.json()) as T;
}
