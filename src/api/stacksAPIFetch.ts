import { isTrustedStacksApiUrl } from './server-api-origin';

export async function stacksAPIFetch(url: string, options: RequestInit = {}) {
  const reqHeaders = new Headers(options.headers || {});

  reqHeaders.delete('x-api-key');
  if (isTrustedStacksApiUrl(url)) {
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
    // Do not let an allowed destination redirect credentials or server requests elsewhere.
    redirect: 'error',
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
    throw new Error(`${errorContext}: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}
