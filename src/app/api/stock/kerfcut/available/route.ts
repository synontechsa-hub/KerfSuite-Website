import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'
import { validateLicenseRequest } from '@/utils/license-auth'

export async function GET(request: Request) {
  const auth = await validateLicenseRequest(request, 'kerfcut')
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { workspaceId } = auth
  const { searchParams } = new URL(request.url)
  const materialId = searchParams.get('material_id')
  const minWidth = Number(searchParams.get('min_width') || '0')
  const minHeight = Number(searchParams.get('min_height') || '0')

  if (!Number.isFinite(minWidth) || !Number.isFinite(minHeight) || minWidth < 0 || minHeight < 0) {
    return NextResponse.json({ error: 'Invalid minimum dimensions' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  let query = adminClient
    .from('assets')
    .select(`
      id, material_id, system_name, display_name, width, height, quantity,
      asset_type, status, location_id, job_reference,
      materials(name, thickness, unit), locations(name)
    `)
    .eq('workspace_id', workspaceId)
    .eq('status', 'available')
    .gte('width', minWidth)
    .gte('height', minHeight)
    .gt('quantity', 0)
    .order('system_name', { ascending: true })

  if (materialId) query = query.eq('material_id', materialId)

  const { data: assets, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    assets: assets?.map(asset => ({
      id: asset.id,
      material_id: asset.material_id,
      system_name: asset.system_name,
      display_name: asset.display_name,
      width: Number(asset.width),
      height: Number(asset.height),
      quantity: asset.quantity,
      asset_type: asset.asset_type,
      status: asset.status,
      location_id: asset.location_id,
      job_reference: asset.job_reference,
      material: asset.materials?.[0] || null,
      location: asset.locations?.[0]?.name || null,
    })) || [],
  })
}
