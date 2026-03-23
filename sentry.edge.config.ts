import * as Sentry from '@sentry/nextjs';
import { addCustomFingerprint } from './src/common/utils/sentry-utils';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,
  debug: false,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  beforeSend(event, hint) {
    return addCustomFingerprint(event, hint);
  },

});
const version =
  process.env.SENTRY_RELEASE ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.NEXT_PUBLIC_RELEASE_TAG_NAME ||
  'dev';
Sentry.setTag('version', version);