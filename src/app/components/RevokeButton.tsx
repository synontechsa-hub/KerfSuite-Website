'use client'

import { useState, useTransition } from 'react'
import { revokeKey } from '../portal/actions'
import SubmitButton from './SubmitButton'

export default function RevokeButton({
  licenseId,
  onRevokeOptimistic
}: {
  licenseId: string,
  onRevokeOptimistic?: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleAction = async () => {
    if (!confirm('Revoke this key instantly? This will lock out the machine.')) {
      return
    }
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
    <form action={handleAction}>
      <SubmitButton 
        variant="danger"
        disabled={isPending}
      >
        {isPending ? 'REVOKING...' : 'REVOKE'}
      </SubmitButton>
      
      {error && (
        <div style={{ color: 'var(--status-error)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
          {error}
        </div>
      )}
    </form>
  )
}

