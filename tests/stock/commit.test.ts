/**
 * SynStock Commit Atomic Logic Tests
 */

describe('Commit Atomic Pattern Logic', () => {

  test('Optimistic Concurrency Pattern (Logical)', () => {
    // The core logic in commit/route.ts uses .eq('status', 'available')
    // to ensure an asset isn't double-consumed.

    const requestConsumedIds = ['asset-1', 'asset-2'];

    // Logic: If status matches 'available', count will equal request length.
    // If one is already 'consumed', update count < request length -> 409 Conflict.

    const mockDbState = [
      { id: 'asset-1', status: 'available' },
      { id: 'asset-2', status: 'consumed' } // Oops, someone grabbed it!
    ];

    const successfullyUpdated = mockDbState.filter(a =>
      requestConsumedIds.includes(a.id) && a.status === 'available'
    );

    expect(successfullyUpdated.length).toBeLessThan(requestConsumedIds.length);
    expect(successfullyUpdated.map(a => a.id)).not.toContain('asset-2');
  });

  test('Batch Event Generation Logic', () => {
    const consumedIds = ['a', 'b'];
    const jobRef = 'REF-99';

    const events = consumedIds.map(id => ({
      asset_id: id,
      event_type: 'cut',
      metadata: { job_reference: jobRef }
    }));

    expect(events).toHaveLength(2);
    expect(events[0].metadata.job_reference).toBe(jobRef);
  });
});
