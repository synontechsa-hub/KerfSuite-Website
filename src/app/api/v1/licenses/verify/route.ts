import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'
import { z } from 'zod'
import crypto from 'crypto'
import { getRateLimit } from '@/utils/rate-limit'

const VerifySchema = z.object({
  cdkey: z.string().min(1, 'Missing cdkey'),
  machine_id: z.string().min(1, 'Missing machine_id'),
  app_version: z.string().optional(),
  os_info: z.string().optional()
})

const LEASE_DURATION_HOURS = 48

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = VerifySchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { cdkey, machine_id, app_version, os_info } = result.data
    const currentIp = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1'

    const ratelimit = getRateLimit(10, '1 m') // 10 requests per minute
    if (ratelimit) {
      const { success } = await ratelimit.limit(`verify_${currentIp}`)
      if (!success) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
      }
    }

    const adminClient = createAdminClient()

    // 1. Fetch the license status via RPC
    const { data: slots, error: fetchError } = await adminClient.rpc('verify_license', {
      p_cdkey: cdkey
    })

    if (fetchError || !slots || slots.length === 0) {
      return NextResponse.json({ error: 'License key not found' }, { status: 404 })
    }

    const slot = slots[0]

    // 2. Status handling
    if (slot.status === 'revoked') {
      await adminClient.from('audit_logs').insert({
        workspace_id: slot.workspace_id,
        actor_email: 'SYSTEM',
        action_type: 'activation_failed',
        target_id: slot.id,
        description: `Failed activation attempt for revoked key from machine: ${machine_id}`
      })
      return NextResponse.json({ error: 'License has been revoked', status: 'revoked' }, { status: 403 })
    }

    // 3. Bind the machine via RPC (handles activation and verification)
    const { error: bindError } = await adminClient.rpc('bind_machine', {
      p_cdkey: cdkey,
      p_machine_id: machine_id,
      p_app_version: app_version,
      p_os_info: os_info,
      p_ip: currentIp
    })

    if (bindError) {
      if (bindError.message.includes('already bound')) {
        return NextResponse.json({ error: 'License bound to another machine', status: 'active' }, { status: 403 })
      }
      return NextResponse.json({ error: bindError.message }, { status: 500 })
    }

    // 4. GENERATE OFFLINE LEASE (The Lease Model)
    const expiresAt = Math.floor(Date.now() / 1000) + (LEASE_DURATION_HOURS * 3600)
    const payload = JSON.stringify({
      sub: slot.id,
      mid: machine_id,
      wid: slot.workspace_id,
      exp: expiresAt
    })

    const leaseSecret = process.env.LEASE_SECRET || 'dev-industrial-secret-change-me'
    const base64Payload = Buffer.from(payload).toString('base64url')
    const signature = crypto
      .createHmac('sha256', leaseSecret)
      .update(base64Payload)
      .digest('base64url')

    const leaseToken = `${base64Payload}.${signature}`

    const isActivation = slot.status === 'waiting'

    return NextResponse.json({
      success: true,
      status: 'active',
      bound_machine_id: machine_id,
      message: isActivation ? 'License activated' : 'License verified',
      lease: {
        token: leaseToken,
        expires_at: new Date(expiresAt * 1000).toISOString(),
        duration_hours: LEASE_DURATION_HOURS
      }
    })

  } catch (err: unknown) {
    console.error('License verification error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

