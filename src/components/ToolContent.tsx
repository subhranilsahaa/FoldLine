import { Link } from 'react-router-dom';
import { ADSENSE_CLIENT, RELATED, TOOL_COPY } from '../content';
import { META, type ToolMeta } from '../tools-meta';
import AdSlot from './AdSlot';

/** Crawlable, readable content shown under every tool: how it works, privacy, FAQ. */
export default function ToolContent({ meta }: { meta: ToolMeta }) {
  const copy = TOOL_COPY[meta.id as keyof typeof META];
  const related = RELATED[meta.id as keyof typeof META].map((id) => META[id]);
  return (
    <div className="prose-fl mx-auto mt-16 max-w-3xl border-t border-line pt-10">
      <h2>How it works</h2>
      <p>{copy.intro}</p>
      <ol>{copy.steps.map((s) => <li key={s}>{s}</li>)}</ol>

      <h2>Your files stay on your device</h2>
      <p>
        When you choose a PDF, your browser reads it into memory and the code on this page edits it there. The file is never
        sent to Foldline’s servers or to anyone else; you can confirm this by watching the network tab in your browser’s developer tools.
        {ADSENSE_CLIENT && ' This page does load advertising scripts from Google, which are separate from your files. See the '}
        {ADSENSE_CLIENT && <Link to="/privacy">privacy policy</Link>}
        {ADSENSE_CLIENT && ' for details.'}
      </p>

      <AdSlot />

      <h2>Frequently asked questions</h2>
      {copy.faq.map((f) => (
        <div key={f.q}>
          <h3>{f.q}</h3>
          <p>{f.a}</p>
        </div>
      ))}

      <h2>Related PDF tools</h2>
      <ul>
        {related.map((m) => <li key={m.id}><Link to={m.path}>{m.anchor}</Link>: {m.outcome}</li>)}
      </ul>
    </div>
  );
}
