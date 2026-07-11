import { createAdminClient } from '@/utils/supabase/server'
import crypto from 'crypto'

/**
 * Validates that a request from a desktop app is authorized
 * via an active license key and updates telemetry + abuse detection.
 */
export async function validateLicenseRequest(request: Request, expectedApp?: string) {
  const cdkey = request.headers.get('x-license-key')
  const machineId = request.headers.get('x-machine-id')
  const workspaceId = request.headers.get('x-workspace-id')
  const appVersion = request.headers.get('x-app-version')
  const osInfo = request.headers.get('x-os-info')

  // Get IP (Standard Next.js header pattern)
  const currentIp = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1'

  if (!cdkey || !machineId || !workspaceId) {
    return { error: 'Missing license headers', status: 401 }
  }

  const adminClient = createAdminClient()

  // Hash the incoming key to match the database
  const cdkeyHash = crypto.createHash('sha256').update(cdkey).digest('hex')

  const { data: slot, error } = await adminClient
    .from('license_slots')
    .select('id, status, bound_machine_id, workspace_id, last_ip, abuse_score, is_flagged, app')
    .eq('cdkey_hash', cdkeyHash)
    .eq('workspace_id', workspaceId)
    .single()

  if (error || !slot) {
    return { error: 'Invalid license or workspace', status: 403 }
  }

  if (slot.status !== 'active') {
    return { error: `License status is ${slot.status}`, status: 403 }
  }

  if (slot.bound_machine_id !== machineId) {
    return { error: 'License bound to another machine', status: 403 }
  }

  // APP-SPECIFIC VALIDATION
  if (expectedApp && slot.app !== expectedApp) {
    return { error: `License not valid for ${expectedApp}`, status: 403 }
  }

  // ABUSE DETECTION LOGIC
  const updates: any = {
    last_seen_at: new Date().toISOString(),
    last_ip: currentIp,
    app_version: appVersion || undefined,
    os_info: osInfo || undefined
  }

  // Detect IP shifting
  if (slot.last_ip && slot.last_ip !== currentIp) {
    updates.abuse_score = (slot.abuse_score || 0) + 1

    // Auto-flag if score gets high
    if (updates.abuse_score >= 5 && !slot.is_flagged) {
      updates.is_flagged = true

      // Log critical security event
      await adminClient.from('audit_logs').insert({
        workspace_id: slot.workspace_id,
        actor_email: 'SECURITY-ENGINE',
        action_type: 'potential_abuse_flagged',
        target_id: slot.id,
        description: `License ending in ...${cdkey.slice(-4)} flagged for excessive IP shifting (5+ unique origins).`
      })
    }
  }

  // Update telemetry in background
  adminClient
    .from('license_slots')
    .update(updates)
    .eq('id', slot.id)
    .then(({ error }) => {
      if (error) console.error('Heartbeat/Abuse update failed:', error)
    })

  return { success: true, workspaceId: slot.workspace_id, isFlagged: slot.is_flagged || updates.is_flagged }
}

