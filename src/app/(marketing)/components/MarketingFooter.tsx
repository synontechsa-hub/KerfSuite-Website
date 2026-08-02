import Link from 'next/link';
import styles from '../marketing.module.css';

export default function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        {/* Brand column */}
        <div className={styles.footerBrandCol}>
          <div className={styles.footerWordmark}>
            KERF<span>SUITE</span>
          </div>
          <p className={styles.footerTagline}>Precision at every stage of production.</p>

          {/* Feed Rate publisher credit */}
          <div className={styles.footerPublisher}>
            <span className={styles.footerPublisherLabel}>Published by</span>
            <a
              href="https://github.com/Feed-Rate"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.footerPublisherLink}
            >
              <div className={styles.footerFeedRateLogo}>
                FEED <span>RATE</span>
              </div>
            </a>
          </div>
        </div>

        <ul className={styles.footerLinks}>
          <li><Link href="/#apps">PRODUCTS</Link></li>
          <li><Link href="/#pricing">PRICING</Link></li>
          <li><Link href="/downloads">DOWNLOADS</Link></li>
          <li><Link href="/login">PORTAL</Link></li>
          <li>
            <a href="https://synontech.github.io" target="_blank" rel="noopener noreferrer">
              SYNONTECH
            </a>
          </li>
          <li>
            <a href="https://github.com/Feed-Rate/KerfSuite" target="_blank" rel="noopener noreferrer">
              GITHUB
            </a>
          </li>
        </ul>
      </div>

      {/* Powered By Synontech + copyright bar */}
      <div className={styles.footerBottom}>
        <p className={styles.footerCopy}>
          &copy; {year} Synontech / Feed Rate. All rights reserved.
        </p>
        <a
          href="https://synontech.github.io"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.footerPoweredBy}
        >
          <div className={styles.footerPoweredByLogo}>
            SYNON<span>TECH</span>
          </div>
        </a>
      </div>
    </footer>
  );
}
