import * as Sentry from '@sentry/nextjs'

// Server + edge error monitoring. Privacy posture matches the zero-retention
// design documented on /security: no PII, no request bodies — narratives and
// transcripts must never appear in error reports.
export async function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? 'development',
    tracesSampleRate: 0.1,
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
}

export const onRequestError = Sentry.captureRequestError
