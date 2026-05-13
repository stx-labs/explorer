import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
const isProduction = process.env.NODE_ENV === 'production';
const isSentryEnabled = isProduction && Boolean(dsn);

const THIRD_PARTY_NOISE_URL = /(?:google-analytics|googletagmanager)\.com/i;
const THIRD_PARTY_NOISE_MESSAGE = /^Failed to fetch \(.*(?:google-analytics|googletagmanager)\.com.*\)$/i;
const SENSITIVE_QUERY_PARAM_KEYS = new Set([
  'token',
  'auth',
  'authorization',
  'key',
  'api_key',
  'apikey',
  'signature',
  'sig',
  'password',
  'secret',
]);

const sanitizeUrl = (rawUrl: string): string => {
  try {
    const url = new URL(rawUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    for (const key of [...url.searchParams.keys()]) {
      if (SENSITIVE_QUERY_PARAM_KEYS.has(key.toLowerCase())) {
        url.searchParams.set(key, '[REDACTED]');
      }
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
};

Sentry.init({
  dsn,
  enabled: isSentryEnabled,
  environment,
  tracesSampleRate: 0.1,
  debug: false,

  ignoreErrors: [THIRD_PARTY_NOISE_MESSAGE],

  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.thirdPartyErrorFilterIntegration({
      filterKeys: ['stacks-explorer'],
      behaviour: 'drop-error-if-exclusively-contains-third-party-frames',
    }),
  ],

  beforeSend(event, hint) {
    const originalException = hint.originalException;
    const message =
      (typeof originalException === 'object' &&
        originalException &&
        'message' in originalException &&
        typeof (originalException as { message?: unknown }).message === 'string' &&
        (originalException as { message: string }).message) ||
      event.message ||
      '';

    if (THIRD_PARTY_NOISE_MESSAGE.test(message)) {
      return null;
    }

    if (event.request?.url && THIRD_PARTY_NOISE_URL.test(event.request.url)) {
      return null;
    }

    if (event.request?.url) {
      event.request.url = sanitizeUrl(event.request.url);
    }

    return event;
  },

  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
      const data = breadcrumb.data as { url?: string } | undefined;
      if (data?.url) {
        if (THIRD_PARTY_NOISE_URL.test(data.url)) return null;
        data.url = sanitizeUrl(data.url);
      }
    }
    return breadcrumb;
  },

  initialScope: {
    tags: {
      app: 'stacks-explorer',
    },
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;