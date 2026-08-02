'use client'

import { useState, useTransition } from 'react'
import { removeUser } from '../actions'
import styles from '../page.module.css'
import IndustrialModal from '../../components/IndustrialModal'

export default function RemoveUserButton({
  userId,
  currentUserId,
  onRemoveOptimistic
}: {
  userId: string,
  currentUserId: string,
  onRemoveOptimistic?: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)
  const isSelf = userId === currentUserId

  if (isSelf) {
    return (
      <button className={styles.btnDangerDisabled} title="You cannot remove yourself" disabled>
        Remove
      </button>
    )
  }

  const handleAction = async () => {
    setError(null)

    startTransition(async () => {
      if (onRemoveOptimistic) onRemoveOptimistic()
      const result = await removeUser(userId)
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
        {isPending ? 'REMOVING...' : 'Remove'}
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
        title="Remove User"
        message="Are you sure you want to remove this user from the workspace? Their access to all applications and the portal will be terminated immediately."
        confirmText="Remove User"
        variant="danger"
      />
    </>
  )
}

