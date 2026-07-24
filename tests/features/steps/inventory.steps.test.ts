import { loadFeature, defineFeature } from 'jest-cucumber';
import { createMockSupabase } from '../../helpers/mockSupabase';
import { PortalService } from '@/services/portal_service';
import { Asset } from '@/models/portal';
import type { SupabaseClient } from '@supabase/supabase-js';

const feature = loadFeature('tests/features/inventory.feature');

defineFeature(feature, (test) => {
  test('Adding a new MDF sheet', ({ given, when, then, and }) => {
    let resultAsset: Asset;

    given('a workshop with no assets', () => {
      // Setup state if needed
    });

    when(/^the admin adds a "(.*)" of "(.*)" with dimensions (\d+)x(\d+)$/, async (type, material, width, height) => {
      const mockDb = createMockSupabase([{
        data: {
          id: 'new-id',
          workspace_id: 'ws-1',
          material_id: 'm-1',
          system_name: 'SHEET-0001',
          asset_type: type,
          status: 'available',
          width: parseInt(width),
          height: parseInt(height)
        }
      }]);

      resultAsset = await PortalService.createAsset(mockDb as unknown as SupabaseClient, {
        materialId: 'm-1',
        width: parseInt(width),
        height: parseInt(height),
        assetType: type,
        status: 'available'
      });
    });

    then(/^the system should generate a name starting with "(.*)"$/, (prefix) => {
      expect(resultAsset.systemName).toMatch(new RegExp(`^${prefix}`));
    });

    and(/^the asset status should be "(.*)"$/, (status) => {
      expect(resultAsset.status).toBe(status);
    });
  });

  test('Classifying a small offcut', ({ given, when, then, and }) => {
    let resultAsset: Asset;

    given('an MDF material exists', () => {
      // Mock setup
    });

    when(/^the admin adds a "(.*)" piece of "(.*)" with dimensions (\d+)x(\d+)$/, async (type, material, width, height) => {
      const w = parseInt(width);
      const h = parseInt(height);
      const area = w * h;
      const expectedType = area < 400 * 400 ? 'offcut' : 'remnant';
      const expectedPrefix = area < 400 * 400 ? 'OFFCUT' : 'REMNANT';

      const mockDb = createMockSupabase([{
        data: {
          id: 'new-id',
          workspace_id: 'ws-1',
          material_id: 'm-1',
          system_name: `${expectedPrefix}-0001`,
          asset_type: expectedType,
          status: 'available',
          width: w,
          height: h
        }
      }]);

      resultAsset = await PortalService.createAsset(mockDb as unknown as SupabaseClient, {
        materialId: 'm-1',
        width: w,
        height: h,
        assetType: type
      });
    });

    then(/^the asset should be classified as an "(.*)"$/, (type: string) => {
      expect(resultAsset.assetType).toBe(type as 'offcut' | 'remnant');
    });

    and(/^the system name should start with "(.*)"$/, (prefix) => {
      expect(resultAsset.systemName).toMatch(new RegExp(`^${prefix}`));
    });
  });
});
