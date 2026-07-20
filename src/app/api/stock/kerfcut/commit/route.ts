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
  // 1. Validate Machine License (Expect KerfCut)
  const auth = await validateLicenseRequest(request, 'kerfcut')
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

    // 2. ATOMIC COMMIT VIA RPC
    // Moves all logic (consumption, remnants, events) into a single DB transaction.
    const { data, error } = await adminClient.rpc('commit_kerfcut_job', {
      p_workspace_id: workspaceId,
      p_job_reference: job_reference,
      p_consumed_assets: consumed_assets,
      p_generated_remnants: generated_remnants || []
    })

    if (error) {
      if (error.message.includes('CONFLICT')) {
        return NextResponse.json({
          status: 'conflict',
          message: error.message
        }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json(data)

  } catch (error: unknown) {
    console.error('Commit error:', error)
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
