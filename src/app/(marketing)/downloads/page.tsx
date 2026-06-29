import type { Metadata } from 'next';
import Link from 'next/link';
import MarketingNav from '../components/MarketingNav';
import MarketingFooter from '../components/MarketingFooter';
import styles from '../marketing.module.css';
import dlStyles from './downloads.module.css';


export const metadata: Metadata = {
  title: 'Downloads',
  description: 'Download the latest KerfSuite applications. KerfCut v1.0.0-Beta available now on Windows x64.',
};

const releases = [
  {
    app: 'KerfCut',
    version: 'v1.0.0-Beta',
    date: '2026-06-11',
    status: 'active' as const,
    description: 'Algorithmic cut-list optimizer for sheet goods. MaxRects + Guillotine packing, PDF export, grain lock.',
    requirements: ['Windows 10/11 (x64)', '.NET 8.0 Runtime', 'Internet connection for activation'],
    links: [
      { label: 'Download on itch.io', href: 'https://synontech.itch.io/kerfsuite', primary: true },
      { label: 'GitHub Release', href: 'https://github.com/Feed-Rate/KerfSuite/releases/tag/v1.0.0-beta', primary: false },
    ],
  },
  {
    app: 'KerfStock',
    version: 'v0.8.2-Beta',
    date: 'TBA',
    status: 'idle' as const,
    description: 'Real-time workshop inventory tracking. Monitors sheet goods, hardware, and offcuts.',
    requirements: ['Windows 10/11 (x64)', 'KerfSuite License'],
    links: [],
  },
];

export default function DownloadsPage() {
  return (
    <>
      <MarketingNav />

      <main style={{ paddingTop: '64px', minHeight: '100vh' }}>
        {/* Page Header */}
        <section className={dlStyles.pageHeader}>
          <div className="section-inner">
            <p className="section-tag">Distribution</p>
            <h1 className="section-title">Downloads</h1>
            <p className={dlStyles.pageSubtitle}>
              Get the latest KerfSuite applications. Requires an active license — manage yours in the{' '}
              <Link href="/login" style={{ color: 'var(--accent-orange)' }}>Portal</Link>.
            </p>
          </div>
        </section>

        <div className="cyber-divider" />

        {/* Release Cards */}
        <section className={dlStyles.releasesSection}>
          <div className="section-inner">
            {releases.map((release) => (
              <div key={release.app} className={dlStyles.releaseCard}>
                <div className={dlStyles.releaseHeader}>
                  <div className={dlStyles.releaseTitle}>
                    <h2 className={dlStyles.releaseName}>{release.app}</h2>
                    <span className={`${styles.versionTag} ${release.status === 'idle' ? styles.versionTagIdle : ''}`}>
                      {release.version}
                    </span>
                    <span className={`badge badge-${release.status}`}>
                      {release.status === 'active' ? 'Available Now' : 'Coming Soon'}
                    </span>
                  </div>
                  <div className={dlStyles.releaseDate}>
                    <span className="stencil-heading">Release Date</span>
                    <span className={dlStyles.dateMono}>{release.date}</span>
                  </div>
                </div>

                <p className={dlStyles.releaseDesc}>{release.description}</p>

                <div className={dlStyles.releaseBody}>
                  <div className={dlStyles.requirements}>
                    <p className="stencil-heading" style={{ marginBottom: '0.5rem' }}>System Requirements</p>
                    <ul className={dlStyles.reqList}>
                      {release.requirements.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  <div className={dlStyles.downloadActions}>
                    {release.links.length > 0 ? (
                      release.links.map((link) => (
                        <a
                          key={link.href}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={link.primary ? 'btn-filled' : 'btn-primary'}
                        >
                          {link.label}
                        </a>
                      ))
                    ) : (
                      <button className="btn-ghost" disabled style={{ cursor: 'not-allowed', opacity: 0.5 }}>
                        Not Yet Available
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="cyber-divider" />

        {/* Activation Guide */}
        <section style={{ padding: '4rem 0' }}>
          <div className="section-inner">
            <div style={{ maxWidth: '640px' }}>
              <p className="section-tag">Getting Started</p>
              <h2 className="section-title" style={{ fontSize: '1.4rem' }}>
                Activation <span>Guide</span>
              </h2>
              <ol className={dlStyles.guideList}>
                <li>
                  <strong>Purchase a license</strong> — visit the{' '}
                  <Link href="/#pricing" style={{ color: 'var(--accent-orange)' }}>pricing section</Link>{' '}
                  and select a tier.
                </li>
                <li>
                  <strong>Sign in to the Portal</strong> — go to{' '}
                  <Link href="/login" style={{ color: 'var(--accent-orange)' }}>KerfPortal</Link>{' '}
                  to manage your workspace.
                </li>
                <li>
                  <strong>Generate a CDKey</strong> — in the portal dashboard, click &ldquo;+ Generate Key&rdquo; for your machine.
                </li>
                <li>
                  <strong>Download KerfCut</strong> — use the links above to get the installer.
                </li>
                <li>
                  <strong>Activate</strong> — launch KerfCut and enter your CDKey when prompted. Internet connection required for first activation.
                </li>
              </ol>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </>
  );
}
