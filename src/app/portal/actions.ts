'use server'

import { createClient, createAdminClient } from '@/utils/supabase/server'
import crypto from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { PortalService } from '@/services/portal_service'
import type { SupabaseClient } from '@supabase/supabase-js'

const EmailSchema = z.string().email('Invalid email address')
const PasswordSchema = z.string().min(8, 'Password must be at least 8 characters')
const WorkspaceNameSchema = z.string().min(1, 'Workspace name cannot be empty').trim()
const AppSchema = z.enum(['kerfcut', 'kerfstock']).default('kerfcut')
const LicenseLabelSchema = z.string().trim().max(100, 'Machine label cannot exceed 100 characters')

/**
 * Authorization & MFA Guard
 * Rule 8.1: Service/Repository logic separation
 */
async function ensureAdminWithMFA(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: mfaData, error: mfaError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (mfaError || mfaData.currentLevel !== 'aal2') {
    throw new Error('MFA_REQUIRED: This action requires a verified Multi-Factor Authentication session.')
  }

  const result = await PortalService.getUserProfile(supabase, user.id);
  if (!result || result.profile.role !== 'admin') {
    throw new Error('Insufficient permissions: Admin only')
  }

  return { user, profile: result.profile, workspace: result.workspace }
}

export async function generateKey(formData: FormData) {
  try {
    const supabase = await createClient()
    const { user, profile, workspace } = await ensureAdminWithMFA(supabase)

    const allowedApps = workspace.allowedApps;
    const appResult = AppSchema.safeParse(formData.get('app'));
    if (!appResult.success) throw new Error('Invalid app type');
    const app = appResult.data;

    if (!allowedApps.includes(app)) {
      throw new Error(`Unauthorized: Workspace does not have access to ${app}`)
    }

    const prefix = app === 'kerfstock' ? 'KST-PRO' : 'KCT-PRO'
    const generateSegment = () => crypto.randomBytes(4).toString('hex').toUpperCase()
    const cdkey = `${prefix}-${generateSegment()}-${generateSegment()}`
    const cdkeyHash = crypto.createHash('sha256').update(cdkey).digest('hex')

    const license = await PortalService.generateLicense(supabase, {
      workspaceId: profile.workspaceId,
      app: app,
      cdkey: null, // SECURITY: Never store raw keys. Safe due to hash lookup in RPC.
      cdkeyHash: cdkeyHash,
      createdBy: user.id
    });

    await PortalService.logAction(supabase, {
      workspaceId: profile.workspaceId,
      actorId: user.id,
      actorEmail: profile.email,
      actionType: 'key_generated',
      targetId: license.id,
      description: `Generated ${app} key ending in ...${cdkey.slice(-4)}`
    })

    revalidatePath('/portal')
    return { key: cdkey, error: null, requiresMfa: false }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('MFA_REQUIRED')) {
      return {
        key: null,
        error: 'Verify MFA from Account Security before generating a key.',
        requiresMfa: true
      }
    }

    console.error('Error generating key:', error)
    return {
      key: null,
      error: 'Failed to generate the licence key. Please try again.',
      requiresMfa: false
    }
  }
}
export async function updateLicenseLabel(licenseId: string, label: string) {
  try {
    const supabase = await createClient()
    const labelResult = LicenseLabelSchema.safeParse(label)
    if (!labelResult.success) {
      return { error: labelResult.error.issues[0].message, success: false }
    }

    const { user, profile } = await ensureAdminWithMFA(supabase)
    await PortalService.updateLicenseLabel(supabase, licenseId, profile.workspaceId, labelResult.data);

    await PortalService.logAction(supabase, {
      workspaceId: profile.workspaceId,
      actorId: user.id,
      actorEmail: profile.email,
      actionType: 'label_updated',
      targetId: licenseId,
      description: `Updated machine label to: ${labelResult.data}`
    })

    revalidatePath('/portal')
    return { success: true }
  } catch (error: unknown) {
    console.error('Error updating label:', error)
    return { error: error instanceof Error ? error.message : 'Failed to update label', success: false }
  }
}

type InviteUserState = {
  error: string | null
  success: string | null
  inviteUrl: string | null
}

export async function inviteUser(
  prevState: InviteUserState | null,
  formData: FormData,
): Promise<InviteUserState> {
  try {
    const supabase = await createClient()
    const emailResult = EmailSchema.safeParse(formData.get('email'))
    if (!emailResult.success) {
      return { error: 'Enter a valid email address.', success: null, inviteUrl: null }
    }
    const email = emailResult.data.trim().toLowerCase()

    const { user, profile } = await ensureAdminWithMFA(supabase)

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .ilike('email', email)
      .eq('workspace_id', profile.workspaceId)
      .maybeSingle()

    if (existingUser) {
      return {
        error: `${email} is already in this workspace.`,
        success: null,
        inviteUrl: null,
      }
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: recentInvites } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('actor_id', user.id)
      .eq('action_type', 'workspace_invite_created')
      .gte('created_at', twentyFourHoursAgo)

    if (recentInvites && recentInvites >= 10) {
      return {
        error: 'Daily invitation limit reached. Try again tomorrow.',
        success: null,
        inviteUrl: null,
      }
    }

    const rawToken = crypto.randomBytes(32).toString('base64url')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const inviteId = await PortalService.createWorkspaceInvite(supabase, {
      email,
      tokenHash,
    })
    const siteUrl = new URL(
      process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    )
    const inviteUrl = new URL('/join', siteUrl)
    inviteUrl.searchParams.set('token', rawToken)

    await PortalService.logAction(supabase, {
      workspaceId: profile.workspaceId,
      actorId: user.id,
      actorEmail: profile.email,
      actionType: 'workspace_invite_created',
      targetId: inviteId,
      description: `Created a 7-day workspace invitation for ${email}`,
    })

    revalidatePath('/portal/users')
    return {
      error: null,
      success: `Invitation link created for ${email}.`,
      inviteUrl: inviteUrl.toString(),
    }
  } catch (error: unknown) {
    console.error('Error creating workspace invitation:', error)
    const message = error instanceof Error ? error.message : ''
    return {
      error: message.includes('MFA_REQUIRED')
        ? 'Verify MFA from Account Settings before inviting a member.'
        : 'The invitation link could not be created.',
      success: null,
      inviteUrl: null,
    }
  }
}

export async function removeUser(userId: string) {
  try {
    const supabase = await createClient()
    const { user: currentUser, profile: adminProfile } = await ensureAdminWithMFA(supabase)

    if (userId === currentUser.id) return { error: 'Cannot remove yourself', success: false }

    const { data: targetUser } = await supabase
      .from('users')
      .select('email, workspace_id, role')
      .eq('id', userId)
      .eq('workspace_id', adminProfile.workspaceId)
      .single()

    if (!targetUser) return { error: 'User not found in your workspace', success: false }

    if (targetUser.role === 'admin') {
      const adminCount = await PortalService.getAdminsCount(supabase, adminProfile.workspaceId);
      if (adminCount <= 1) {
        return { error: 'Cannot remove the last admin of the workspace', success: false }
      }
    }

    const adminClient = createAdminClient()
    const { error: authError } = await adminClient.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('Error deleting user from auth:', authError)
      return { error: 'Failed to delete user account', success: false }
    }

    await PortalService.logAction(supabase, {
      workspaceId: adminProfile.workspaceId,
      actorId: currentUser.id,
      actorEmail: adminProfile.email,
      actionType: 'user_removed',
      targetId: userId,
      description: `Removed user: ${targetUser?.email || userId}`
    })

    revalidatePath('/portal/users')
    return { success: true }
  } catch (error: unknown) {
    console.error('Error removing user:', error)
    return { error: error instanceof Error ? error.message : 'Failed to remove user', success: false }
  }
}

export async function revokeKey(keyId: string) {
  try {
    const supabase = await createClient()
    const { user, profile } = await ensureAdminWithMFA(supabase)

    const keyInfo = await PortalService.revokeLicense(supabase, keyId, profile.workspaceId);

    await PortalService.logAction(supabase, {
      workspaceId: profile.workspaceId,
      actorId: user.id,
      actorEmail: profile.email,
      actionType: 'key_revoked',
      targetId: keyId,
      description: `Revoked key: ${keyInfo?.cdkey ? '...' + keyInfo.cdkey.slice(-4) : 'REDACTED'}`
    })

    revalidatePath('/portal')
    return { success: true }
  } catch (error: unknown) {
    console.error('Error revoking key:', error)
    return { error: error instanceof Error ? error.message : 'Failed to revoke key', success: false }
  }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function updatePassword(prevState: { error: string | null, success: string | null } | null, formData: FormData) {
  const supabase = await createClient()
  const passwordResult = PasswordSchema.safeParse(formData.get('password'))
  if (!passwordResult.success) {
    return { error: 'Password must be at least 8 characters', success: null }
  }
  const password = passwordResult.data
  const confirmPassword = formData.get('confirmPassword') as string

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match', success: null }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    console.error('Error updating password:', error)
    return { error: error.message, success: null }
  }

  revalidatePath('/portal/account')
  return { error: null, success: 'Password updated successfully' }
}

export async function updateWorkspaceName(prevState: { error: string | null, success: string | null } | null, formData: FormData) {
  const supabase = await createClient()
  const nameResult = WorkspaceNameSchema.safeParse(formData.get('name'))
  if (!nameResult.success) {
    return { error: 'Workspace name cannot be empty', success: null }
  }
  const name = nameResult.data

  const { user, profile } = await ensureAdminWithMFA(supabase)

  await PortalService.updateWorkspaceName(supabase, profile.workspaceId, name.trim());

  await PortalService.logAction(supabase, {
    workspaceId: profile.workspaceId,
    actorId: user.id,
    actorEmail: profile.email,
    actionType: 'workspace_renamed',
    description: `Renamed workspace to: ${name.trim()}`
  })

  revalidatePath('/portal', 'layout')
  return { error: null, success: 'Workspace name updated successfully' }
}

export async function changeUserRole(userId: string, newRole: 'admin' | 'member') {
  const supabase = await createClient()
  const { user, profile: adminProfile } = await ensureAdminWithMFA(supabase)

  if (userId === user.id) throw new Error('Cannot change your own role')

  const { data: targetUser } = await supabase
    .from('users')
    .select('email, role')
    .eq('id', userId)
    .eq('workspace_id', adminProfile.workspaceId)
    .single()

  if (!targetUser) return { error: 'User not found in your workspace' }

  if (newRole === 'member' && targetUser.role === 'admin') {
    const adminCount = await PortalService.getAdminsCount(supabase, adminProfile.workspaceId);
    if (adminCount <= 1) {
      return { error: 'Cannot demote the last admin of the workspace' }
    }
  }

  await PortalService.changeUserRole(supabase, userId, newRole);

  await PortalService.logAction(supabase, {
    workspaceId: adminProfile.workspaceId,
    actorId: user.id,
    actorEmail: adminProfile.email,
    actionType: 'role_changed',
    targetId: userId,
    description: `Changed role of ${targetUser.email} to ${newRole}`
  })

  revalidatePath('/portal/users')
}

