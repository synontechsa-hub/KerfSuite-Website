import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import MarketingNav from '../components/MarketingNav';
import MarketingFooter from '../components/MarketingFooter';
import styles from '../marketing.module.css';
import dlStyles from './downloads.module.css';

const KERFCUT_RELEASE_URL = 'https://github.com/Feed-Rate/KerfSuite/releases/tag/KerfCut-v1.0.1-Beta';
const KERFCUT_INSTALLER_URL = 'https://github.com/Feed-Rate/KerfSuite/releases/download/KerfCut-v1.0.1-Beta/KerfCut_Setup_v1.0.1_beta.exe';

export const metadata: Metadata = {
  title: 'Downloads',
  description: 'Download the latest KerfSuite applications. KerfCut v1.0.1 Beta available now on Windows x64.',
};

const releases = [
  {
    app: 'KerfCut',
    version: 'v1.0.1 Beta',
    date: '2026-07-27',
    status: 'active' as const,
    description: 'Beta cut-list optimizer for sheet goods. MaxRects + Guillotine packing, PDF/CSV export, grain lock, and 90-day beta license activation.',
    requirements: ['Windows 10/11 (x64)', 'Internet connection for first activation', '90-day beta license key'],
    links: [
      { label: 'Installer', href: KERFCUT_INSTALLER_URL, primary: true },
      { label: 'Release', href: KERFCUT_RELEASE_URL, primary: false },
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

      <main>
        <section className={dlStyles.dlScreen}>
          <div className={dlStyles.dlBackground} />

          <div className={dlStyles.dlInner}>
            <div className={dlStyles.dlVisualPanel}>
              <Image
                src="/images/marketing/downloads/photo.jpg"
                alt="Workshop Production"
                className={dlStyles.dlPhoto}
                fill
                priority
                sizes="1173px"
                style={{ objectFit: 'cover' }}
              />
            </div>

            <div className={dlStyles.dlTextContainer}>
              <div className={dlStyles.dlCategoryTag}>Downloads</div>
              <h1 className={dlStyles.dlHeadingText}>
                Currently<br /><span>Available.</span>
              </h1>
              <p className={dlStyles.dlBodyText}>Get the latest versions of all our tools here.</p>
            </div>

            <div className={dlStyles.dlAppGrid}>
              <div className={dlStyles.dlAppRow}>
                <a
                  href={KERFCUT_INSTALLER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={dlStyles.dlBtnDownload}
                  download
                  aria-label="Download KerfCut v1.0.1 Beta installer"
                >
                  DOWNLOAD
                </a>
                <div className={dlStyles.dlAppLogo}>
                  KERF<span>CUT</span>
                </div>
              </div>

              <div className={dlStyles.dlAppRow} style={{ opacity: 0.5 }}>
                <button className={dlStyles.dlBtnDownload} style={{ cursor: 'not-allowed' }} disabled>
                  DOWNLOAD
                </button>
                <div className={dlStyles.dlAppLogo}>
                  KERF<span>STOCK</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="cyber-divider" />

        <div className={dlStyles.technicalSections}>
          <section className={dlStyles.releasesSection}>
            <div className="section-inner">
              <h2 className="stencil-heading" style={{ marginBottom: '2rem', fontSize: '1.2rem' }}>Release Documentation</h2>
              {releases.map((release) => (
                <div key={release.app} className={dlStyles.releaseCard}>
                  <div className={dlStyles.releaseHeader}>
                    <div className={dlStyles.releaseTitle}>
                      <h2 className={dlStyles.releaseName}>{release.app}</h2>
                      <span className={`${styles.versionTag} ${release.status === 'idle' ? styles.versionTagIdle : ''}`}>
                        {release.version}
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
                    {release.links.length > 0 && (
                      <div className={dlStyles.downloadActions}>
                        {release.links.map((link) => (
                          <a
                            key={link.label}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={dlStyles.dlBtnDownload}
                            download={link.primary || undefined}
                          >
                            {link.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="cyber-divider" />

          <section style={{ padding: '4rem 0' }}>
            <div className="section-inner">
              <div style={{ maxWidth: '640px' }}>
                <p className="section-tag">Getting Started</p>
                <h2 className="section-title" style={{ fontSize: '1.4rem' }}>
                  Activation <span>Guide</span>
                </h2>
                <ol className={dlStyles.guideList}>
                  <li>
                    <strong>Sign in to the Portal</strong> - go to{' '}
                    <Link href="/login" style={{ color: 'var(--accent-orange)' }}>KerfPortal</Link>{' '}
                    to manage your workspace.
                  </li>
                  <li>
                    <strong>Create or request a beta key</strong> - generate a 90-day KerfCut beta license key for the tester machine.
                  </li>
                  <li>
                    <strong>Download KerfCut</strong> - use the Download button above to get the Windows installer.
                  </li>
                  <li>
                    <strong>Launch KerfCut</strong> - copy the Machine ID shown on the activation screen if the portal requests it.
                  </li>
                  <li>
                    <strong>Activate</strong> - paste the beta license key into KerfCut and click Activate. Internet connection is required for first activation.
                  </li>
                </ol>
              </div>
            </div>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </>
  );
}
