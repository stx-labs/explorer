export async function stacksAPIFetch(url: string, options: RequestInit = {}) {
  const reqHeaders = new Headers(options.headers || {});

  reqHeaders.set('x-api-key', process.env.EXPLORER_STACKS_API_KEY || '');

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
