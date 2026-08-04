import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/utils/supabase/server'
import {
  type KerfEntitlementApp,
  KerfEntitlementSigningConfigurationError,
  issueKerfEntitlementLease,
  readKerfEntitlementSigningConfiguration
} from '@/utils/entitlements/kel'

export const runtime = 'nodejs'

const LeaseRequestSchema = z.object({
  activation_key: z.string().min(1, 'Missing activation key'),
  machine_id: z.string().min(16).max(128, 'Invalid machine identifier'),
  app: z.enum(['kerfcut', 'kerfstock']),
  app_version: z.string().max(64).optional(),
  os_info: z.string().max(256).optional()
})

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const parsed = LeaseRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid lease request' }, { status: 400 })
    }

    const signingConfiguration = readKerfEntitlementSigningConfiguration()
    const { activation_key, machine_id, app, app_version, os_info } = parsed.data
    const currentIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
    const adminClient = createAdminClient()

    const { data: slots, error: fetchError } = await adminClient.rpc('verify_license', {
      p_cdkey: activation_key,
      p_app: app
    })

    if (fetchError || !slots || slots.length === 0) {
      return NextResponse.json({ error: 'Licence could not be verified' }, { status: 403 })
    }

    const slot = slots[0]

    if (slot.status === 'revoked') {
      await adminClient.from('audit_logs').insert({
        workspace_id: slot.workspace_id,
        actor_email: 'SYSTEM',
        action_type: 'entitlement_lease_denied',
        target_id: slot.id,
        description: 'Lease request denied for a revoked licence'
      })
      return NextResponse.json({ error: 'Licence has been revoked' }, { status: 403 })
    }

    const { error: bindError } = await adminClient.rpc('bind_machine', {
      p_cdkey: activation_key,
      p_machine_id: machine_id,
      p_app: app,
      p_app_version: app_version,
      p_os_info: os_info,
      p_ip: currentIp
    })

    if (bindError) {
      if (bindError.message.includes('already bound')) {
        return NextResponse.json({ error: 'Licence is bound to another machine' }, { status: 403 })
      }
      console.error('Entitlement machine binding failed')
      return NextResponse.json({ error: 'Entitlement service unavailable' }, { status: 503 })
    }

    const issuedLease = issueKerfEntitlementLease(
      {
        app: app as KerfEntitlementApp,
        licenseSlotId: slot.id,
        workspaceId: slot.workspace_id,
        machineId: machine_id
      },
      signingConfiguration
    )

    return NextResponse.json({
      success: true,
      status: 'active',
      bound_machine_id: machine_id,
      app,
      message: slot.status === 'waiting' ? 'Licence activated' : 'Licence verified',
      lease: {
        token: issuedLease.token,
        expires_at: new Date(issuedLease.claims.exp * 1000).toISOString(),
        duration_hours: signingConfiguration.durationHours,
        format: 'compact-jws',
        alg: 'EdDSA',
        kid: signingConfiguration.keyId
      }
    })
  } catch (error: unknown) {
    if (error instanceof KerfEntitlementSigningConfigurationError) {
      console.error('Entitlement signing configuration error')
      return NextResponse.json({ error: 'Entitlement service unavailable' }, { status: 503 })
    }

    console.error('Entitlement lease issue failed')
    return NextResponse.json({ error: 'Entitlement service unavailable' }, { status: 503 })
  }
}