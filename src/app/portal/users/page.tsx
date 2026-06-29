import styles from "../page.module.css";
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import UserRoster from './UserRoster';
import InviteUserButton from './InviteUserButton';
import { PortalService } from '@/services/portal_service';

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // 1. Authenticate & get workspace
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await PortalService.getUserProfile(supabase, user.id);
  if (!result) redirect('/login');

  const { profile } = result;

  // 2. Fetch Users via Service Layer (Rule 8.1)
  const usersWithStatus = await PortalService.getWorkspaceUsers(supabase, profile.workspaceId);

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <Sidebar activeItem="users" userEmail={user.email || ''} />

      {/* Main Content */}
      <main className={styles.main}>
        <header className={`${styles.header} panel`}>
          <h2 className="stencil-heading" style={{ fontSize: "1rem", color: "var(--text-primary)" }}>
            USER ROSTER
          </h2>
          <div className={styles.headerActions}>
            {profile.role === 'admin' && <InviteUserButton />}
          </div>
        </header>

        {params?.message && (
          <div className="panel" style={{
            borderLeft: `4px solid ${params.message.startsWith('Error') ? 'var(--status-error)' : 'var(--status-running)'}`,
            marginBottom: "1rem"
          }}>
            <p style={{
              fontSize: "0.9rem",
              color: params.message.startsWith('Error') ? 'var(--status-error)' : 'var(--status-running)'
            }}>
              {params.message}
            </p>
          </div>
        )}

        <div className="panel" style={{ flex: 1 }}>
          <h3 className="stencil-heading" style={{ marginBottom: "1.5rem" }}>Workshop Personnel</h3>

          <UserRoster
            initialUsers={usersWithStatus}
            currentUserId={user.id}
            currentUserRole={profile.role}
          />
        </div>
      </main>
    </div>
  );
}

