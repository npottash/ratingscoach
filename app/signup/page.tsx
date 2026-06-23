'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { signup } from './actions'
import type { AuthFormState } from '../login/actions'

const initialState: AuthFormState = undefined

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, initialState)

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="text-center">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            The Ratings Coach
          </Link>
          <h1 className="mt-8 text-2xl font-semibold">Create your account</h1>
          <p className="mt-2 text-sm text-muted">
            Start prepping for your next agency meeting.
          </p>
        </div>

        <form action={action} className="mt-8 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Work email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Password</span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <span className="text-xs text-muted">At least 8 characters.</span>
          </label>

          {state?.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {pending ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link href="/login" className="text-brand hover:text-brand-hover">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
