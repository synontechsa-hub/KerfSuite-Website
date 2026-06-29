'use client'

import { useState, useTransition } from 'react'
import { updateLicenseLabel } from '../portal/actions'
import styles from '../portal/page.module.css'

export default function EditableLabel({
  licenseId,
  initialLabel,
  boundMachineId,
  onUpdateOptimistic
}: {
  licenseId: string,
  initialLabel: string | null,
  boundMachineId: string | null,
  onUpdateOptimistic?: (label: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [label, setLabel] = useState(initialLabel || '')
  const [isPending, startTransition] = useTransition()

  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newLabel = label.trim()
    setIsEditing(false)
    setError(null)

    startTransition(async () => {
      if (onUpdateOptimistic) onUpdateOptimistic(newLabel)
      const result = await updateLicenseLabel(licenseId, newLabel)
      if (result?.error) {
        setError(result.error)
        console.error("Failed to update label:", result.error)
      }
    })
  }

  // Determine what text to show when not editing
  const displayText = initialLabel || (boundMachineId ? `Machine: ${boundMachineId.slice(-6)}` : null)

  if (isEditing) {
    return (
      <form onSubmit={handleSubmit} className={styles.labelForm}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              autoFocus
              className={styles.labelInput}
              value={label}
              placeholder={boundMachineId || "Enter label..."}
              onChange={(e) => setLabel(e.target.value)}
              disabled={isPending}
            />
            <button type="submit" className={styles.labelSave} title="Save" disabled={isPending}>✓</button>
            <button
              type="button"
              className={styles.labelCancel}
              title="Cancel"
              onClick={() => { setLabel(initialLabel || ''); setIsEditing(false); setError(null); }}
              disabled={isPending}
            >✕</button>
          </div>
          {error && <span style={{ color: 'var(--status-error)', fontSize: '0.65rem', marginTop: '2px' }}>{error}</span>}
        </div>
      </form>
    )
  }

  return (
    <div
      className={styles.labelDisplay}
      style={{ opacity: isPending ? 0.5 : 1 }}
      onClick={() => !isPending && setIsEditing(true)}
      title="Click to edit machine label"
    >
      {displayText || <span style={{ opacity: 0.3 }}>+ Add Label</span>}
    </div>
  )
}

