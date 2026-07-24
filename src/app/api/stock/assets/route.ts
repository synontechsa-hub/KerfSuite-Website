import { NextResponse } from 'next/server'
import { z } from 'zod'
import { handleRouteError, jsonError, requireWorkspace, validateBody } from '@/utils/api'

const CreateAssetSchema = z.object({
  material_id: z.string().uuid(),
  display_name: z.string().optional(),
  width: z.number().positive(),
  height: z.number().positive(),
  asset_type: z.enum(['full_sheet', 'remnant', 'offcut', 'custom']).default('full_sheet'),
  status: z.enum(['available', 'reserved', 'consumed', 'disposed', 'damaged', 'missing']).default('available'),
  location_id: z.string().uuid().optional(),
  job_reference: z.string().optional(),
  system_name: z.string().optional()
})

export async function GET() {
  const result = await requireWorkspace()
  if ('error' in result) return result.error
  const { auth } = result

  const { data: assets, error } = await auth.supabase
    .from('assets')
    .select('*, materials(name, thickness), locations(name)')
    .eq('workspace_id', auth.workspaceId)
    .order('created_at', { ascending: false })

  if (error) return jsonError(error.message, 500)

  return NextResponse.json(assets)
}

export async function POST(request: Request) {
  const result = await requireWorkspace()
  if ('error' in result) return result.error
  const { auth } = result

  try {
    const parsed = validateBody(CreateAssetSchema, await request.json())
    if ('error' in parsed) return parsed.error
    const body = parsed.data

    // ATOMIC: Use RPC to handle sequential naming and creation in one transaction
    const { data: asset, error } = await auth.supabase
      .rpc('create_asset', {
        p_material_id: body.material_id,
        p_width: body.width,
        p_height: body.height,
        p_asset_type: body.asset_type,
        p_display_name: body.display_name,
        p_location_id: body.location_id,
        p_status: body.status
      })
      .single()

    if (error) throw error

    return NextResponse.json(asset)
  } catch (error: unknown) {
    return handleRouteError(error)
  }
}
