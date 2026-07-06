'use client';

import { useState } from 'react';
import styles from '../page.module.css';
import InventoryRoster from './InventoryRoster';
import AddAssetModal from './AddAssetModal';
import { Asset, Material, Location } from '@/models/portal';

export default function InventoryManager({
  initialAssets,
  materials,
  locations
}: {
  initialAssets: Asset[],
  materials: Material[],
  locations: Location[]
}) {
  const [assets, setAssets] = useState(initialAssets);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddAsset = (newAsset: any) => {
    // Reload to get fresh data with joins from the server component
    window.location.reload();
  };

  return (
    <>
      <header className={`${styles.header} panel`}>
        <h2 className="stencil-heading" style={{ fontSize: "1rem", color: "var(--text-primary)" }}>
          INVENTORY / STOCK
        </h2>
        <div className={styles.headerActions}>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary"
            style={{ fontSize: '0.7rem' }}
          >
            + ADD MANUAL ASSET
          </button>
        </div>
      </header>

      <div className="panel" style={{ marginTop: "1rem" }}>
        <InventoryRoster
          initialAssets={assets}
          materials={materials}
          locations={locations}
        />
      </div>

      <AddAssetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        materials={materials}
        locations={locations}
        onAdd={handleAddAsset}
      />
    </>
  );
}
