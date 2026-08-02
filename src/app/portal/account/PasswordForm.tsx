'use client'

import { useActionState } from 'react'
import { updatePassword } from '../actions'
import styles from '../page.module.css'

export default function PasswordForm() {
  const [state, formAction, isPending] = useActionState(updatePassword, null)

  return (
    <form action={formAction} className={styles.loginForm} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <label className="stencil-heading">New Security Code (Min. 8 Chars)</label>
        <input
          name="password"
          type="password"
          required
          placeholder="••••••••"
          className={styles.select}
          style={{ width: "100%" }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <label className="stencil-heading">Confirm Security Code</label>
        <input
          name="confirmPassword"
          type="password"
          required
          placeholder="••••••••"
          className={styles.select}
          style={{ width: "100%" }}
        />
      </div>

      {state?.error && (
        <span style={{ color: 'var(--status-error)', fontSize: '0.8rem' }}>
          {state.error}
        </span>
      )}
      {state?.success && (
        <span style={{ color: 'var(--status-success)', fontSize: '0.8rem' }}>
          {state.success}
        </span>
      )}

      <button className="btn-primary" type="submit" style={{ padding: "0.8rem" }} disabled={isPending}>
        {isPending ? 'Updating...' : 'Update Credentials'}
      </button>
    </form>
  )
}

