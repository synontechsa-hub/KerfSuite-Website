import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'
import { validateLicenseRequest } from '@/utils/license-auth'
import { jsonError } from '@/utils/api'

export async function GET(request: Request) {
  // 1. Validate Machine License (Expect KerfCut)
  const auth = await validateLicenseRequest(request, 'kerfcut')
  if ('error' in auth) {
    return jsonError(auth.error, auth.status)
  }

  const { workspaceId } = auth
  const { searchParams } = new URL(request.url)
  const material_id = searchParams.get('material_id')
  const min_width = parseFloat(searchParams.get('min_width') || '0')
  const min_height = parseFloat(searchParams.get('min_height') || '0')

  if (!material_id) {
    return jsonError('Missing material_id', 400)
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
    return jsonError('Material not found', 404)
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

  if (error) return jsonError(error.message, 500)

  return NextResponse.json({
    material,
    assets: assets?.map(a => ({
      ...a,
      location: a.locations?.[0]?.name || null
    })) || []
  })
}
