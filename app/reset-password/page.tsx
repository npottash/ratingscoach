'use client'

import { useActionState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import type { AuthFormState } from '../login/actions'
import { updatePassword } from './actions'

const initialState: AuthFormState = undefined

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState(updatePassword, initialState)

  return (
    <>
      <PageHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="text-center">
            <h1 className="text-2xl font-semibold">Choose a new password</h1>
            <p className="mt-2 text-sm text-muted">
              You&apos;re signed in via your reset link. Set a new password
              below.
            </p>
          </div>

          <form action={action} className="mt-8 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">New password</span>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Confirm new password</span>
              <input
                name="confirm"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
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
              {pending ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </div>
      </main>
    </>
  )
}
