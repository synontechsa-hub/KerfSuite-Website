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

      <main className={styles.scrollContainer}>
        {/* ====================================================
            HERO — Split Panel Design
        ==================================================== */}
        <section className={styles.hero}>
          <div className={styles.heroBackground} />

          <div className={styles.heroPhotoWrap}>
            <img
              src="/images/marketing/hero/hero-photo.jpg"
              alt="CNC laser cutting metal on the production floor"
              className={styles.heroPhoto}
            />
          </div>

          <div className="splitInner" style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', alignItems: 'center' }}>
            <div className={styles.heroContent}>
              <ScrollReveal>
                <p className={styles.heroEyebrow}>
                  PRECISION AT EVERY STAGE OF PRODUCTION.
                </p>

                <h1 className={styles.heroTitle}>
                  WORK<br />
                  SMARTER.<br />
                  WASTE <span>LESS.</span>
                </h1>

                <p className={styles.heroDesc}>
                  A growing ecosystem of integrated workshop utilities designed to bridge
                  the gap between design and physical output. From algorithmic cut
                  optimization to real-time stock management, KerfSuite is built for
                  serious makers who demand zero-defect workflows.
                </p>

                <div className={styles.heroCtas}>
                  <Link href="#apps" className={styles.heroBtnExplore} aria-label="Explore the Suite" />
                  <Link href="/signup" className={styles.heroBtnStarted} aria-label="Get Started" />
                </div>

                <div className={styles.heroElements}>
                  <div className={styles.heroPoweredBy}>
                    <span>Powered by</span>
                    <img src="/svg/marketing/hero/element-powered.svg" alt="Synontech" className={styles.heroElementPowered} />
                  </div>
                  <img src="/svg/marketing/hero/element-feedrate.svg" alt="Feed Rate" className={styles.heroElementFeedRate} />
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        <div className="cyber-divider" />
        {/* ====================================================
            ABOUT SECTION — Industrial Layout
        ==================================================== */}
        <section id="about" className={styles.aboutSection}>
          <div className={styles.aboutBackground} />

          <div className={styles.aboutPhotoWrap}>
            <img
              src="/images/marketing/about/about-photo.png"
              alt="CNC machinery in a workshop"
              className={styles.aboutPhoto}
            />
          </div>

          <div className={styles.aboutContentContainer}>
            <div className={styles.aboutContent}>
              <ScrollReveal>
                <p className={styles.aboutEyebrow}>ABOUT</p>
                <h2 className={styles.aboutHeadline}>
                  SERIOUS<br />
                  <span>TOOLS</span> FOR<br />
                  ALL YOUR <span>NEEDS.</span>
                </h2>
                <div className={styles.aboutBody}>
                  <p>
                    SynonTech develops purposeful software designed to solve real-world problems.
                    From AI tools and productivity applications to custom web solutions, our focus
                    is on building practical software for industries we know firsthand. We create
                    tools that improve efficiency, simplify workflows, and help businesses get more done.
                  </p>
                  <p>
                    KerfSuite was created specifically for manufacturing and woodworking. Whether
                    you&apos;re running a commercial workshop or building projects in your garage,
                    our applications are designed around the realities of the workshop floor.
                    KerfCut is the first application in the ecosystem and forms the foundation
                    for everything that follows.
                  </p>
                  <p>
                    Already in development is KerfStock, KerfCut&apos;s companion inventory manager.
                    Together, the two applications create a connected workflow where off-cuts
                    generated during optimization are automatically recorded with their exact
                    dimensions and job references. Instead of valuable material being misplaced,
                    forgotten, or mislabelled, every usable piece remains accounted for.
                  </p>
                  <p>
                    KerfSuite is just the beginning. Additional applications are already planned
                    to expand the ecosystem, addressing more of the everyday challenges faced in
                    modern workshops. As the platform grows, each new tool will integrate
                    seamlessly with the others, creating a unified production environment
                    designed to save time, reduce waste, and improve productivity. Follow our
                    development journey to see what&apos;s coming next.
                  </p>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>


        {/* ====================================================
            PHILOSOPHY
        ==================================================== */}
        <section id="philosophy" className={styles.philosophySection}>
          {/* Background */}
          <div className={styles.philosophyBackground} />

          {/* Right-side photo panel */}
          <div className={styles.philosophyPhotoWrap}>
            <img
              src="/images/marketing/philosophy/philosophy-photo.jpg"
              alt="Engineer operating CNC machinery"
              className={styles.philosophyPhoto}
            />
          </div>

          {/* Left-side text content */}
          <div className={styles.philosophyInner}>
            <ScrollReveal>
              <p className={styles.philosophyEyebrow}>Philosophy</p>
              <h2 className={styles.philosophyHeadline}>
                Built For<br />
                <span>Production.</span>
              </h2>
              <p className={styles.philosophyTagline}>
                We don&apos;t build generic SaaS applications. We engineer rugged software
                designed for the speed, precision, and demands of the modern workshop.
                Every tool in KerfSuite is built with one goal in mind: helping professionals
                work smarter, waste less, and stay in control of their production.
              </p>
            </ScrollReveal>

            <div className={styles.philosophyFeatures}>
              {[
                {
                  title: 'Integrated Ecosystem',
                  desc: 'Your workshop data moves seamlessly between applications. Optimize a cut in KerfCut, and KerfStock automatically records the remaining material, updates inventory, and keeps your workshop synchronized in the cloud.',
                },
                {
                  title: 'Unified Command Center',
                  desc: 'KerfPortal provides a centralized dashboard for managing users, licenses, machines, and your entire KerfSuite ecosystem from any browser, anywhere.',
                },
                {
                  title: 'Precision by Design',
                  desc: 'Every millimetre matters. KerfSuite accounts for every kerf, off-cut, and material dimension to ensure your digital cut lists accurately reflect real-world production.',
                },
                {
                  title: 'Rapid Deployment',
                  desc: 'Get up and running in minutes. Create an account, activate your license, download your tools, and begin optimizing your workflow immediately.',
                },
              ].map((f, i) => (
                <ScrollReveal key={f.title} delay={i * 100}>
                  <div className={styles.philosophyFeatureItem}>
                    <h3 className={styles.philosophyFeatureTitle}>{f.title}</h3>
                    <p className={styles.philosophyFeatureDesc}>{f.desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
        <div className="cyber-divider" />

        {/* ====================================================
            PRODUCTS
        ==================================================== */}
        <section id="apps" className={styles.appsSection}>
          <div className="section-inner">
            <ScrollReveal>
              <p className="section-tag">Products</p>
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
        <MarketingFooter />
      </main>
    </div>
  );
}
