import { readFileSync } from 'node:fs'
import path from 'node:path'

const migration = readFileSync(path.join(process.cwd(), 'supabase', 'migrations', '202608040000_device_authorization.sql'), 'utf8')

describe('device authorization migration security', () => {
  it('stores only hashes and denies direct desktop-table access', () => {
    expect(migration).toContain('device_code_hash TEXT NOT NULL UNIQUE')
    expect(migration).toContain('user_code_hash TEXT NOT NULL UNIQUE')
    expect(migration).toContain('ENABLE ROW LEVEL SECURITY')
    expect(migration).toContain('REVOKE ALL ON TABLE public.desktop_authorization_requests FROM PUBLIC, anon, authenticated;')
  })

  it('makes authorization consumption single-use and service-only', () => {
    expect(migration).toContain("status = 'consumed'")
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.consume_desktop_authorization(TEXT) TO service_role;')
    expect(migration).not.toMatch(/GRANT\s+EXECUTE[\s\S]*consume_desktop_authorization[\s\S]*TO\s+anon/i)
  })
})
