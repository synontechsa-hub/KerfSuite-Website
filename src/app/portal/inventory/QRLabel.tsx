'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Asset } from '@/models/portal';

interface QRLabelProps {
  asset: Asset;
  onClose: () => void;
}

export default function QRLabel({ asset, onClose }: QRLabelProps) {
  const handlePrint = () => {
    window.print();
  };

  // Create a clean URL for the QR code
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const qrValue = `${baseUrl}/portal/inventory/${asset.id}`;

  return (
    <div className="modal-overlay no-print">
      <div className="panel" style={{ width: '450px', backgroundColor: 'var(--bg-panel-raised)' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--bg-panel-border)', paddingBottom: '0.5rem' }}>
          <h3 className="stencil-heading" style={{ fontSize: '0.9rem' }}>PRINT ASSET LABEL</h3>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)' }}>✕</button>
        </header>

        {/* The Printable Area */}
        <div className="printable-label" style={{
          backgroundColor: 'white',
          color: 'black',
          padding: '15px',
          display: 'flex',
          gap: '15px',
          borderRadius: '4px',
          boxShadow: '0 0 10px rgba(0,0,0,0.5)'
        }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>System ID</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>{asset.systemName}</div>
            </div>

            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase' }}>Material</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                {asset.material?.name.toUpperCase()} {asset.material?.thickness}MM
              </div>
            </div>

            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase' }}>Dimensions</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                {asset.width} x {asset.height}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid #ddd', paddingLeft: '15px' }}>
            <QRCodeSVG value={qrValue} size={100} level="H" />
            <div style={{ fontSize: '0.5rem', marginTop: '5px', fontWeight: 700, opacity: 0.5 }}>SCAN TO LOCATE</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '0.5rem 1rem' }}>CANCEL</button>
          <button onClick={handlePrint} className="btn-filled" style={{ padding: '0.5rem 1.5rem' }}>
            PRINT LABEL
          </button>
        </div>

        <p style={{ fontSize: '0.55rem', color: 'var(--text-dim)', marginTop: '1rem', textAlign: 'center' }}>
          FORMATTED FOR 50MM X 30MM THERMAL PRINTERS
        </p>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-label, .printable-label * {
            visibility: visible;
          }
          .printable-label {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            box-shadow: none !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
