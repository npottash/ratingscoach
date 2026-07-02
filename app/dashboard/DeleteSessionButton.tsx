'use client'

import { useState, useTransition } from 'react'
import { deleteSession } from './actions'

export function DeleteSessionButton({
  sessionId,
  issuerName,
}: {
  sessionId: string
  issuerName: string
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const res = await deleteSession(sessionId)
      if (!res.ok) {
        setError(res.error)
      } else {
        setOpen(false)
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Delete ${issuerName} session`}
        title="Delete session"
        className="rounded-md p-1.5 text-muted transition hover:bg-red-50 hover:text-red-600"
      >
        <TrashIcon />
      </button>

      {open && (
        <ConfirmModal
          issuerName={issuerName}
          pending={pending}
          error={error}
          onCancel={() => {
            setOpen(false)
            setError(null)
          }}
          onConfirm={handleDelete}
        />
      )}
    </>
  )
}

function ConfirmModal({
  issuerName,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  issuerName: string
  pending: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-white p-6 shadow-xl">
        <h2
          id="delete-confirm-title"
          className="text-xl font-semibold tracking-tight text-foreground"
        >
          Delete session?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          This will permanently delete the session for{' '}
          <span className="font-medium text-foreground">{issuerName}</span> —
          including the readiness score and any real-meeting questions you
          logged. This cannot be undone.
        </p>

        {error && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            autoFocus
            className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium hover:border-brand hover:text-brand disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="rounded-md bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {pending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}
