'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { login, type AuthFormState } from './actions'

const initialState: AuthFormState = undefined

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, initialState)

  return (
    <>
      <PageHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="text-center">
            <h1 className="text-2xl font-semibold">Sign in</h1>
            <p className="mt-2 text-sm text-muted">
              Continue your meeting prep.
            </p>
          </div>

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
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Password</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </label>

          {state?.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <p className="text-right text-sm">
            <Link
              href="/forgot-password"
              className="text-brand hover:text-brand-hover"
            >
              Forgot password?
            </Link>
          </p>

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

          <p className="mt-6 text-center text-sm text-muted">
            New here?{' '}
            <Link href="/signup" className="text-brand hover:text-brand-hover">
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </>
  )
}
