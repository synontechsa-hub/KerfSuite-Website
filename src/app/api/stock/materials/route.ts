import { NextResponse } from 'next/server'
import { getAuthedWorkspace } from '@/utils/auth-helpers'

export async function GET() {
  const auth = await getAuthedWorkspace()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: materials, error } = await auth.supabase
    .from('materials')
    .select('*')
    .eq('workspace_id', auth.workspaceId)
    .eq('is_deleted', false)
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(materials)
}

export async function POST(request: Request) {
  const auth = await getAuthedWorkspace()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (auth.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

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

    // Log administrative action
    await auth.supabase.from('audit_logs').insert({
      workspace_id: auth.workspaceId,
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      action_type: 'material_created',
      description: `Created material: ${body.name} (${body.thickness}${body.unit})`
    })

    return NextResponse.json(material)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

