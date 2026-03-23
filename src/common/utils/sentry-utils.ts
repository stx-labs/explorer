import type { ErrorEvent, EventHint } from '@sentry/core';

export function addCustomFingerprint(event: ErrorEvent, hint?: EventHint): ErrorEvent {
  const errorMessage = event.exception?.values?.[0]?.value || '';

  //group all api errors by their http status code
  if (errorMessage.includes('Request failed with status code')) {
    const match = errorMessage.match(/status code (\d+)/);
    const status = match ? match[1] : 'unknown';
    event.fingerprint = ['api-error', status];
  } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
    event.fingerprint = ['network-error'];
  } else {
    event.fingerprint = ['{{ default }}'];
  }
  return event;
}
