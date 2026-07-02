'use client'

import { useActionState } from 'react'
import { joinWaitlist, type WaitlistState } from './actions'

const initialState: WaitlistState = { status: 'idle' }

export function WaitlistForm() {
  const [state, action, pending] = useActionState(joinWaitlist, initialState)
  const done = state.status === 'success'

  return (
    <div className="flex flex-col items-center gap-3">
      <form
        action={action}
        className="flex w-full flex-col gap-3 sm:flex-row"
      >
        <input
          name="email"
          type="email"
          required
          placeholder="you@firm.com"
          autoComplete="email"
          disabled={pending || done}
          className="flex-1 rounded-md border border-border bg-white px-4 py-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={pending || done}
          className="rounded-md bg-brand px-6 py-3 text-base font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {pending ? 'Submitting…' : done ? 'Submitted' : 'Request access'}
        </button>
      </form>
      {state.status === 'success' && (
        <p className="text-sm font-medium text-emerald-700">{state.message}</p>
      )}
      {state.status === 'error' && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}
    </div>
  )
}
