import { NextResponse } from 'next/server'
import { getAuthedStockWorkspace } from '@/utils/auth-helpers'
import { z } from 'zod'

const MaterialSchema = z.object({
  name: z.string().trim().min(1).max(100),
  thickness: z.number().positive().max(10000),
  unit: z.enum(['mm', 'in']).default('mm')
}).strict()
export async function GET(request: Request) {
  const auth = await getAuthedStockWorkspace(request)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { data: materials, error } = await auth.supabase
    .from('materials')
    .select('*')
    .eq('workspace_id', auth.workspaceId)
    .eq('is_deleted', false)
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(materials)
}

export async function POST(request: Request) {
  const auth = await getAuthedStockWorkspace(request)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  if (auth.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  try {
    const validation = MaterialSchema.safeParse(await request.json())
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 })
    }
    const body = validation.data

    const { data: material, error } = await auth.supabase
      .from('materials')
      .insert({
        name: body.name,
        thickness: body.thickness,
        unit: body.unit,
        workspace_id: auth.workspaceId,
        created_by: auth.user.id
      })
      .select()
      .single()

    if (error) throw error

    // Log administrative action
    await auth.supabase.from('audit_logs').insert({
      workspace_id: auth.workspaceId,
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      action_type: 'material_created',
      description: `Created material: ${body.name} (${body.thickness}${body.unit})`
    })

    return NextResponse.json(material)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

