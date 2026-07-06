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
  searchParams: Promise<{ session_id?: string; agency?: string; print?: string }>
}) {
  const { session_id, agency, print } = await searchParams
  if (!session_id) redirect('/intake')
  if (!agency || !VALID_AGENCIES.includes(agency as Agency)) redirect('/intake')

  const supabase = await createClient()
  // select('*') so the page tolerates the scorecard_output column not having
  // been migrated yet — the field simply comes back undefined.
  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', session_id)
    .single<ScorecardSession>()

  if (!session) redirect('/intake')

  return (
    <>
      <PageHeader />
      <StepIndicator current={4} sessionId={session.id} agency={agency} />
      <Scorecard
        session={session}
        agency={agency as Agency}
        autoPrint={print === '1'}
      />
    </>
  )
}
