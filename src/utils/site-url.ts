/**
 * Resolve an absolute URL on the public site origin.
 * Falls back to localhost when NEXT_PUBLIC_SITE_URL is unset (dev).
 */
export function siteUrl(path = '/'): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return new URL(path, base).toString()
}
