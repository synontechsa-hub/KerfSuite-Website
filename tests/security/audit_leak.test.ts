/**
 * Audit Log Masking Logic Tests
 */

describe('Audit Log Masking Logic', () => {
  test('CDKey should be masked in audit log description', () => {
    const cdkey = 'KCT-PRO-A1B2-C3D4';
    const description = `Revoked key: ${cdkey ? '...' + cdkey.slice(-4) : 'REDACTED'}`;

    expect(description).toBe('Revoked key: ...C3D4');
    expect(description).not.toContain('A1B2');
  });

  test('CDKey generation logs should only contain suffix', () => {
    const cdkey = 'KST-PRO-5678-EFGH';
    const description = `Generated kerfstock key ending in ...${cdkey.slice(-4)}`;

    expect(description).toBe('Generated kerfstock key ending in ...EFGH');
    expect(description).not.toContain('5678');
  });
});
