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
            PRODUCTS — Split Panel Design (Text Right, Photo Left)
        ==================================================== */}
        <section id="apps" className={styles.productsSection}>
          {/* Background */}
          <div className={styles.productsBackground} />

          {/* Left-side photo panel */}
          <div className={styles.productsPhotoWrap}>
            <img
              src="/images/marketing/products/products-photo.jpg"
              alt="Industrial controller with operator finger pressing button"
              className={styles.productsPhoto}
            />
          </div>

          {/* Right-side text content and grid */}
          <div className={styles.productsContentContainer}>
            <div className={styles.productsContent}>
              <ScrollReveal>
                <p className={styles.productsEyebrow}>PRODUCTS</p>
                <h2 className={styles.productsHeadline}>
                  EVERY TOOL.<br />
                  ONE <span>ECOSYSTEM.</span>
                </h2>
                <div className={styles.productsBody}>
                  <p>
                    KerfSuite is a growing ecosystem of integrated workshop applications designed to work
                    together from day one. Instead of isolated tools and disconnected workflows, each application
                    shares data wherever possible, reducing manual input, eliminating duplicate work, and minimizing
                    costly human error.
                  </p>
                  <p>
                    KerfCut is the first application available today, delivering intelligent nesting and material
                    optimization for workshops of every size. Already in development is KerfStock, a companion
                    inventory manager that works seamlessly alongside KerfCut. Together, they create a connected
                    workflow where optimized cuts, off-cuts, and inventory remain synchronized automatically,
                    giving you complete visibility over your materials.
                  </p>
                  <p>
                    As the KerfSuite ecosystem expands, every new application will integrate into the platform,
                    creating a unified production environment that grows alongside your workshop.
                  </p>
                </div>

                {/* Grid of 12 app logo buttons */}
                <div className={styles.productsAppGrid}>
                  
                  {/* KerfCut (Active with Popup) */}
                  <div className={`${styles.appGridItem} ${styles.activeItem}`}>
                    <div className={styles.appLogoBtn}>
                      Kerf<span>Cut</span>
                    </div>
                    <div className={styles.appPopup}>
                      <div className={styles.popupHeader}>
                        <span className={styles.popupName}>Kerf<span>Cut</span></span>
                        <span className={styles.popupBadge}>v1.0.0-Beta // ACTIVE</span>
                      </div>
                      <p className={styles.popupDesc}>
                        KerfCut is built for CNC flatbeds, guillotines, and cut-off saws. Its optimized cut layouts minimize material waste so your operators can stop doing mental maths and get back to cutting.
                      </p>
                      <div className={styles.popupActions}>
                        <a
                          href="https://github.com/Feed-Rate/KerfSuite/releases/tag/v1.0.0-beta"
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.popupBtn}
                        >
                          Download
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* KerfStock (Active with Popup) */}
                  <div className={`${styles.appGridItem} ${styles.activeItem}`}>
                    <div className={styles.appLogoBtn}>
                      Kerf<span>Stock</span>
                    </div>
                    <div className={styles.appPopup}>
                      <div className={styles.popupHeader}>
                        <span className={styles.popupName}>Kerf<span>Stock</span></span>
                        <span className={styles.popupBadge}>v0.8.2 // Beta</span>
                      </div>
                      <p className={styles.popupDesc}>
                        KerfStock is KerfCut&apos;s dedicated inventory companion. Access your full material stock at a glance, on desktop, mobile, or in the browser, letting you connect whenever, wherever you like.
                      </p>
                      <div className={styles.popupActions}>
                        <Link href="/login" className={styles.popupBtn}>
                          Access Portal
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Remaining 10 apps (Inactive / Roadmap) */}
                  {[
                    { prefix: 'Kerf', suffix: 'Vendor' },
                    { prefix: 'Kerf', suffix: 'Plot' },
                    { prefix: 'Kerf', suffix: 'Job' },
                    { prefix: 'Kerf', suffix: 'Flow' },
                    { prefix: 'Kerf', suffix: 'Mill' },
                    { prefix: 'Kerf', suffix: 'Run' },
                    { prefix: 'Kerf', suffix: 'Tack' },
                    { prefix: 'Kerf', suffix: 'Hub' },
                    { prefix: 'Kerf', suffix: 'Quote' },
                    { prefix: 'Kerf', suffix: 'Ledger' },
                  ].map((app) => (
                    <div key={app.suffix} className={`${styles.appGridItem} ${styles.inactiveItem}`}>
                      <div className={styles.appLogoBtn}>
                        {app.prefix}<span>{app.suffix}</span>
                      </div>
                    </div>
                  ))}

                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        <div className="cyber-divider" />


        {/* ====================================================
            PRICING — Asset Integrated Design
        ==================================================== */}
        <section id="pricing" className={styles.pricingSection}>
          <div className={styles.pricingBackground} />

          <div className={styles.pricingInner}>
            <div className={styles.pricingTextContainer}>
              <img src="/svg/marketing/pricing/text-category.svg" alt="Licensing" className={styles.pricingCategory} />
              <img src="/svg/marketing/pricing/text-heading.svg" alt="Licensing and Ecosystem Access" className={styles.pricingHeading} />
              <img src="/svg/marketing/pricing/text-body.svg" alt="Prorated ecosystem upgrades, Material yield guarantee, Customer support, and Early adopter price locks." className={styles.pricingBody} />
            </div>

            <div className={styles.pricingGrid}>
              {/* Card 1: KerfCut Single */}
              <ScrollReveal delay={300}>
                <div className={styles.pricingCard}>
                  <img src="/svg/marketing/pricing/card-1.svg" alt="KerfCut Single Tool - $25/year" className={styles.pricingCardImg} />
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
                      <button type="submit" className="btn-filled" style={{ width: '100%', border: 'none', height: '38px', borderRadius: '7px', cursor: 'pointer', fontFamily: 'Orbitron', fontWeight: 'bold' }}>
                        BUY LICENSE
                      </button>
                    </form>
                  </div>
                </div>
              </ScrollReveal>

              {/* Card 2: KerfStock */}
              <ScrollReveal delay={400}>
                <div className={styles.pricingCard}>
                  <img src="/svg/marketing/pricing/card-2.svg" alt="KerfStock Tool - $40/year" className={styles.pricingCardImg} />
                  <div className={styles.pricingAction}>
                    <button className="btn-filled" style={{ width: '100%', border: 'none', height: '38px', borderRadius: '7px', opacity: 0.5, cursor: 'not-allowed', fontFamily: 'Orbitron', fontWeight: 'bold' }}>
                      COMING SOON
                    </button>
                  </div>
                </div>
              </ScrollReveal>

              {/* Card 3: Full Suite */}
              <ScrollReveal delay={500}>
                <div className={styles.pricingCard}>
                  <img src="/svg/marketing/pricing/card-3.svg" alt="KerfSuite Full Suite - $99/year" className={styles.pricingCardImg} />
                  <div className={styles.pricingAction}>
                    <button className="btn-filled" style={{ width: '100%', border: 'none', height: '38px', borderRadius: '7px', opacity: 0.5, cursor: 'not-allowed', fontFamily: 'Orbitron', fontWeight: 'bold' }}>
                      COMING SOON
                    </button>
                  </div>
                </div>
              </ScrollReveal>

              {/* Card 4: Workshop Tier */}
              <ScrollReveal delay={600}>
                <div className={styles.pricingCard}>
                  <img src="/svg/marketing/pricing/card-4.svg" alt="Workshop Tier - $299/year" className={styles.pricingCardImg} />
                  <div className={styles.pricingAction} style={{ width: '354px' }}>
                    <button className="btn-filled" style={{ width: '100%', border: 'none', height: '38px', borderRadius: '7px', opacity: 0.5, cursor: 'not-allowed', fontFamily: 'Orbitron', fontWeight: 'bold' }}>
                      COMING SOON
                    </button>
                  </div>
                </div>
              </ScrollReveal>
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
