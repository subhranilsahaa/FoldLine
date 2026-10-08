import { ADSENSE_CLIENT } from '../content';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
    googlefc?: { showRevocationMessage?: () => void };
  }
}

let started = false;

/**
 * Loads Google's consent message (Funding Choices), then AdSense unless index.html already
 * loaded it (it does, so Google can verify the site). Never adds a second adsbygoogle.js.
 * Does nothing unless VITE_ADSENSE_CLIENT is set. Copy the exact consent snippet from
 * AdSense > Privacy & messaging if Google's current version differs from this one.
 */
export function initAds() {
  if (started || !ADSENSE_CLIENT || typeof document === 'undefined') return;
  started = true;
  const pub = ADSENSE_CLIENT.replace(/^ca-/, '');

  const fc = document.createElement('script');
  fc.async = true;
  fc.src = `https://fundingchoicesmessages.google.com/i/${pub}?ers=1`;
  document.head.appendChild(fc);

  // Tells the consent message that it is present.
  const signal = () => {
    if ((window.frames as unknown as Record<string, unknown>)['googlefcPresent']) return;
    if (!document.body) { setTimeout(signal, 0); return; }
    const f = document.createElement('iframe');
    f.name = 'googlefcPresent';
    f.style.cssText = 'display:none;width:0;height:0;border:none';
    document.body.appendChild(f);
  };
  signal();

  if (document.querySelector('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')) return;
  const ad = document.createElement('script');
  ad.async = true;
  ad.crossOrigin = 'anonymous';
  ad.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
  document.head.appendChild(ad);
}

/** Reopens the consent message so visitors can change their choice (EEA, UK, Switzerland). */
export function openPrivacySettings() {
  window.googlefc?.showRevocationMessage?.();
}
