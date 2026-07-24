'use client'

import { useActionState, useState, useRef } from 'react'
import { inviteUser } from '../actions'
import styles from '../page.module.css'
import IndustrialModal from '../../components/IndustrialModal'

export default function InviteUserButton() {
  const [state, formAction, isPending] = useActionState(inviteUser, null)
  const [showConfirm, setShowConfirm] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        className={styles.generateForm}
      >
        <input
          name="email"
          type="email"
          placeholder="colleague@workshop.com"
          required
          className={styles.select}
          style={{ width: "200px" }}
        />
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          disabled={isPending}
          className="btn-primary"
          style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}
        >
          {isPending ? 'Inviting...' : '+ Invite User'}
        </button>

        {state?.error && (
          <span style={{ color: 'var(--status-error)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
            {state.error}
          </span>
        )}
        {state?.success && (
          <span style={{ color: 'var(--status-success)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
            {state.success}
          </span>
        )}
      </form>

      <IndustrialModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => formRef.current?.requestSubmit()}
        title="Invite Workspace Member"
        message="This will send an invitation email to the specified address. They will be added to this workspace once they accept."
        confirmText="Send Invitation"
      />
    </>
  )
}

