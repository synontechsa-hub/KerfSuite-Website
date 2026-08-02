import styles from "../page.module.css";
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import { PortalService } from '@/services/portal_service';
import InventoryManager from './InventoryManager';

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
        <InventoryManager
          initialAssets={assets}
          materials={materials}
          locations={locations}
        />
      </main>
    </div>
  );
}
