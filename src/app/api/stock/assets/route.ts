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
    const asset_type = body.asset_type || 'full_sheet'

    // AUDIT LOGIC: Sequential naming per workspace and type
    const prefix = {
      full_sheet: 'SHEET',
      remnant: 'REMNANT',
      offcut: 'OFFCUT',
      custom: 'CUSTOM'
    }[asset_type as 'full_sheet' | 'remnant' | 'offcut' | 'custom'] || 'ASSET'

    const { count } = await supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', userData.workspace_id)
      .eq('asset_type', asset_type)

    const system_name = body.system_name || `${prefix}-${((count || 0) + 1).toString().padStart(4, '0')}`

    const { data: asset, error } = await supabase
      .from('assets')
      .insert({
        ...body,
        workspace_id: userData.workspace_id,
        system_name,
        created_by: user.id,
        updated_at: new Date().toISOString()
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

