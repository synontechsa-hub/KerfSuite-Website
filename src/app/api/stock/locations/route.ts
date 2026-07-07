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

  const { data: locations, error } = await supabase
    .from('locations')
    .select('*')
    .eq('workspace_id', userData.workspace_id)
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(locations)
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

    // Calculate depth based on parent
    let depth = 0
    if (body.parent_id) {
      const { data: parent } = await supabase
        .from('locations')
        .select('depth')
        .eq('id', body.parent_id)
        .single()
      depth = (parent?.depth || 0) + 1
    }

    const { data: location, error } = await supabase
      .from('locations')
      .insert({
        ...body,
        workspace_id: userData.workspace_id,
        depth,
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
      action_type: 'location_created',
      description: `Created location: ${body.name}`
    })

    return NextResponse.json(location)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

