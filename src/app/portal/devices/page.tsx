import styles from '../page.module.css'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '../../components/Sidebar'
import { PortalService } from '@/services/portal_service'
import { approveDeviceAuthorization } from './actions'

export default async function DeviceApprovalPage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const profileResult = await PortalService.getUserProfile(supabase, user.id)
  if (!profileResult) redirect('/login')
  const { profile } = profileResult
  const licenses = (await PortalService.getLicenses(supabase, profile.workspaceId)).filter((license) => license.status !== 'revoked')
  const result = (await searchParams).result

  return <div className={styles.container}>
    <Sidebar activeItem="devices" userEmail={user.email || ''} />
    <main className={styles.main}>
      <header className={`${styles.header} panel`}><h2 className="stencil-heading" style={{ fontSize: '1rem' }}>APPROVE DESKTOP DEVICE</h2></header>
      <section className="panel" style={{ maxWidth: '620px' }}>
        <h3 className="stencil-heading" style={{ marginBottom: '1rem' }}>Secure device approval</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1rem' }}>Enter the short code shown by KerfCut or KerfStock. The desktop receives only a single-use signed lease; no activation key is entered into or sent by the app.</p>
        {result === 'approved' && <p style={{ color: 'var(--status-running)', marginBottom: '1rem' }}>Device approved. Return to the desktop app.</p>}
        {result === 'mfa' && <p style={{ color: 'var(--status-error)', marginBottom: '1rem' }}>Administrator MFA is required to approve a device.</p>}
        {(result === 'invalid' || result === 'unavailable') && <p style={{ color: 'var(--status-error)', marginBottom: '1rem' }}>That approval could not be completed. Check the code and try again.</p>}
        {profile.role !== 'admin' ? <p>Only workspace administrators can approve new devices.</p> : <form action={approveDeviceAuthorization} className={styles.generateForm} style={{ alignItems: 'stretch', flexDirection: 'column' }}>
          <label htmlFor="user_code">Desktop code</label><input id="user_code" name="user_code" required autoComplete="one-time-code" placeholder="ABCD-EF12-3456-7890" className={styles.labelInput} />
          <label htmlFor="license_slot_id">Licence slot</label><select id="license_slot_id" name="license_slot_id" required className={styles.select}><option value="">Select a licence</option>{licenses.map((license) => <option key={license.id} value={license.id}>{license.app} — {license.label || license.status}</option>)}</select>
          <button type="submit" className="btn-primary" disabled={licenses.length === 0}>Approve device</button>
        </form>}
      </section>
    </main>
  </div>
}
