import { useEffect, useRef } from 'react';
import { ADSENSE_CLIENT, ADSENSE_SLOT } from '../content';
import { initAds } from '../lib/ads';

/**
 * One responsive AdSense unit with a reserved height so the page doesn't jump.
 * Renders nothing until VITE_ADSENSE_CLIENT and VITE_ADSENSE_SLOT are set.
 * Only place it between content sections, never beside the drop area or the download button.
 * Routes remount it on navigation, so each page requests its own ad.
 */
export default function AdSlot() {
  const pushed = useRef(false);
  const enabled = !!ADSENSE_CLIENT && !!ADSENSE_SLOT;
  useEffect(() => {
    if (!enabled || pushed.current) return;
    pushed.current = true;
    initAds();
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* ad blocked or already filled */ }
  }, [enabled]);
  if (!enabled) return null;
  return (
    <aside aria-label="Advertisement" className="my-10 min-h-[280px]">
      <p className="mb-1 text-center text-[11px] uppercase tracking-wider text-mute">Advertisement</p>
      <ins className="adsbygoogle" style={{ display: 'block', minHeight: 250 }} data-ad-client={ADSENSE_CLIENT} data-ad-slot={ADSENSE_SLOT} data-ad-format="auto" data-full-width-responsive="true" />
    </aside>
  );
}
