'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

type GoogleAuthButtonProps = {
  nextPath?: string
  label?: string
  className?: string
}

export default function GoogleAuthButton({
  nextPath = '/portal',
  label = 'Continue with Google',
  className,
}: GoogleAuthButtonProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleGoogleSignIn() {
    setError(null)
    setIsPending(true)

    const supabase = createClient()
    const callbackUrl = new URL('/auth/callback', window.location.origin)
    callbackUrl.searchParams.set('next', nextPath)

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl.toString(),
        scopes: 'openid email profile',
      },
    })

    if (signInError) {
      setError('Google sign-in could not be started. Please try again.')
      setIsPending(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        className={className || 'btn-secondary'}
        disabled={isPending}
        onClick={handleGoogleSignIn}
      >
        {isPending ? 'Connecting to Google...' : label}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  )
}
