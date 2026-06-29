import styles from "../page.module.css";
import { createClient, createAdminClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '../../components/Sidebar';

export default async function AuditPage() {
  const supabase = await createClient();

  // 1. Authenticate & get workspace
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userData } = await supabase
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single();

  const workspaceId = userData?.workspace_id;

  // 2. Fetch Audit Logs (Paginated or just top 100 for now)
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className={styles.container}>
      <Sidebar activeItem="audit" userEmail={user.email || ''} />

      <main className={styles.main}>
        <header className={`${styles.header} panel`}>
          <h2 className="stencil-heading" style={{ fontSize: "1rem", color: "var(--text-primary)" }}>
            SYSTEM AUDIT LOG
          </h2>
        </header>

        <div className="panel" style={{ flex: 1 }}>
          <h3 className="stencil-heading" style={{ marginBottom: "1.5rem" }}>Security & Action History</h3>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target ID</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs?.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                      {new Date(log.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td style={{ fontSize: "0.85rem", fontWeight: "600" }}>{log.actor_email}</td>
                    <td>
                      <span className={`${styles.badge} ${styles['status-waiting']}`} style={{ fontSize: "0.65rem" }}>
                        {log.action_type.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", opacity: 0.6 }}>
                      {log.target_id || '—'}
                    </td>
                    <td style={{ fontSize: "0.9rem" }}>{log.description}</td>
                  </tr>
                ))}
                {(!auditLogs || auditLogs.length === 0) && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                      No activity recorded in this workspace.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

