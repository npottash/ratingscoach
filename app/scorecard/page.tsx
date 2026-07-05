import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StepIndicator } from '@/components/StepIndicator'
import { PageHeader } from '@/components/PageHeader'
import { Scorecard, type ScorecardSession } from './Scorecard'
import type { Agency } from '@/lib/types'

const VALID_AGENCIES: Agency[] = ['S&P', "Moody's", 'Fitch']

export default async function ScorecardPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; agency?: string }>
}) {
  const { session_id, agency } = await searchParams
  if (!session_id) redirect('/intake')
  if (!agency || !VALID_AGENCIES.includes(agency as Agency)) redirect('/intake')

  const supabase = await createClient()
  const { data: session } = await supabase
    .from('sessions')
    .select(
      'id, issuer_name, sector, industry, sub_type, current_rating, outlook, agency, meeting_type, meeting_date, overall_score, factors_flagged, critical_gaps'
    )
    .eq('id', session_id)
    .single<ScorecardSession>()

  if (!session) redirect('/intake')

  return (
    <>
      <PageHeader />
      <StepIndicator current={4} sessionId={session.id} agency={agency} />
      <Scorecard session={session} agency={agency as Agency} />
    </>
  )
}
