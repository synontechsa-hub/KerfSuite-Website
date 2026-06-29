import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './marketing.module.css';
import MarketingNav from './components/MarketingNav';
import MarketingFooter from './components/MarketingFooter';
import ScrollReveal from './components/ScrollReveal';

export const metadata: Metadata = {
  title: 'KerfSuite — The Workshop Operating System',
  description:
    'A precision utility suite for serious workshops. Algorithmic cut optimization, real-time inventory, and unified license management.',
};

export default function LandingPage() {
  return (
    <div className={styles.marketingPage}>
      <MarketingNav />

      <main>
        {/* ====================================================
            HERO — Split Panel Design
        ==================================================== */}
        <section className={styles.hero}>
          {/* Engineering grid background */}
          <div className={styles.heroGrid} />

          {/* Left: Copy Panel */}
          <div className={styles.heroLeft}>
            <ScrollReveal>
              <p className={styles.heroEyebrow}>
                PRECISION AT EVERY STAGE OF PRODUCTION.
              </p>

              <h1 className={styles.heroTitle}>
                Work smarter.<br />
                Waste less.
              </h1>

              <p className={styles.heroDesc}>
                A growing ecosystem of integrated workshop utilities designed to bridge
                the gap between design and physical output. From algorithmic cut
                optimization to real-time stock management, KerfSuite is built for
                serious makers who demand zero-defect workflows.
              </p>

              <div className={styles.heroCtas}>
                <Link href="#apps" className="btn-filled">
                  Explore the Suite
                </Link>
                <Link href="/signup" className="btn-primary">
                  Get Started →
                </Link>
              </div>

              <div className={styles.heroPoweredBy}>
                <span>Powered by</span>
                <span className={styles.heroPoweredByBrand}>Synontech</span>
              </div>
            </ScrollReveal>
          </div>

          {/* Right: Workshop Photo Panel */}
          <div className={styles.heroRight}>
            <div className={styles.heroImageWrap}>
              {/* Workshop stock photo */}
              <img
                src="/images/hero-workshop.jpg"
                alt="Workshop floor — precision manufacturing"
                className={styles.heroImage}
              />
              {/* Black fade overlay */}
              <div className={styles.heroImageOverlay} />
              {/* Corner tag */}
              <div className={styles.heroImageTag}>
                <span className={styles.heroImageTagDot} />
                WORKSHOP IN PRODUCTION
              </div>
            </div>
          </div>
        </section>

        <div className="cyber-divider" />

        {/* ====================================================
            APPLICATION STACK
        ==================================================== */}
        <section id="apps" className={styles.appsSection}>
          <div className="section-inner">
            <ScrollReveal>
              <p className="section-tag">Application Stack</p>
              <h2 className="section-title">The Core <span>Suite</span></h2>
            </ScrollReveal>

            <div className={styles.appsGrid}>

              {/* KerfCut */}
              <ScrollReveal>
                <article className={styles.appCard}>
                  <div className={styles.appCardVisual}>
                    <img src="/svg/kerfcut-wordmark.svg" alt="KerfCut" className={styles.appCardLogo} />
                    <span className={styles.versionTag}>v1.0.0-Beta // ACTIVE</span>
                  </div>
                  <div className={styles.appCardBody}>
                    <p className={styles.appCardDesc}>
                      Algorithmic cut-list optimizer designed to maximize material yield.
                      KerfCut takes your piece lists and packs them into raw sheets using
                      MaxRects and Guillotine logic — instantly.
                    </p>
                    <ul className={styles.featureList}>
                      <li>Smart Sheet Packing (MaxRects + Guillotine)</li>
                      <li>Instant Quoting</li>
                      <li>Grain Direction Locking</li>
                      <li>PDF Cut Plan Export</li>
                    </ul>
                    <div className={styles.appCardActions}>
                      <a
                        href="https://github.com/Feed-Rate/KerfSuite/releases/tag/v1.0.0-beta"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary"
                      >
                        Download KerfCut
                      </a>
                    </div>
                  </div>
                </article>
              </ScrollReveal>

              {/* KerfStock */}
              <ScrollReveal delay={100}>
                <article className={styles.appCard}>
                  <div className={styles.appCardVisual}>
                    <div className={styles.appCardName}>Kerf<span>Stock</span></div>
                    <span className={styles.versionTag}>v0.8.2 // Beta</span>
                  </div>
                  <div className={styles.appCardBody}>
                    <p className={styles.appCardDesc}>
                      Real-time workshop inventory tracking. KerfStock monitors sheet goods,
                      hardware, and offcut inventory — alerting you when stock is low and
                      automatically syncing with KerfCut.
                    </p>
                    <ul className={styles.featureList}>
                      <li>Inventory Monitoring</li>
                      <li>Offcut Management</li>
                      <li>Low Stock Alerts</li>
                      <li>KerfCut Integration</li>
                    </ul>
                    <div className={styles.appCardActions}>
                      <Link href="/login" className="btn-primary">
                        Access Inventory Portal
                      </Link>
                    </div>
                  </div>
                </article>
              </ScrollReveal>

              {/* KerfQuote */}
              <ScrollReveal delay={200}>
                <article className={`${styles.appCard} ${styles.comingSoon}`}>
                  <div className={styles.appCardVisual}>
                    <div className={styles.appCardName}>Kerf<span>Quote</span></div>
                    <span className={styles.versionTagIdle}>Roadmap</span>
                  </div>
                  <div className={styles.appCardBody}>
                    <p className={styles.appCardDesc}>
                      Professional quoting and estimating tool. Generate accurate
                      client-ready quotes directly from KerfCut optimizations with
                      material costs, labour, and margin built in.
                    </p>
                    <ul className={styles.featureList}>
                      <li>Quote Generation</li>
                      <li>Material Cost Calculator</li>
                      <li>Client PDF Output</li>
                      <li>KerfCut Integration</li>
                    </ul>
                    <div className={styles.appCardActions}>
                      <span className="btn-ghost" style={{ cursor: 'not-allowed', opacity: 0.5 }}>
                        On Roadmap
                      </span>
                    </div>
                  </div>
                </article>
              </ScrollReveal>

            </div>
          </div>
        </section>

        <div className="cyber-divider" />

        {/* ====================================================
            TECH STACK STRIP
        ==================================================== */}
        <section className={styles.techStrip}>
          <div className="section-inner">
            <div className={styles.techGrid}>
              {[
                { label: 'Engine', value: 'Custom Heuristics' },
                { label: 'Logic', value: 'MaxRects + Guillotine' },
                { label: 'Database', value: 'PostgreSQL (Cloud)' },
                { label: 'Stack', value: 'Flutter + Next.js' },
                { label: 'Identity', value: 'Supabase Auth' },
              ].map((item) => (
                <div key={item.label} className={styles.techItem}>
                  <p className={styles.techLabel}>{item.label}</p>
                  <p className={styles.techValue}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ====================================================
            PHILOSOPHY
        ==================================================== */}
        <section className={styles.philosophySection}>
          <div className="section-inner">
            <ScrollReveal>
              <p className="section-tag">Philosophy</p>
              <h2 className="section-title">Built for <span>Production</span></h2>
            </ScrollReveal>

            <div className={styles.featuresGrid}>
              {[
                {
                  title: 'Integrated Ecosystem',
                  desc: 'Your workshop data flows between apps. Optimize a cut in KerfCut, and KerfStock automatically marks that material as consumed in the cloud.',
                },
                {
                  title: 'Unified Command',
                  desc: 'KerfPortal gives workshop owners a single command center to manage users, machines, and licenses from any browser, anywhere.',
                },
                {
                  title: 'Professional Accuracy',
                  desc: 'Engineered for precision. Every millimetre of kerf is accounted for, ensuring your cut lists match your physical results perfectly.',
                },
                {
                  title: 'Rapid Deployment',
                  desc: 'Initialize your workshop in minutes. Sign up, generate a key, download the apps, and start optimizing immediately.',
                },
              ].map((f, i) => (
                <ScrollReveal key={f.title} delay={i * 100}>
                  <div className={styles.featureCard}>
                    <h3 className={styles.featureCardTitle}>{f.title}</h3>
                    <p className={styles.featureCardDesc}>{f.desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <div className="cyber-divider" />

        {/* ====================================================
            PRICING
        ==================================================== */}
        <section id="pricing" className={styles.pricingSection}>
          <div className="section-inner">
            <ScrollReveal>
              <p className="section-tag">Licensing</p>
              <h2 className="section-title">Ecosystem <span>Access</span></h2>
              <p className={styles.pricingNote}>
                All licenses include 1 year of updates. Renew annually to continue receiving updates.
              </p>
            </ScrollReveal>

            <div className={styles.pricingGrid}>

              {/* KerfCut Single */}
              <ScrollReveal>
                <div className={`${styles.pricingCard} ${styles.featured}`}>
                  <div className={styles.pricingBadge}>Most Popular</div>
                  <div className={styles.pricingTier}>KerfCut Single Tool</div>
                  <div className={styles.pricingPrice}>$25 <span>/ year</span></div>
                  <ul className={styles.pricingFeatures}>
                    <li>Full access to KerfCut</li>
                    <li>Standard PDF exports</li>
                    <li>Single user license</li>
                    <li>1 year of updates</li>
                    <li>KerfPortal access</li>
                  </ul>
                  <div className={styles.pricingAction}>
                    <form
                      action="https://www.paypal.com/cgi-bin/webscr"
                      method="post"
                      target="_blank"
                      style={{ width: '100%' }}
                    >
                      <input type="hidden" name="cmd" value="_xclick" />
                      <input type="hidden" name="business" value="synontech.sa@gmail.com" />
                      <input type="hidden" name="item_name" value="KerfCut Single Tool Annual License" />
                      <input type="hidden" name="amount" value="25.00" />
                      <input type="hidden" name="currency_code" value="USD" />
                      <input type="hidden" name="return" value="https://kerfsuite.vercel.app/portal" />
                      <input type="hidden" name="cancel_return" value="https://kerfsuite.vercel.app/#pricing" />
                      <input type="hidden" name="no_shipping" value="1" />
                      <input type="hidden" name="no_note" value="1" />
                      <button type="submit" className="btn-filled" style={{ width: '100%', border: 'none' }}>
                        Buy License
                      </button>
                    </form>
                  </div>
                </div>
              </ScrollReveal>

              {/* Full Suite */}
              <ScrollReveal delay={100}>
                <div className={`${styles.pricingCard} ${styles.comingSoon}`}>
                  <div className={styles.pricingTier}>Full Suite</div>
                  <div className={styles.pricingPrice}>$45 <span>/ year</span></div>
                  <ul className={styles.pricingFeatures}>
                    <li>Access to ALL modules</li>
                    <li>Cross-app data sync</li>
                    <li>Priority bug response</li>
                    <li><strong>Get KerfStock free when it launches</strong></li>
                  </ul>
                  <div className={styles.pricingAction}>
                    <button className="btn-ghost" style={{ width: '100%', cursor: 'not-allowed', opacity: 0.5 }} disabled>
                      Suite Coming Soon
                    </button>
                  </div>
                </div>
              </ScrollReveal>

              {/* Workshop Pro */}
              <ScrollReveal delay={200}>
                <div className={`${styles.pricingCard} ${styles.comingSoon}`}>
                  <div className={styles.pricingTier}>Workshop Pro</div>
                  <div className={styles.pricingPrice}>$149 <span>/ year</span></div>
                  <ul className={styles.pricingFeatures}>
                    <li>Full Suite for 5 users</li>
                    <li>Shared network database</li>
                    <li>Priority feature requests</li>
                    <li>Dedicated support channel</li>
                  </ul>
                  <div className={styles.pricingAction}>
                    <button className="btn-ghost" style={{ width: '100%', cursor: 'not-allowed', opacity: 0.5 }} disabled>
                      Workshop Coming Soon
                    </button>
                  </div>
                </div>
              </ScrollReveal>

            </div>

            {/* Pricing meta */}
            <div className={styles.pricingMeta}>
              <div className={styles.pricingMetaCard}>
                <h4>Ecosystem Upgrade Path</h4>
                <p>
                  Start with KerfCut today. When KerfStock launches, upgrade to the Full
                  Suite at a prorated discount — your existing investment carries over fully.
                </p>
              </div>
              <div className={styles.pricingMetaCard}>
                <h4>Precision Guarantee</h4>
                <p>
                  Risk-free optimization. If KerfCut doesn&apos;t improve your material
                  yield, contact us within 14 days for a full refund.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="cyber-divider" />

        {/* ====================================================
            PORTAL CTA BANNER
        ==================================================== */}
        <section className={styles.ctaBanner}>
          <div className="section-inner">
            <h2 className={styles.ctaBannerTitle}>
              Calibrate your <span>workflow.</span>
            </h2>
            <p className={styles.ctaBannerDesc}>
              Already a licensee? Sign in to manage your workspace, machines, and users
              from the KerfSuite command center.
            </p>
            <div className={styles.ctaBannerActions}>
              <Link href="/login" className="btn-filled">
                Open Portal
              </Link>
              <Link href="#pricing" className="btn-primary">
                Initialize License
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
