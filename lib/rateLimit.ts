import type { SupabaseClient } from '@supabase/supabase-js'

// Per-user daily caps. Overridable via env so limits can be tuned per
// environment without a deploy-time code change.
const DEFAULT_LIMITS: Record<string, number> = {
  simulate: 300, // turns/day — several full simulation sessions
  coach: 100, // coach questions/day
  extract: 20, // document transcriptions/day — each is a full-PDF vision call
}

function limitFor(endpoint: string): number {
  const envKey = `RATE_LIMIT_${endpoint.toUpperCase()}_PER_DAY`
  const fromEnv = Number(process.env[envKey])
  return Number.isFinite(fromEnv) && fromEnv > 0
    ? fromEnv
    : (DEFAULT_LIMITS[endpoint] ?? 100)
}

/**
 * Increment the user's daily counter for an endpoint and check the cap.
 * Returns true if the request is allowed.
 *
 * Fails open if the increment_api_usage function/table hasn't been created
 * yet (see supabase/migrations/20260701000000_api_usage.sql) so the app
 * keeps working before the migration is run.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  endpoint: 'simulate' | 'coach' | 'extract'
): Promise<boolean> {
  const { data, error } = await supabase.rpc('increment_api_usage', {
    p_user_id: userId,
    p_endpoint: endpoint,
    p_limit: limitFor(endpoint),
  })

  if (error) {
    console.error(`rate-limit check failed for ${endpoint}:`, error.message)
    return true
  }
  return data === true
}
