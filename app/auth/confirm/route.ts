import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// Handles Supabase email-link verification (password recovery, email
// confirmation). Supports both link styles: token_hash + type (verifyOtp)
// and PKCE code (exchangeCodeForSession). On success the session cookies
// are set and the user is redirected to `next`.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  const redirectTo = request.nextUrl.clone()
  redirectTo.pathname = next
  redirectTo.search = ''

  const supabase = await createClient()

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    })
    if (!error) return NextResponse.redirect(redirectTo)
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(redirectTo)
  }

  redirectTo.pathname = '/login'
  redirectTo.search = '?error=link-expired'
  return NextResponse.redirect(redirectTo)
}
