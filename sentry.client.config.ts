import * as Sentry from '@sentry/nextjs';

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: process.env.NODE_ENV === 'production',
    tracesSampleRate: 0.1,
    debug: false,

    //  debugging user sessions leading to errors
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
        Sentry.replayIntegration({
            maskAllText: true,
            blockAllMedia: true,
        }),
    ]
    
});
Sentry.setTag('version',
    process.env.NEXT_PUBLIC_RELEASE_TAG_NAME || 'dev'
);