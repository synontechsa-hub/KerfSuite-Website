'use client'

import { useState, useTransition } from 'react'
import SubmitButton from './SubmitButton'

type ActionResult = { error?: string | null } | null | undefined | void

/**
 * A destructive/confirmable action button.
 * Encapsulates the shared confirm -> optimistic update -> transition -> inline
 * error pattern used by revoke/remove style buttons.
 */
export default function ConfirmActionButton({
  action,
  confirmMessage,
  idleLabel,
  pendingLabel,
  variant = 'danger',
  onOptimistic,
}: {
  action: () => Promise<ActionResult>
  confirmMessage: string
  idleLabel: string
  pendingLabel: string
  variant?: 'primary' | 'danger'
  onOptimistic?: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleAction = async () => {
    if (!confirm(confirmMessage)) {
      return
    }
    setError(null)

    startTransition(async () => {
      if (onOptimistic) onOptimistic()
      const result = await action()
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <form action={handleAction}>
      <SubmitButton variant={variant} disabled={isPending}>
        {isPending ? pendingLabel : idleLabel}
      </SubmitButton>

      {error && (
        <div style={{ color: 'var(--status-error)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
          {error}
        </div>
      )}
    </form>
  )
}
