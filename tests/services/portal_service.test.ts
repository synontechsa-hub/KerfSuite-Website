/**
 * Unit tests for src/services/portal_service.ts.
 * The Supabase client is mocked so the data-access logic (mapping, error
 * handling, default values) can be exercised without a database.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { PortalService } from '@/services/portal_service';
import { createMockSupabase, QueryResult } from '../helpers/mockSupabase';

function client(...results: QueryResult[]): SupabaseClient {
  return createMockSupabase(results) as unknown as SupabaseClient;
}

describe('PortalService.getUserProfile', () => {
  it('returns mapped profile and workspace on success', async () => {
    const supabase = client({
      data: {
        id: 'u-1',
        email: 'a@b.com',
        role: 'admin',
        workspace_id: 'ws-1',
        created_at: 'now',
        confirmed: true,
        workspaces: { id: 'ws-1', name: 'Acme', allowed_apps: ['kerfcut'], created_at: 'now' },
      },
    });

    const result = await PortalService.getUserProfile(supabase, 'u-1');
    expect(result).not.toBeNull();
    expect(result!.profile.email).toBe('a@b.com');
    expect(result!.workspace.name).toBe('Acme');
    expect(result!.workspace.allowedApps).toEqual(['kerfcut']);
  });

  it('returns null on error', async () => {
    const supabase = client({ error: { message: 'boom' }, data: null });
    expect(await PortalService.getUserProfile(supabase, 'u-1')).toBeNull();
  });

  it('returns null when no data is found', async () => {
    const supabase = client({ data: null });
    expect(await PortalService.getUserProfile(supabase, 'missing')).toBeNull();
  });
});

describe('PortalService.getLicenses', () => {
  it('maps each returned license row', async () => {
    const supabase = client({
      data: [
        { id: 'l-1', cdkey: 'k1', app: 'kerfcut', is_flagged: false, abuse_score: 0 },
        { id: 'l-2', cdkey: 'k2', app: 'kerfstock', is_flagged: true, abuse_score: 2 },
      ],
    });
    const licenses = await PortalService.getLicenses(supabase, 'ws-1');
    expect(licenses).toHaveLength(2);
    expect(licenses[0].id).toBe('l-1');
    expect(licenses[1].isFlagged).toBe(true);
  });

  it('returns an empty array when data is null', async () => {
    const supabase = client({ data: null });
    expect(await PortalService.getLicenses(supabase, 'ws-1')).toEqual([]);
  });
});

describe('PortalService.getAuditLogs', () => {
  it('maps audit log rows', async () => {
    const supabase = client({
      data: [{ id: 'log-1', workspace_id: 'ws-1', action_type: 'x', description: 'd' }],
    });
    const logs = await PortalService.getAuditLogs(supabase, 'ws-1', 5);
    expect(logs).toHaveLength(1);
    expect(logs[0].actionType).toBe('x');
  });

  it('returns an empty array when data is null', async () => {
    expect(await PortalService.getAuditLogs(client({ data: null }), 'ws-1')).toEqual([]);
  });
});

describe('PortalService.getUsersCount', () => {
  it('returns the count', async () => {
    expect(await PortalService.getUsersCount(client({ count: 7 }), 'ws-1')).toBe(7);
  });

  it('returns 0 when count is null', async () => {
    expect(await PortalService.getUsersCount(client({ count: null }), 'ws-1')).toBe(0);
  });
});

describe('PortalService.getAdminsCount', () => {
  it('returns the administrator count', async () => {
    expect(await PortalService.getAdminsCount(client({ count: 2 }), 'ws-1')).toBe(2);
  });

  it('returns 0 when the administrator count is null', async () => {
    expect(await PortalService.getAdminsCount(client({ count: null }), 'ws-1')).toBe(0);
  });

  it('throws a DB_ERROR when the count query fails', async () => {
    await expect(
      PortalService.getAdminsCount(client({ error: { message: 'denied' } }), 'ws-1'),
    ).rejects.toThrow('DB_ERROR: denied');
  });
});

describe('PortalService.getWorkspaceUsers', () => {
  it('maps rpc results', async () => {
    const supabase = client({
      data: [{ id: 'u-1', email: 'a@b.com', role: 'member', workspace_id: 'ws-1', created_at: 'now' }],
    });
    const users = await PortalService.getWorkspaceUsers(supabase, 'ws-1');
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('a@b.com');
  });

  it('returns an empty array and logs on rpc error', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const supabase = client({ error: { message: 'rpc failed' }, data: null });
    expect(await PortalService.getWorkspaceUsers(supabase, 'ws-1')).toEqual([]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('PortalService.logAction', () => {
  it('logs an error but does not throw when the insert fails', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const supabase = client({ error: { message: 'insert failed' } });
    await expect(
      PortalService.logAction(supabase, {
        workspaceId: 'ws-1',
        actorId: 'u-1',
        actorEmail: 'a@b.com',
        actionType: 'x',
        description: 'd',
      }),
    ).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledWith('Failed to log action:', { message: 'insert failed' });
    spy.mockRestore();
  });

  it('succeeds silently when there is no error', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await PortalService.logAction(client({ error: null }), {
      workspaceId: 'ws-1',
      actorId: 'u-1',
      actorEmail: 'a@b.com',
      actionType: 'x',
      targetId: 't-1',
      description: 'd',
    });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('PortalService.generateLicense', () => {
  it('returns the mapped inserted license', async () => {
    const supabase = client({
      data: { id: 'l-9', cdkey: null, app: 'kerfcut', status: 'waiting', is_flagged: false, abuse_score: 0 },
    });
    const license = await PortalService.generateLicense(supabase, {
      workspaceId: 'ws-1',
      app: 'kerfcut',
      cdkey: null,
      cdkeyHash: 'hash',
      createdBy: 'u-1',
    });
    expect(license.id).toBe('l-9');
    expect(license.status).toBe('waiting');
  });

  it('throws a DB_ERROR when the insert fails', async () => {
    const supabase = client({ error: { message: 'constraint' }, data: null });
    await expect(
      PortalService.generateLicense(supabase, {
        workspaceId: 'ws-1',
        app: 'kerfcut',
        cdkey: null,
        cdkeyHash: 'hash',
        createdBy: 'u-1',
      }),
    ).rejects.toThrow('DB_ERROR: constraint');
  });
});

describe('PortalService.updateLicenseLabel', () => {
  it('resolves when the update succeeds', async () => {
    await expect(
      PortalService.updateLicenseLabel(client({ error: null }), 'l-1', 'ws-1', 'New label'),
    ).resolves.toBeUndefined();
  });

  it('throws a DB_ERROR when the update fails', async () => {
    await expect(
      PortalService.updateLicenseLabel(client({ error: { message: 'nope' } }), 'l-1', 'ws-1', 'x'),
    ).rejects.toThrow('DB_ERROR: nope');
  });
});

describe('PortalService.revokeLicense', () => {
  it('fetches the current key then revokes and returns the mapped license', async () => {
    const supabase = client(
      { data: { cdkey: 'KCT-PRO-A1B2-C3D4' } },
      { error: null },
    );
    const result = await PortalService.revokeLicense(supabase, 'l-1', 'ws-1');
    expect(result!.cdkey).toBe('KCT-PRO-A1B2-C3D4');
  });

  it('returns null when the license was not found', async () => {
    const supabase = client({ data: null }, { error: null });
    expect(await PortalService.revokeLicense(supabase, 'l-1', 'ws-1')).toBeNull();
  });

  it('throws a DB_ERROR when the revoke update fails', async () => {
    const supabase = client({ data: { cdkey: 'x' } }, { error: { message: 'locked' } });
    await expect(PortalService.revokeLicense(supabase, 'l-1', 'ws-1')).rejects.toThrow(
      'DB_ERROR: locked',
    );
  });
});

describe('PortalService.updateWorkspaceName', () => {
  it('resolves on success', async () => {
    await expect(
      PortalService.updateWorkspaceName(client({ error: null }), 'ws-1', 'Renamed'),
    ).resolves.toBeUndefined();
  });

  it('throws a DB_ERROR on failure', async () => {
    await expect(
      PortalService.updateWorkspaceName(client({ error: { message: 'bad' } }), 'ws-1', 'x'),
    ).rejects.toThrow('DB_ERROR: bad');
  });
});

describe('PortalService.changeUserRole', () => {
  it('resolves on success', async () => {
    await expect(
      PortalService.changeUserRole(client({ error: null }), 'u-1', 'admin'),
    ).resolves.toBeUndefined();
  });

  it('throws a DB_ERROR on failure', async () => {
    await expect(
      PortalService.changeUserRole(client({ error: { message: 'denied' } }), 'u-1', 'admin'),
    ).rejects.toThrow('DB_ERROR: denied');
  });
});

describe('PortalService.getAssets', () => {
  it('maps assets including joined material/location', async () => {
    const supabase = client({
      data: [
        {
          id: 'a-1',
          workspace_id: 'ws-1',
          material_id: 'm-1',
          system_name: 'SHEET-0001',
          asset_type: 'full_sheet',
          status: 'available',
          width: 1,
          height: 1,
          materials: { name: 'MDF', thickness: 16 },
          locations: { name: 'Shelf A' },
        },
      ],
    });
    const assets = await PortalService.getAssets(supabase, 'ws-1');
    expect(assets[0].systemName).toBe('SHEET-0001');
    expect(assets[0].material).toEqual({ name: 'MDF', thickness: 16 });
  });

  it('returns an empty array when data is null', async () => {
    expect(await PortalService.getAssets(client({ data: null }), 'ws-1')).toEqual([]);
  });
});

describe('PortalService.getMaterials', () => {
  it('maps materials', async () => {
    const supabase = client({
      data: [{ id: 'm-1', workspace_id: 'ws-1', name: 'MDF', thickness: 16, unit: 'mm', created_at: 'now' }],
    });
    const materials = await PortalService.getMaterials(supabase, 'ws-1');
    expect(materials[0].name).toBe('MDF');
  });

  it('returns an empty array when data is null', async () => {
    expect(await PortalService.getMaterials(client({ data: null }), 'ws-1')).toEqual([]);
  });
});

describe('PortalService.getLocations', () => {
  it('maps locations', async () => {
    const supabase = client({
      data: [{ id: 'loc-1', workspace_id: 'ws-1', name: 'Shelf A', parent_id: null, depth: 0 }],
    });
    const locations = await PortalService.getLocations(supabase, 'ws-1');
    expect(locations[0].name).toBe('Shelf A');
  });

  it('returns an empty array when data is null', async () => {
    expect(await PortalService.getLocations(client({ data: null }), 'ws-1')).toEqual([]);
  });
});
