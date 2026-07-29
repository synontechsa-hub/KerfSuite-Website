import { NextResponse } from 'next/server'
import { getAuthedStockWorkspace } from '@/utils/auth-helpers'
import { PortalService } from '@/services/portal_service'
import { z } from 'zod'
import { serializeDesktopAsset } from '@/utils/stock-api'

const CreateAssetSchema = z.object({
  material_id: z.string().uuid(),
  display_name: z.string().nullable().optional(),
  width: z.number().positive(),
  height: z.number().positive(),
  asset_type: z.enum(['full_sheet', 'remnant', 'offcut', 'custom']).default('full_sheet'),
  status: z.enum(['available', 'reserved', 'consumed', 'disposed', 'damaged', 'missing']).default('available'),
  location_id: z.string().uuid().nullable().optional(),
  job_reference: z.string().trim().max(200).nullable().optional(),
  quantity: z.number().int().min(1).max(500).default(1)
})

export async function GET(request: Request) {
  const auth = await getAuthedStockWorkspace(request)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const assets = await PortalService.getAssets(auth.supabase, auth.workspaceId);
  const response = request.headers.has('authorization')
    ? assets.map(serializeDesktopAsset)
    : assets
  return NextResponse.json(response)
}

export async function POST(request: Request) {
  const auth = await getAuthedStockWorkspace(request)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const rawBody = await request.json()
    const validation = CreateAssetSchema.safeParse(rawBody)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 })
    }

    const body = validation.data

    const assets = await PortalService.createAssets(auth.supabase, {
      materialId: body.material_id,
      width: body.width,
      height: body.height,
      assetType: body.asset_type,
      quantity: body.quantity,
      displayName: body.display_name,
      locationId: body.location_id,
      status: body.status,
      jobReference: body.job_reference
    });

    const responseAssets = request.headers.has('authorization')
      ? assets.map(serializeDesktopAsset)
      : assets
    const response = body.quantity === 1 ? responseAssets[0] : responseAssets
    return NextResponse.json(response)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

