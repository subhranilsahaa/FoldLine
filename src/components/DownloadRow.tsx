import type { ReactNode } from 'react';
import type { FileNameState } from '../lib/useFileName';
import FileNameField from './FileNameField';

/**
 * The rename field next to the main download button. Both use the same `name.filename`, which is also what
 * downloadBytes receives, so the field, the button's aria-label and the success card always agree.
 */
export default function DownloadRow({ name, label, icon, onDownload, disabled, primary = true, className = '' }: {
  name: FileNameState;
  /** visible button text; the aria-label starts with it so the accessible name contains the visible one */
  label: string;
  icon?: ReactNode;
  onDownload: () => void;
  disabled?: boolean;
  primary?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex w-full flex-col gap-2 sm:flex-row sm:items-end sm:gap-3 ${className}`}>
      <FileNameField name={name} onEnter={disabled ? undefined : onDownload} />
      <button
        type="button" onClick={onDownload} disabled={disabled}
        aria-label={`${label}. Saves as ${name.filename}`}
        className={`btn btn-lg w-full sm:w-auto ${primary ? 'btn-hl' : ''}`}
      >
        {icon}{label}
      </button>
    </div>
  );
}
