import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'
import { validateLicenseRequest } from '@/utils/license-auth'
import { z } from 'zod'

const GeneratedRemnantSchema = z.object({
  material_id: z.string().uuid(),
  width: z.number().positive(),
  height: z.number().positive(),
  location_id: z.string().uuid().nullable().optional(),
  source_asset_id: z.string().uuid(),
}).strict()

const ConsumedAssetSchema = z.object({
  asset_id: z.string().uuid(),
  quantity: z.number().int().positive().max(100000),
}).strict()

const CommitSchema = z.object({
  commit_token: z.string().uuid(),
  job_reference: z.string().trim().min(1).max(200),
  consumed_assets: z.array(ConsumedAssetSchema).min(1).max(1000),
  generated_remnants: z.array(GeneratedRemnantSchema).default([]),
}).strict().superRefine((value, context) => {
  const assetIds = value.consumed_assets.map(item => item.asset_id)
  if (new Set(assetIds).size !== assetIds.length) {
    context.addIssue({
      code: 'custom',
      path: ['consumed_assets'],
      message: 'Duplicate asset IDs are not allowed',
    })
  }
})

export async function POST(request: Request) {
  const auth = await validateLicenseRequest(request, 'kerfcut')
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const validation = CommitSchema.safeParse(await request.json())
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 })
    }

    const { commit_token, job_reference, consumed_assets, generated_remnants } = validation.data
    const adminClient = createAdminClient()
    const { data, error } = await adminClient.rpc('commit_kerfcut_stock_job', {
      p_workspace_id: auth.workspaceId,
      p_commit_token: commit_token,
      p_job_reference: job_reference,
      p_consumed_assets: consumed_assets,
      p_generated_remnants: generated_remnants,
    })

    if (error) {
      if (error.message.includes('CONFLICT')) {
        return NextResponse.json({ status: 'conflict', message: error.message }, { status: 409 })
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
