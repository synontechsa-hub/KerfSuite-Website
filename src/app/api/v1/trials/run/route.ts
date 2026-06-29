import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'
import { z } from 'zod'
import { getRateLimit } from '@/utils/rate-limit'

const TRIAL_MAX_DAYS = 14
const TRIAL_MAX_RUNS = 20

const TrialRunSchema = z.object({
  machine_id: z.string().min(1, 'Missing machine_id')
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = TrialRunSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { machine_id } = result.data
    const currentIp = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1'

    const ratelimit = getRateLimit(5, '1 d') // 5 trial run requests per IP per day
    if (ratelimit) {
      const { success } = await ratelimit.limit(`trial_${currentIp}`)
      if (!success) {
        return NextResponse.json({ error: 'Too many trial requests from this IP today' }, { status: 429 })
      }
    }

    const adminClient = createAdminClient()

    /**
     * The increment_trial_run RPC handles:
     * 1. Creating the trial record if it doesn't exist (ON CONFLICT).
     * 2. Incrementing the run count.
     * 3. Tracking origin and last seen IPs.
     * 4. Returning the current status.
     * 5. SECURITY DEFINER ensures it can write to the trials table.
     */
    const { data: rpcData, error: rpcError } = await adminClient.rpc('increment_trial_run', {
      p_machine_id: machine_id,
      p_ip: currentIp
    })

    if (rpcError) {
      console.error('Trial RPC error:', rpcError)
      return NextResponse.json({ error: 'Failed to process trial run' }, { status: 500 })
    }

    if (rpcData) {
      const runsCount = rpcData.runs_count
      const daysLeft = rpcData.days_left
      
      const runsLeft = Math.max(0, TRIAL_MAX_RUNS - runsCount)
      const tier = (runsLeft > 0 && daysLeft > 0) ? 'trial' : 'free'

      return NextResponse.json({
        success: true,
        tier,
        runs_left: runsLeft,
        days_left: daysLeft
      })
    }

    return NextResponse.json({ error: 'No data returned from trial service' }, { status: 500 })

  } catch (err: unknown) {
    console.error('Trial endpoint error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

