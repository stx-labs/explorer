import { isTrustedStacksApiUrl } from './server-api-origin';

export async function stacksAPIFetch(url: string, options: RequestInit = {}) {
  const reqHeaders = new Headers(options.headers || {});

  reqHeaders.delete('x-api-key');
  if (isTrustedStacksApiUrl(url) && process.env.EXPLORER_STACKS_API_KEY) {
    reqHeaders.set('x-api-key', process.env.EXPLORER_STACKS_API_KEY);
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
    // Never forward the server key through a redirect; uncredentialed custom APIs may redirect.
    redirect: reqHeaders.has('x-api-key') ? 'error' : options.redirect,
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
