import { readFileSync } from 'node:fs'
import path from 'node:path'

const migration = readFileSync(
  path.join(process.cwd(), 'supabase', 'migrations', '202607290400_kerfcut_stock_integration.sql'),
  'utf8',
)
const availableRoute = readFileSync(
  path.join(process.cwd(), 'src', 'app', 'api', 'stock', 'kerfcut', 'available', 'route.ts'),
  'utf8',
)
const commitRoute = readFileSync(
  path.join(process.cwd(), 'src', 'app', 'api', 'stock', 'kerfcut', 'commit', 'route.ts'),
  'utf8',
)

describe('KerfCut quantity-aware stock integration', () => {
  it('returns batch quantities and stock metadata', () => {
    expect(availableRoute).toContain('quantity')
    expect(availableRoute).toContain('job_reference')
    expect(availableRoute).toContain('materials(name, thickness, unit)')
    expect(availableRoute).toContain(".gt('quantity', 0)")
  })

  it('accepts an explicit quantity and idempotency token', () => {
    expect(commitRoute).toContain('commit_token: z.string().uuid()')
    expect(commitRoute).toContain('quantity: z.number().int().positive()')
    expect(commitRoute).toContain("rpc('commit_kerfcut_stock_job'")
  })

  it('uses an additive idempotency ledger restricted from desktop roles', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.kerfcut_stock_commits')
    expect(migration).toContain('UNIQUE (workspace_id, commit_token)')
    expect(migration).toContain('ENABLE ROW LEVEL SECURITY')
    expect(migration).toContain('REVOKE ALL ON TABLE public.kerfcut_stock_commits FROM PUBLIC, anon, authenticated;')
  })

  it('locks batches and rejects insufficient or cross-job stock', () => {
    expect(migration).toContain('FOR UPDATE OF asset')
    expect(migration).toContain('v_asset.quantity < v_quantity')
    expect(migration).toContain("v_asset.status <> 'available'")
    expect(migration).toContain('v_asset.job_reference IS NOT NULL')
  })

  it('grants the new transaction only to the service role', () => {
    expect(migration).toContain('TO service_role;')
    expect(migration).not.toMatch(/GRANT EXECUTE[\s\S]*TO (anon|authenticated);/)
  })
})
