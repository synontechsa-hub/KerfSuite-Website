import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { getSafeAuthRedirect } from '@/utils/auth-redirect'

function buildRedirect(request: Request, origin: string, path: string) {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv = process.env.NODE_ENV === 'development'
  if (isLocalEnv) return NextResponse.redirect(`${origin}${path}`)

  // SECURITY: Production redirects are anchored to the configured site URL.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : null
  if (siteUrl && forwardedHost && forwardedHost === siteUrl.host) {
    return NextResponse.redirect(`https://${forwardedHost}${path}`)
  }

  return NextResponse.redirect(`${siteUrl?.origin || origin}${path}`)
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const requestedNext = searchParams.get('next')

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash,
    })
    
    if (!error) {
      const next = '/portal/account?message=Welcome! Please set your security code (password) below.'
      return buildRedirect(request, origin, next)
    } else {
      console.error('Auth callback verifyOtp error:', error)
    }
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const next = getSafeAuthRedirect(requestedNext, '/portal')
      return buildRedirect(request, origin, next)
    } else {
      console.error('Auth callback error:', error)
    }
  }

  return buildRedirect(
    request,
    origin,
    '/login?message=Sign-in link expired or invalid.',
  )
}

