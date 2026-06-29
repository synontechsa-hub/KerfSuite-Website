'use client';

import { useState } from 'react';
import { Asset, Material, Location } from '@/models/portal';
import styles from '../page.module.css';

export default function InventoryRoster({
  initialAssets,
  materials,
  locations
}: {
  initialAssets: Asset[],
  materials: Material[],
  locations: Location[]
}) {
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredAssets = initialAssets.filter(asset => {
    const matchesSearch = asset.systemName.toLowerCase().includes(filter.toLowerCase()) ||
                          asset.displayName?.toLowerCase().includes(filter.toLowerCase()) ||
                          asset.material?.name.toLowerCase().includes(filter.toLowerCase());
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className={styles.inventoryContainer}>
      <div className={styles.rosterHeader}>
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="SEARCH ASSETS (ID, NAME, MATERIAL)..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={styles.select}
            style={{ width: '300px' }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.select}
          >
            <option value="all">ALL STATUSES</option>
            <option value="available">AVAILABLE</option>
            <option value="reserved">RESERVED</option>
            <option value="consumed">CONSUMED</option>
            <option value="damaged">DAMAGED</option>
          </select>
        </div>
        <div className={styles.rosterStats}>
          <span className="stencil-heading" style={{ fontSize: '0.6rem' }}>
            TOTAL MATCHES: {filteredAssets.length}
          </span>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className="stencil-heading">SYSTEM ID</th>
              <th className="stencil-heading">MATERIAL</th>
              <th className="stencil-heading">DIMENSIONS (mm)</th>
              <th className="stencil-heading">LOCATION</th>
              <th className="stencil-heading">STATUS</th>
              <th className="stencil-heading">CREATED</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssets.map(asset => (
              <tr key={asset.id} className={styles.tableRow}>
                <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {asset.systemName}
                  {asset.displayName && <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 300 }}>{asset.displayName}</div>}
                </td>
                <td>
                  {asset.material?.name}
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{asset.material?.thickness}mm</div>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                  {asset.width} x {asset.height}
                </td>
                <td style={{ fontSize: '0.75rem' }}>
                  {asset.location?.name || '---'}
                </td>
                <td>
                  <span className={`badge badge-${asset.status}`}>
                    {asset.status}
                  </span>
                </td>
                <td style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                  {new Date(asset.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {filteredAssets.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                  NO ASSETS MATCHING CRITERIA
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
