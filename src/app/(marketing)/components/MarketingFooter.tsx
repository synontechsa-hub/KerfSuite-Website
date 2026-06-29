import Link from 'next/link';
import styles from '../marketing.module.css';

export default function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div>
          <p className={styles.footerBrand}>Kerf<span>Suite</span></p>
          <p className={styles.footerTagline}>Precision at every stage of production.</p>
        </div>

        <ul className={styles.footerLinks}>
          <li><Link href="/#apps">Suite</Link></li>
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

        <p className={styles.footerCopy}>
          &copy; {year} Synontech. All rights reserved. &nbsp;|&nbsp; Powered by{' '}
          <a href="https://synontech.github.io" target="_blank" rel="noopener noreferrer">
            Synontech
          </a>
        </p>
      </div>
    </footer>
  );
}
