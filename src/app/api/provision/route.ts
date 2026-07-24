import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'
import { z } from 'zod'
import crypto from 'crypto'
import { handleRouteError, jsonError, validateBody } from '@/utils/api'
import { siteUrl } from '@/utils/site-url'

const ProvisionSchema = z.object({
  email: z.string().email('Invalid email address'),
  workshopName: z.string().optional()
})

/**
 * API Endpoint for automated workspace provisioning.
 * Expected Body: { email: string, workshopName?: string }
 * Headers: { 'x-provision-secret': string }
 */
export async function POST(request: Request) {
  const secret = request.headers.get('x-provision-secret')
  const PROVISIONING_SECRET = process.env.PROVISIONING_SECRET

  // 1. Validate Secret
  const isAuthorized = PROVISIONING_SECRET && secret && secret.length === PROVISIONING_SECRET.length &&
    crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(PROVISIONING_SECRET))

  if (!isAuthorized) {
    return jsonError('Unauthorized', 401)
  }

  try {
    const parsed = validateBody(ProvisionSchema, await request.json())
    if ('error' in parsed) return parsed.error

    const { email, workshopName } = parsed.data
    const adminClient = createAdminClient()

    // 2. Create Workspace
    const { data: workspace, error: wsError } = await adminClient
      .from('workspaces')
      .insert({ name: workshopName || 'My Workshop' })
      .select()
      .single()

    if (wsError) throw wsError

    // 3. Invite Admin User
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        workspace_id: workspace.id,
        role: 'admin'
      },
      redirectTo: siteUrl('/auth/callback')
    })

    if (inviteError) throw inviteError

    // 4. Log the provisioning
    await adminClient
      .from('audit_logs')
      .insert({
        workspace_id: workspace.id,
        actor_email: 'SYSTEM',
        action_type: 'workspace_provisioned',
        description: `Provisioned workspace for ${email}`
      })

    return NextResponse.json({
      success: true,
      workspaceId: workspace.id,
      userId: inviteData.user.id
    })

  } catch (error: unknown) {
    return handleRouteError(error, { logPrefix: 'Provisioning error:' })
  }
}
