'use client'

export default function Error({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  return (
    <div style={{
      display: 'flex', minHeight: '100vh', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--text-primary)'
    }}>
      <div className="panel" style={{ maxWidth: 500, textAlign: 'center' }}>
        <h2 className="stencil-heading" style={{ color: 'var(--status-error)', marginBottom: '1rem' }}>
          Something went wrong
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          {error.message || 'An unexpected error occurred.'}
        </p>
        <button className="btn-primary" onClick={reset}>Try Again</button>
      </div>
    </div>
  )
}

