import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'
import { z } from 'zod'

const StatusSchema = z.object({
  machine_id: z.string().min(1, 'Missing machine_id')
})

const TRIAL_MAX_DAYS = 14
const TRIAL_MAX_RUNS = 20

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const result = StatusSchema.safeParse({
      machine_id: searchParams.get('machine_id')
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { machine_id } = result.data
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

    const runsCount = existing.runs_count
    const startedAt = new Date(existing.started_at)
    const now = new Date()
    
    // Calculate days elapsed (matching the RPC logic)
    const elapsedDays = Math.floor((now.getTime() - startedAt.getTime()) / (1000 * 60 * 60 * 24))
    
    const runsLeft = Math.max(0, TRIAL_MAX_RUNS - runsCount)
    const daysLeft = Math.max(0, TRIAL_MAX_DAYS - elapsedDays)

    const tier = (runsLeft > 0 && daysLeft > 0) ? 'trial' : 'free'

    return NextResponse.json({
      success: true,
      tier,
      runs_left: runsLeft,
      days_left: daysLeft
    })

  } catch (err: unknown) {
    console.error('Trial status endpoint error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

