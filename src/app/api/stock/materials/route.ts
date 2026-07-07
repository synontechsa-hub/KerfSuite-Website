import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  if (!userData) return NextResponse.json({ error: 'User workspace not found' }, { status: 403 })

  const { data: materials, error } = await supabase
    .from('materials')
    .select('*')
    .eq('workspace_id', userData.workspace_id)
    .eq('is_deleted', false)
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(materials)
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('workspace_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) return NextResponse.json({ error: 'User workspace not found' }, { status: 403 })
  if (userData.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  try {
    const body = await request.json()
    const { data: material, error } = await supabase
      .from('materials')
      .insert({
        ...body,
        workspace_id: userData.workspace_id,
        created_by: user.id
      })
      .select()
      .single()

    if (error) throw error

    // Log administrative action
    await supabase.from('audit_logs').insert({
      workspace_id: userData.workspace_id,
      actor_id: user.id,
      actor_email: user.email,
      action_type: 'material_created',
      description: `Created material: ${body.name} (${body.thickness}${body.unit})`
    })

    return NextResponse.json(material)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

