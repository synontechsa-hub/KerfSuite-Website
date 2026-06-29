'use client'

import { useActionState } from 'react'
import { inviteUser } from '../actions'
import SubmitButton from '../../components/SubmitButton'
import styles from '../page.module.css'

export default function InviteUserButton() {
  const [state, formAction, isPending] = useActionState(inviteUser, null)

  return (
    <form 
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
      <SubmitButton
        onClick={(e) => {
          if (!confirm('Send an invitation email to this user?')) {
            e.preventDefault()
          }
        }}
      >
        {isPending ? 'Inviting...' : '+ Invite User'}
      </SubmitButton>

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
  )
}

