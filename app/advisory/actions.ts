'use server'

import { createClient } from '@supabase/supabase-js'

export type AdvisoryState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }

export async function requestAdvisory(
  _prev: AdvisoryState,
  formData: FormData
): Promise<AdvisoryState> {
  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const company = String(formData.get('company') ?? '').trim() || null
  const notes = String(formData.get('notes') ?? '').trim() || null

  if (!name) {
    return { status: 'error', message: 'Please enter your name.' }
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: 'error', message: 'Please enter a valid email address.' }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return {
      status: 'error',
      message: 'Booking is temporarily unavailable. Please try again later.',
    }
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  const { error } = await admin
    .from('advisory_requests')
    .insert({ name, email, company, notes })

  if (error) {
    console.error('advisory request insert failed:', error.message)
    return {
      status: 'error',
      message:
        'Something went wrong submitting your request. Please email us directly or try again.',
    }
  }

  return {
    status: 'success',
    message:
      "Request received. A senior advisor will reach out to schedule within one business day.",
  }
}
