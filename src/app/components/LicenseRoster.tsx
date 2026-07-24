'use client'

import { useOptimistic } from 'react'
import styles from '../portal/page.module.css'
import CopyButton from './CopyButton'
import EditableLabel from './EditableLabel'
import RevokeButton from './RevokeButton'
import { License } from '@/models/portal'
import FormattedDate from './FormattedDate'
import { useState, useEffect } from 'react'

function StatusIndicator({ lastSeenAt, status }: { lastSeenAt: string | null, status: string }) {
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    if (!lastSeenAt || status === 'revoked') return

    const checkLive = () => {
      const lastSeen = new Date(lastSeenAt).getTime()
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
      setIsLive(lastSeen > fiveMinutesAgo)
    }

    checkLive()
    const timer = setInterval(checkLive, 30000) // Re-check every 30s
    return () => clearInterval(timer)
  }, [lastSeenAt, status])

  return (
    <div
      title={lastSeenAt ? `Last seen: ${new Date(lastSeenAt).toLocaleString()}` : 'Never seen'}
      style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: status === 'revoked' ? 'var(--status-error)' : isLive ? 'var(--status-running)' : 'var(--status-idle)',
        boxShadow: isLive ? '0 0 8px var(--status-running)' : 'none'
      }}
    />
  )
}

export default function LicenseRoster({
  initialLicenses,
  userRole
}: {
  initialLicenses: License[],
  userRole: string
}) {
  const [optimisticLicenses, updateOptimisticLicenses] = useOptimistic(
    initialLicenses,
    (state, updated: { id: string, status?: string, label?: string }) => {
      return state.map(l => l.id === updated.id ? { ...l, ...updated } : l)
    }
  )

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Status</th>
            <th>CDKey</th>
            <th>App</th>
            <th>Machine Label</th>
            <th>Version</th>
            <th>Last IP</th>
            <th>Activated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {optimisticLicenses.map((license) => (
            <tr key={license.id} style={license.isFlagged ? { backgroundColor: 'rgba(231, 76, 60, 0.05)' } : {}}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <StatusIndicator lastSeenAt={license.lastSeenAt} status={license.status} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span className={`${styles.badge} ${styles['status-' + license.status]}`} style={{ fontSize: '0.6rem' }}>
                      {license.status}
                    </span>
                    {license.isFlagged && (
                      <span style={{
                        fontSize: '0.55rem',
                        color: 'var(--status-error)',
                        fontWeight: 'bold',
                        border: '1px solid var(--status-error)',
                        padding: '1px 3px',
                        borderRadius: '2px',
                        textAlign: 'center'
                      }}>
                        FLAGGED
                      </span>
                    )}
                  </div>
                </div>
              </td>
              <td style={{ fontFamily: "var(--font-mono)", color: "var(--accent-orange)" }}>
                {license.cdkey || 'REDACTED'} <CopyButton text={license.cdkey || ''} />
              </td>
              <td style={{ textTransform: "uppercase", fontSize: "0.85rem" }}>{license.app}</td>
              <td>
                <EditableLabel
                  licenseId={license.id}
                  initialLabel={license.label}
                  boundMachineId={license.boundMachineId}
                  onUpdateOptimistic={(newLabel) => updateOptimisticLicenses({ id: license.id, label: newLabel })}
                />
              </td>
              <td style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                {license.appVersion || '—'}
                {license.osInfo && <div style={{ fontSize: '0.6rem', opacity: 0.5 }}>{license.osInfo}</div>}
              </td>
              <td style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                {license.lastIp || '—'}
                {license.abuseScore > 0 && (
                  <div style={{ fontSize: '0.6rem', color: 'var(--status-warning)' }}>
                    {license.abuseScore} shifts
                  </div>
                )}
              </td>
              <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                {license.redeemedAt ? <FormattedDate date={license.redeemedAt} format="dateOnly" /> : '—'}
              </td>
              <td>
                {license.status !== 'revoked' && userRole === 'admin' ? (
                  <RevokeButton
                    licenseId={license.id}
                    onRevokeOptimistic={() => updateOptimisticLicenses({ id: license.id, status: 'revoked' })}
                  />
                ) : license.status === 'revoked' ? (
                  <span style={{ fontSize: "0.75rem", opacity: 0.5 }}>TERMINATED</span>
                ) : (
                  <span style={{ fontSize: "0.75rem", opacity: 0.5 }}>READ-ONLY</span>
                )}
              </td>
            </tr>
          ))}
          {optimisticLicenses.length === 0 && (
            <tr>
              <td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                No licenses generated yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

