import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StepIndicator } from '@/components/StepIndicator'
import { PageHeader } from '@/components/PageHeader'
import { BuilderWizard, type BuilderSession } from './BuilderWizard'

export default async function BuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams
  if (!session_id) redirect('/intake')

  const supabase = await createClient()
  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', session_id)
    .single<BuilderSession>()

  if (!session) redirect('/intake')

  return (
    <>
      <PageHeader />
      <StepIndicator current={2} sessionId={session.id} />
      <BuilderWizard session={session} />
    </>
  )
}
