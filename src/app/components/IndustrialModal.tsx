'use client';

import React from 'react';

interface IndustrialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
}

export default function IndustrialModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'CONFIRM',
  cancelText = 'CANCEL',
  variant = 'primary'
}: IndustrialModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="panel" style={{ width: '450px', maxWidth: '95%', backgroundColor: 'var(--bg-panel-raised)', borderLeft: `4px solid ${variant === 'danger' ? 'var(--status-error)' : 'var(--accent-orange)'}` }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--bg-panel-border)' }}>
          <h3 className="stencil-heading" style={{ fontSize: '0.9rem', color: variant === 'danger' ? 'var(--status-error)' : 'var(--accent-orange)' }}>
            {title.toUpperCase()}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </header>

        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.6' }}>
            {message}
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost"
            style={{ fontSize: '0.75rem', padding: '0.5rem 1.2rem' }}
          >
            {cancelText.toUpperCase()}
          </button>
          {onConfirm && (
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}
              style={{ fontSize: '0.75rem', padding: '0.5rem 1.2rem' }}
            >
              {confirmText.toUpperCase()}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
