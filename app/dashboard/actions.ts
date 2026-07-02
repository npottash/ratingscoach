'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export type DeleteSessionResult = { ok: true } | { ok: false; error: string }

export async function deleteSession(
  sessionId: string
): Promise<DeleteSessionResult> {
  if (!sessionId) {
    return { ok: false, error: 'Missing session id.' }
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  // Belt + suspenders: RLS already scopes to the user, but the explicit
  // user_id filter makes the intent obvious in the code and the SQL.
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', user.id)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/dashboard')
  return { ok: true }
}
