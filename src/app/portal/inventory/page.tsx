import styles from "../page.module.css";
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import { PortalService } from '@/services/portal_service';
import InventoryRoster from './InventoryRoster';

export default async function InventoryPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await PortalService.getUserProfile(supabase, user.id);
  if (!result) redirect('/login');

  const { profile } = result;

  const [assets, materials, locations] = await Promise.all([
    PortalService.getAssets(supabase, profile.workspaceId),
    PortalService.getMaterials(supabase, profile.workspaceId),
    PortalService.getLocations(supabase, profile.workspaceId)
  ]);

  return (
    <div className={styles.container}>
      <Sidebar activeItem="inventory" userEmail={user.email || ''} />

      <main className={styles.main}>
        <header className={`${styles.header} panel`}>
          <h2 className="stencil-heading" style={{ fontSize: "1rem", color: "var(--text-primary)" }}>
            INVENTORY / STOCK
          </h2>
          <div className={styles.headerActions}>
            <button className="btn-primary" style={{ fontSize: '0.7rem' }}>+ ADD MANUAL ASSET</button>
          </div>
        </header>

        <div className="panel" style={{ marginTop: "1rem" }}>
          <InventoryRoster
            initialAssets={assets}
            materials={materials}
            locations={locations}
          />
        </div>
      </main>
    </div>
  );
}
