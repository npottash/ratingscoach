import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StepIndicator } from '@/components/StepIndicator'
import { PageHeader } from '@/components/PageHeader'
import { Simulation, type SimulationSession } from './Simulation'
import type { Agency } from '@/lib/types'

const VALID_AGENCIES: Agency[] = ['S&P', "Moody's", 'Fitch']

export default async function SimulationPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; agency?: string }>
}) {
  const { session_id, agency } = await searchParams
  if (!session_id) redirect('/intake')
  // Optional agency override — used by "Run this session against X" on the
  // scorecard to rerun the same setup with a different agency.
  const agencyOverride = VALID_AGENCIES.includes(agency as Agency)
    ? (agency as Agency)
    : undefined

  const supabase = await createClient()
  const { data: session } = await supabase
    .from('sessions')
    .select(
      'id, issuer_name, ticker, sector, industry, sub_type, current_rating, outlook, agency, meeting_type'
    )
    .eq('id', session_id)
    .single<SimulationSession>()

  if (!session) redirect('/intake')

  return (
    <>
      <PageHeader confirmExit="Leaving will end the simulation. Your conversation and answers live only in this browser tab and will be lost." />
      <StepIndicator
        current={3}
        sessionId={session.id}
        confirmBack="Leaving will end the simulation. Your conversation and answers live only in this browser tab and will be lost."
      />
      <Simulation session={session} agencyOverride={agencyOverride} />
    </>
  )
}
