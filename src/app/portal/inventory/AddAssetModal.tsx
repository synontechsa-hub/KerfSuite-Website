'use client';

import React, { useState } from 'react';
import styles from '../page.module.css';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: any[];
  locations: any[];
  onAdd: (asset: any) => void;
}

export default function AddAssetModal({ isOpen, onClose, materials, locations, onAdd }: AddAssetModalProps) {
  const [materialId, setMaterialId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [width, setWidth] = useState(2440);
  const [height, setHeight] = useState(1220);
  const [locationId, setLocationId] = useState('');
  const [assetType, setAssetType] = useState('full_sheet');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/stock/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: materialId,
          display_name: displayName || null,
          width,
          height,
          location_id: locationId || null,
          asset_type: assetType
        })
      });

      if (!response.ok) throw new Error('Failed to create asset');
      const newAsset = await response.json();
      onAdd(newAsset);

      // Reset
      setMaterialId('');
      setDisplayName('');
      setLocationId('');

      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="panel" style={{ width: '400px', maxWidth: '95%', backgroundColor: 'var(--bg-panel-raised)' }}>
        <header className={styles.header} style={{ marginBottom: '1.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--bg-panel-border)' }}>
          <h3 className="stencil-heading" style={{ fontSize: '0.9rem' }}>ADD MANUAL ASSET</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </header>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label className="stencil-heading" style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>MATERIAL</label>
            <select
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
              required
              className={styles.select}
            >
              <option value="">SELECT MATERIAL...</option>
              {materials.map(m => (
                <option key={m.id} value={m.id}>{m.name.toUpperCase()} ({m.thickness}mm)</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label className="stencil-heading" style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>DISPLAY NAME</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="OPTIONAL NAME..."
              className={styles.select}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
              <label className="stencil-heading" style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>WIDTH (mm)</label>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(parseInt(e.target.value))}
                required
                className={styles.select}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
              <label className="stencil-heading" style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>HEIGHT (mm)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(parseInt(e.target.value))}
                required
                className={styles.select}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label className="stencil-heading" style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>ASSET TYPE</label>
            <select
              value={assetType}
              onChange={(e) => setAssetType(e.target.value)}
              className={styles.select}
            >
              <option value="full_sheet">FULL SHEET</option>
              <option value="remnant">REMNANT</option>
              <option value="offcut">OFFCUT</option>
              <option value="custom">CUSTOM</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label className="stencil-heading" style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>LOCATION</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className={styles.select}
            >
              <option value="">UNKNOWN / FLOOR</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.name.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} className={styles.logoutBtn} style={{ width: 'auto', border: 'none', padding: '0.5rem 1rem' }}>CANCEL</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'SAVING...' : 'SAVE ASSET'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
