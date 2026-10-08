import { usePdfStore } from '../../lib/store';
import { downloadBytes, type Protection, type SourceDoc } from '../../lib/pdf';
import { useFileName } from '../../lib/useFileName';
import { META } from '../../tools-meta';
import DownloadRow from '../../components/DownloadRow';
import Icon from '../../components/Icon';
import FileChips from '../../components/FileChips';
import ToolShell from '../../components/ToolShell';

const fmt = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);

const STATUS: Record<Protection, { label: string; detail: string }> = {
  password: { label: 'Password removed', detail: 'This copy opens without asking for a password.' },
  restricted: { label: 'Restrictions removed', detail: 'It opened without a password but limited editing, copying or printing. This copy has no such limits.' },
  none: { label: 'Wasn’t protected', detail: 'This file has no password or restrictions, so the copy is identical in content.' },
};

/** One file: its status, its own rename field and its download button. */
function UnlockRow({ d }: { d: SourceDoc }) {
  const st = STATUS[d.protection];
  const name = useFileName('unlock', [d.name], d.id);
  return (
    <li className="rounded-2xl border border-line bg-card p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${d.protection === 'none' ? 'bg-line text-ink' : 'bg-hl text-hl-ink'}`}>
          <Icon name={d.protection === 'none' ? 'check' : 'unlock'} className="size-3.5" />{st.label}
        </span>
        <span className="text-[13px] text-mute">{fmt(d.bytes.length)}</span>
      </div>
      <p className="mt-2 break-words font-display text-xl font-bold">{d.name}</p>
      <p className="mt-1 text-mute">{st.detail}</p>
      <DownloadRow
        name={name} label="Download unlocked PDF" icon={<Icon name="download" />}
        onDownload={() => downloadBytes(d.bytes, name.filename)} className="mt-4"
      />
    </li>
  );
}

/**
 * Files are decrypted the moment they are opened (see loadPdfBytes), so by the time this screen
 * shows, saving an unlocked copy is a single click on the original bytes: nothing is re-rendered or rebuilt.
 */
function Unlocker() {
  const docs = usePdfStore((s) => s.docs);
  const pages = usePdfStore((s) => s.pages);
  const used = new Set(pages.map((p) => p.docId));
  const list = Object.values(docs).filter((d) => used.has(d.id));

  return (
    <>
      <FileChips />
      <ul className="mt-5 grid max-w-2xl list-none gap-3 p-0">
        {list.map((d) => <UnlockRow key={d.id} d={d} />)}
      </ul>
      <p className="mt-6 max-w-[62ch] text-[13px] text-mute">
        You need to know the password: Foldline unlocks files you can already open, it can’t guess or recover a forgotten one. Only remove protection from files that are yours or that you have permission to change. The content is not altered, and nothing is uploaded.
      </p>
    </>
  );
}

export default function UnlockTool() {
  return <ToolShell meta={META.unlock}><Unlocker /></ToolShell>;
}
