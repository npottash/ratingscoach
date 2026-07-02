'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import {
  requestPasswordReset,
  type ForgotPasswordState,
} from './actions'

const initialState: ForgotPasswordState = undefined

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(
    requestPasswordReset,
    initialState
  )

  return (
    <>
      <PageHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="text-center">
            <h1 className="text-2xl font-semibold">Reset your password</h1>
            <p className="mt-2 text-sm text-muted">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          {state?.success ? (
            <div className="mt-8 rounded-md border border-border bg-white p-4 text-center text-sm">
              If an account exists for that email, a password reset link is on
              its way. Check your inbox.
            </div>
          ) : (
            <form action={action} className="mt-8 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Email</span>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </label>

              {state?.error && (
                <p className="text-sm text-red-600">{state.error}</p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="mt-2 rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
              >
                {pending ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted">
            Remembered it?{' '}
            <Link href="/login" className="text-brand hover:text-brand-hover">
              Back to sign in
            </Link>
          </p>
        </div>
      </main>
    </>
  )
}
