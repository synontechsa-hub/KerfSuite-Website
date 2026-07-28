import { SupabaseClient } from '@supabase/supabase-js';
import {
  License, mapLicenseFromDb,
  UserProfile, mapUserProfileFromDb,
  AuditLog, mapAuditLogFromDb,
  Workspace, mapWorkspaceFromDb,
  Asset, mapAssetFromDb,
  Material, mapMaterialFromDb,
  Location, mapLocationFromDb,
  DbUserProfile, DbLicense, DbAuditLog, DbWorkspace, DbMaterial, DbLocation, DbAsset
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

    if (error) {
      console.error('Failed to load portal user profile:', error.message);
      return null;
    }
    if (!data) return null;

    return {
      profile: mapUserProfileFromDb(data as DbUserProfile),
      workspace: mapWorkspaceFromDb((data as DbUserProfile).workspaces as DbWorkspace)
    };
  }

  static async getLicenses(supabase: SupabaseClient, workspaceId: string): Promise<License[]> {
    const { data } = await supabase
      .from('license_slots')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    return (data as DbLicense[] || []).map(mapLicenseFromDb);
  }

  static async getAuditLogs(supabase: SupabaseClient, workspaceId: string, limit: number = 10): Promise<AuditLog[]> {
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return (data as DbAuditLog[] || []).map(mapAuditLogFromDb);
  }

  static async getUsersCount(supabase: SupabaseClient, workspaceId: string): Promise<number> {
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    return count || 0;
  }

  static async getAdminsCount(supabase: SupabaseClient, workspaceId: string): Promise<number> {
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('role', 'admin');

    if (error) throw new Error(`DB_ERROR: ${error.message}`);
    return count || 0;
  }

  static async getWorkspaceUsers(supabase: SupabaseClient, workspaceId: string): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .rpc('get_workspace_users', { p_workspace_id: workspaceId });

    if (error) {
      console.error('Error in getWorkspaceUsers:', error);
      return [];
    }

    return (data as DbUserProfile[] || []).map(mapUserProfileFromDb);
  }

  static async createWorkspaceInvite(supabase: SupabaseClient, params: {
    email: string,
    tokenHash: string
  }): Promise<string> {
    const { data, error } = await supabase.rpc('create_workspace_invite', {
      p_email: params.email,
      p_token_hash: params.tokenHash
    });

    if (error) throw new Error(`DB_ERROR: ${error.message}`);
    if (typeof data !== 'string') throw new Error('DB_ERROR: Invitation ID was not returned');
    return data;
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
    return mapLicenseFromDb(data as DbLicense);
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
      .select('*')
      .eq('id', licenseId)
      .eq('workspace_id', workspaceId)
      .single();

    const { error } = await supabase
      .from('license_slots')
      .update({ status: 'revoked' })
      .eq('id', licenseId)
      .eq('workspace_id', workspaceId);

    if (error) throw new Error(`DB_ERROR: ${error.message}`);

    return current ? mapLicenseFromDb(current as DbLicense) : null;
  }

  static async updateWorkspaceName(supabase: SupabaseClient, workspaceId: string, name: string) {
    const { error } = await supabase
      .from('workspaces')
      .update({ name })
      .eq('id', workspaceId);

    if (error) throw new Error(`DB_ERROR: ${error.message}`);
  }

  static async changeUserRole(supabase: SupabaseClient, userId: string, newRole: string) {
    const { error } = await supabase.rpc('change_workspace_user_role', {
      p_user_id: userId,
      p_new_role: newRole
    });

    if (error) throw new Error(`DB_ERROR: ${error.message}`);
  }

  static async getAssets(supabase: SupabaseClient, workspaceId: string): Promise<Asset[]> {
    const { data } = await supabase
      .from('assets')
      .select('*, materials(name, thickness), locations(name)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    return (data as DbAsset[] || []).map(mapAssetFromDb);
  }

  static async getMaterials(supabase: SupabaseClient, workspaceId: string): Promise<Material[]> {
    const { data } = await supabase
      .from('materials')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false)
      .order('name', { ascending: true });

    return (data as DbMaterial[] || []).map(mapMaterialFromDb);
  }

  static async getLocations(supabase: SupabaseClient, workspaceId: string): Promise<Location[]> {
    const { data } = await supabase
      .from('locations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('depth', { ascending: true })
      .order('name', { ascending: true });

    return (data as DbLocation[] || []).map(mapLocationFromDb);
  }

  static async createAsset(supabase: SupabaseClient, params: {
    materialId: string,
    width: number,
    height: number,
    assetType: string,
    displayName?: string | null,
    locationId?: string | null,
    status?: string
  }): Promise<Asset> {
    const { data, error } = await supabase
      .rpc('create_asset', {
        p_material_id: params.materialId,
        p_width: params.width,
        p_height: params.height,
        p_asset_type: params.assetType,
        p_display_name: params.displayName,
        p_location_id: params.locationId,
        p_status: params.status
      })
      .single();

    if (error) throw new Error(`DB_ERROR: ${error.message}`);
    return mapAssetFromDb(data as DbAsset);
  }
}

