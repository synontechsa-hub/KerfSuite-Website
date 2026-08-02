import Link from 'next/link'
import GoogleAuthButton from '../components/GoogleAuthButton'
import styles from '../login/login.module.css'
import { createClient } from '@/utils/supabase/server'
import { claimWorkspaceInvite, signOutForInvite } from './actions'

const inviteTokenPattern = /^[A-Za-z0-9_-]{43}$/

export default async function JoinWorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string, message?: string }>
}) {
  const params = await searchParams
  const token = params.token || ''
  const isValidToken = inviteTokenPattern.test(token)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const nextPath = isValidToken
    ? `/join?token=${token}`
    : '/join'

  return (
    <main className={styles.container}>
      <section className={`${styles.loginCard} panel`}>
        <div className={styles.header}>
          <h1 className={styles.brandHeading}>
            Kerf<span>Suite</span>
          </h1>
          <p className="stencil-heading">Workspace Invitation</p>
        </div>

        {!isValidToken ? (
          <div className={styles.errorAlert} role="alert">
            {params.message || 'This invitation link is invalid.'}
          </div>
        ) : (
          <>
            <p className={styles.invitationCopy}>
              You have been invited to collaborate in a KerfSuite workspace.
              The invitation can only be accepted by the email address it was created for.
            </p>

            {params.message && (
              <div className={styles.errorAlert} role="alert">{params.message}</div>
            )}

            {!user ? (
              <>
                <GoogleAuthButton
                  className={styles.googleButton}
                  nextPath={nextPath}
                  label="Sign in with Google to accept"
                />
                <p className={styles.oauthHint}>
                  Use the Google account matching the email address your administrator invited.
                </p>
              </>
            ) : (
              <div className={styles.invitationActions}>
                <p className={styles.signedInIdentity}>
                  Signed in as <strong>{user.email}</strong>
                </p>
                <form action={claimWorkspaceInvite}>
                  <input type="hidden" name="token" value={token} />
                  <button type="submit" className="btn-primary">
                    Accept Workspace Invitation
                  </button>
                </form>
                <form action={signOutForInvite}>
                  <input type="hidden" name="token" value={token} />
                  <button type="submit" className="btn-secondary">
                    Use a Different Account
                  </button>
                </form>
              </div>
            )}
          </>
        )}

        <div className={styles.footer}>
          <Link href="/">Back to KerfSuite</Link>
        </div>
      </section>
    </main>
  )
}
