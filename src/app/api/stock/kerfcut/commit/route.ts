import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'
import { validateLicenseRequest } from '@/utils/license-auth'
import { z } from 'zod'

const GeneratedRemnantSchema = z.object({
  material_id: z.string().uuid(),
  width: z.number().positive(),
  height: z.number().positive(),
  location_id: z.string().uuid().nullable().optional(),
  source_asset_id: z.string().uuid()
}).strict()

const CommitSchema = z.object({
  job_reference: z.string().trim().min(1).max(200),
  consumed_assets: z.array(z.string().uuid()).min(1),
  generated_remnants: z.array(GeneratedRemnantSchema).default([])
}).strict()
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
    const validation = CommitSchema.safeParse(await request.json())
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 })
    }
    const { job_reference, consumed_assets, generated_remnants } = validation.data

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
