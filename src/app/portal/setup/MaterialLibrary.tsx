'use client';

import { useState } from 'react';
import { Material } from '@/models/portal';
import styles from '../page.module.css';

export default function MaterialLibrary({ initialMaterials }: { initialMaterials: Material[] }) {
  const [materials, setMaterials] = useState(initialMaterials);
  const [name, setName] = useState('');
  const [thickness, setThickness] = useState('');
  const [unit, setUnit] = useState('mm');
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/stock/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, thickness: parseFloat(thickness), unit })
      });

      if (!response.ok) throw new Error('Failed to add material');
      const newMat = await response.json();

      // Update local state (optimistic or just simple append)
      // Since models/portal.ts has camelCase, and API returns snake_case, we should ideally map here
      // But for simple display, we'll just reload or map manually
      window.location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel" style={{ flex: 1 }}>
      <h3 className="stencil-heading" style={{ marginBottom: '1.5rem', color: 'var(--accent-orange)' }}>
        MATERIAL LIBRARY
      </h3>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 2 }}>
          <label className="stencil-heading" style={{ fontSize: '0.55rem' }}>NAME</label>
          <input
            type="text"
            placeholder="e.g. MDF"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={styles.select}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
          <label className="stencil-heading" style={{ fontSize: '0.55rem' }}>THICKNESS</label>
          <input
            type="number"
            step="0.1"
            placeholder="mm"
            value={thickness}
            onChange={(e) => setThickness(e.target.value)}
            required
            className={styles.select}
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>
          {loading ? '...' : '+ ADD'}
        </button>
      </form>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className="stencil-heading" style={{ fontSize: '0.6rem' }}>MATERIAL NAME</th>
              <th className="stencil-heading" style={{ fontSize: '0.6rem' }}>SIZE</th>
              <th className="stencil-heading" style={{ fontSize: '0.6rem' }}>UNIT</th>
            </tr>
          </thead>
          <tbody>
            {materials.map(m => (
              <tr key={m.id} className={styles.tableRow}>
                <td style={{ fontWeight: 600 }}>{m.name.toUpperCase()}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{m.thickness}</td>
                <td>{m.unit}</td>
              </tr>
            ))}
            {materials.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-dim)', fontSize: '0.7rem' }}>
                  NO MATERIALS DEFINED
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
