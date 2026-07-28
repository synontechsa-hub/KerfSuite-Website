import { readFileSync } from 'node:fs'
import path from 'node:path'

const migration = readFileSync(
  path.join(
    process.cwd(),
    'supabase',
    'migrations',
    '202607280001_remove_legacy_recursive_user_policies.sql',
  ),
  'utf8',
)

describe('users policy cleanup migration', () => {
  it('removes the recursive legacy workspace policy', () => {
    expect(migration).toContain(
      'DROP POLICY IF EXISTS "Users see workspace peers" ON public.users;',
    )
  })

  it('keeps one helper-backed authenticated users policy', () => {
    expect(migration).toContain(
      'CREATE POLICY "Users view workspace peers"',
    )
    expect(migration).toContain('TO authenticated')
    expect(migration).toContain(
      'USING (workspace_id = public.get_user_workspace());',
    )
    expect(migration).not.toMatch(/SELECT\s+users_?\d*\.workspace_id/i)
  })
})