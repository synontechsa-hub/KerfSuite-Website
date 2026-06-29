'use client'

import { useState, useTransition } from 'react'
import { removeUser } from '../actions'
import SubmitButton from '../../components/SubmitButton'
import styles from '../page.module.css'

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
  const isSelf = userId === currentUserId

  if (isSelf) {
    return (
      <button className={styles.btnDangerDisabled} title="You cannot remove yourself" disabled>
        Remove
      </button>
    )
  }

  const handleAction = async () => {
    if (!confirm('Are you sure you want to remove this user from the workspace?')) {
      return
    }
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
    <form action={handleAction}>
      <SubmitButton 
        variant="danger"
        disabled={isPending}
      >
        {isPending ? 'REMOVING...' : 'Remove'}
      </SubmitButton>

      {error && (
        <div style={{ color: 'var(--status-error)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
          {error}
        </div>
      )}
    </form>
  )
}

