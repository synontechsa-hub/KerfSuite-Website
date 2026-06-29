import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'
import { validateLicenseRequest } from '@/utils/license-auth'
import crypto from 'crypto'

/**
 * KERFCUT COMMIT API
 * Standard: AGENTS.md v1.2
 * Refactored for ATOMICITY to prevent race conditions (double-spend).
 */
export async function POST(request: Request) {
  // 1. Validate Machine License
  const auth = await validateLicenseRequest(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { workspaceId } = auth
  const adminClient = createAdminClient()

  try {
    const body = await request.json()
    const { job_reference, consumed_assets, generated_remnants } = body

    if (!consumed_assets || !Array.isArray(consumed_assets) || consumed_assets.length === 0) {
      return NextResponse.json({ error: 'Invalid consumed_assets' }, { status: 400 })
    }

    // 2. ATOMIC CONSUMPTION
    // We update only if status is 'available'.
    // This prevents two machines from consuming the same sheet simultaneously.
    const { data: updatedAssets, error: consumeError } = await adminClient
      .from('assets')
      .update({
        status: 'consumed',
        job_reference,
        updated_at: new Date().toISOString()
      })
      .in('id', consumed_assets)
      .eq('workspace_id', workspaceId)
      .eq('status', 'available')
      .select('id, system_name')

    if (consumeError) throw consumeError

    // 3. CONFLICT DETECTION
    // If the number of updated rows doesn't match the requested count,
    // it means some were already consumed or missing.
    if (!updatedAssets || updatedAssets.length !== consumed_assets.length) {
      const updatedIds = updatedAssets?.map(a => a.id) || []
      const failedIds = consumed_assets.filter(id => !updatedIds.includes(id))

      // Rollback logic: In a real production SQL env we'd use a transaction,
      // but here we manually revert the successful ones if partial failure occurred
      // to keep the request atomic.
      if (updatedIds.length > 0) {
        await adminClient
          .from('assets')
          .update({ status: 'available', job_reference: null })
          .in('id', updatedIds)
          .eq('workspace_id', workspaceId)
      }

      return NextResponse.json({
        status: 'conflict',
        message: 'One or more assets were already consumed or are unavailable.',
        failed_ids: failedIds
      }, { status: 409 })
    }

    // 4. CREATE REMNANTS
    const created_remnants: any[] = []
    if (generated_remnants && Array.isArray(generated_remnants) && generated_remnants.length > 0) {
      const remnantsToInsert = generated_remnants.map((r: any) => ({
        workspace_id: workspaceId,
        material_id: r.material_id,
        system_name: `REMNANT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        width: r.width,
        height: r.height,
        asset_type: 'remnant',
        status: 'available',
        source_asset_id: r.source_asset_id,
        location_id: r.location_id,
        job_reference
      }))

      const { data: inserted, error: insertError } = await adminClient
        .from('assets')
        .insert(remnantsToInsert)
        .select()

      if (insertError) throw insertError

      inserted?.forEach(row => {
        created_remnants.push({
          id: row.id,
          system_name: row.system_name,
          width: row.width,
          height: row.height
        })
      })
    }

    // 5. AUDIT LOGGING & EVENTS
    const events = consumed_assets.map(id => ({
      asset_id: id,
      workspace_id: workspaceId,
      event_type: 'cut',
      notes: `Consumed in job ${job_reference}`,
      metadata: { job_reference }
    }))

    created_remnants.forEach(r => {
      events.push({
        asset_id: r.id,
        workspace_id: workspaceId,
        event_type: 'received_from_kerfcut',
        notes: `Generated from job ${job_reference}`,
        metadata: { job_reference }
      })
    })

    await adminClient.from('asset_events').insert(events)

    return NextResponse.json({
      status: 'committed',
      consumed_count: consumed_assets.length,
      remnants_created: created_remnants
    })

  } catch (error: unknown) {
    console.error('Commit error:', error)
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
