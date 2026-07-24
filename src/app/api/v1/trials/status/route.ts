import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'
import { z } from 'zod'
import { handleRouteError, validateBody } from '@/utils/api'
import { computeTrialTier, daysLeft, elapsedDays, runsLeft } from '@/utils/trial'

const StatusSchema = z.object({
  machine_id: z.string().min(1, 'Missing machine_id')
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = validateBody(StatusSchema, {
      machine_id: searchParams.get('machine_id')
    })
    if ('error' in parsed) return parsed.error

    const { machine_id } = parsed.data
    const adminClient = createAdminClient()

    const { data: existing, error } = await adminClient
      .from('trials')
      .select('runs_count, started_at')
      .eq('machine_id', machine_id)
      .maybeSingle()

    if (error || !existing) {
      return NextResponse.json({
        success: true,
        tier: 'free',
        runs_left: 0,
        days_left: 0
      })
    }

    const runsRemaining = runsLeft(existing.runs_count)
    const daysRemaining = daysLeft(elapsedDays(new Date(existing.started_at)))
    const tier = computeTrialTier(runsRemaining, daysRemaining)

    return NextResponse.json({
      success: true,
      tier,
      runs_left: runsRemaining,
      days_left: daysRemaining
    })

  } catch (err: unknown) {
    return handleRouteError(err, { logPrefix: 'Trial status endpoint error:', fallback: 'Internal server error' })
  }
}
