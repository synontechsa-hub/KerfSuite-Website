'use client';

import { useState, useEffect } from 'react';
import styles from '../marketing.module.css';

export default function CtaSlideshow() {
  const [index, setIndex] = useState(0);
  const totalSlides = 8;
  const slidePairs = [0, 2, 4, 6];

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 2) % totalSlides);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={styles.ctaSlideshowContainer}>
      {/* Primary Structural Frame from Mock-up */}
      <img
        src="/svg/marketing/cta/boxes.svg"
        alt=""
        className={styles.ctaFrameOverlay}
        style={{ width: '1920px', height: '1000px', position: 'absolute', top: '-337px', left: 0 }}
      />

      <div className={styles.ctaSlideshowFrame}>
        <div className={styles.ctaSlidePanel}>
          <div className={styles.ctaMonitorOverlay} />
          <div className={styles.ctaScanline} />
          <img
            src={`/images/marketing/cta/slide-${index + 1}.jpg`}
            alt={`Workshop View ${index + 1}`}
            className={styles.ctaSlideImage}
            key={`left-${index}`}
          />
        </div>
        <div className={styles.ctaSlidePanel}>
          <div className={styles.ctaMonitorOverlay} />
          <div className={styles.ctaScanline} />
          <img
            src={`/images/marketing/cta/slide-${index + 2}.jpg`}
            alt={`Workshop View ${index + 2}`}
            className={styles.ctaSlideImage}
            key={`right-${index}`}
          />
        </div>
      </div>

      <div className={styles.ctaIndicators}>
        {slidePairs.map((p) => (
          <div
            key={p}
            className={`${styles.ctaIndicator} ${index === p ? styles.active : ''}`}
            onClick={() => setIndex(p)}
          >
            <span className={styles.ctaIndicatorLabel}>POS-{p/2 + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
