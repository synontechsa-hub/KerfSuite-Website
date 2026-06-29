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
          <img
            src="/svg/kerfsuite-wordmark.svg"
            alt="KerfSuite"
            height={28}
            style={{ display: 'block', height: '28px', width: 'auto' }}
          />
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
        <Link href="/login" style={{ color: 'var(--text-secondary)', marginRight: '1rem', fontSize: '0.85rem', textDecoration: 'none' }}>
          Login
        </Link>
        <Link href="/signup" className={styles.navPortalBtn}>
          Sign Up →
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
