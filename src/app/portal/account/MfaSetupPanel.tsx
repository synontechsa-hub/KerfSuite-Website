'use client'

import { FormEvent, useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import styles from '../page.module.css'

type Enrollment = {
  factorId: string
  qrCode: string
  secret: string
}

type VerifiedFactor = {
  id: string
  friendly_name?: string | null
}

export default function MfaSetupPanel({ isMfaEnabled }: { isMfaEnabled: boolean }) {
  const router = useRouter()
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [verifiedFactor, setVerifiedFactor] = useState<VerifiedFactor | null>(null)
  const [code, setCode] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  useEffect(() => {
    if (isMfaEnabled) return

    const loadFactors = async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.mfa.listFactors()
      const factor = data?.totp?.[0]
      if (factor) {
        setVerifiedFactor({ id: factor.id, friendly_name: factor.friendly_name })
      }
    }

    void loadFactors()
  }, [isMfaEnabled])

  const startEnrollment = async () => {
    setIsBusy(true)
    setError(null)
    setMessage(null)

    const supabase = createClient()
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'KerfSuite Portal'
    })

    setIsBusy(false)

    if (error) {
      setError(error.message)
      return
    }

    setEnrollment({
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret
    })
    setVerifiedFactor(null)
    setCode('')
  }

  const verifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const factorId = enrollment?.factorId || verifiedFactor?.id
    if (!factorId) return

    setIsBusy(true)
    setError(null)
    setMessage(null)

    const supabase = createClient()
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: code.trim()
    })

    setIsBusy(false)

    if (error) {
      setError(error.message)
      return
    }

    setMessage('MFA verified. Sensitive portal actions are now unlocked for this session.')
    setCode('')
    router.refresh()
  }

  if (isMfaEnabled) {
    return (
      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
        Sensitive actions like generating beta keys are unlocked for this session.
      </p>
    )
  }

  return (
    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {!enrollment && !verifiedFactor && (
        <button className="btn-primary" type="button" onClick={startEnrollment} disabled={isBusy} style={{ alignSelf: 'flex-start' }}>
          {isBusy ? 'Starting...' : 'Set Up Authenticator'}
        </button>
      )}

      {verifiedFactor && !enrollment && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Enter a code from {verifiedFactor.friendly_name || 'your authenticator'} to unlock admin actions for this session.
        </p>
      )}

      {enrollment && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Image
              src={enrollment.qrCode}
              alt="KerfSuite MFA QR code"
              width={160}
              height={160}
              unoptimized
              style={{ backgroundColor: '#fff', padding: '0.5rem', borderRadius: '4px' }}
            />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Scan this with Google Authenticator, Microsoft Authenticator, 1Password, or Bitwarden.
              </p>
              <code style={{ display: 'block', color: 'var(--accent-orange)', wordBreak: 'break-all', fontSize: '0.75rem' }}>
                {enrollment.secret}
              </code>
            </div>
          </div>
        </div>
      )}

      {(enrollment || verifiedFactor) && (
        <form onSubmit={verifyCode} className={styles.loginForm} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            className={styles.select}
            required
            minLength={6}
            maxLength={8}
            style={{ minWidth: '140px' }}
          />
          <button className="btn-primary" type="submit" disabled={isBusy}>
            {isBusy ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>
      )}

      {error && <span style={{ color: 'var(--status-error)', fontSize: '0.8rem' }}>{error}</span>}
      {message && <span style={{ color: 'var(--status-running)', fontSize: '0.8rem' }}>{message}</span>}
    </div>
  )
}
