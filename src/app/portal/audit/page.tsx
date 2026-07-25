import styles from "../page.module.css";
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import FormattedDate from '../../components/FormattedDate';
import Link from 'next/link';

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>
}) {
  const supabase = await createClient();
  const params = await searchParams;

  // 1. Authenticate & get workspace
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userData } = await supabase
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single();

  const workspaceId = userData?.workspace_id;

  // 2. Build Query
  let query = supabase
    .from('audit_logs')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (params.action && params.action !== 'all') {
    query = query.eq('action_type', params.action);
  }

  const { data: auditLogs } = await query;

  const filters = [
    { label: 'ALL ACTIONS', value: 'all' },
    { label: 'LICENSE GEN', value: 'key_generated' },
    { label: 'LICENSE REVOKE', value: 'key_revoked' },
    { label: 'USER INVITE', value: 'user_invited' },
    { label: 'LOGIN', value: 'login_success' },
    { label: 'WORKSPACE', value: 'workspace_renamed' },
  ];

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "1.5rem", flexWrap: 'wrap', gap: '1rem' }}>
            <h3 className="stencil-heading">Security & Action History</h3>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {filters.map((f) => (
                <Link
                  key={f.value}
                  href={`/portal/audit${f.value === 'all' ? '' : `?action=${f.value}`}`}
                  className={`${styles.badge} ${params.action === f.value || (!params.action && f.value === 'all') ? styles['status-active'] : styles['status-waiting']}`}
                  style={{ fontSize: '0.6rem', textDecoration: 'none' }}
                >
                  {f.label}
                </Link>
              ))}
            </div>
          </div>

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
                  <tr key={log.id} className={styles.tableRow}>
                    <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                      <FormattedDate date={log.created_at} format="long" />
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
                    <td colSpan={5} style={{ textAlign: "center", padding: "4rem", color: "var(--text-secondary)" }}>
                      NO MATCHING ACTIVITY RECORDED.
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

