'use server'

import { createClient } from '@supabase/supabase-js'

export type FeedbackState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }

export async function submitFeedback(
  _prev: FeedbackState,
  formData: FormData
): Promise<FeedbackState> {
  const name = String(formData.get('name') ?? '').trim() || null
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const message = String(formData.get('message') ?? '').trim()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: 'error', message: 'Please enter a valid email address.' }
  }
  if (!message) {
    return { status: 'error', message: 'Please enter your feedback.' }
  }
  // Bound abuse from a public form.
  if (message.length > 5000) {
    return {
      status: 'error',
      message: 'Please keep feedback under 5,000 characters.',
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return {
      status: 'error',
      message:
        'The form is temporarily unavailable. Please email feedback@theratingscoach.com instead.',
    }
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  const { error } = await admin
    .from('feedback')
    .insert({ name, email, message })

  if (error) {
    console.error('feedback insert failed:', error.message)
    return {
      status: 'error',
      message:
        'Something went wrong. Please email feedback@theratingscoach.com or try again.',
    }
  }

  return {
    status: 'success',
    message: "Thank you — we read every note. If a reply is needed, we'll be in touch.",
  }
}
