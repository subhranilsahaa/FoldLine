import { Link } from 'react-router-dom';
import { META } from '../tools-meta';
import { ADSENSE_CLIENT } from '../content';
import { openPrivacySettings } from '../lib/ads';

export default function Footer() {
  return (
    <footer className="mx-auto mt-20 max-w-3xl border-t border-line pt-6 text-sm text-mute">
      <nav aria-label="All PDF tools">
        <p className="mb-2 font-semibold text-ink">PDF tools</p>
        <ul className="grid list-none grid-cols-1 gap-x-6 p-0 sm:grid-cols-2">
          {Object.values(META).map((m) => (
            <li key={m.id}><Link className="inline-flex min-h-11 items-center hover:text-ink hover:underline" to={m.path}>{m.anchor}</Link></li>
          ))}
        </ul>
      </nav>
      <div className="mt-4 flex flex-wrap items-center gap-x-6">
        <span>Foldline</span>
        <Link className="inline-flex min-h-11 items-center hover:text-ink hover:underline" to="/about">About</Link>
        <Link className="inline-flex min-h-11 items-center hover:text-ink hover:underline" to="/privacy">Privacy</Link>
        <Link className="inline-flex min-h-11 items-center hover:text-ink hover:underline" to="/terms">Terms</Link>
        <Link className="inline-flex min-h-11 items-center hover:text-ink hover:underline" to="/cookies">Cookies</Link>
        <Link className="inline-flex min-h-11 items-center hover:text-ink hover:underline" to="/disclaimer">Disclaimer</Link>
        <Link className="inline-flex min-h-11 items-center hover:text-ink hover:underline" to="/contact">Contact</Link>
        {ADSENSE_CLIENT && (
          <button type="button" onClick={openPrivacySettings} className="inline-flex min-h-11 items-center hover:text-ink hover:underline">Ad privacy settings</button>
        )}
      </div>
    </footer>
  );
}
