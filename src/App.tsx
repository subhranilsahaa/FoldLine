import { Suspense, useEffect, useRef } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { TOOLS } from './tools';
import { SOON } from './tools-meta';
import { usePdfStore } from './lib/store';
import Icon from './components/Icon';
import Notice from './components/Notice';
import PasswordPrompt from './components/PasswordPrompt';
import ThemeToggle from './components/ThemeToggle';
import DoneCard from './components/DoneCard';
import Footer from './components/Footer';
import ToolContent from './components/ToolContent';
import { About, Contact, Home, NotFound } from './pages/Pages';
import { Cookies, Disclaimer, Privacy, Terms } from './pages/Legal';
import { headFor, normalizePath } from './content';

function setMeta(selector: string, create: () => HTMLElement, attr: string, value: string) {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) { el = create(); document.head.appendChild(el); }
  el.setAttribute(attr, value);
}

/** Keeps title, description and canonical in sync on client-side navigation (prerendering sets them for first load). */
function useHead(pathname: string) {
  useEffect(() => {
    const h = headFor(pathname);
    document.title = h.title;
    setMeta('meta[name="description"]', () => Object.assign(document.createElement('meta'), { name: 'description' }), 'content', h.description);
    setMeta('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }), 'href', h.canonical);
  }, [pathname]);
}

export default function App() {
  const { pathname, hash } = useLocation();
  const pageCount = usePdfStore((s) => s.pages.length);
  const hasPages = pageCount > 0;
  const reset = usePdfStore((s) => s.reset);
  const addFiles = usePdfStore((s) => s.addFiles);
  const here = normalizePath(pathname);
  useHead(here);
  const navRef = useRef<HTMLElement>(null);
  // A new page opens at the top (router navigation otherwise keeps the old scroll position), unless the link points to a #section.
  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash]);

  // Keep the current tool's chip in view in the scrollable mobile tool row.
  useEffect(() => {
    const el = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: calm ? 'auto' : 'smooth' });
  }, [here]);

  // Drop PDFs anywhere on the page.
  useEffect(() => {
    const isFiles = (e: DragEvent) => !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files');
    const end = () => document.body.classList.remove('is-dragging');
    const over = (e: DragEvent) => { if (isFiles(e)) { e.preventDefault(); document.body.classList.add('is-dragging'); } };
    const drop = (e: DragEvent) => { if (isFiles(e)) { e.preventDefault(); end(); void addFiles(e.dataTransfer!.files); } };
    document.addEventListener('dragover', over);
    const leave = (e: DragEvent) => { if (!e.relatedTarget) end(); }; // only when the drag leaves the window
    document.addEventListener('dragleave', leave);
    document.addEventListener('drop', drop);
    return () => {
      document.removeEventListener('dragover', over);
      document.removeEventListener('dragleave', leave);
      document.removeEventListener('drop', drop);
    };
  }, [addFiles]);

  return (
    <div className="grid min-h-dvh grid-rows-[auto_auto_1fr] md:grid-cols-[240px_minmax(0,1fr)] md:grid-rows-[auto_1fr]">
      <header className="flex items-center gap-3 border-b border-line bg-panel px-4 py-2 md:col-span-2 md:px-5">
        <Link to="/" className="flex min-h-11 items-center gap-2.5 font-display text-[21px] font-bold tracking-tight">
          <span className="grid size-[28px] place-items-center rounded-lg bg-hl text-hl-ink"><Icon name="fold" /></span>
          Foldline
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line py-1 pl-2 pr-3 text-[13px] text-mute max-sm:px-2">
          <Icon name="lock" className="size-3.5" />
          <span className="max-sm:sr-only">Runs on your device</span>
        </span>
        <span className="flex-1" />
        <ThemeToggle />
        {hasPages && (
          <span
            title="Your loaded pages carry over to every tool"
            className="inline-flex items-center gap-1.5 rounded-full bg-hl px-2.5 py-1 text-[13px] font-semibold text-hl-ink"
          >
            <Icon name="file" className="size-3.5" />
            {pageCount}<span className="max-sm:sr-only">{pageCount === 1 ? ' page' : ' pages'} ready</span>
          </span>
        )}
        {hasPages && <button className="btn" onClick={reset}>Start over</button>}
      </header>

      <nav
        ref={navRef} aria-label="Tools"
        className="sticky top-0 z-30 flex gap-1.5 overflow-x-auto border-b border-line bg-panel px-3 py-2 [scrollbar-width:none] md:max-h-dvh md:flex-col md:gap-1 md:self-start md:overflow-x-visible md:overflow-y-auto md:border-b-0 md:border-r md:px-3 md:py-3.5"
      >
        {TOOLS.map((t) => (
          <NavLink
            key={t.id}
            to={t.path}
            className={({ isActive }) =>
              `flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 text-[15px] font-semibold leading-tight md:gap-3 md:py-2 ${isActive ? 'bg-ink text-desk' : 'hover:bg-line'}`
            }
          >
            <Icon name={t.icon} />
            <span>
              {t.title}
              <small className="hidden text-xs font-normal opacity-75 md:block">{t.short}</small>
            </span>
          </NavLink>
        ))}
        <p className="mt-4 hidden px-3 text-xs text-mute md:block">Coming soon</p>
        {SOON.map((t) => (
          <div key={t.id} aria-disabled="true" className="hidden items-center gap-3 rounded-xl px-3 py-2 text-sm text-mute opacity-70 md:flex">
            <Icon name={t.icon} />
            {t.title}
          </div>
        ))}
      </nav>

      <main className="min-w-0 px-[clamp(16px,3vw,44px)] pb-[calc(var(--dock-h,0px)+var(--done-h,0px)+5rem)] pt-5 md:pt-6">
        <Suspense fallback={<p className="text-mute">Loading…</p>}>
          <Routes>
            <Route path="/" element={<Home />} />
            {TOOLS.map((t) => <Route key={t.id} path={t.path} element={<><t.component /><ToolContent meta={t} /></>} />)}
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="/disclaimer" element={<Disclaimer />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Footer />
      </main>
      <DoneCard />
      <Notice />
      <PasswordPrompt />
    </div>
  );
}
