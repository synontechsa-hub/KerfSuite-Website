import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import GoogleAnalytics from "@/app/components/GoogleAnalytics";

jest.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

const measurementId = "G-HJSZ8LEQKH";
const storageKey = "kerfsuite.analytics-consent.v1";

describe("GoogleAnalytics", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.localStorage.clear();
    document.getElementById("kerfsuite-google-analytics")?.remove();
    delete window.gtag;
    window.dataLayer = [];
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  function finishConsentCheck() {
    act(() => {
      jest.runOnlyPendingTimers();
    });
  }

  it("initializes Google consent mode with storage denied before the visitor chooses", () => {
    render(<GoogleAnalytics measurementId={measurementId} />);
    finishConsentCheck();

    expect(screen.getByRole("dialog", { name: /optional site analytics/i })).toBeInTheDocument();
    expect(document.getElementById("kerfsuite-google-analytics")).toHaveAttribute(
      "src",
      `https://www.googletagmanager.com/gtag/js?id=${measurementId}`,
    );
  });

  it("loads the correct Google tag after analytics consent", () => {
    render(<GoogleAnalytics measurementId={measurementId} />);
    finishConsentCheck();

    fireEvent.click(screen.getByRole("button", { name: /allow analytics/i }));

    const script = document.getElementById("kerfsuite-google-analytics");
    expect(script).toHaveAttribute(
      "src",
      `https://www.googletagmanager.com/gtag/js?id=${measurementId}`,
    );
    expect(window.localStorage.getItem(storageKey)).toBe("granted");
    expect(screen.getByRole("button", { name: /change analytics privacy preference/i })).toBeInTheDocument();
  });

  it("keeps analytics storage denied when analytics is declined", () => {
    render(<GoogleAnalytics measurementId={measurementId} />);
    finishConsentCheck();

    fireEvent.click(screen.getByRole("button", { name: /essential only/i }));

    expect(window.localStorage.getItem(storageKey)).toBe("denied");
    expect(document.getElementById("kerfsuite-google-analytics")).toHaveAttribute(
      "src",
      `https://www.googletagmanager.com/gtag/js?id=${measurementId}`,
    );
  });

  it("honours a previously granted choice on later visits", () => {
    window.localStorage.setItem(storageKey, "granted");

    render(<GoogleAnalytics measurementId={measurementId} />);
    finishConsentCheck();

    expect(document.getElementById("kerfsuite-google-analytics")).toHaveAttribute(
      "src",
      `https://www.googletagmanager.com/gtag/js?id=${measurementId}`,
    );
  });
});