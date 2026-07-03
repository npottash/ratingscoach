import * as Sentry from '@sentry/nextjs'

const DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  'https://1a9d56a8fc1545c8a344bf280af19bc2@o4511668019265536.ingest.us.sentry.io/4511668039516160'

// Browser error monitoring.
//
// Session Replay is intentionally NOT enabled. Replay records the DOM, which
// would capture the prepared narrative and the live simulation transcript —
// the exact content that /security promises never leaves this browser tab.
// Enabling it would break the product's core zero-retention guarantee.
Sentry.init({
  dsn: DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',
  tracesSampleRate:
    process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' ? 0.1 : 1.0,
  sendDefaultPii: false,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
