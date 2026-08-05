import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/utils/supabase/server'
import { DeviceAuthorizationConfigurationError, hashAuthorizationCode, readDeviceAuthorizationConfiguration } from '@/utils/entitlements/device-authorization'
import { KerfEntitlementSigningConfigurationError, issueKerfEntitlementLease, readKerfEntitlementSigningConfiguration } from '@/utils/entitlements/kel'

export const runtime = 'nodejs'
const RequestSchema = z.object({ device_code: z.string().min(40).max(128) })
type ConsumedAuthorization = { license_slot_id: string; workspace_id: string; app: 'kerfcut' | 'kerfstock'; machine_id: string }

export async function POST(request: Request) {
  try {
    const parsed = RequestSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Invalid device authorization request' }, { status: 400 })
    const configuration = readDeviceAuthorizationConfiguration()
    const signingConfiguration = readKerfEntitlementSigningConfiguration()
    const admin = createAdminClient()
    const deviceCodeHash = hashAuthorizationCode(parsed.data.device_code, configuration)
    const { data: authorization, error: lookupError } = await admin.from('desktop_authorization_requests').select('status, expires_at').eq('device_code_hash', deviceCodeHash).maybeSingle()
    if (lookupError || !authorization || new Date(authorization.expires_at).getTime() <= Date.now()) return NextResponse.json({ error: 'Device authorization is invalid or expired' }, { status: 400 })
    if (authorization.status === 'pending') return NextResponse.json({ error: 'authorization_pending' }, { status: 428, headers: { 'Cache-Control': 'no-store' } })
    if (authorization.status !== 'approved') return NextResponse.json({ error: 'Device authorization is invalid or expired' }, { status: 400 })
    const { data, error } = await admin.rpc('consume_desktop_authorization', { p_device_code_hash: deviceCodeHash })
    const consumed = Array.isArray(data) ? data[0] as ConsumedAuthorization | undefined : undefined
    if (error || !consumed) return NextResponse.json({ error: 'Device authorization is invalid or expired' }, { status: 400 })
    const issuedLease = issueKerfEntitlementLease({ app: consumed.app, licenseSlotId: consumed.license_slot_id, workspaceId: consumed.workspace_id, machineId: consumed.machine_id }, signingConfiguration)
    return NextResponse.json({ lease: { token: issuedLease.token, expires_at: new Date(issuedLease.claims.exp * 1000).toISOString(), format: 'compact-jws', alg: 'EdDSA', kid: signingConfiguration.keyId } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (!(error instanceof DeviceAuthorizationConfigurationError) && !(error instanceof KerfEntitlementSigningConfigurationError)) console.error('Device authorization token issue failed')
    return NextResponse.json({ error: 'Device authorization unavailable' }, { status: 503 })
  }
}
