import styles from "../portal/page.module.css";
import { logout } from '../portal/actions';
import Link from 'next/link';

type NavItem = 'dashboard' | 'users' | 'account' | 'audit' | 'inventory';

export default function Sidebar({
  activeItem,
  userEmail
}: {
  activeItem: NavItem,
  userEmail: string
}) {
  return (
    <aside className={`${styles.sidebar} panel`}>
      <div className={styles.brand}>
        <h1 style={{ color: "var(--text-primary)", letterSpacing: "3px", fontSize: "1.2rem", fontWeight: 900, textTransform: "uppercase" }}>
          Kerf<span style={{ color: "var(--accent-orange)" }}>Suite</span>
        </h1>
        <p className="stencil-heading" style={{ marginTop: "0.25rem", fontSize: "0.6rem", letterSpacing: "3px" }}>Portal</p>
      </div>
      
      <nav className={styles.nav}>
        <Link href="/" className={`${styles.navItem} ${activeItem === 'dashboard' ? styles.active : ''}`}>
          <span className="stencil-heading">Dashboard & Licenses</span>
        </Link>
        <Link href="/portal/users" className={`${styles.navItem} ${activeItem === 'users' ? styles.active : ''}`}>
          <span className="stencil-heading">Users</span>
        </Link>
        <Link href="/portal/inventory" className={`${styles.navItem} ${activeItem === 'inventory' ? styles.active : ''}`}>
          <span className="stencil-heading">Inventory / Stock</span>
        </Link>
        <Link href="/portal/audit" className={`${styles.navItem} ${activeItem === 'audit' ? styles.active : ''}`}>
          <span className="stencil-heading">Audit Log</span>
        </Link>
        <a href="https://synontech.itch.io/kerfsuite" target="_blank" rel="noopener noreferrer" className={styles.navItem}>
          <span className="stencil-heading">Download Software ↗</span>
        </a>
        <Link href="/account" className={`${styles.navItem} ${activeItem === 'account' ? styles.active : ''}`}>
          <span className="stencil-heading">Security / Account</span>
        </Link>
      </nav>

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
         <div style={{ padding: "0.5rem", borderTop: "1px solid var(--bg-panel-border)" }}>
           <p className="stencil-heading" style={{ fontSize: "0.6rem", opacity: 0.5 }}>Active Operator</p>
           <p style={{ fontSize: "0.75rem", color: "var(--accent-orange)", wordBreak: "break-all" }}>{userEmail}</p>
         </div>
         <a href="/" style={{ fontSize: "0.65rem", color: "var(--text-secondary)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: "0.5rem" }}>← Back to Site</a>
         <form action={logout}>
           <button type="submit" className={styles.logoutBtn}>
             LOG OUT
           </button>
         </form>
         <p style={{ fontSize: "0.62rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>KerfSuite Portal v0.1.0</p>
      </div>
    </aside>
  );
}

