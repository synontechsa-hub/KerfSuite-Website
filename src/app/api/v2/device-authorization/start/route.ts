import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/utils/supabase/server'
import { DeviceAuthorizationConfigurationError, createDeviceAuthorizationCodes, hashAuthorizationCode, readDeviceAuthorizationConfiguration } from '@/utils/entitlements/device-authorization'

export const runtime = 'nodejs'
const RequestSchema = z.object({ app: z.enum(['kerfcut', 'kerfstock']), machine_id: z.string().min(16).max(128), app_version: z.string().max(64).optional(), os_info: z.string().max(256).optional() })

export async function POST(request: Request) {
  try {
    const parsed = RequestSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Invalid device authorization request' }, { status: 400 })
    const configuration = readDeviceAuthorizationConfiguration()
    const { deviceCode, userCode, expiresAt } = createDeviceAuthorizationCodes()
    const { error } = await createAdminClient().from('desktop_authorization_requests').insert({
      device_code_hash: hashAuthorizationCode(deviceCode, configuration), user_code_hash: hashAuthorizationCode(userCode.replace(/-/g, ''), configuration),
      app: parsed.data.app, machine_id: parsed.data.machine_id, app_version: parsed.data.app_version ?? null, os_info: parsed.data.os_info ?? null, expires_at: expiresAt.toISOString()
    })
    if (error) return NextResponse.json({ error: 'Device authorization unavailable' }, { status: 503 })
    return NextResponse.json({ device_code: deviceCode, user_code: userCode, verification_uri: new URL('/portal/devices', request.url).toString(), expires_in: 600, interval: 5 }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof DeviceAuthorizationConfigurationError) console.error('Device authorization configuration error')
    else console.error('Device authorization creation failed')
    return NextResponse.json({ error: 'Device authorization unavailable' }, { status: 503 })
  }
}
