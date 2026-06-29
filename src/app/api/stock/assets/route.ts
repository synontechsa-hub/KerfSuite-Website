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

  const { data: assets, error } = await supabase
    .from('assets')
    .select('*, materials(name, thickness), locations(name)')
    .eq('workspace_id', userData.workspace_id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(assets)
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  if (!userData) return NextResponse.json({ error: 'User workspace not found' }, { status: 403 })

  try {
    const body = await request.json()

    // Auto-generate system name if not provided
    const system_name = body.system_name || `ASSET-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    const { data: asset, error } = await supabase
      .from('assets')
      .insert({
        ...body,
        workspace_id: userData.workspace_id,
        system_name,
        created_by: user.id
      })
      .select()
      .single()

    if (error) throw error

    // Log event
    await supabase.from('asset_events').insert({
      asset_id: asset.id,
      workspace_id: userData.workspace_id,
      event_type: 'purchased',
      performed_by: user.id,
      notes: 'Initial asset creation'
    })

    return NextResponse.json(asset)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

