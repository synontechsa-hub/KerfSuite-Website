'use client'

import { useState } from 'react'
import { generateKey } from '../portal/actions'
import SubmitButton from './SubmitButton'
import styles from '../portal/page.module.css'

export default function GenerateKeyButton({ allowedApps }: { allowedApps: string[] }) {
  const [error, setError] = useState<string | null>(null)

  if (!allowedApps || allowedApps.length === 0) {
    return (
      <div className={styles.generateForm}>
        <p className="stencil-heading" style={{ fontSize: '0.65rem', opacity: 0.6 }}>
          NO PRO LICENSES ASSIGNED
        </p>
      </div>
    )
  }

  return (
    <form 
      action={async (formData) => {
        setError(null)
        try {
          await generateKey(formData)
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

