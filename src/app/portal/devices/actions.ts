'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { createAdminClient, createClient } from '@/utils/supabase/server'
import { hashAuthorizationCode, normalizeUserCode, readDeviceAuthorizationConfiguration } from '@/utils/entitlements/device-authorization'

const FormSchema = z.object({ user_code: z.string().min(16).max(32), license_slot_id: z.string().uuid() })

export async function approveDeviceAuthorization(formData: FormData) {
  const parsed = FormSchema.safeParse({ user_code: formData.get('user_code'), license_slot_id: formData.get('license_slot_id') })
  if (!parsed.success) redirect('/portal/devices?result=invalid')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  const { data: profile } = await supabase.from('users').select('workspace_id, role, email').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin' || mfaData?.currentLevel !== 'aal2') redirect('/portal/devices?result=mfa')

  const { data: slot } = await supabase.from('license_slots').select('id').eq('id', parsed.data.license_slot_id).eq('workspace_id', profile.workspace_id).maybeSingle()
  if (!slot) redirect('/portal/devices?result=invalid')

  try {
    const codeHash = hashAuthorizationCode(normalizeUserCode(parsed.data.user_code), readDeviceAuthorizationConfiguration())
    const admin = createAdminClient()
    const { error } = await admin.rpc('approve_desktop_authorization', { p_user_code_hash: codeHash, p_license_slot_id: slot.id, p_actor_id: user.id })
    if (error) redirect('/portal/devices?result=invalid')
    await admin.from('audit_logs').insert({ workspace_id: profile.workspace_id, actor_id: user.id, actor_email: profile.email, action_type: 'device_authorization_approved', target_id: slot.id, description: 'Approved a new desktop device without an activation key exchange' })
  } catch {
    redirect('/portal/devices?result=unavailable')
  }
  redirect('/portal/devices?result=approved')
}
