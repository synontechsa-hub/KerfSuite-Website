import Link from 'next/link';
import styles from '../marketing.module.css';

export default function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        {/* Brand column */}
        <div className={styles.footerBrandCol}>
          <img
            src="/svg/kerfsuite-wordmark.svg"
            alt="KerfSuite"
            className={styles.footerWordmark}
          />
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
              <img
                src="/svg/feedrate-logo.svg"
                alt="Feed Rate"
                className={styles.footerFeedRateLogo}
              />
            </a>
          </div>
        </div>

        <ul className={styles.footerLinks}>
          <li><Link href="/#apps">products</Link></li>
          <li><Link href="/#pricing">Pricing</Link></li>
          <li><Link href="/downloads">Downloads</Link></li>
          <li><Link href="/login">Portal</Link></li>
          <li>
            <a href="https://synontech.github.io" target="_blank" rel="noopener noreferrer">
              Synontech
            </a>
          </li>
          <li>
            <a href="https://github.com/Feed-Rate/KerfSuite" target="_blank" rel="noopener noreferrer">
              GitHub
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
          <img
            src="/svg/powered-by-synontech.svg"
            alt="Powered by Synontech"
            className={styles.footerPoweredByImg}
          />
        </a>
      </div>
    </footer>
  );
}
