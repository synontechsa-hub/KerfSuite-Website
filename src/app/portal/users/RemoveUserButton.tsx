'use client'

import { removeUser } from '../actions'
import ConfirmActionButton from '../../components/ConfirmActionButton'
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
  const isSelf = userId === currentUserId

  if (isSelf) {
    return (
      <button className={styles.btnDangerDisabled} title="You cannot remove yourself" disabled>
        Remove
      </button>
    )
  }

  return (
    <ConfirmActionButton
      action={() => removeUser(userId)}
      confirmMessage="Are you sure you want to remove this user from the workspace?"
      idleLabel="Remove"
      pendingLabel="REMOVING..."
      onOptimistic={onRemoveOptimistic}
    />
  )
}
