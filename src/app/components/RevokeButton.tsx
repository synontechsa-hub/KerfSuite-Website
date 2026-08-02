'use client'

import { useState, useTransition } from 'react'
import { revokeKey } from '../portal/actions'
import styles from '../portal/page.module.css'
import IndustrialModal from './IndustrialModal'

export default function RevokeButton({
  licenseId,
  onRevokeOptimistic
}: {
  licenseId: string,
  onRevokeOptimistic?: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)

  const handleAction = async () => {
    setError(null)

    startTransition(async () => {
      if (onRevokeOptimistic) onRevokeOptimistic()
      const result = await revokeKey(licenseId)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isPending}
        className={styles.btnDanger}
      >
        {isPending ? 'REVOKING...' : 'REVOKE'}
      </button>
      
      {error && (
        <div style={{ color: 'var(--status-error)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
          {error}
        </div>
      )}

      <IndustrialModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleAction}
        title="Revoke License Key"
        message="Are you sure you want to revoke this key instantly? This will lock out the machine and release the license slot for a new activation. This action cannot be undone."
        confirmText="Revoke Instantly"
        variant="danger"
      />
    </>
  )
}

