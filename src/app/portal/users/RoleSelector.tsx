'use client'

import { useState, useTransition } from 'react'
import { changeUserRole } from '../actions'
import styles from '../page.module.css'

export default function RoleSelector({
  userId,
  currentRole,
  onUpdateOptimistic
}: {
  userId: string,
  currentRole: string,
  onUpdateOptimistic?: (role: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleRoleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as 'admin' | 'member'
    setError(null)

    startTransition(async () => {
      if (onUpdateOptimistic) onUpdateOptimistic(newRole)
      try {
        const res = await changeUserRole(userId, newRole)
        if (res && 'error' in res) {
          setError(res.error || 'Failed to update role')
        }
      } catch (err: unknown) {
        console.error(err)
        setError(err instanceof Error ? err.message : 'Failed to update role')
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <select
        value={currentRole}
        onChange={handleRoleChange}
        disabled={isPending}
        className={`${styles.select} ${styles.badge} ${styles['status-' + (currentRole === 'admin' ? 'active' : 'waiting')]}`}
        style={{
          padding: '2px 8px',
          fontSize: '0.75rem',
          height: 'auto',
          border: 'none',
          outline: 'none',
          appearance: 'none',
          cursor: isPending ? 'wait' : 'pointer',
          textAlign: 'center',
          opacity: isPending ? 0.5 : 1
        }}
      >
        <option value="member">member</option>
        <option value="admin">admin</option>
      </select>
      {error && (
        <span style={{ fontSize: '0.6rem', color: 'var(--status-error)', textTransform: 'uppercase' }}>
          {error}
        </span>
      )}
    </div>
  )
}

