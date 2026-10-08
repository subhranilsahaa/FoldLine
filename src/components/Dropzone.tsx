import { type ReactNode } from 'react';
import { usePdfStore } from '../lib/store';
import Icon from './Icon';

interface Props { children: ReactNode; primary?: boolean; large?: boolean; plus?: boolean }

/** Button that opens the file picker. Dropping files works anywhere (see App). */
export default function PickPdfs({ children, primary, large, plus }: Props) {
  const addFiles = usePdfStore((s) => s.addFiles);
  const loading = usePdfStore((s) => s.loading);
  return (
    <label className={`btn ${primary ? 'btn-hl' : ''} ${large ? 'btn-lg' : ''} ${loading ? 'pointer-events-none opacity-60' : ''}`}>
      {plus && <Icon name="plus" />}
      {loading ? 'Opening…' : children}
      <input
        type="file" accept="application/pdf,.pdf" multiple hidden
        onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ''; }}
      />
    </label>
  );
}
