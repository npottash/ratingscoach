'use server'

import { createClient } from '@supabase/supabase-js'

export type WaitlistState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }

export async function joinWaitlist(
  _prev: WaitlistState,
  formData: FormData
): Promise<WaitlistState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      status: 'error',
      message: 'Please enter a valid email address.',
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return {
      status: 'error',
      message: 'Waitlist is temporarily unavailable. Please try again later.',
    }
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  const { error } = await admin.from('waitlist').insert({ email })

  // Postgres unique violation = already on the list. Treat as success so we
  // don't leak whether an email is in the database and so the UX is friendly.
  if (error && error.code !== '23505') {
    return { status: 'error', message: error.message }
  }

  return {
    status: 'success',
    message: "You're on the list — we'll be in touch.",
  }
}
