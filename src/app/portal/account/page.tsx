import styles from "../page.module.css";
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import WorkspaceForm from './WorkspaceForm';
import PasswordForm from './PasswordForm';

export default async function AccountPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userData } = await supabase
    .from('users')
    .select('workspace_id, role, workspaces(name)')
    .eq('id', user.id)
    .single();

  const workspaceName = ((userData?.workspaces as unknown) as { name: string })?.name || '';

  // Check MFA Status
  const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const isMfaEnabled = mfaData?.currentLevel === 'aal2';

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <Sidebar activeItem="account" userEmail={user.email || ''} />

      <main className={styles.main}>
        <header className={`${styles.header} panel`}>
          <h2 className="stencil-heading" style={{ fontSize: "1rem", color: "var(--text-primary)" }}>
            ACCOUNT SECURITY
          </h2>
        </header>

        <div className="panel" style={{ maxWidth: "500px", marginBottom: "1rem" }}>
          <h3 className="stencil-heading" style={{ marginBottom: "1.5rem" }}>Multi-Factor Authentication</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: isMfaEnabled ? "var(--status-running)" : "var(--status-error)",
              boxShadow: isMfaEnabled ? "0 0 8px var(--status-running)" : "none"
            }} />
            <div>
              <p style={{ fontSize: "0.9rem", fontWeight: "600" }}>
                Status: {isMfaEnabled ? "SECURED (AAL2)" : "PASSWORD ONLY (AAL1)"}
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                {isMfaEnabled
                  ? "Your account is protected by an additional security layer."
                  : "MFA is highly recommended for administrators to prevent unauthorized access."}
              </p>
            </div>
          </div>
          {userData?.role === 'admin' && !isMfaEnabled && (
            <div style={{ marginTop: "1rem", padding: "0.8rem", backgroundColor: "rgba(231, 76, 60, 0.1)", borderLeft: "4px solid var(--status-error)" }}>
              <p style={{ fontSize: "0.8rem", color: "var(--status-error)" }}>
                <strong>Admin Notice:</strong> MFA is REQUIRED for sensitive operations like generating keys or removing users.
              </p>
            </div>
          )}
        </div>

        <div className="panel" style={{ maxWidth: "500px", marginBottom: "1rem" }}>
          <h3 className="stencil-heading" style={{ marginBottom: "1.5rem" }}>Workspace Settings</h3>
          <WorkspaceForm defaultName={workspaceName} />
        </div>

        <div className="panel" style={{ maxWidth: "500px" }}>
          <h3 className="stencil-heading" style={{ marginBottom: "1.5rem" }}>Update Security Credentials</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
            Requires you to be logged back in after changing.
          </p>
          <PasswordForm />
        </div>
      </main>
    </div>
  );
}

