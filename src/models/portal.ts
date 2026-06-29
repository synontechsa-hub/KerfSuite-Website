/**
 * SoulLink Architecture - Data Models
 * Standard: AGENTS.md v1.2
 */

export type License = {
  id: string;
  cdkey: string;
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
  description: string;
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
 * MAPPERS: PostgreSQL (snake_case) <-> Runtime (camelCase)
 * Required by Rule 3.4
 */

export function mapLicenseFromDb(db: any): License {
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

export function mapUserProfileFromDb(db: any): UserProfile {
  return {
    id: db.id,
    email: db.email,
    role: db.role,
    workspaceId: db.workspace_id,
    createdAt: db.created_at,
    confirmed: db.confirmed,
  };
}

export function mapAuditLogFromDb(db: any): AuditLog {
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

export function mapWorkspaceFromDb(db: any): Workspace {
  return {
    id: db.id,
    name: db.name,
    allowedApps: db.allowed_apps || [],
    createdAt: db.created_at,
  };
}

export function mapMaterialFromDb(db: any): Material {
  return {
    id: db.id,
    workspaceId: db.workspace_id,
    name: db.name,
    thickness: db.thickness,
    unit: db.unit,
    createdAt: db.created_at,
  };
}

export function mapLocationFromDb(db: any): Location {
  return {
    id: db.id,
    workspaceId: db.workspace_id,
    name: db.name,
    parentId: db.parent_id,
    depth: db.depth,
  };
}

export function mapAssetFromDb(db: any): Asset {
  return {
    id: db.id,
    workspaceId: db.workspace_id,
    materialId: db.material_id,
    systemName: db.system_name,
    displayName: db.display_name,
    width: db.width,
    height: db.height,
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

