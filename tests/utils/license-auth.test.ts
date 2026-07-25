/**
 * @jest-environment node
 *
 * Unit tests for src/utils/license-auth.ts validateLicenseRequest.
 * The admin Supabase client is mocked so the header validation, license
 * state checks and IP-based abuse detection logic can be exercised.
 */
import crypto from 'crypto';

const createAdminClient = jest.fn();

jest.mock('@/utils/supabase/server', () => ({
  createAdminClient: () => createAdminClient(),
}));

// Imported after the mock is registered.
import { validateLicenseRequest } from '@/utils/license-auth';

type Slot = Record<string, unknown> | null;

type AdminSpies = {
  admin: { from: jest.Mock };
  auditInsert: jest.Mock;
  update: jest.Mock;
  eqHash: jest.Mock;
  eqWorkspace: jest.Mock;
};

function makeAdmin(slot: Slot, slotError: unknown = null): AdminSpies {
  const auditInsert = jest.fn(() => Promise.resolve({ error: null }));
  const update = jest.fn(() => ({
    eq: jest.fn(() => ({
      then: (resolve: (v: { error: unknown }) => unknown) =>
        Promise.resolve({ error: null }).then(resolve),
    })),
  }));

  // Stable spies for the select chain so filters can be asserted.
  const single = jest.fn(() => Promise.resolve({ data: slot, error: slotError }));
  const eqWorkspace = jest.fn(() => ({ single }));
  const eqHash = jest.fn(() => ({ eq: eqWorkspace }));
  const select = jest.fn(() => ({ eq: eqHash }));

  const admin = {
    from: jest.fn((table: string) => {
      if (table === 'audit_logs') {
        return { insert: auditInsert };
      }
      // license_slots supports both the select chain and the update chain.
      return { select, update };
    }),
  };

  return { admin, auditInsert, update, eqHash, eqWorkspace };
}

function makeRequest(headers: Record<string, string>): Request {
  return new Request('https://api.test/verify', { headers });
}

const validHeaders = {
  'x-license-key': 'KCT-PRO-A1B2-C3D4',
  'x-machine-id': 'machine-1',
  'x-workspace-id': 'ws-1',
  'x-app-version': '1.0.0',
  'x-os-info': 'Windows 11',
  'x-forwarded-for': '10.0.0.1, 10.0.0.2',
};

function activeSlot(overrides: Record<string, unknown> = {}) {
  return {
    id: 'slot-1',
    status: 'active',
    bound_machine_id: 'machine-1',
    workspace_id: 'ws-1',
    last_ip: '10.0.0.1',
    abuse_score: 0,
    is_flagged: false,
    app: 'kerfcut',
    ...overrides,
  };
}

beforeEach(() => {
  createAdminClient.mockReset();
});

describe('validateLicenseRequest header validation', () => {
  it.each([
    ['x-license-key'],
    ['x-machine-id'],
    ['x-workspace-id'],
  ])('returns 401 when %s is missing', async (missing) => {
    const headers = { ...validHeaders } as Record<string, string>;
    delete headers[missing];
    const result = await validateLicenseRequest(makeRequest(headers));
    expect(result).toEqual({ error: 'Missing license headers', status: 401 });
    expect(createAdminClient).not.toHaveBeenCalled();
  });
});

describe('validateLicenseRequest license lookup', () => {
  it('returns 403 when the license/workspace is not found', async () => {
    const { admin } = makeAdmin(null, { message: 'not found' });
    createAdminClient.mockReturnValue(admin);
    const result = await validateLicenseRequest(makeRequest(validHeaders));
    expect(result).toEqual({ error: 'Invalid license or workspace', status: 403 });
  });

  it('returns 403 when the license is not active', async () => {
    const { admin } = makeAdmin(activeSlot({ status: 'revoked' }));
    createAdminClient.mockReturnValue(admin);
    const result = await validateLicenseRequest(makeRequest(validHeaders));
    expect(result).toEqual({ error: 'License status is revoked', status: 403 });
  });

  it('returns 403 when bound to another machine', async () => {
    const { admin } = makeAdmin(activeSlot({ bound_machine_id: 'other-machine' }));
    createAdminClient.mockReturnValue(admin);
    const result = await validateLicenseRequest(makeRequest(validHeaders));
    expect(result).toEqual({ error: 'License bound to another machine', status: 403 });
  });

  it('returns 403 when the license app does not match the expected app', async () => {
    const { admin } = makeAdmin(activeSlot({ app: 'kerfstock' }));
    createAdminClient.mockReturnValue(admin);
    const result = await validateLicenseRequest(makeRequest(validHeaders), 'kerfcut');
    expect(result).toEqual({ error: 'License not valid for kerfcut', status: 403 });
  });
});

describe('validateLicenseRequest success + telemetry', () => {
  it('hashes the incoming key with sha256 to look up the slot', async () => {
    const { admin, eqHash, eqWorkspace } = makeAdmin(activeSlot());
    createAdminClient.mockReturnValue(admin);
    await validateLicenseRequest(makeRequest(validHeaders), 'kerfcut');

    const expectedHash = crypto
      .createHash('sha256')
      .update(validHeaders['x-license-key'])
      .digest('hex');
    expect(eqHash).toHaveBeenCalledWith('cdkey_hash', expectedHash);
    expect(eqWorkspace).toHaveBeenCalledWith('workspace_id', 'ws-1');
  });

  it('returns success and records telemetry for a valid request', async () => {
    const { admin, update } = makeAdmin(activeSlot());
    createAdminClient.mockReturnValue(admin);
    const result = await validateLicenseRequest(makeRequest(validHeaders), 'kerfcut');
    // is_flagged is false and the IP is unchanged, so isFlagged resolves to
    // `false || undefined` in the source.
    expect(result).toEqual({ success: true, workspaceId: 'ws-1', isFlagged: undefined });
    expect(update).toHaveBeenCalledTimes(1);
    const payload = update.mock.calls[0][0];
    expect(payload.last_ip).toBe('10.0.0.1');
    expect(payload.app_version).toBe('1.0.0');
  });

  it('increments abuse_score when the IP shifts', async () => {
    const { admin, update, auditInsert } = makeAdmin(
      activeSlot({ last_ip: '9.9.9.9', abuse_score: 1 }),
    );
    createAdminClient.mockReturnValue(admin);
    await validateLicenseRequest(makeRequest(validHeaders));
    expect(update.mock.calls[0][0].abuse_score).toBe(2);
    expect(auditInsert).not.toHaveBeenCalled();
  });

  it('auto-flags and logs a security event once abuse_score reaches 5', async () => {
    const { admin, update, auditInsert } = makeAdmin(
      activeSlot({ last_ip: '9.9.9.9', abuse_score: 4, is_flagged: false }),
    );
    createAdminClient.mockReturnValue(admin);
    const result = await validateLicenseRequest(makeRequest(validHeaders));

    expect(update.mock.calls[0][0].is_flagged).toBe(true);
    expect(update.mock.calls[0][0].abuse_score).toBe(5);
    expect(auditInsert).toHaveBeenCalledTimes(1);
    const logged = auditInsert.mock.calls[0][0];
    expect(logged.action_type).toBe('potential_abuse_flagged');
    // The key must be masked to its last 4 characters in the audit log.
    expect(logged.description).toContain('...C3D4');
    expect(logged.description).not.toContain('A1B2');
    expect(result).toEqual({ success: true, workspaceId: 'ws-1', isFlagged: true });
  });

  it('defaults the IP to 127.0.0.1 when x-forwarded-for is absent', async () => {
    const headers = { ...validHeaders } as Record<string, string>;
    delete headers['x-forwarded-for'];
    const { admin, update } = makeAdmin(activeSlot({ last_ip: null }));
    createAdminClient.mockReturnValue(admin);
    await validateLicenseRequest(makeRequest(headers));
    expect(update.mock.calls[0][0].last_ip).toBe('127.0.0.1');
  });
});
