import { NextResponse } from 'next/server'
import { handleRouteError, jsonError, requireAdmin, requireWorkspace } from '@/utils/api'
import { PortalService } from '@/services/portal_service'

export async function GET() {
  const result = await requireWorkspace()
  if ('error' in result) return result.error
  const { auth } = result

  const { data: materials, error } = await auth.supabase
    .from('materials')
    .select('*')
    .eq('workspace_id', auth.workspaceId)
    .eq('is_deleted', false)
    .order('name', { ascending: true })

  if (error) return jsonError(error.message, 500)

  return NextResponse.json(materials)
}

export async function POST(request: Request) {
  const result = await requireWorkspace()
  if ('error' in result) return result.error
  const { auth } = result

  const adminError = requireAdmin(auth)
  if (adminError) return adminError

  try {
    const body = await request.json()
    const { data: material, error } = await auth.supabase
      .from('materials')
      .insert({
        ...body,
        workspace_id: auth.workspaceId,
        created_by: auth.user.id
      })
      .select()
      .single()

    if (error) throw error

    await PortalService.logAction(auth.supabase, {
      workspaceId: auth.workspaceId,
      actorId: auth.user.id,
      actorEmail: auth.user.email ?? '',
      actionType: 'material_created',
      description: `Created material: ${body.name} (${body.thickness}${body.unit})`
    })

    return NextResponse.json(material)
  } catch (error: unknown) {
    return handleRouteError(error)
  }
}
