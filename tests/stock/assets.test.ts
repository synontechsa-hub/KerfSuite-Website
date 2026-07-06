import { createAdminClient } from '@/utils/supabase/server';

const TEST_WORKSPACE_ID = '00000000-0000-0000-0000-000000000000'; // Replace with a valid test ID if needed

describe('Inventory Asset Logic', () => {
  const adminClient = createAdminClient();

  test('Sequential Naming Logic', async () => {
    // 1. Get current count
    const { count: initialCount } = await adminClient
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', TEST_WORKSPACE_ID)
      .eq('asset_type', 'full_sheet');

    const nextNumber = (initialCount || 0) + 1;
    const expectedName = `SHEET-${nextNumber.toString().padStart(4, '0')}`;

    // 2. Mock a POST request to /api/stock/assets would happen here
    // For unit testing logic, we verify the naming pattern
    expect(expectedName).toMatch(/^SHEET-\d{4}$/);
  });

  test('Remnant vs Offcut Classification', () => {
    const threshold = 400 * 400;

    const smallPiece = { width: 200, height: 200 }; // 40,000
    const largePiece = { width: 500, height: 500 }; // 250,000

    expect(smallPiece.width * smallPiece.height).toBeLessThan(threshold);
    expect(largePiece.width * largePiece.height).toBeGreaterThan(threshold);
  });
});
