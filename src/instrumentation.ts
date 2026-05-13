import * as Sentry from '@sentry/nextjs';

type Runtime = 'nodejs' | 'edge';

declare global {
  // eslint-disable-next-line no-var
  var __sentryInstrumentationInitialized__: Partial<Record<Runtime, boolean>> | undefined;
}

const runtimeConfigMap: Record<Runtime, string> = {
  nodejs: '../sentry.server.config',
  edge: '../sentry.edge.config',
};

function getCurrentRuntime(): Runtime | null {
  const runtime = process.env.NEXT_RUNTIME;
  return runtime === 'nodejs' || runtime === 'edge' ? runtime : null;
}

async function loadSentryConfig(runtime: Runtime): Promise<void> {
  globalThis.__sentryInstrumentationInitialized__ ??= {};
  if (globalThis.__sentryInstrumentationInitialized__[runtime]) return;

  await import(runtimeConfigMap[runtime]);
  globalThis.__sentryInstrumentationInitialized__[runtime] = true;
}

export async function register(): Promise<void> {
  const runtime = getCurrentRuntime();
  if (!runtime) return;
  await loadSentryConfig(runtime);
}

export const onRequestError: typeof Sentry.captureRequestError = (...args) =>
  Sentry.captureRequestError(...args);
