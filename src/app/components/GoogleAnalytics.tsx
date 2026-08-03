"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const CONSENT_STORAGE_KEY = "kerfsuite.analytics-consent.v1";
const GOOGLE_TAG_SCRIPT_ID = "kerfsuite-google-analytics";

type AnalyticsConsent = "granted" | "denied";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function setGoogleConsent(consent: AnalyticsConsent) {
  window.gtag?.("consent", "update", {
    analytics_storage: consent,
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

function initializeGoogleAnalytics(measurementId: string) {
  if (!window.gtag) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = (...args: unknown[]) => window.dataLayer.push(args);
    window.gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    window.gtag("set", "ads_data_redaction", true);
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
  }

  if (!document.getElementById(GOOGLE_TAG_SCRIPT_ID)) {
    const script = document.createElement("script");
    script.id = GOOGLE_TAG_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(script);
  }
}

function removeGoogleAnalyticsCookies() {
  const hostname = window.location.hostname;

  document.cookie.split(";").forEach((cookie) => {
    const name = cookie.split("=")[0]?.trim();
    if (!name?.startsWith("_ga")) return;

    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=.${hostname}; SameSite=Lax`;
  });
}

export default function GoogleAnalytics({
  measurementId,
}: {
  measurementId: string;
}) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<AnalyticsConsent | null>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    initializeGoogleAnalytics(measurementId);

    const timer = window.setTimeout(() => {
      const savedConsent = window.localStorage.getItem(CONSENT_STORAGE_KEY);
      if (savedConsent === "granted" || savedConsent === "denied") {
        setConsent(savedConsent);
        if (savedConsent === "granted") setGoogleConsent("granted");
        return;
      }

      setPreferencesOpen(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [measurementId]);

  useEffect(() => {
    if (consent !== "granted") return;

    initializeGoogleAnalytics(measurementId);
    window.gtag?.("event", "page_view", {
      page_location: window.location.href,
      page_path: pathname,
      page_title: document.title,
      send_to: measurementId,
    });
  }, [consent, measurementId, pathname]);

  const saveConsent = (choice: AnalyticsConsent) => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
    setConsent(choice);
    setPreferencesOpen(false);

    if (choice === "granted") {
      initializeGoogleAnalytics(measurementId);
      setGoogleConsent("granted");
      return;
    }

    setGoogleConsent("denied");
    removeGoogleAnalyticsCookies();
  };

  return (
    <>
      {preferencesOpen && (
        <section
          className="analytics-consent"
          role="dialog"
          aria-modal="false"
          aria-labelledby="analytics-consent-title"
          aria-describedby="analytics-consent-description"
        >
          <div className="analytics-consent__copy">
            <p className="analytics-consent__eyebrow">Privacy controls</p>
            <h2 id="analytics-consent-title">Optional site analytics</h2>
            <p id="analytics-consent-description">
              Analytics helps us understand how KerfSuite is used and improve the
              experience. Advertising and personalised-ad tracking remain disabled.
              Essential security storage is unaffected.
            </p>
          </div>
          <div className="analytics-consent__actions">
            <button
              type="button"
              className="analytics-consent__button analytics-consent__button--secondary"
              onClick={() => saveConsent("denied")}
            >
              Essential only
            </button>
            <button
              type="button"
              className="analytics-consent__button analytics-consent__button--primary"
              onClick={() => saveConsent("granted")}
            >
              Allow analytics
            </button>
          </div>
        </section>
      )}

      {!preferencesOpen && consent !== null && (
        <button
          type="button"
          className="analytics-preferences"
          onClick={() => setPreferencesOpen(true)}
          aria-label="Change analytics privacy preference"
        >
          Privacy choices
        </button>
      )}
    </>
  );
}