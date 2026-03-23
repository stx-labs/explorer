import * as Sentry from '@sentry/nextjs';
import { addCustomFingerprint } from './common/utils/sentry-utils';

function isThirdPartyError(event: Sentry.ErrorEvent): boolean {
  const errorMessage = event.exception?.values?.[0]?.value || '';
  const frames = event.exception?.values?.[0]?.stacktrace?.frames || [];
  const filename = frames[frames.length - 1]?.filename || '';

  if (
    filename.includes('gt-window-provider') ||
    errorMessage.includes('shouldSetTallyForCurrentProvider') ||
    errorMessage.includes('walletRouter')
  ) {
    return true;
  }

  if (
    filename.startsWith('extension://') ||
    filename.startsWith('moz-extension://') ||
    filename.startsWith('chrome-extension://') ||
    filename.startsWith('safari-extension://')
  ) {
    return true;
  }

  return false;
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,
  debug: false,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,

  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  beforeSend(event, hint) {
    if (isThirdPartyError(event)) {
      return null;
    }
    return addCustomFingerprint(event, hint);
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
const version = process.env.NEXT_PUBLIC_RELEASE_TAG_NAME || 'dev';
Sentry.setTag('version', version);
