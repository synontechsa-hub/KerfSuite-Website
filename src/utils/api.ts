import { NextResponse } from 'next/server'
import { ZodError, type ZodType } from 'zod'
import { getRateLimit, type RateLimitWindow } from '@/utils/rate-limit'
import { getAuthedWorkspace, type AuthedWorkspace } from '@/utils/auth-helpers'

/**
 * Shared helpers for API route handlers.
 * Centralizes the JSON error/validation/auth/rate-limit patterns that were
 * previously copy-pasted across every route under src/app/api.
 */

/** Build a standard `{ error }` JSON response with the given status. */
export function jsonError(
  message: string,
  status: number,
  extra?: Record<string, unknown>
) {
  return NextResponse.json({ error: message, ...extra }, { status })
}

/** Extract a human-readable message from an unknown thrown value. */
export function errorMessage(error: unknown, fallback = 'Internal Server Error'): string {
  return error instanceof Error ? error.message : fallback
}

/**
 * Convert a caught error into a 500 JSON response, optionally logging it first.
 * Mirrors the try/catch tail that appeared in every route handler.
 */
export function handleRouteError(
  error: unknown,
  options: { logPrefix?: string; fallback?: string } = {}
) {
  if (options.logPrefix) console.error(options.logPrefix, error)
  return jsonError(errorMessage(error, options.fallback), 500)
}

/** The first Zod issue message, used as the user-facing validation error. */
export function firstZodIssue(error: ZodError): string {
  return error.issues[0].message
}

type ValidationResult<T> = { data: T } | { error: NextResponse }

/**
 * Validate `input` against a schema. On failure returns `{ error }` with a 400
 * JSON response; on success returns `{ data }`.
 *
 * Usage:
 *   const parsed = validateBody(Schema, raw)
 *   if ('error' in parsed) return parsed.error
 *   const body = parsed.data
 */
export function validateBody<T>(
  schema: ZodType<T>,
  input: unknown
): ValidationResult<T> {
  const result = schema.safeParse(input)
  if (!result.success) {
    return { error: jsonError(firstZodIssue(result.error), 400) }
  }
  return { data: result.data }
}

/** Client IP from the standard forwarded header, falling back to localhost. */
export function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1'
}

/**
 * Apply a sliding-window rate limit for `identifier`. Returns a 429 response
 * when the limit is exceeded, or `null` to continue (also `null` when rate
 * limiting is not configured).
 */
export async function enforceRateLimit(
  identifier: string,
  limit: number,
  window: RateLimitWindow,
  message = 'Too many requests'
): Promise<NextResponse | null> {
  const ratelimit = getRateLimit(limit, window)
  if (!ratelimit) return null

  const { success } = await ratelimit.limit(identifier)
  if (!success) return jsonError(message, 429)

  return null
}

/**
 * Resolve the authenticated workspace context for a portal API route.
 * Returns `{ error }` with a 401 response when unauthenticated.
 */
export async function requireWorkspace(): Promise<
  { auth: AuthedWorkspace } | { error: NextResponse }
> {
  const auth = await getAuthedWorkspace()
  if (!auth) return { error: jsonError('Unauthorized', 401) }
  return { auth }
}

/** Ensure the caller is an admin; returns a 403 response otherwise. */
export function requireAdmin(auth: AuthedWorkspace): NextResponse | null {
  if (auth.role !== 'admin') return jsonError('Admin access required', 403)
  return null
}
