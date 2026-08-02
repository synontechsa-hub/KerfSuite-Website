/**
 * SoulLink Architecture - Data Models
 * Standard: AGENTS.md v1.2
 */

export type License = {
  id: string;
  cdkey: string | null;
  app: string;
  label: string | null;
  status: string;
  redeemedAt: string | null;
  boundMachineId: string | null;
  lastSeenAt: string | null;
  appVersion: string | null;
  osInfo: string | null;
  isFlagged: boolean;
  abuseScore: number;
  lastIp: string | null;
};

export type UserProfile = {
  id: string;
  email: string;
  role: string;
  workspaceId: string;
  createdAt: string;
  confirmed: boolean;
};

export type AuditLog = {
  id: string;
  workspaceId: string;
  actorId: string | null;
  actorEmail: string | null;
  actionType: string;
  targetId: string | null;
  description: string | null;
  createdAt: string;
};

export type Workspace = {
  id: string;
  name: string;
  allowedApps: string[];
  createdAt: string;
};

export type Material = {
  id: string;
  workspaceId: string;
  name: string;
  thickness: number | null;
  unit: string;
  createdAt: string;
};

export type Location = {
  id: string;
  workspaceId: string;
  name: string;
  parentId: string | null;
  depth: number;
};

export type Asset = {
  id: string;
  workspaceId: string;
  materialId: string;
  systemName: string;
  displayName: string | null;
  width: number;
  height: number;
  quantity: number;
  assetType: 'full_sheet' | 'remnant' | 'offcut' | 'custom';
  status: 'available' | 'reserved' | 'consumed' | 'disposed' | 'damaged' | 'missing';
  locationId: string | null;
  sourceAssetId: string | null;
  jobReference: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  material?: {
    name: string;
    thickness: number | null;
  };
  location?: {
    name: string;
  };
};

/**
 * DB Row Definitions (PostgreSQL snake_case)
 * Internal usage only for mapping.
 */
export interface DbLicense {
  id: string;
  cdkey: string | null;
  app: string;
  label: string | null;
  status: string;
  redeemed_at: string | null;
  bound_machine_id: string | null;
  last_seen_at: string | null;
  app_version: string | null;
  os_info: string | null;
  is_flagged: boolean;
  abuse_score: number;
  last_ip: string | null;
}

export interface DbUserProfile {
  id: string;
  email: string;
  role: string;
  workspace_id: string;
  created_at: string;
  confirmed?: boolean;
  email_confirmed_at?: string | null;
  workspaces?: DbWorkspace;
}

export interface DbAuditLog {
  id: string;
  workspace_id: string;
  actor_id: string | null;
  actor_email: string | null;
  action_type: string;
  target_id: string | null;
  description: string | null;
  created_at: string;
}

export interface DbWorkspace {
  id: string;
  name: string;
  allowed_apps: string[] | null;
  created_at: string;
}

export interface DbMaterial {
  id: string;
  workspace_id: string;
  name: string;
  thickness: number | null;
  unit: string;
  created_at: string;
}

export interface DbLocation {
  id: string;
  workspace_id: string;
  name: string;
  parent_id: string | null;
  depth: number;
}

export interface DbAsset {
  id: string;
  workspace_id: string;
  material_id: string;
  system_name: string;
  display_name: string | null;
  width: number;
  height: number;
  quantity: number;
  asset_type: 'full_sheet' | 'remnant' | 'offcut' | 'custom';
  status: 'available' | 'reserved' | 'consumed' | 'disposed' | 'damaged' | 'missing';
  location_id: string | null;
  source_asset_id: string | null;
  job_reference: string | null;
  created_at: string;
  updated_at: string;
  materials?: {
    name: string;
    thickness: number | null;
  };
  locations?: {
    name: string;
  };
}

/**
 * MAPPERS: PostgreSQL (snake_case) <-> Runtime (camelCase)
 * Required by Rule 3.4
 */

export function mapLicenseFromDb(db: DbLicense): License {
  return {
    id: db.id,
    cdkey: db.cdkey,
    app: db.app,
    label: db.label,
    status: db.status,
    redeemedAt: db.redeemed_at,
    boundMachineId: db.bound_machine_id,
    lastSeenAt: db.last_seen_at,
    appVersion: db.app_version,
    osInfo: db.os_info,
    isFlagged: db.is_flagged,
    abuseScore: db.abuse_score,
    lastIp: db.last_ip,
  };
}

export function mapUserProfileFromDb(db: DbUserProfile): UserProfile {
  return {
    id: db.id,
    email: db.email,
    role: db.role,
    workspaceId: db.workspace_id,
    createdAt: db.created_at,
    confirmed: db.confirmed ?? (db.email_confirmed_at ? true : false),
  };
}

export function mapAuditLogFromDb(db: DbAuditLog): AuditLog {
  return {
    id: db.id,
    workspaceId: db.workspace_id,
    actorId: db.actor_id,
    actorEmail: db.actor_email,
    actionType: db.action_type,
    targetId: db.target_id,
    description: db.description,
    createdAt: db.created_at,
  };
}

export function mapWorkspaceFromDb(db: DbWorkspace): Workspace {
  return {
    id: db.id,
    name: db.name,
    allowedApps: db.allowed_apps || [],
    createdAt: db.created_at,
  };
}

export function mapMaterialFromDb(db: DbMaterial): Material {
  return {
    id: db.id,
    workspaceId: db.workspace_id,
    name: db.name,
    thickness: db.thickness,
    unit: db.unit,
    createdAt: db.created_at,
  };
}

export function mapLocationFromDb(db: DbLocation): Location {
  return {
    id: db.id,
    workspaceId: db.workspace_id,
    name: db.name,
    parentId: db.parent_id,
    depth: db.depth,
  };
}

export function mapAssetFromDb(db: DbAsset): Asset {
  return {
    id: db.id,
    workspaceId: db.workspace_id,
    materialId: db.material_id,
    systemName: db.system_name,
    displayName: db.display_name,
    width: db.width,
    height: db.height,
    quantity: db.quantity ?? 1,
    assetType: db.asset_type,
    status: db.status,
    locationId: db.location_id,
    sourceAssetId: db.source_asset_id,
    jobReference: db.job_reference,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    material: db.materials ? {
      name: db.materials.name,
      thickness: db.materials.thickness,
    } : undefined,
    location: db.locations ? {
      name: db.locations.name,
    } : undefined,
  };
}

