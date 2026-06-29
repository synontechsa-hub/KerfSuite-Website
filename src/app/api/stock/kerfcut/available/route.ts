import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'
import { validateLicenseRequest } from '@/utils/license-auth'

export async function GET(request: Request) {
  // 1. Validate Machine License
  const auth = await validateLicenseRequest(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { workspaceId } = auth
  const { searchParams } = new URL(request.url)
  const material_id = searchParams.get('material_id')
  const min_width = parseFloat(searchParams.get('min_width') || '0')
  const min_height = parseFloat(searchParams.get('min_height') || '0')

  if (!material_id) {
    return NextResponse.json({ error: 'Missing material_id' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // 1. Fetch material details
  const { data: material } = await adminClient
    .from('materials')
    .select('*')
    .eq('id', material_id)
    .eq('workspace_id', workspaceId)
    .single()

  if (!material) {
    return NextResponse.json({ error: 'Material not found' }, { status: 404 })
  }

  // 2. Fetch available assets
  const { data: assets, error } = await adminClient
    .from('assets')
    .select('id, system_name, display_name, width, height, status, locations(name)')
    .eq('workspace_id', workspaceId)
    .eq('material_id', material_id)
    .eq('status', 'available')
    .gte('width', min_width)
    .gte('height', min_height)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    material,
    assets: assets?.map(a => ({
      ...a,
      location: a.locations?.[0]?.name || null
    })) || []
  })
}

