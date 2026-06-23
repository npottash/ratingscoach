'use server'

import { createClient } from '@/lib/supabase/server'

export type SaveRealQuestionsResult = { error?: string; saved?: number }

export async function saveRealQuestions(
  session_id: string,
  agency: string,
  sector: string,
  raw: string
): Promise<SaveRealQuestionsResult> {
  // Industry/sub_type are not stored alongside real questions for now —
  // they live on the parent session row. Retrieval joins through session_id
  // when needed.
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length === 0) return { saved: 0 }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const { error } = await supabase.from('real_questions').insert(
    lines.map((l) => ({
      user_id: user.id,
      session_id,
      agency,
      sector,
      question_text: l,
    }))
  )

  if (error) return { error: error.message }
  return { saved: lines.length }
}
