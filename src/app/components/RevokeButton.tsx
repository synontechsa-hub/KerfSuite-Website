'use client'

import { revokeKey } from '../portal/actions'
import ConfirmActionButton from './ConfirmActionButton'

export default function RevokeButton({
  licenseId,
  onRevokeOptimistic
}: {
  licenseId: string,
  onRevokeOptimistic?: () => void
}) {
  return (
    <ConfirmActionButton
      action={() => revokeKey(licenseId)}
      confirmMessage="Revoke this key instantly? This will lock out the machine."
      idleLabel="REVOKE"
      pendingLabel="REVOKING..."
      onOptimistic={onRevokeOptimistic}
    />
  )
}
