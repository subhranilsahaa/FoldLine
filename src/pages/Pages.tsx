import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import PickPdfs from '../components/Dropzone';
import { usePdfStore } from '../lib/store';
import { ADSENSE_CLIENT, CONTACT_EMAIL } from '../content';
import { META } from '../tools-meta';

const Page = ({ children }: { children: React.ReactNode }) => (
  <article className="prose-fl mx-auto max-w-3xl pt-2">{children}</article>
);


type Vars = React.CSSProperties & Record<`--${string}`, string>;
const v = (o: Record<string, string>) => o as Vars;

/**
 * One small looping scene per tool, each showing that tool's own operation (see .tool-art in index.css).
 * Transform/opacity only, fixed 24x24 viewBox so nothing shifts layout.
 */
function ToolArt({ id, className }: { id: keyof typeof META; className: string }) {
  const pg = { fill: 'var(--card)' };
  let body: React.ReactNode = null;
  switch (id) {
    case 'merge': // three sheets converge into one stack
      body = (<>
        <rect {...pg} className="ta ta-in" style={v({ '--x': '-7px', '--y': '1px' })} x="6" y="5" width="12" height="15" rx="2" />
        <rect {...pg} className="ta ta-in" style={v({ '--x': '7px', '--y': '1px' })} x="6" y="5" width="12" height="15" rx="2" />
        <g className="ta ta-in" style={v({ '--y': '-6px' })}><rect {...pg} x="6" y="5" width="12" height="15" rx="2" /><path d="M9 10h6M9 14h4" /></g>
      </>);
      break;
    case 'organize': // thumbnails reorder 1-2-3 -> 2-3-1
      body = (<>
        <g className="ta ta-out" style={v({ '--x': '14px' })}><rect {...pg} x="2" y="3" width="6" height="9" rx="1.5" /><path d="M4 6.5h2" /></g>
        <g className="ta ta-out" style={v({ '--x': '-7px' })}><rect {...pg} x="9" y="3" width="6" height="9" rx="1.5" /><path d="M11 6.5h2M11 8.5h2" /></g>
        <g className="ta ta-out" style={v({ '--x': '-7px' })}><rect {...pg} x="16" y="3" width="6" height="9" rx="1.5" /><path d="M18 6.5h2M18 8.5h2" /></g>
        <path d="M4 17h16M4 20.5h10" />
      </>);
      break;
    case 'extract': // the chosen page is pulled up out of a stack
      body = (<>
        <rect {...pg} x="4" y="8" width="12" height="13" rx="2" />
        <rect {...pg} x="6" y="6.5" width="12" height="13" rx="2" />
        <g className="ta ta-pull"><rect {...pg} x="8" y="9" width="12" height="12" rx="2" /><rect x="10.5" y="12" width="7" height="2.5" rx="1" fill="var(--hl)" stroke="none" /><path d="M10.5 17.5h5" /></g>
      </>);
      break;
    case 'crop': // crop corners close in on the page
      body = (<>
        <rect {...pg} x="6.5" y="5.5" width="11" height="13" rx="1" />
        <path d="M9 10h6M9 13h4" />
        <g className="ta ta-sq" style={v({ '--s': '.7' })}><path d="M2.5 7.5v-5h5M16.5 2.5h5v5M21.5 16.5v5h-5M7.5 21.5h-5v-5" /></g>
      </>);
      break;
    case 'compress': // page squeezed from top and bottom
      body = (<>
        <g className="ta ta-squash"><rect {...pg} x="5" y="5" width="14" height="14" rx="2" /><path d="M8.5 10h7M8.5 14h7" /></g>
        <path className="ta ta-out" style={v({ '--y': '4px' })} d="M9 1.5l3 3 3-3" />
        <path className="ta ta-out" style={v({ '--y': '-4px' })} d="M9 22.5l3-3 3 3" />
      </>);
      break;
    case 'ocr': // scan bar passes down; text lines appear behind it
      body = (<>
        <rect {...pg} x="5" y="3" width="14" height="18" rx="2" />
        <path className="ta ta-ln ta-r1" d="M8.5 8h7" />
        <path className="ta ta-ln ta-r2" d="M8.5 12h7" />
        <path className="ta ta-ln ta-r3" d="M8.5 16h4.5" />
        <rect className="ta ta-scan" x="3" y="5" width="18" height="2.5" rx="1" fill="var(--hl)" stroke="none" />
      </>);
      break;
    case 'protect': // shackle drops shut and the lock fills yellow
      body = (<>
        <g className="ta ta-in" style={v({ '--y': '-4px' })}><path d="M8 11V8a4 4 0 0 1 8 0v3" /></g>
        <rect {...pg} x="5" y="11" width="14" height="10" rx="2" />
        <rect className="ta ta-fade" x="5.9" y="11.9" width="12.2" height="8.2" rx="1.4" fill="var(--hl)" stroke="none" />
        <circle cx="12" cy="16" r="1.2" fill="currentColor" stroke="none" />
      </>);
      break;
    case 'unlock': // shackle swings open on its hinge
      body = (<>
        <path className="ta ta-swing" d="M8 11V8a4 4 0 0 1 8 0v3" />
        <rect {...pg} x="5" y="11" width="14" height="10" rx="2" />
        <circle cx="12" cy="16" r="1.2" fill="currentColor" stroke="none" />
      </>);
      break;
    case 'convert': // PDF page turns into a Word page: text rewrites itself on the right
      body = (<>
        <rect {...pg} x="2.5" y="4" width="7.5" height="16" rx="1.5" />
        <rect x="4" y="6" width="4.5" height="2.5" rx="1" fill="var(--hl)" stroke="none" />
        <path d="M4 12h4.5M4 15h3" />
        <path className="ta ta-arrow" d="M11 12h2M12.2 10.6 13.6 12l-1.4 1.4" />
        <rect {...pg} x="14.5" y="4" width="7.5" height="16" rx="1.5" />
        <path className="ta ta-ln ta-r1" d="M16 8h4.5" />
        <path className="ta ta-ln ta-r2" d="M16 12h4.5" />
        <path className="ta ta-ln ta-r3" d="M16 16h3" />
      </>);
      break;
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={`tool-art ${className}`}>
      {body}
    </svg>
  );
}

const FEATURED = ['merge', 'extract', 'compress'] as const;

function ToolCard({ id, big }: { id: keyof typeof META; big?: boolean }) {
  const m = META[id];
  return (
    <Link
      to={m.path}
      className={`group flex h-full rounded-[20px] border border-line bg-card hover:border-ink ${big ? 'items-center gap-4 p-5 md:flex-col md:items-start md:gap-6 md:p-6' : 'flex-col gap-3 p-4'}`}
    >
      <span className={`grid shrink-0 place-items-center rounded-2xl bg-line text-ink ${big ? 'size-14 md:size-16' : 'size-11'}`}>
        <ToolArt id={id} className={big ? 'size-7' : 'size-[22px]'} />
      </span>
      <span>
        <span className={`h-display block ${big ? 'text-2xl' : 'text-lg'}`}>{m.title}</span>
        <span className="mt-0.5 block text-[15px] text-mute">{m.outcome}</span>
      </span>
    </Link>
  );
}

export function Home() {
  const count = usePdfStore((s) => s.pages.length);
  const rest = (Object.keys(META) as (keyof typeof META)[]).filter((id) => !(FEATURED as readonly string[]).includes(id));
  return (
    <section className="mx-auto max-w-5xl">
      <div className="grid items-center gap-6 md:grid-cols-[1.2fr_.8fr]">
        <div>
          <h1 className="h-display text-[clamp(2.1rem,7vw,3.6rem)]">PDF tools that stay on your device</h1>
          <p className="mt-3 max-w-[40ch] text-lg text-mute">Merge, split, compress and lock PDFs. Free, with no account.</p>
          <div className="mt-6 max-md:[&>label]:w-full">
            <PickPdfs primary large>{count ? 'Add more PDFs' : 'Choose PDFs'}</PickPdfs>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-sm text-mute">
            <Icon name="lock" className="size-4" />Runs on your device. Nothing uploaded.
          </p>
          <p className="mt-1 text-sm text-mute">
            {count ? `${count} ${count === 1 ? 'page' : 'pages'} ready. Pick a tool below.` : 'Pick a tool below, or drop files anywhere.'}
          </p>
        </div>
        <div className="fan max-md:hidden" aria-hidden="true"><i /><i /><i /></div>
      </div>

      <ul className="mt-8 grid list-none gap-3 p-0 md:grid-cols-3">
        {FEATURED.map((id) => <li key={id}><ToolCard id={id} big /></li>)}
      </ul>
      <ul className="mt-3 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-5">
        {rest.map((id) => <li key={id}><ToolCard id={id} /></li>)}
      </ul>
      <div className="prose-fl mt-14">
        <h2>Why on-device matters for PDFs</h2>
        <p>
          PDFs are often contracts, invoices, IDs and medical letters. Most online PDF tools ask you to upload them to a stranger’s server
          first. Foldline does the work in your browser instead: the file is read into your device’s memory, edited there, and returned
          as a download. There is nothing to upload, so there is nothing to leak, retain or delete later.
        </p>
        <h2>How it works</h2>
        <ol>
          <li>Pick a tool and choose your PDF, or drop it anywhere on the page.</li>
          <li>Arrange, select or crop pages using thumbnails you can see and drag.</li>
          <li>Download the new PDF. Your original file is never changed.</li>
        </ol>
        <p>
          Files you open in one tool carry over to the others, so you can merge a few documents and then trim or reorder the result
          without saving in between.
        </p>
        <h2>Good to know</h2>
        <p>
          Very large PDFs are limited by your device’s memory. If a PDF has a password, Foldline asks for it when you open the file. More tools,
          including signing and watermarks, are planned. Read more <Link to="/about">about Foldline</Link> or the <Link to="/privacy">privacy policy</Link>.
        </p>
      </div>
    </section>
  );
}

export function About() {
  return (
    <Page>
      <h1>About Foldline</h1>
      <p>
        Foldline is a small set of PDF tools that run entirely in your web browser. It exists because everyday jobs like combining two
        documents, pulling out one page or trimming a scanned margin shouldn’t require uploading private files to a third party or
        installing software.
      </p>
      <h2>How it works</h2>
      <p>
        Your browser opens the PDF with pdf.js to draw page thumbnails, and edits it with pdf-lib to build the new file. Both libraries
        run locally in the page. Adding and removing passwords uses qpdf compiled to WebAssembly, and OCR uses Tesseract, which also run in your browser. Foldline’s servers only deliver the website itself; they never receive your documents.
      </p>
      <h2>What you can do today</h2>
      <ul>
        {Object.values(META).map((m) => <li key={m.id}><Link to={m.path}>{m.title}</Link>: {m.blurb}</li>)}
      </ul>
      <h2>How Foldline is funded</h2>
      <p>
        {ADSENSE_CLIENT
          ? 'Foldline is free to use and supported by advertising. Ads are kept away from the controls you use to open and download files, and they never have access to your documents.'
          : 'Foldline is free to use and has no accounts or paywalls.'}
      </p>
      <h2>Feedback</h2>
      <p>Found a bug or want a tool added? Visit the <Link to="/contact">contact page</Link>.</p>
    </Page>
  );
}

export function Contact() {
  return (
    <Page>
      <h1>Contact</h1>
      <p>
        Questions, bug reports and feature ideas are welcome. Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
      <h2>Reporting a bug</h2>
      <p>
        It helps to include the tool you were using, your browser and device, and roughly how large the PDF was. Please don’t attach
        PDFs that contain sensitive information; a description of what went wrong is usually enough.
      </p>
      <p>For how your data is handled, see the <Link to="/privacy">Privacy Policy</Link>, <Link to="/terms">Terms and Conditions</Link>, <Link to="/cookies">Cookie Policy</Link> and <Link to="/disclaimer">Disclaimer</Link>.</p>
    </Page>
  );
}

export function NotFound() {
  return (
    <Page>
      <h1>Page not found</h1>
      <p>That page doesn’t exist. Try one of the tools:</p>
      <ul>{Object.values(META).map((m) => <li key={m.id}><Link to={m.path}>{m.title}</Link></li>)}</ul>
      <p><Link to="/">Back to the home page</Link></p>
    </Page>
  );
}
