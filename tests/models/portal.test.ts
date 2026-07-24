/**
 * Unit tests for src/models/portal.ts DB <-> runtime mappers.
 * These mappers are pure functions and previously had 0% coverage.
 */
import {
  mapLicenseFromDb,
  mapUserProfileFromDb,
  mapAuditLogFromDb,
  mapWorkspaceFromDb,
  mapMaterialFromDb,
  mapLocationFromDb,
  mapAssetFromDb,
} from '@/models/portal';

describe('mapLicenseFromDb', () => {
  it('maps snake_case DB columns to camelCase runtime fields', () => {
    const db = {
      id: 'lic-1',
      cdkey: 'KCT-PRO-A1B2-C3D4',
      app: 'kerfcut',
      label: 'Workshop PC',
      status: 'active',
      redeemed_at: '2026-01-01T00:00:00Z',
      bound_machine_id: 'machine-9',
      last_seen_at: '2026-02-02T00:00:00Z',
      app_version: '1.2.3',
      os_info: 'Windows 11',
      is_flagged: true,
      abuse_score: 3,
      last_ip: '10.0.0.1',
    };

    expect(mapLicenseFromDb(db)).toEqual({
      id: 'lic-1',
      cdkey: 'KCT-PRO-A1B2-C3D4',
      app: 'kerfcut',
      label: 'Workshop PC',
      status: 'active',
      redeemedAt: '2026-01-01T00:00:00Z',
      boundMachineId: 'machine-9',
      lastSeenAt: '2026-02-02T00:00:00Z',
      appVersion: '1.2.3',
      osInfo: 'Windows 11',
      isFlagged: true,
      abuseScore: 3,
      lastIp: '10.0.0.1',
    });
  });

  it('preserves nullable fields', () => {
    const result = mapLicenseFromDb({
      id: 'lic-2',
      cdkey: 'x',
      app: 'kerfstock',
      label: null,
      status: 'waiting',
      redeemed_at: null,
      bound_machine_id: null,
      last_seen_at: null,
      app_version: null,
      os_info: null,
      is_flagged: false,
      abuse_score: 0,
      last_ip: null,
    });

    expect(result.label).toBeNull();
    expect(result.boundMachineId).toBeNull();
    expect(result.lastIp).toBeNull();
    expect(result.isFlagged).toBe(false);
  });
});

describe('mapUserProfileFromDb', () => {
  it('maps standard user columns', () => {
    const result = mapUserProfileFromDb({
      id: 'u-1',
      email: 'a@b.com',
      role: 'admin',
      workspace_id: 'ws-1',
      created_at: '2026-01-01T00:00:00Z',
      confirmed: true,
    });

    expect(result).toEqual({
      id: 'u-1',
      email: 'a@b.com',
      role: 'admin',
      workspaceId: 'ws-1',
      createdAt: '2026-01-01T00:00:00Z',
      confirmed: true,
    });
  });

  it('derives confirmed from email_confirmed_at when confirmed is absent', () => {
    expect(
      mapUserProfileFromDb({
        id: 'u-2',
        email: 'c@d.com',
        role: 'member',
        workspace_id: 'ws-2',
        created_at: 'now',
        email_confirmed_at: '2026-03-03T00:00:00Z',
      }).confirmed,
    ).toBe(true);

    expect(
      mapUserProfileFromDb({
        id: 'u-3',
        email: 'e@f.com',
        role: 'member',
        workspace_id: 'ws-3',
        created_at: 'now',
        email_confirmed_at: null,
      }).confirmed,
    ).toBe(false);
  });

  it('prefers an explicit confirmed flag over the email fallback', () => {
    expect(
      mapUserProfileFromDb({
        id: 'u-4',
        email: 'g@h.com',
        role: 'member',
        workspace_id: 'ws-4',
        created_at: 'now',
        confirmed: false,
        email_confirmed_at: '2026-03-03T00:00:00Z',
      }).confirmed,
    ).toBe(false);
  });
});

describe('mapAuditLogFromDb', () => {
  it('maps audit log columns', () => {
    expect(
      mapAuditLogFromDb({
        id: 'log-1',
        workspace_id: 'ws-1',
        actor_id: 'u-1',
        actor_email: 'admin@x.com',
        action_type: 'revoke_license',
        target_id: 'lic-1',
        description: 'Revoked key',
        created_at: '2026-01-01T00:00:00Z',
      }),
    ).toEqual({
      id: 'log-1',
      workspaceId: 'ws-1',
      actorId: 'u-1',
      actorEmail: 'admin@x.com',
      actionType: 'revoke_license',
      targetId: 'lic-1',
      description: 'Revoked key',
      createdAt: '2026-01-01T00:00:00Z',
    });
  });

  it('preserves null actor fields for system-generated logs', () => {
    const result = mapAuditLogFromDb({
      id: 'log-2',
      workspace_id: 'ws-1',
      actor_id: null,
      actor_email: null,
      action_type: 'potential_abuse_flagged',
      target_id: null,
      description: 'flagged',
      created_at: 'now',
    });
    expect(result.actorId).toBeNull();
    expect(result.actorEmail).toBeNull();
    expect(result.targetId).toBeNull();
  });
});

describe('mapWorkspaceFromDb', () => {
  it('maps workspace columns', () => {
    expect(
      mapWorkspaceFromDb({
        id: 'ws-1',
        name: 'Acme',
        allowed_apps: ['kerfcut', 'kerfstock'],
        created_at: 'now',
      }),
    ).toEqual({
      id: 'ws-1',
      name: 'Acme',
      allowedApps: ['kerfcut', 'kerfstock'],
      createdAt: 'now',
    });
  });

  it('defaults allowedApps to an empty array when null/undefined', () => {
    expect(
      mapWorkspaceFromDb({ id: 'ws-2', name: 'B', allowed_apps: null, created_at: 'now' })
        .allowedApps,
    ).toEqual([]);
    expect(
      mapWorkspaceFromDb({ id: 'ws-3', name: 'C', created_at: 'now' }).allowedApps,
    ).toEqual([]);
  });
});

describe('mapMaterialFromDb', () => {
  it('maps material columns including nullable thickness', () => {
    expect(
      mapMaterialFromDb({
        id: 'm-1',
        workspace_id: 'ws-1',
        name: 'MDF 16mm',
        thickness: 16,
        unit: 'mm',
        created_at: 'now',
      }),
    ).toEqual({
      id: 'm-1',
      workspaceId: 'ws-1',
      name: 'MDF 16mm',
      thickness: 16,
      unit: 'mm',
      createdAt: 'now',
    });

    expect(
      mapMaterialFromDb({
        id: 'm-2',
        workspace_id: 'ws-1',
        name: 'Unknown',
        thickness: null,
        unit: 'mm',
        created_at: 'now',
      }).thickness,
    ).toBeNull();
  });
});

describe('mapLocationFromDb', () => {
  it('maps location columns', () => {
    expect(
      mapLocationFromDb({
        id: 'loc-1',
        workspace_id: 'ws-1',
        name: 'Shelf A',
        parent_id: 'loc-root',
        depth: 2,
      }),
    ).toEqual({
      id: 'loc-1',
      workspaceId: 'ws-1',
      name: 'Shelf A',
      parentId: 'loc-root',
      depth: 2,
    });
  });

  it('preserves a null parentId for root locations', () => {
    expect(
      mapLocationFromDb({
        id: 'loc-root',
        workspace_id: 'ws-1',
        name: 'Warehouse',
        parent_id: null,
        depth: 0,
      }).parentId,
    ).toBeNull();
  });
});

describe('mapAssetFromDb', () => {
  const base = {
    id: 'asset-1',
    workspace_id: 'ws-1',
    material_id: 'm-1',
    system_name: 'SHEET-0006',
    display_name: 'Big sheet',
    width: 1000,
    height: 500,
    asset_type: 'full_sheet',
    status: 'available',
    location_id: 'loc-1',
    source_asset_id: null,
    job_reference: 'JOB-1234',
    created_at: 'c',
    updated_at: 'u',
  };

  it('maps all scalar columns', () => {
    const result = mapAssetFromDb(base);
    expect(result).toMatchObject({
      id: 'asset-1',
      workspaceId: 'ws-1',
      materialId: 'm-1',
      systemName: 'SHEET-0006',
      displayName: 'Big sheet',
      width: 1000,
      height: 500,
      assetType: 'full_sheet',
      status: 'available',
      locationId: 'loc-1',
      sourceAssetId: null,
      jobReference: 'JOB-1234',
      createdAt: 'c',
      updatedAt: 'u',
    });
  });

  it('maps joined material and location when present', () => {
    const result = mapAssetFromDb({
      ...base,
      materials: { name: 'MDF 16mm', thickness: 16 },
      locations: { name: 'Shelf A' },
    });
    expect(result.material).toEqual({ name: 'MDF 16mm', thickness: 16 });
    expect(result.location).toEqual({ name: 'Shelf A' });
  });

  it('leaves joined fields undefined when the join is absent', () => {
    const result = mapAssetFromDb(base);
    expect(result.material).toBeUndefined();
    expect(result.location).toBeUndefined();
  });
});
