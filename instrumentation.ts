import * as Sentry from '@sentry/nextjs'

// Loads the runtime-appropriate Sentry config once per server instance.
// Follows the Sentry Next.js SDK convention: dispatch by NEXT_RUNTIME.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
