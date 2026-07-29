import { createBearerClient, createClient } from '@/utils/supabase/server'
import { validateLicenseRequest } from '@/utils/license-auth'
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
export async function getAuthedWorkspace(request?: Request): Promise<AuthedWorkspace | null> {
  const authorization = request?.headers.get('authorization')
  const bearerMatch = authorization?.match(/^Bearer\s+(.+)$/i)
  const accessToken = bearerMatch?.[1]?.trim()
  const supabase = accessToken
    ? createBearerClient(accessToken)
    : await createClient()

  const { data: { user } } = accessToken
    ? await supabase.auth.getUser(accessToken)
    : await supabase.auth.getUser()
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

export async function getAuthedStockWorkspace(
  request: Request
): Promise<AuthedWorkspace | { error: string; status: number }> {
  const auth = await getAuthedWorkspace(request)
  if (!auth) return { error: 'Unauthorized', status: 401 }

  // Portal browser requests authenticate with secure Supabase cookies. Desktop
  // requests use a bearer token and must also prove the bound app licence.
  if (request.headers.has('authorization')) {
    const license = await validateLicenseRequest(request, 'kerfstock', auth.workspaceId)
    if ('error' in license && license.error) {
      return { error: license.error, status: license.status ?? 403 }
    }
  }

  return auth
}
