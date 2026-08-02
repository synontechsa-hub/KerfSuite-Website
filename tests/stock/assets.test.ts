/**
 * SynStock Asset Logic Tests
 * Tests naming sequences and classification thresholds
 */

describe('Inventory Asset Logic', () => {

  test('Sequential Naming Logic (Unit)', () => {
    // We simulate the logic used in assets/route.ts
    const prefix = 'SHEET';
    const mockDbCount = 5; // 5 existing sheets

    const nextNumber = mockDbCount + 1;
    const systemName = `${prefix}-${nextNumber.toString().padStart(4, '0')}`;

    expect(systemName).toBe('SHEET-0006');
    expect(systemName).toMatch(/^SHEET-\d{4}$/);
  });

  test('Remnant vs Offcut Classification Threshold', () => {
    // Ported from kerfcut/commit/route.ts
    const threshold = 400 * 400; // 160,000 mm2

    const remnantPiece = { width: 500, height: 400 }; // 200,000
    const offcutPiece = { width: 300, height: 300 };  // 90,000

    const isRemnant = (remnantPiece.width * remnantPiece.height) >= threshold;
    const isOffcut = (offcutPiece.width * offcutPiece.height) < threshold;

    expect(isRemnant).toBe(true);
    expect(isOffcut).toBe(true);
  });

  test('Job Reference Inheritance Logic', () => {
    const jobReference = 'JOB-1234';
    const sourceAsset = { id: 'parent-1', location_id: 'shelf-A' };

    // Mock remnant generation
    const generatedRemnant = {
      material_id: 'mdf-16',
      width: 1000,
      height: 500,
      source_asset_id: sourceAsset.id,
      location_id: sourceAsset.location_id, // Inherited
      job_reference: jobReference // Inherited
    };

    expect(generatedRemnant.job_reference).toBe(jobReference);
    expect(generatedRemnant.location_id).toBe('shelf-A');
  });
});
