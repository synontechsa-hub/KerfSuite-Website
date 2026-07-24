'use client'

import { useState } from 'react'
import { generateKey } from '../portal/actions'
import SubmitButton from './SubmitButton'
import styles from '../portal/page.module.css'

export default function GenerateKeyButton({ allowedApps }: { allowedApps: string[] }) {
  const [error, setError] = useState<string | null>(null)
  const [newKey, setNewKey] = useState<string | null>(null)

  if (!allowedApps || allowedApps.length === 0) {
    return (
      <div className={styles.generateForm}>
        <p className="stencil-heading" style={{ fontSize: '0.65rem', opacity: 0.6 }}>
          NO PRO LICENSES ASSIGNED
        </p>
      </div>
    )
  }

  if (newKey) {
    return (
      <div className="panel" style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000, borderLeft: '4px solid var(--status-running)', backgroundColor: 'var(--bg-panel-raised)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', minWidth: '300px', animation: 'fadeInUp 0.3s ease' }}>
        <h3 className="stencil-heading" style={{ color: 'var(--status-running)', marginBottom: '0.5rem' }}>NEW KEY GENERATED</h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>COPY THIS NOW. It will not be shown again.</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: '#000', padding: '1rem', borderRadius: '4px', border: '1px solid var(--bg-panel-border)', marginBottom: '1rem' }}>
          <code style={{ color: 'var(--accent-orange)', fontWeight: 'bold', fontSize: '1rem' }}>{newKey}</code>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => {
              navigator.clipboard.writeText(newKey);
              // Simple feedback
            }}
            className="btn-primary"
            style={{ fontSize: '0.7rem', flex: 1 }}
          >
            COPY KEY
          </button>
          <button
            onClick={() => setNewKey(null)}
            className="btn-ghost"
            style={{ fontSize: '0.7rem', flex: 1 }}
          >
            DISMISS
          </button>
        </div>
      </div>
    )
  }

  return (
    <form 
      action={async (formData) => {
        setError(null)
        try {
          const key = await generateKey(formData)
          if (key) setNewKey(key)
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : 'Failed to generate key')
        }
      }} 
      className={styles.generateForm}
    >
      <select name="app" className={styles.select}>
        {allowedApps.includes('kerfcut') && <option value="kerfcut">KerfCut (Optimisation PRO)</option>}
        {allowedApps.includes('kerfstock') && <option value="kerfstock">KerfStock (Inventory PRO)</option>}
      </select>
      
      <SubmitButton
        onClick={(e) => {
          if (!confirm('Generate a new license key?')) {
            e.preventDefault()
          }
        }}
      >
        + Generate Key
      </SubmitButton>

      {error && (
        <span style={{ color: 'var(--status-error)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
          {error}
        </span>
      )}
    </form>
  )
}

