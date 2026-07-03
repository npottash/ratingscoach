'use client'

import { useActionState } from 'react'
import { requestAdvisory, type AdvisoryState } from './actions'

const initialState: AdvisoryState = { status: 'idle' }

const inputClass =
  'rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'
const labelClass = 'flex flex-col gap-1.5 text-sm font-medium text-foreground'

export function AdvisoryForm() {
  const [state, action, pending] = useActionState(requestAdvisory, initialState)

  if (state.status === 'success') {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-emerald-800">
          Request received
        </h2>
        <p className="mt-2 text-sm text-emerald-700">{state.message}</p>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className={labelClass}>
        <span>Name</span>
        <input name="name" required autoComplete="name" className={inputClass} />
      </label>
      <label className={labelClass}>
        <span>Work email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        <span>
          Company <span className="font-normal text-muted">(optional)</span>
        </span>
        <input name="company" autoComplete="organization" className={inputClass} />
      </label>
      <label className={labelClass}>
        <span>
          What would you like help with?{' '}
          <span className="font-normal text-muted">(optional)</span>
        </span>
        <textarea
          name="notes"
          rows={4}
          placeholder="Upcoming meeting, agency, timing, and where you'd like a second set of eyes."
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
        {pending ? 'Submitting…' : 'Request a session'}
      </button>
    </form>
  )
}
