'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'

const InviteTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/)

function buildJoinPath(token: string, message?: string) {
  const params = new URLSearchParams({ token })
  if (message) params.set('message', message)
  return `/join?${params.toString()}`
}

function getClaimErrorMessage(message: string) {
  if (message.includes('INVITATION_EMAIL_MISMATCH')) {
    return 'This invitation belongs to a different email address. Sign in with the invited Google account.'
  }
  if (message.includes('EXISTING_WORKSPACE_CANNOT_BE_REPLACED')) {
    return 'This account already contains workspace data and cannot be moved automatically.'
  }
  if (message.includes('VERIFIED_EMAIL_REQUIRED')) {
    return 'A verified email address is required to accept this invitation.'
  }
  return 'This invitation is invalid, expired, or has already been used.'
}

export async function claimWorkspaceInvite(formData: FormData) {
  const tokenResult = InviteTokenSchema.safeParse(formData.get('token'))
  if (!tokenResult.success) {
    redirect('/join?message=This invitation link is invalid.')
  }

  const token = tokenResult.data
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(buildJoinPath(token, 'Sign in before accepting this invitation.'))
  }

  const { data, error } = await supabase.rpc('claim_workspace_invite', {
    p_token: token,
  })

  if (error || !data?.length) {
    console.error('Workspace invitation claim failed:', error?.message)
    redirect(buildJoinPath(token, getClaimErrorMessage(error?.message || '')))
  }

  revalidatePath('/portal', 'layout')
  revalidatePath('/portal/users')
  const workspaceName = data[0].workspace_name || 'the workspace'
  redirect(`/portal/users?message=${encodeURIComponent(`Welcome to ${workspaceName}.`)}`)
}

export async function signOutForInvite(formData: FormData) {
  const tokenResult = InviteTokenSchema.safeParse(formData.get('token'))
  const supabase = await createClient()
  await supabase.auth.signOut()

  redirect(
    tokenResult.success
      ? buildJoinPath(tokenResult.data)
      : '/join?message=This invitation link is invalid.',
  )
}
