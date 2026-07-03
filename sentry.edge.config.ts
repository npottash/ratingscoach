import * as Sentry from '@sentry/nextjs'

const DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  'https://1a9d56a8fc1545c8a344bf280af19bc2@o4511668019265536.ingest.us.sentry.io/4511668039516160'

// Edge runtime error monitoring (proxy.ts and any edge routes). Same privacy
// posture as the server config — no local variables, no log forwarding.
Sentry.init({
  dsn: DSN,
  environment: process.env.VERCEL_ENV ?? 'development',
  tracesSampleRate: process.env.VERCEL_ENV === 'production' ? 0.1 : 1.0,
  sendDefaultPii: false,
  beforeSend(event) {
    if (event.request) {
      delete event.request.data
      delete event.request.cookies
    }
    return event
  },
})
