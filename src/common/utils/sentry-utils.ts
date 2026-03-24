import type { ErrorEvent, EventHint } from '@sentry/core';

export function addCustomFingerprint(event: ErrorEvent, hint?: EventHint): ErrorEvent {
  const errorMessage = event.exception?.values?.[0]?.value || '';
  const originalError = hint?.originalException as any;
  const status = originalError?.status;

  //group all api errors by their http status code
  if (status) {
    event.fingerprint = ['api-error', String(status)];
  } else if (errorMessage.includes('Request failed with status code')) {
    const match = errorMessage.match(/status code (\d+)/);
    const extractedStatus = match ? match[1] : 'unknown';
    event.fingerprint = ['api-error', extractedStatus];
  } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
    event.fingerprint = ['network-error'];
  } else {
    event.fingerprint = ['{{ default }}'];
  }
  return event;
}
