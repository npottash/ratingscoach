'use server'

import { createClient } from '@/lib/supabase/server'
import type { Agency } from '@/lib/types'

const VALID_AGENCIES: Agency[] = ['S&P', "Moody's", 'Fitch']

/**
 * Switch the session's agency (agency-fit "prepare for X instead" action).
 * RLS scopes the update to the requesting user's own sessions.
 */
export async function switchAgency(
  sessionId: string,
  agency: Agency
): Promise<{ error?: string }> {
  if (!VALID_AGENCIES.includes(agency)) {
    return { error: 'Invalid agency.' }
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const { error } = await supabase
    .from('sessions')
    .update({ agency: [agency] })
    .eq('id', sessionId)
  if (error) return { error: 'Could not update the agency. Please try again.' }
  return {}
}
