import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { usePdfStore } from '../lib/store';
import type { ToolMeta } from '../tools-meta';
import PickPdfs from './Dropzone';
import Icon from './Icon';
import HeroScene, { HERO_SCENE_IDS, prefersReducedMotion, useHeroReplay } from './HeroScene';

/** Tool ids that don't have their own scene but share another tool's (see HeroScene aliases). */
const SCENE_ALIAS: Record<string, string> = { split: 'extract', lock: 'protect' };

/**
 * Animated hero illustration: plays once when scrolled into view, and again on hover / tap.
 * Falls back to the static sheet fan for tools without a scene. Honours prefers-reduced-motion
 * (the global rule collapses animation durations, and we also skip auto-play).
 */
function Hero({ toolId }: { toolId: string }) {
  const sceneId = SCENE_ALIAS[toolId] ?? toolId;
  const hasScene = HERO_SCENE_IDS.includes(sceneId);
  const ref = useRef<HTMLDivElement>(null);
  const [play, replay] = useHeroReplay();
  const [wait, setWait] = useState(false);

  // Hold the first frame until the hero is mostly on screen, then play once (layout effect: no flash of the finished frame).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!hasScene || !el || prefersReducedMotion()) return;
    if (typeof IntersectionObserver === 'undefined') { replay(); return; }
    setWait(true);
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); setWait(false); replay(); }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [hasScene, replay]);

  if (!hasScene) return <div className="fan max-md:order-1" aria-hidden="true"><i /><i /><i /></div>;
  return (
    <div ref={ref} className="max-md:order-1" aria-hidden="true" onMouseEnter={() => replay()} onClick={() => replay()}>
      <HeroScene id={sceneId} play={play} wait={wait} className="mx-auto max-w-[420px]" />
    </div>
  );
}

/**
 * Page frame for every tool: the one <h1> and a short description are always visible.
 * With no files loaded it shows one obvious action (Choose PDFs) over an animated hero, otherwise the tool UI.
 */
export default function ToolShell({ meta, children, hasContent }: { meta: ToolMeta; children: ReactNode; hasContent?: boolean }) {
  const hasPages = usePdfStore((s) => s.pages.length > 0);
  const active = hasContent !== undefined ? hasContent : hasPages;
  return (
    <section>
      <h1 className="h-display text-[28px] md:text-4xl">{meta.h1}</h1>
      <p className="mt-1.5 max-w-[60ch] text-mute">{meta.blurb}</p>
      {active ? children : (
        <div className="mx-auto mt-6 grid max-w-4xl items-center gap-4 md:mt-10 md:grid-cols-[1.1fr_.9fr] md:gap-8">
          <div className="max-md:order-2">
            <h2 className="h-display mb-3 text-3xl md:text-5xl">{meta.dropTitle}</h2>
            <p className="mb-6 max-w-[44ch] text-lg text-mute">{meta.dropHint}</p>
            <div className="max-md:[&>label]:w-full">
              <PickPdfs primary large>Choose PDFs</PickPdfs>
            </div>
            <p className="mt-3.5 flex items-center gap-1.5 text-sm text-mute">
              <Icon name="lock" className="size-4" />Runs on your device. Nothing uploaded.
            </p>
            <p className="mt-1 text-[13px] text-mute max-md:hidden">Or drop files anywhere on this page.</p>
          </div>
          <Hero toolId={meta.id} />
        </div>
      )}
    </section>
  );
}
