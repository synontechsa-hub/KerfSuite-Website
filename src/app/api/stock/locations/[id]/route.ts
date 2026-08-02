import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthedStockWorkspace } from '@/utils/auth-helpers'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthedStockWorkspace(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  if (auth.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 })
  }

  const { data: location } = await auth.supabase
    .from('locations')
    .select('id, name')
    .eq('id', id)
    .eq('workspace_id', auth.workspaceId)
    .eq('is_deleted', false)
    .maybeSingle()

  if (!location) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 })
  }

  const [{ count: activeAssets }, { count: activeChildren }] = await Promise.all([
    auth.supabase
      .from('assets')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', auth.workspaceId)
      .eq('location_id', id)
      .not('status', 'in', '(consumed,disposed)'),
    auth.supabase
      .from('locations')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', auth.workspaceId)
      .eq('parent_id', id)
      .eq('is_deleted', false)
  ])

  if ((activeAssets ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Move or consume the active stock in this location before removing it.' },
      { status: 409 }
    )
  }
  if ((activeChildren ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Remove or move child locations before removing this location.' },
      { status: 409 }
    )
  }

  const { error } = await auth.supabase
    .from('locations')
    .update({ is_deleted: true })
    .eq('id', id)
    .eq('workspace_id', auth.workspaceId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await auth.supabase.from('audit_logs').insert({
    workspace_id: auth.workspaceId,
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    action_type: 'location_archived',
    target_id: id,
    description: `Archived location: ${location.name}`
  })

  return NextResponse.json({ success: true })
}
