import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  if (!userData) return NextResponse.json({ error: 'User workspace not found' }, { status: 403 })

  const { data: locations, error } = await supabase
    .from('locations')
    .select('*')
    .eq('workspace_id', userData.workspace_id)
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(locations)
}

