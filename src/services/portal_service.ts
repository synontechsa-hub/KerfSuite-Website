import { SupabaseClient } from '@supabase/supabase-js';
import {
  License, mapLicenseFromDb,
  UserProfile, mapUserProfileFromDb,
  AuditLog, mapAuditLogFromDb,
  Workspace, mapWorkspaceFromDb,
  Asset, mapAssetFromDb,
  Material, mapMaterialFromDb,
  Location, mapLocationFromDb
} from '@/models/portal';

/**
 * PortalService: Centralized data access layer
 * Standard: AGENTS.md v1.2 - Rule 8.1
 */
export class PortalService {

  static async getUserProfile(supabase: SupabaseClient, userId: string): Promise<{ profile: UserProfile, workspace: Workspace } | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*, workspaces(*)')
      .eq('id', userId)
      .single();

    if (error || !data) return null;

    return {
      profile: mapUserProfileFromDb(data),
      workspace: mapWorkspaceFromDb(data.workspaces)
    };
  }

  static async getLicenses(supabase: SupabaseClient, workspaceId: string): Promise<License[]> {
    const { data } = await supabase
      .from('license_slots')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    return (data || []).map(mapLicenseFromDb);
  }

  static async getAuditLogs(supabase: SupabaseClient, workspaceId: string, limit: number = 10): Promise<AuditLog[]> {
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return (data || []).map(mapAuditLogFromDb);
  }

  static async getUsersCount(supabase: SupabaseClient, workspaceId: string): Promise<number> {
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    return count || 0;
  }

  static async getWorkspaceUsers(supabase: SupabaseClient, workspaceId: string): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .rpc('get_workspace_users', { p_workspace_id: workspaceId });

    if (error) {
      console.error('Error in getWorkspaceUsers:', error);
      return [];
    }

    return (data || []).map(mapUserProfileFromDb);
  }

  static async logAction(supabase: SupabaseClient, params: {
    workspaceId: string,
    actorId: string,
    actorEmail: string,
    actionType: string,
    targetId?: string,
    description: string
  }) {
    // Rule 8.4: Async operations MUST handle error states explicitly
    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          workspace_id: params.workspaceId,
          actor_id: params.actorId,
          actor_email: params.actorEmail,
          action_type: params.actionType,
          target_id: params.targetId,
          description: params.description
        });

      if (error) console.error('Failed to log action:', error);
    } catch (e) {
      console.error('Critical error in logAction:', e);
    }
  }

  static async generateLicense(supabase: SupabaseClient, params: {
    workspaceId: string,
    app: string,
    cdkey: string | null,
    cdkeyHash: string,
    createdBy: string
  }): Promise<License> {
    const { data, error } = await supabase
      .from('license_slots')
      .insert({
        workspace_id: params.workspaceId,
        app: params.app,
        cdkey: params.cdkey, // May be null if purging raw keys
        cdkey_hash: params.cdkeyHash,
        status: 'waiting',
        created_by: params.createdBy
      })
      .select()
      .single();

    if (error) throw new Error(`DB_ERROR: ${error.message}`);
    return mapLicenseFromDb(data);
  }

  static async updateLicenseLabel(supabase: SupabaseClient, licenseId: string, workspaceId: string, label: string) {
    const { error } = await supabase
      .from('license_slots')
      .update({ label })
      .eq('id', licenseId)
      .eq('workspace_id', workspaceId);

    if (error) throw new Error(`DB_ERROR: ${error.message}`);
  }

  static async revokeLicense(supabase: SupabaseClient, licenseId: string, workspaceId: string): Promise<License | null> {
    // Fetch info first for the audit log
    const { data: current } = await supabase
      .from('license_slots')
      .select('cdkey')
      .eq('id', licenseId)
      .eq('workspace_id', workspaceId)
      .single();

    const { error } = await supabase
      .from('license_slots')
      .update({ status: 'revoked' })
      .eq('id', licenseId)
      .eq('workspace_id', workspaceId);

    if (error) throw new Error(`DB_ERROR: ${error.message}`);

    return current ? mapLicenseFromDb(current) : null;
  }

  static async updateWorkspaceName(supabase: SupabaseClient, workspaceId: string, name: string) {
    const { error } = await supabase
      .from('workspaces')
      .update({ name })
      .eq('id', workspaceId);

    if (error) throw new Error(`DB_ERROR: ${error.message}`);
  }

  static async changeUserRole(supabase: SupabaseClient, userId: string, workspaceId: string, newRole: string) {
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId)
      .eq('workspace_id', workspaceId);

    if (error) throw new Error(`DB_ERROR: ${error.message}`);
  }

  static async getAssets(supabase: SupabaseClient, workspaceId: string): Promise<Asset[]> {
    const { data } = await supabase
      .from('assets')
      .select('*, materials(name, thickness), locations(name)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    return (data || []).map(mapAssetFromDb);
  }

  static async getMaterials(supabase: SupabaseClient, workspaceId: string): Promise<Material[]> {
    const { data } = await supabase
      .from('materials')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false)
      .order('name', { ascending: true });

    return (data || []).map(mapMaterialFromDb);
  }

  static async getLocations(supabase: SupabaseClient, workspaceId: string): Promise<Location[]> {
    const { data } = await supabase
      .from('locations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('depth', { ascending: true })
      .order('name', { ascending: true });

    return (data || []).map(mapLocationFromDb);
  }
}

