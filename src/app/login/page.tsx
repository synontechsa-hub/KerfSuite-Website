'use client'

import { useActionState, use } from 'react'
import { login } from './actions'
import styles from './login.module.css'

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>
}) {
  const params = use(searchParams)
  const [state, formAction, isPending] = useActionState(login, null)

  return (
    <div className={styles.container}>
      <div className={`${styles.loginCard} panel`}>
        <div className={styles.header}>
          <h1 style={{ color: "var(--text-primary)", letterSpacing: "3px", fontSize: "1.5rem", fontWeight: 900, textTransform: "uppercase" }}>
            Kerf<span style={{ color: "var(--accent-orange)" }}>Suite</span>
          </h1>
          <p className="stencil-heading" style={{ marginTop: "0.4rem", letterSpacing: "3px" }}>Portal Access</p>
        </div>

        <form className={styles.form} action={formAction}>
          <div className={styles.inputGroup}>
            <label className="stencil-heading" htmlFor="email">Email Address</label>
            <input 
              className={styles.input} 
              id="email" 
              name="email" 
              type="email" 
              placeholder="admin@workshop.com" 
              required 
            />
          </div>

          <div className={styles.inputGroup}>
            <label className="stencil-heading" htmlFor="password">Security Code</label>
            <input 
              className={styles.input} 
              id="password" 
              name="password" 
              type="password" 
              placeholder="••••••••" 
              required 
            />
          </div>

          {(state?.error || params?.message) && (
            <div className={styles.errorAlert}>
              {state?.error || params?.message}
            </div>
          )}

          <div className={styles.actions}>
            <button className="btn-primary" style={{ width: "100%", padding: "0.8rem" }} disabled={isPending}>
              {isPending ? 'Authenticating...' : 'Initialize Session'}
            </button>
          </div>
        </form>
        
        <div className={styles.footer}>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.72rem", textAlign: "center", marginBottom: "0.5rem" }}>
            Workshop owners &amp; admins only.
          </p>
          <a href="/" style={{ display: "block", textAlign: "center", fontSize: "0.65rem", color: "var(--text-secondary)", letterSpacing: "1px", textTransform: "uppercase", transition: "color 0.2s" }}>
            ← Back to KerfSuite
          </a>
        </div>
      </div>
    </div>
  )
}

