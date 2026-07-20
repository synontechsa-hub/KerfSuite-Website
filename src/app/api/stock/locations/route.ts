import { NextResponse } from 'next/server'
import { getAuthedWorkspace } from '@/utils/auth-helpers'

export async function GET() {
  const auth = await getAuthedWorkspace()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: locations, error } = await auth.supabase
    .from('locations')
    .select('*')
    .eq('workspace_id', auth.workspaceId)
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(locations)
}

export async function POST(request: Request) {
  const auth = await getAuthedWorkspace()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (auth.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

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
        return NextResponse.json({ error: 'Invalid parent location' }, { status: 400 })
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

    // Log administrative action
    await auth.supabase.from('audit_logs').insert({
      workspace_id: auth.workspaceId,
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      action_type: 'location_created',
      description: `Created location: ${body.name}`
    })

    return NextResponse.json(location)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
