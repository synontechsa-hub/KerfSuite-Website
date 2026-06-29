'use client';

import Link from 'next/link';
import { useState } from 'react';
import styles from '../marketing.module.css';

export default function MarketingNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className={styles.nav}>
      <div className={styles.navBrand}>
        <Link href="/" className={styles.navLogo}>
          Kerf<span>Suite</span>
        </Link>
      </div>

      <ul className={`${styles.navLinks} ${menuOpen ? styles.open : ''}`}>
        <li><Link href="/#apps" onClick={() => setMenuOpen(false)}>Suite</Link></li>
        <li><Link href="/#pricing" onClick={() => setMenuOpen(false)}>Pricing</Link></li>
        <li><Link href="/downloads" onClick={() => setMenuOpen(false)}>Downloads</Link></li>
        <li>
          <a
            href="https://synontech.github.io"
            target="_blank"
            rel="noopener noreferrer"
          >
            Synontech
          </a>
        </li>
      </ul>

      <div className={styles.navActions}>
        <Link href="/login" className={styles.navPortalBtn}>
          Portal →
        </Link>
        <button
          className={styles.navHamburger}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </nav>
  );
}
