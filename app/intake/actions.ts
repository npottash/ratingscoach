'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Agency } from '@/lib/types'

const VALID_AGENCIES: Agency[] = ['S&P', "Moody's", 'Fitch']

export type IntakeFormState = { error?: string } | undefined

export async function submitIntake(
  _prev: IntakeFormState,
  formData: FormData
): Promise<IntakeFormState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in.' }
  }

  const issuer_name = String(formData.get('issuer_name') ?? '').trim()
  const ticker = String(formData.get('ticker') ?? '').trim() || null
  const sector = String(formData.get('sector') ?? '').trim()
  const industry = String(formData.get('industry') ?? '').trim() || null
  const sub_type = String(formData.get('sub_type') ?? '').trim() || null
  const current_rating = String(formData.get('current_rating') ?? '').trim()
  const outlook = String(formData.get('outlook') ?? '').trim()
  const agencyRaw = formData.getAll('agency').map(String)
  const agency = agencyRaw.filter((a): a is Agency =>
    (VALID_AGENCIES as string[]).includes(a)
  )
  const meeting_date = String(formData.get('meeting_date') ?? '').trim()
  const meeting_type = String(formData.get('meeting_type') ?? '').trim()
  const key_topics = String(formData.get('key_topics') ?? '').trim() || null

  if (
    !issuer_name ||
    !sector ||
    !current_rating ||
    !outlook ||
    agency.length === 0 ||
    !meeting_date ||
    !meeting_type
  ) {
    return { error: 'Please fill in all required fields.' }
  }

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: user.id,
      issuer_name,
      ticker,
      sector,
      industry,
      sub_type,
      current_rating,
      outlook,
      agency,
      meeting_date,
      meeting_type,
      key_topics,
      status: 'intake',
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: error?.message ?? 'Failed to create session.' }
  }

  redirect(`/narrative?session_id=${data.id}`)
}
