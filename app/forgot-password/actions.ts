'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export type ForgotPasswordState =
  | { error?: string; success?: boolean }
  | undefined

export async function requestPasswordReset(
  _prev: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get('email') ?? '').trim()

  if (!email) {
    return { error: 'Email is required.' }
  }

  const h = await headers()
  const origin = h.get('origin') ?? 'https://www.theratingscoach.com'

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
