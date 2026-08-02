import { serializeDesktopAsset } from '@/utils/stock-api'
import { Asset } from '@/models/portal'

describe('serializeDesktopAsset', () => {
  it('converts the Portal model to the Flutter wire contract', () => {
    const asset: Asset = {
      id: 'asset-1',
      workspaceId: 'workspace-1',
      materialId: 'material-1',
      systemName: 'SHEET-001',
      displayName: 'Test sheet',
      width: 2440,
      height: 1220,
      assetType: 'full_sheet',
      status: 'available',
      locationId: 'location-1',
      sourceAssetId: null,
      jobReference: 'JOB-42',
      createdAt: '2026-07-29T00:00:00.000Z',
      updatedAt: '2026-07-29T00:00:00.000Z',
      material: { name: 'Mild Steel', thickness: 3 },
      location: { name: 'Crate A' },
    }

    expect(serializeDesktopAsset(asset)).toMatchObject({
      system_name: 'SHEET-001',
      asset_type: 'full_sheet',
      job_reference: 'JOB-42',
      materials: { name: 'Mild Steel', thickness: 3 },
      locations: { name: 'Crate A' },
    })
  })
})
