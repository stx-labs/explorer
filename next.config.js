const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  output: 'standalone',
  turbopack: {},
  async headers() {
    return [
      {
        source: '/(.*)?', // Matches all pages
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Document-Policy',
            value: 'js-profiling',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/about',
        destination: '/',
        permanent: true,
      },
    ];
  },
  experimental: {
    optimizePackageImports: ['@chakra-ui/react'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'assets.hiro.so',
      },
    ],
  },
};

// Sentry configuration with more explicit options
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options
  org: 'hirosystems',
  project: 'explorer',

  // Enable sourcemap uploads
  uploadSourceMaps: true,

  // Include source content in sourcemaps
  include: '.next',
  ignore: ['node_modules', 'next.config.js'],

  // Ensure Debug IDs are properly injected
  injectClientSideDebugIds: true,

  // Only print logs for uploading source maps in CI
  silent: false,
  debug: false,

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Hides source maps from generated client bundles
  // Does NOT prevent source maps from being generated or uploaded to Sentry.
  hideSourceMaps: false,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  // automaticVercelMonitors: true,
  experimental: {
    instrumentationHook: true,
  },

  // Tells Sentry to automatically associate your sourcemaps with the correct Git commit information.
  setCommits: {
    auto: true,
  },

  // Ensure sourcemaps are uploaded with the correct release
  deploy: {
    env: process.env.NODE_ENV || 'production',
  },

  release: {
    // Defines the release identifier that Sentry will use to match errors with the correct sourcemaps.
    name: process.env.NEXT_PUBLIC_RELEASE_TAG_NAME || `dev-${Date.now()}`,
    // Automatically injects the release name into your Sentry configuration at build time.
    inject: true,
  },
};

// Apply Sentry configuration
module.exports = withSentryConfig(withBundleAnalyzer(nextConfig), sentryWebpackPluginOptions);
