import { readFileSync } from 'node:fs';
import path from 'node:path';

const migrationPath = path.join(
  process.cwd(),
  'supabase',
  'migrations',
  '202607270001_security_baseline.sql',
);
const initialSchemaPath = path.join(
  process.cwd(),
  'supabase',
  'migrations',
  '202607270000_initial_schema.sql',
);

const migration = readFileSync(migrationPath, 'utf8');
const initialSchema = readFileSync(initialSchemaPath, 'utf8');

describe('database security migration', () => {
  it('does not grant privileged RPC execution to anon', () => {
    expect(migration).not.toMatch(/GRANT\s+EXECUTE[\s\S]*?TO\s+anon\s*;/i);
  });

  it('restricts desktop RPCs to the service role', () => {
    expect(migration).toContain(
      'GRANT EXECUTE ON FUNCTION public.verify_license(TEXT, TEXT) TO service_role;',
    );
    expect(migration).toContain(
      'GRANT EXECUTE ON FUNCTION public.bind_machine(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;',
    );
    expect(migration).toContain(
      'GRANT EXECUTE ON FUNCTION public.commit_kerfcut_job(UUID, TEXT, UUID[], JSONB) TO service_role;',
    );
  });

  it('enforces cross-workspace asset relationships', () => {
    expect(migration).toContain('assets_workspace_material_fkey');
    expect(migration).toContain('assets_workspace_location_fkey');
    expect(migration).toContain('assets_workspace_source_fkey');
    expect(migration).toContain('asset_events_workspace_asset_fkey');
  });

  it('uses a concurrency-safe asset counter and unique system names', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.asset_counters');
    expect(migration).toContain('assets_workspace_system_name_key');
    expect(migration).toContain('ON CONFLICT (workspace_id, asset_type) DO UPDATE');
  });

  it('protects the final workspace administrator in the database', () => {
    expect(migration).toContain('public.prevent_last_workspace_admin()');
    expect(migration).toContain('CREATE TRIGGER protect_last_workspace_admin');
    expect(migration).toContain("RAISE EXCEPTION 'LAST_ADMIN'");
  });

  it('does not trust signup metadata for workspace or role assignment', () => {
    const start = migration.indexOf('CREATE OR REPLACE FUNCTION public.handle_new_user()');
    const end = migration.indexOf('-- ---------------------------------------------------------------------------', start);
    const functionBody = migration.slice(start, end);

    expect(functionBody).not.toContain("raw_user_meta_data->>'workspace_id'");
    expect(functionBody).not.toContain("raw_user_meta_data->>'role'");
    expect(functionBody).toContain("VALUES (new.id, v_workspace_id, new.email, 'admin')");
  });

  it('uses a 90-day beta trial window', () => {
    expect(migration).toContain('90 - FLOOR');
  });

  it('requires an application when verifying and binding licenses', () => {
    expect(migration).toContain('CREATE FUNCTION public.verify_license(p_cdkey TEXT, p_app TEXT)');
    expect(migration).toContain('AND l.app = p_app');
    expect(migration).toContain('p_app TEXT,');
  });

  it('removes the legacy permission block from the initial migration', () => {
    expect(initialSchema).not.toMatch(/GRANT\s+EXECUTE[\s\S]*?TO\s+anon\s*;/i);
    expect(initialSchema).toContain(
      'Privileges are intentionally defined by the following security migration.',
    );
  });
});
