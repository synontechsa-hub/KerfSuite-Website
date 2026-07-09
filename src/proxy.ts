import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Check for Upstash config to prevent crash on boot if missing
const hasUpstash = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
const redis = hasUpstash ? Redis.fromEnv() : null

const licenseRatelimit = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 per minute
  analytics: true,
}) : null

const trialRatelimit = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 d'), // 5 per day
  analytics: true,
}) : null

const authRatelimit = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 per minute
  analytics: true,
}) : null

const provisionRatelimit = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 per minute
  analytics: true,
}) : null

export async function proxy(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1'
    const path = request.nextUrl.pathname

    if (path.startsWith('/api/v1/licenses/verify') && licenseRatelimit) {
      try {
        const { success } = await licenseRatelimit.limit(`license_${ip}`)
        if (!success) {
          return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
        }
      } catch (error) {
        console.error('License Rate limiting error (Failing Open):', error)
        // Fail open for paying customers
      }
    }

    if (path.startsWith('/api/v1/trials') && trialRatelimit) {
      try {
        const { success } = await trialRatelimit.limit(`trial_${ip}`)
        if (!success) {
          return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
        }
      } catch (error) {
        console.error('Trial Rate limiting error (Failing Closed):', error)
        // Fail closed to prevent trial abuse
        return NextResponse.json({ error: 'Service temporarily unavailable.' }, { status: 503 })
      }
    }

    if (path.startsWith('/login') && request.method === 'POST' && authRatelimit) {
      try {
        const { success } = await authRatelimit.limit(`login_${ip}`)
        if (!success) {
          return NextResponse.redirect(new URL('/login?message=Too many attempts. Try again later.', request.url))
        }
      } catch (error) {
        console.error('Auth Rate limiting error:', error)
      }
    }

    if (path.startsWith('/api/provision') && provisionRatelimit) {
      try {
        const { success } = await provisionRatelimit.limit(`provision_${ip}`)
        if (!success) {
          return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })
        }
      } catch (error) {
        console.error('Provision Rate limiting error:', error)
      }
    }

    return await updateSession(request)
  } catch (err: any) {
    console.error('Unhandled proxy error:', err)
    // Fail safe to standard response if proxy logic itself crashes
    return NextResponse.next({ request })
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|monitoring|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}


