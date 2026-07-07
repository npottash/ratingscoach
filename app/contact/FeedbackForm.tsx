'use client'

import { useActionState } from 'react'
import { submitFeedback, type FeedbackState } from './actions'

const initialState: FeedbackState = { status: 'idle' }

const inputClass =
  'rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'
const labelClass = 'flex flex-col gap-1.5 text-sm font-medium text-foreground'

export function FeedbackForm() {
  const [state, action, pending] = useActionState(submitFeedback, initialState)

  if (state.status === 'success') {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-emerald-800">
          Feedback received
        </h2>
        <p className="mt-2 text-sm text-emerald-700">{state.message}</p>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className={labelClass}>
        <span>
          Name <span className="font-normal text-muted">(optional)</span>
        </span>
        <input name="name" autoComplete="name" className={inputClass} />
      </label>
      <label className={labelClass}>
        <span>Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        <span>Your feedback</span>
        <textarea
          name="message"
          required
          rows={6}
          placeholder="What's working, what isn't, what you'd like to see…"
          className={inputClass}
        />
      </label>

      {state.status === 'error' && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 self-start rounded-md bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
      >
        {pending ? 'Sending…' : 'Send feedback'}
      </button>
    </form>
  )
}
