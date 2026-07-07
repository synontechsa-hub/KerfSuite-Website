import styles from "../page.module.css";
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import { PortalService } from '@/services/portal_service';
import MaterialLibrary from './MaterialLibrary';
import WorkshopMap from './WorkshopMap';

export default async function SetupPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await PortalService.getUserProfile(supabase, user.id);
  if (!result || result.profile.role !== 'admin') redirect('/portal');

  const { profile } = result;

  const [materials, locations] = await Promise.all([
    PortalService.getMaterials(supabase, profile.workspaceId),
    PortalService.getLocations(supabase, profile.workspaceId)
  ]);

  return (
    <div className={styles.container}>
      <Sidebar activeItem="setup" userEmail={user.email || ''} />

      <main className={styles.main}>
        <header className={`${styles.header} panel`}>
          <h2 className="stencil-heading" style={{ fontSize: "1rem", color: "var(--text-primary)" }}>
            WORKSHOP SETUP & CONFIGURATION
          </h2>
        </header>

        <div className={styles.dashboardSplit}>
          <MaterialLibrary initialMaterials={materials} />
          <WorkshopMap initialLocations={locations} />
        </div>
      </main>
    </div>
  );
}
