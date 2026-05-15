import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,
  debug: false,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  initialScope: {
    tags: {
      'app.name': 'stacks-explorer',
      'app.runtime': 'client',
    },
  },

  // Drop errors whose message matches these patterns. The parenthesized domain format
  // (e.g. "Failed to fetch (www.google-analytics.com)") is added by Sentry's fetch
  // instrumentation and never appears in first-party fetch errors.
  ignoreErrors: [/^Failed to fetch \(.*(?:google-analytics|googletagmanager)\.com.*\)$/],

  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
    // Uses build-time code tagging to identify first-party vs third-party stack frames.
    // Drops errors that originate exclusively from third-party code (browser extensions,
    // injected scripts, etc.) without needing to maintain URL/message pattern lists.
    Sentry.thirdPartyErrorFilterIntegration({
      filterKeys: ['stacks-explorer'],
      behaviour: 'drop-error-if-exclusively-contains-third-party-frames',
    }),
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
