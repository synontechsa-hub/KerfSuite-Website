'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Location } from '@/models/portal';
import styles from '../page.module.css';

export default function WorkshopMap({ initialLocations }: { initialLocations: Location[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stock/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parent_id: parentId || null })
      });

      if (!response.ok) throw new Error('Failed to add location');

      router.refresh();
      setName('');
      setParentId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Helper to render tree
  const renderTree = (pid: string | null = null, indent = 0) => {
    return initialLocations
      .filter(loc => loc.parentId === pid)
      .map(loc => (
        <div key={loc.id}>
          <div className={styles.tableRow} style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {Array.from({ length: indent }).map((_, i) => (
              <span key={i} style={{ color: 'var(--bg-panel-border)' }}>│</span>
            ))}
            {indent > 0 && <span style={{ color: 'var(--bg-panel-border)' }}>├─</span>}
            <span style={{ fontWeight: indent === 0 ? 700 : 400, fontSize: indent === 0 ? '0.85rem' : '0.75rem' }}>
              {loc.name.toUpperCase()}
            </span>
          </div>
          {renderTree(loc.id, indent + 1)}
        </div>
      ));
  };

  return (
    <div className="panel" style={{ flex: 1 }}>
      <h3 className="stencil-heading" style={{ marginBottom: '1.5rem', color: 'var(--accent-orange)' }}>
        WORKSHOP MAP
      </h3>

      {error && (
        <div style={{ padding: '0.5rem', marginBottom: '1rem', backgroundColor: 'rgba(231, 76, 60, 0.1)', borderLeft: '3px solid var(--status-error)', fontSize: '0.7rem', color: 'var(--status-error)' }}>
          {error.toUpperCase()}
        </div>
      )}

      <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 2 }}>
            <label className="stencil-heading" style={{ fontSize: '0.55rem' }}>LOCATION NAME</label>
            <input
              type="text"
              placeholder="e.g. Rack A"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={styles.select}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1.5 }}>
            <label className="stencil-heading" style={{ fontSize: '0.55rem' }}>PARENT (OPTIONAL)</label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className={styles.select}
            >
              <option value="">SITE (TOP LEVEL)</option>
              {initialLocations.filter(l => l.depth < 2).map(l => (
                <option key={l.id} value={l.id}>{l.name.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>
            {loading ? '...' : '+'}
          </button>
        </div>
        <p style={{ fontSize: '0.5rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
          TIP: NEST SHELVES UNDER RACKS, RACKS UNDER WAREHOUSES.
        </p>
      </form>

      <div style={{ borderTop: '1px solid var(--bg-panel-border)', marginTop: '1rem' }}>
        {initialLocations.length > 0 ? renderTree() : (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)', fontSize: '0.7rem' }}>
            NO LOCATIONS DEFINED
          </p>
        )}
      </div>
    </div>
  );
}
