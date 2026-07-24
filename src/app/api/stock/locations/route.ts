import { NextResponse } from 'next/server'
import { handleRouteError, jsonError, requireAdmin, requireWorkspace } from '@/utils/api'
import { PortalService } from '@/services/portal_service'

export async function GET() {
  const result = await requireWorkspace()
  if ('error' in result) return result.error
  const { auth } = result

  const { data: locations, error } = await auth.supabase
    .from('locations')
    .select('*')
    .eq('workspace_id', auth.workspaceId)
    .order('name', { ascending: true })

  if (error) return jsonError(error.message, 500)

  return NextResponse.json(locations)
}

export async function POST(request: Request) {
  const result = await requireWorkspace()
  if ('error' in result) return result.error
  const { auth } = result

  const adminError = requireAdmin(auth)
  if (adminError) return adminError

  try {
    const body = await request.json()

    // Calculate depth based on parent
    let depth = 0
    if (body.parent_id) {
      const { data: parent } = await auth.supabase
        .from('locations')
        .select('depth, workspace_id')
        .eq('id', body.parent_id)
        .single()

      if (!parent || parent.workspace_id !== auth.workspaceId) {
        return jsonError('Invalid parent location', 400)
      }
      depth = (parent?.depth || 0) + 1
    }

    const { data: location, error } = await auth.supabase
      .from('locations')
      .insert({
        ...body,
        workspace_id: auth.workspaceId,
        depth,
        created_by: auth.user.id
      })
      .select()
      .single()

    if (error) throw error

    await PortalService.logAction(auth.supabase, {
      workspaceId: auth.workspaceId,
      actorId: auth.user.id,
      actorEmail: auth.user.email ?? '',
      actionType: 'location_created',
      description: `Created location: ${body.name}`
    })

    return NextResponse.json(location)
  } catch (error: unknown) {
    return handleRouteError(error)
  }
}
