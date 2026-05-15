import * as Sentry from '@sentry/nextjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,
  debug: false,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  integrations: [nodeProfilingIntegration()],
  initialScope: {
    tags: {
      'app.name': 'stacks-explorer',
      'app.runtime': 'server',
    },
  },
});
