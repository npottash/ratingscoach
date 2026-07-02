'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

// Root-level error boundary — catches errors that escape the app layout and
// reports them to Sentry (when configured).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted">
            The error has been reported. Your session data lives only in this
            tab and was not affected.
          </p>
          <button
            onClick={reset}
            className="mt-6 rounded-md bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
