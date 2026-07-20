import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'
import { z } from 'zod'

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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const result = ProvisionSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { email, workshopName } = result.data
    const adminClient = createAdminClient()

    // 2. Create Workspace
    const { data: workspace, error: wsError } = await adminClient
      .from('workspaces')
      .insert({ name: workshopName || 'My Workshop' })
      .select()
      .single()

    if (wsError) throw wsError

    // 3. Invite Admin User
    const redirectUrl = new URL('/auth/callback', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').toString()
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        workspace_id: workspace.id,
        role: 'admin'
      },
      redirectTo: redirectUrl
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
    console.error('Provisioning error:', error)
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

