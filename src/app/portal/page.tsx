import styles from "./page.module.css";
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import GenerateKeyButton from '../components/GenerateKeyButton';
import Link from 'next/link';
import LicenseRoster from '../components/LicenseRoster';
import { PortalService } from '@/services/portal_service';

export default async function Home() {
  const supabase = await createClient();

  // 1. Authenticate & get profile
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await PortalService.getUserProfile(supabase, user.id);
  if (!result) redirect('/login');
  
  const { profile, workspace } = result;

  // 2. Fetch Data via Service Layer (Rule 8.1)
  const [licenses, auditLogs, usersCount] = await Promise.all([
    PortalService.getLicenses(supabase, profile.workspaceId),
    PortalService.getAuditLogs(supabase, profile.workspaceId),
    PortalService.getUsersCount(supabase, profile.workspaceId)
  ]);

  const activeMachines = licenses.filter(l => l.status === 'active').length;
  const waitingSlots = licenses.filter(l => l.status === 'waiting').length;

  return (
    <div className={styles.container}>
      <Sidebar activeItem="dashboard" userEmail={user.email || ''} />

      <main className={styles.main}>
        <header className={`${styles.header} panel`}>
          <h2 className="stencil-heading" style={{ fontSize: "1rem", color: "var(--text-primary)" }}>
            DASHBOARD
          </h2>
          <div className={styles.headerActions}>
            {profile.role === 'admin' && <GenerateKeyButton allowedApps={workspace.allowedApps} />}
          </div>
        </header>

        <div className={styles.grid}>
          {/* Stats Cards */}
          <div className="panel">
            <h3 className="stencil-heading">Active Machines</h3>
            <div className={styles.statValue}>{activeMachines}</div>
            <div className={styles.statMeta} style={{ color: "var(--status-running)" }}>Bound hardware</div>
          </div>
          
          <div className="panel">
            <h3 className="stencil-heading">Total Users</h3>
            <div className={styles.statValue}>{usersCount}</div>
            <div className={styles.statMeta}>{profile.role} privileges</div>
          </div>
          
          <div className="panel">
            <h3 className="stencil-heading">Waiting Keys</h3>
            <div className={styles.statValue}>{waitingSlots}</div>
            <div className={styles.statMeta} style={{ color: "var(--accent-orange)" }}>Ready to bind</div>
          </div>
        </div>

        <div className={styles.dashboardSplit}>
          {/* Audit Log */}
          <div className="panel" style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 className="stencil-heading">Recent Activity Log</h3>
              <Link href="/audit" style={{ fontSize: "0.7rem", color: "var(--accent-orange)", fontWeight: "600", textDecoration: "underline" }}>
                VIEW FULL LOG →
              </Link>
            </div>
            <div className={styles.auditList}>
              {auditLogs.map((log) => (
                <div key={log.id} className={styles.auditItem}>
                  <span className={styles.auditTime}>
                    {new Date(log.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className={styles.auditText}>
                    <strong>{log.actorEmail}</strong> {log.description}
                  </span>
                </div>
              ))}
              {auditLogs.length === 0 && (
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>No activity recorded.</p>
              )}
            </div>
          </div>

          {/* Download Software Panel */}
          <div className="panel" style={{ flex: 0.6, borderLeft: "4px solid var(--accent-orange)" }}>
            <h3 className="stencil-heading" style={{ marginBottom: "1rem", color: "var(--accent-orange)" }}>
              Download Software
            </h3>
            <div style={{ fontSize: "0.85rem", lineHeight: "1.4" }}>
              <p><strong>Current Version:</strong> v0.1.0-alpha (2026-06-11)</p>
              <p><strong>Status:</strong> Internal Testing</p>
              <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <a href="https://synontech.itch.io/kerfsuite" target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ textAlign: "center", fontSize: "0.75rem" }}>
                  Get KerfCut (Desktop)
                </a>
                <a href="https://synontech.itch.io/kerfsuite" target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ textAlign: "center", fontSize: "0.75rem" }}>
                  Get KerfStock (Mobile)
                </a>
              </div>
              <div style={{ marginTop: "1rem", borderTop: "1px solid var(--bg-panel-border)", paddingTop: "0.5rem" }}>
                <p className="stencil-heading" style={{ fontSize: "0.6rem" }}>Requirements</p>
                <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>• Windows 10/11 (x64)<br/>• .NET 8.0 Runtime<br/>• Persistent Internet for Activation</p>
              </div>
            </div>
          </div>
        </div>

        {licenses.length === 0 && (
          <div className="panel" style={{ borderLeft: "4px solid var(--accent-orange)", marginTop: "1rem" }}>
            <h3 className="stencil-heading" style={{ color: "var(--accent-orange)", marginBottom: "1rem" }}>
              Getting Started
            </h3>
            <ol style={{ fontSize: "0.9rem", lineHeight: "2", paddingLeft: "1.2rem" }}>
              <li>Click <strong>+ Generate Key</strong> above to create a CDKey for your machine.</li>
              <li>Use the <strong>Download Software</strong> link in the sidebar to get KerfCut.</li>
              <li>Launch KerfCut and enter your CDKey when prompted to activate.</li>
            </ol>
          </div>
        )}

        {/* Licenses Data Grid */}
        <div className="panel" style={{ marginTop: "1rem", flex: 1 }}>
          <h3 className="stencil-heading" style={{ marginBottom: "1.5rem" }}>License Roster</h3>
          
          <LicenseRoster
            initialLicenses={licenses}
            userRole={profile.role}
          />
        </div>
      </main>
    </div>
  );
}

