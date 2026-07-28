const invitePathPattern = /^\/join\?token=[A-Za-z0-9_-]{43}$/

const allowedAuthPaths = new Set([
  '/portal',
  '/portal/account',
])

export function getSafeAuthRedirect(
  requestedPath: string | null,
  fallbackPath: string,
) {
  if (!requestedPath) return fallbackPath
  if (allowedAuthPaths.has(requestedPath)) return requestedPath
  if (invitePathPattern.test(requestedPath)) return requestedPath
  return fallbackPath
}
