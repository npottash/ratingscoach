'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Top header for info / legal / app pages. Shows the wordmark on the left,
 * linking back to home.
 *
 * If `confirmExit` is set, clicking the wordmark shows a confirmation modal
 * before navigating away — used on the simulation page so users don't lose
 * an in-progress session by accident.
 */
export function PageHeader({ confirmExit }: { confirmExit?: string }) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)

  function handleClick(e: React.MouseEvent) {
    if (!confirmExit) return
    e.preventDefault()
    setShowConfirm(true)
  }

  function leave() {
    setShowConfirm(false)
    router.push('/')
  }

  return (
    <>
      <header className="border-b border-border bg-white print:hidden">
        <div className="mx-auto flex w-full max-w-6xl items-center px-6 py-5">
          <Link
            href="/"
            onClick={handleClick}
            aria-label="The Ratings Coach — back to home"
            className="flex items-center"
          >
            <img
              src="/wordmark-header.svg"
              alt="The Ratings Coach"
              width={240}
              height={32}
              className="h-8 w-auto"
            />
          </Link>
        </div>
      </header>

      {showConfirm && confirmExit && (
        <ExitConfirmModal
          message={confirmExit}
          onCancel={() => setShowConfirm(false)}
          onLeave={leave}
        />
      )}
    </>
  )
}

function ExitConfirmModal({
  message,
  onCancel,
  onLeave,
}: {
  message: string
  onCancel: () => void
  onLeave: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-white p-6 shadow-xl">
        <h2
          id="exit-confirm-title"
          className="text-xl font-semibold tracking-tight text-foreground"
        >
          Leave this page?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            autoFocus
            className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium hover:border-brand hover:text-brand"
          >
            Stay here
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="rounded-md bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-hover"
          >
            Leave anyway
          </button>
        </div>
      </div>
    </div>
  )
}
