import { usePdfStore } from '../lib/store';
import Icon from './Icon';
import PickPdfs from './Dropzone';
import { useAutoName } from '../lib/settings';

/** One chip per loaded PDF (with page count and remove), an "Add PDFs" button and the "Name files automatically" setting. */
export default function FileChips() {
  const [auto, setAuto] = useAutoName();
  const docs = usePdfStore((s) => s.docs);
  const pages = usePdfStore((s) => s.pages);
  const removeDoc = usePdfStore((s) => s.removeDoc);
  const counts = new Map<string, number>();
  pages.forEach((p) => counts.set(p.docId, (counts.get(p.docId) ?? 0) + 1));
  const shown = Object.values(docs).filter((d) => counts.has(d.id));

  return (
    <div className="mb-1 mt-4 flex flex-wrap gap-2">
      {shown.map((d, i) => (
        <span key={d.id} className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-line bg-card py-1 pl-3 pr-1 text-[13px]">
          {shown.length > 1 && <i aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: `var(--f${i % 6})` }} />}
          <b className="max-w-40 truncate font-semibold sm:max-w-52">{d.name}</b>
          <span className="shrink-0 text-mute">{counts.get(d.id)} {counts.get(d.id) === 1 ? 'page' : 'pages'}</span>
          <button className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-line" aria-label={`Remove ${d.name}`} onClick={() => removeDoc(d.id)}>
            <Icon name="x" className="size-4" />
          </button>
        </span>
      ))}
      <PickPdfs plus>Add PDFs</PickPdfs>
      <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line px-3 text-[13px] text-mute hover:text-ink">
        <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="size-4 accent-[var(--ink)]" />
        Name files automatically
      </label>
    </div>
  );
}
