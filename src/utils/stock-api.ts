import { Asset } from '@/models/portal'

/**
 * Stable wire format consumed by the KerfStock desktop client.
 * The Portal UI uses camelCase models, while Flutter retains the database-style
 * field names for backwards compatibility.
 */
export function serializeDesktopAsset(asset: Asset) {
  return {
    id: asset.id,
    workspace_id: asset.workspaceId,
    material_id: asset.materialId,
    system_name: asset.systemName,
    display_name: asset.displayName,
    width: asset.width,
    height: asset.height,
    asset_type: asset.assetType,
    status: asset.status,
    location_id: asset.locationId,
    source_asset_id: asset.sourceAssetId,
    job_reference: asset.jobReference,
    created_at: asset.createdAt,
    updated_at: asset.updatedAt,
    materials: asset.material ?? null,
    locations: asset.location ?? null,
  }
}
