import { readFileSync } from 'node:fs'
import path from 'node:path'

const migration = readFileSync(
  path.join(
    process.cwd(),
    'supabase',
    'migrations',
    '202607280000_workspace_invite_links.sql',
  ),
  'utf8',
)

describe('workspace invitation migration', () => {
  it('stores a hash instead of a reusable invitation token', () => {
    expect(migration).toContain('token_hash TEXT NOT NULL UNIQUE')
    expect(migration).toContain("public.digest(p_token, 'sha256')")
    expect(migration).not.toMatch(/\btoken\s+TEXT\s+NOT\s+NULL/i)
  })

  it('requires a verified matching email before moving a user', () => {
    expect(migration).toContain('email_confirmed_at')
    expect(migration).toContain('INVITATION_EMAIL_MISMATCH')
    expect(migration).toContain('VERIFIED_EMAIL_REQUIRED')
  })

  it('only moves an untouched personal workspace', () => {
    expect(migration).toContain('EXISTING_WORKSPACE_CANNOT_BE_REPLACED')
    expect(migration).toContain(
      'member.workspace_id = v_current_workspace_id',
    )
    expect(migration).toContain(
      'slot.workspace_id = v_current_workspace_id',
    )
  })

  it('only creates invitations through the MFA-protected RPC', () => {
    expect(migration).toContain(
      'GRANT SELECT, DELETE ON public.workspace_invites TO authenticated;',
    )
    expect(migration).not.toContain(
      'GRANT SELECT, INSERT, DELETE ON public.workspace_invites TO authenticated;',
    )
    expect(migration).toContain(
      'CREATE FUNCTION public.create_workspace_invite(',
    )
    expect(migration).toContain("auth.jwt()->>'aal'")
    expect(migration).toContain(
      'DELETE FROM public.workspace_invites AS old_invite',
    )
    expect(migration).toContain(
      'GRANT EXECUTE ON FUNCTION public.create_workspace_invite(TEXT, TEXT) TO authenticated;',
    )
    expect(migration).toContain(
      'GRANT EXECUTE ON FUNCTION public.claim_workspace_invite(TEXT) TO authenticated;',
    )
  })
})
