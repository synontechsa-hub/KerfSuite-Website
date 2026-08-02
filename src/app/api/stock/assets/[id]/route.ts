import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthedStockWorkspace } from '@/utils/auth-helpers'
import { PortalService } from '@/services/portal_service'
import { serializeDesktopAsset } from '@/utils/stock-api'

const UpdateAssetSchema = z.object({
  material_id: z.string().uuid(),
  display_name: z.string().trim().max(200).nullable().optional(),
  width: z.number().positive(),
  height: z.number().positive(),
  quantity: z.number().int().min(1).max(100000),
  status: z.enum(['available', 'reserved', 'consumed', 'disposed', 'damaged', 'missing']),
  location_id: z.string().uuid().nullable().optional(),
  job_reference: z.string().trim().max(200).nullable().optional()
}).strict()

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthedStockWorkspace(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Invalid asset ID' }, { status: 400 })
  }

  try {
    const validation = UpdateAssetSchema.safeParse(await request.json())
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 })
    }
    const body = validation.data

    await PortalService.updateAsset(auth.supabase, {
      assetId: id,
      materialId: body.material_id,
      width: body.width,
      height: body.height,
      quantity: body.quantity,
      displayName: body.display_name,
      locationId: body.location_id,
      status: body.status,
      jobReference: body.job_reference
    })

    const updated = (await PortalService.getAssets(auth.supabase, auth.workspaceId))
      .find((asset) => asset.id === id)
    if (!updated) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    return NextResponse.json(
      request.headers.has('authorization') ? serializeDesktopAsset(updated) : updated
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    const status = message.includes('ASSET_NOT_FOUND') ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthedStockWorkspace(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Invalid asset ID' }, { status: 400 })
  }

  try {
    await PortalService.archiveAsset(auth.supabase, id)
    const archived = (await PortalService.getAssets(auth.supabase, auth.workspaceId))
      .find((asset) => asset.id === id)
    if (!archived) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    return NextResponse.json(
      request.headers.has('authorization') ? serializeDesktopAsset(archived) : archived
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    const status = message.includes('ASSET_NOT_FOUND') ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}