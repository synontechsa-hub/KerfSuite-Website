import { createClient } from '@/utils/supabase/server'
import { SupabaseClient, User } from '@supabase/supabase-js'

export type AuthedWorkspace = {
  user: User;
  workspaceId: string;
  role: string;
  supabase: SupabaseClient;
}

/**
 * Common helper for Portal API routes to get the current user's workspace context.
 * Rule 8.1: Service/Repository logic separation
 */
export async function getAuthedWorkspace(): Promise<AuthedWorkspace | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userData } = await supabase
    .from('users')
    .select('workspace_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) return null

  return {
    user,
    workspaceId: userData.workspace_id,
    role: userData.role,
    supabase
  }
}
