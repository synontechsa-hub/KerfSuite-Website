'use client'

import { useOptimistic } from 'react'
import styles from '../page.module.css'
import RoleSelector from './RoleSelector'
import RemoveUserButton from './RemoveUserButton'
import { UserProfile } from '@/models/portal'

export default function UserRoster({
  initialUsers,
  currentUserId,
  currentUserRole
}: {
  initialUsers: UserProfile[],
  currentUserId: string,
  currentUserRole: string
}) {
  const [optimisticUsers, updateOptimisticUsers] = useOptimistic(
    initialUsers,
    (state, updated: { id: string, role?: string, removed?: boolean }) => {
      if (updated.removed) {
        return state.filter(u => u.id !== updated.id)
      }
      return state.map(u => u.id === updated.id ? { ...u, ...updated } : u)
    }
  )

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Email Address</th>
            <th>Role</th>
            <th>Joined</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {optimisticUsers.map((u) => (
            <tr key={u.id}>
              <td style={{ color: "var(--text-primary)" }}>{u.email}</td>
              <td>
                {currentUserRole === 'admin' && u.id !== currentUserId ? (
                  <RoleSelector
                    userId={u.id}
                    currentRole={u.role}
                    onUpdateOptimistic={(newRole) => updateOptimisticUsers({ id: u.id, role: newRole })}
                  />
                ) : (
                  <span className={`${styles.badge} ${styles['status-' + (u.role === 'admin' ? 'active' : 'waiting')]}`}>
                    {u.role}
                  </span>
                )}
              </td>
              <td style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                {new Date(u.createdAt).toLocaleDateString()}
              </td>
              <td>
                <span className={`${styles.badge} ${styles[u.confirmed ? 'status-active' : 'status-waiting']}`}>
                  {u.confirmed ? 'Active' : 'Pending'}
                </span>
              </td>
              <td>
                {currentUserRole === 'admin' ? (
                  <RemoveUserButton
                    userId={u.id}
                    currentUserId={currentUserId}
                    onRemoveOptimistic={() => updateOptimisticUsers({ id: u.id, removed: true })}
                  />
                ) : (
                  <span style={{ fontSize: "0.75rem", opacity: 0.5 }}>READ-ONLY</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

