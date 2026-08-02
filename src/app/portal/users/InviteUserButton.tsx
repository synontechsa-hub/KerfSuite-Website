'use client'

import { useActionState, useRef, useState } from 'react'
import { inviteUser } from '../actions'
import styles from '../page.module.css'
import IndustrialModal from '../../components/IndustrialModal'

export default function InviteUserButton() {
  const [state, formAction, isPending] = useActionState(inviteUser, null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  function handleOpenConfirmation() {
    if (formRef.current?.reportValidity()) {
      setShowConfirm(true)
    }
  }

  function handleConfirmInvitation() {
    setShowConfirm(false)
    setCopyStatus(null)
    formRef.current?.requestSubmit()
  }

  async function handleCopyLink() {
    if (!state?.inviteUrl) return

    try {
      await navigator.clipboard.writeText(state.inviteUrl)
      setCopyStatus('Copied. Send this link directly to the invited person.')
    } catch {
      setCopyStatus('Copy failed. Select the link and copy it manually.')
    }
  }

  return (
    <section className={styles.inviteSection} aria-labelledby="invite-member-heading">
      <div>
        <h3 id="invite-member-heading" className="stencil-heading">
          Invite a workspace member
        </h3>
        <p className={styles.inviteHelp}>
          Create a secure seven-day link, then send it yourself by WhatsApp, Gmail, or any other channel.
        </p>
      </div>

      <form ref={formRef} action={formAction} className={styles.generateForm}>
        <input
          name="email"
          type="email"
          placeholder="colleague@workshop.com"
          required
          className={styles.select}
        />
        <button
          type="button"
          onClick={handleOpenConfirmation}
          disabled={isPending}
          className="btn-primary"
        >
          {isPending ? 'Creating...' : '+ Create Invite Link'}
        </button>
      </form>

      {state?.error && (
        <p className={styles.inviteError} role="alert">{state.error}</p>
      )}

      {state?.success && (
        <p className={styles.inviteSuccess} role="status">{state.success}</p>
      )}

      {state?.inviteUrl && (
        <div className={styles.inviteResult}>
          <label htmlFor="workspace-invite-link">One-time invitation link</label>
          <div className={styles.inviteLinkRow}>
            <input
              id="workspace-invite-link"
              value={state.inviteUrl}
              readOnly
              className={styles.select}
              onFocus={(event) => event.currentTarget.select()}
            />
            <button type="button" className="btn-secondary" onClick={handleCopyLink}>
              Copy Link
            </button>
          </div>
          {copyStatus && <p className={styles.inviteHelp}>{copyStatus}</p>}
        </div>
      )}

      <IndustrialModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmInvitation}
        title="Create Workspace Invitation"
        message="The link will work for seven days and only for the Google or verified portal account matching this email address."
        confirmText="Create Link"
      />
    </section>
  )
}
