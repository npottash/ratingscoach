import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StepIndicator } from '@/components/StepIndicator'
import { PageHeader } from '@/components/PageHeader'
import { NarrativeForm, type SessionSummary } from './NarrativeForm'

export default async function NarrativePage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams
  if (!session_id) redirect('/intake')

  const supabase = await createClient()
  const { data: session } = await supabase
    .from('sessions')
    .select('id, issuer_name, agency, meeting_date, key_topics')
    .eq('id', session_id)
    .single<SessionSummary>()

  if (!session) redirect('/intake')

  return (
    <>
      <PageHeader />
      <StepIndicator current={2} sessionId={session.id} />
      <NarrativeForm session={session} />
    </>
  )
}
