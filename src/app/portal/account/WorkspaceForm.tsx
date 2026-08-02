'use client'

import { useActionState } from 'react'
import { updateWorkspaceName } from '../actions'
import styles from '../page.module.css'

export default function WorkspaceForm({ defaultName }: { defaultName: string }) {
  const [state, formAction, isPending] = useActionState(updateWorkspaceName, null)

  return (
    <form action={formAction} className={styles.loginForm} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <label className="stencil-heading">Workspace Name</label>
        <input
          name="name"
          type="text"
          required
          defaultValue={defaultName}
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
        {isPending ? 'Updating...' : 'Update Workspace Name'}
      </button>
    </form>
  )
}

