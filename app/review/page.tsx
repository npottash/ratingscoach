import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StepIndicator } from '@/components/StepIndicator'
import { PageHeader } from '@/components/PageHeader'
import { DeskReview, type DeskReviewSession } from './DeskReview'

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams
  if (!session_id) redirect('/intake')

  const supabase = await createClient()
  // select('*') so the page tolerates schema drift and carries any persisted
  // desk review inside scorecard_output.
  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', session_id)
    .single<DeskReviewSession>()

  if (!session) redirect('/intake')

  return (
    <>
      <PageHeader />
      <StepIndicator current={2} sessionId={session.id} />
      <DeskReview session={session} />
    </>
  )
}
