import * as Sentry from '@sentry/nextjs'

const DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  'https://1a9d56a8fc1545c8a344bf280af19bc2@o4511668019265536.ingest.us.sentry.io/4511668039516160'

// Node.js runtime error monitoring.
//
// Privacy posture is deliberately hardened to match the zero-retention design
// documented on /security. Two Sentry defaults are intentionally NOT enabled:
//   - includeLocalVariables: would attach server-side local variables to
//     stack traces, which for /api/simulate and /api/coach would include the
//     issuer narrative and simulation transcript. Left off.
//   - enableLogs: would forward all console output to Sentry. Left off so no
//     logged content can carry issuer material off-box.
Sentry.init({
  dsn: DSN,
  environment: process.env.VERCEL_ENV ?? 'development',
  tracesSampleRate: process.env.VERCEL_ENV === 'production' ? 0.1 : 1.0,
  sendDefaultPii: false,
  // Belt and braces: strip any request body/cookies from every event so a
  // narrative or transcript can never ride along in an error report.
  beforeSend(event) {
    if (event.request) {
      delete event.request.data
      delete event.request.cookies
    }
    return event
  },
})
