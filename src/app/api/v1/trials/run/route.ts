import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'
import { z } from 'zod'
import { enforceRateLimit, getClientIp, handleRouteError, jsonError, validateBody } from '@/utils/api'
import { computeTrialTier, runsLeft } from '@/utils/trial'

const TrialRunSchema = z.object({
  machine_id: z.string().min(1, 'Missing machine_id')
})

export async function POST(request: Request) {
  try {
    const parsed = validateBody(TrialRunSchema, await request.json())
    if ('error' in parsed) return parsed.error

    const { machine_id } = parsed.data
    const currentIp = getClientIp(request)

    // 5 trial run requests per IP per day
    const limited = await enforceRateLimit(
      `trial_${currentIp}`,
      5,
      '1 d',
      'Too many trial requests from this IP today'
    )
    if (limited) return limited

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
      return jsonError('Failed to process trial run', 500)
    }

    if (rpcData) {
      const runsRemaining = runsLeft(rpcData.runs_count)
      const daysLeft = rpcData.days_left
      const tier = computeTrialTier(runsRemaining, daysLeft)

      return NextResponse.json({
        success: true,
        tier,
        runs_left: runsRemaining,
        days_left: daysLeft
      })
    }

    return jsonError('No data returned from trial service', 500)

  } catch (err: unknown) {
    return handleRouteError(err, { logPrefix: 'Trial endpoint error:', fallback: 'Internal server error' })
  }
}
