import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'

function buildRedirect(request: Request, origin: string, path: string) {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv = process.env.NODE_ENV === 'development'
  if (isLocalEnv) return NextResponse.redirect(`${origin}${path}`)

  // SECURITY: Validate forwardedHost against allowlist to prevent Open Redirect
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host : null
  if (forwardedHost && forwardedHost === siteUrl) {
    return NextResponse.redirect(`https://${forwardedHost}${path}`)
  }

  return NextResponse.redirect(`${origin}${path}`)
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = '/account?message=Welcome! Please set your security code (password) below.'

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash,
    })
    
    if (!error) {
      return buildRedirect(request, origin, next)
    } else {
      console.error('Auth callback verifyOtp error:', error)
    }
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return buildRedirect(request, origin, next)
    } else {
      console.error('Auth callback error:', error)
    }
  }

  return NextResponse.redirect(`${origin}/login?message=Invitation link expired or invalid.`)
}

