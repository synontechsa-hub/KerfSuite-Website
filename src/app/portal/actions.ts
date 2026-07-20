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

  revalidatePath('/')
  return cdkey
}

export async function updateLicenseLabel(licenseId: string, label: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized', success: false }

    const result = await PortalService.getUserProfile(supabase, user.id);
    if (!result) return { error: 'User data not found', success: false }

    await PortalService.updateLicenseLabel(supabase, licenseId, result.profile.workspaceId, label);

    await PortalService.logAction(supabase, {
      workspaceId: result.profile.workspaceId,
      actorId: user.id,
      actorEmail: result.profile.email,
      actionType: 'label_updated',
      targetId: licenseId,
      description: `Updated machine label to: ${label}`
    })

    revalidatePath('/')
    return { success: true }
  } catch (error: unknown) {
    console.error('Error updating label:', error)
    return { error: error instanceof Error ? error.message : 'Failed to update label', success: false }
  }
}

export async function inviteUser(prevState: any, formData: FormData) {
  const supabase = await createClient()
  const emailResult = EmailSchema.safeParse(formData.get('email'))
  if (!emailResult.success) {
    return { error: 'Invalid email address', success: null }
  }
  const email = emailResult.data

  const { user, profile } = await ensureAdminWithMFA(supabase)

  // Check if user is already in the workspace
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .eq('workspace_id', profile.workspaceId)
    .maybeSingle()

  if (existingUser) {
    return { error: `User ${email} is already in the workspace`, success: null }
  }

  // Rate limiting check
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count: recentInvites } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('actor_id', user.id)
    .eq('action_type', 'user_invited')
    .gte('created_at', twentyFourHoursAgo)
  
  if (recentInvites && recentInvites >= 10) {
    return { error: 'Daily invitation limit reached', success: null }
  }

  const adminClient = createAdminClient()
  const redirectUrl = new URL('/auth/callback', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').toString()
  const { data: inviteData, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { workspace_id: profile.workspaceId },
    redirectTo: redirectUrl
  })

  if (error) {
    console.error('Error inviting user:', error)
    return { error: error.message, success: null }
  }

  await PortalService.logAction(supabase, {
    workspaceId: profile.workspaceId,
    actorId: user.id,
    actorEmail: profile.email,
    actionType: 'user_invited',
    targetId: inviteData.user.id,
    description: `Invited user: ${email}`
  })

  revalidatePath('/users')
  return { error: null, success: `Invitation sent to ${email}` }
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
      const adminCount = await PortalService.getUsersCount(supabase, adminProfile.workspaceId);
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

    revalidatePath('/users')
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

    revalidatePath('/')
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

export async function updatePassword(prevState: any, formData: FormData) {
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

  revalidatePath('/account')
  return { error: null, success: 'Password updated successfully' }
}

export async function updateWorkspaceName(prevState: any, formData: FormData) {
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

  revalidatePath('/', 'layout')
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
    const adminCount = await PortalService.getUsersCount(supabase, adminProfile.workspaceId);
    if (adminCount <= 1) {
      return { error: 'Cannot demote the last admin of the workspace' }
    }
  }

  await PortalService.changeUserRole(supabase, userId, adminProfile.workspaceId, newRole);

  await PortalService.logAction(supabase, {
    workspaceId: adminProfile.workspaceId,
    actorId: user.id,
    actorEmail: adminProfile.email,
    actionType: 'role_changed',
    targetId: userId,
    description: `Changed role of ${targetUser.email} to ${newRole}`
  })

  revalidatePath('/users')
}

