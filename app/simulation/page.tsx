import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StepIndicator } from '@/components/StepIndicator'
import { PageHeader } from '@/components/PageHeader'
import { Simulation, type SimulationSession } from './Simulation'

export default async function SimulationPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams
  if (!session_id) redirect('/intake')

  const supabase = await createClient()
  const { data: session } = await supabase
    .from('sessions')
    .select(
      'id, issuer_name, sector, industry, sub_type, current_rating, outlook, agency, key_topics'
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
      <Simulation session={session} />
    </>
  )
}
