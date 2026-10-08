import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ToolShell from '../../components/ToolShell';
import Icon from '../../components/Icon';
import Dock from '../../components/Dock';
import OpAnimation from '../../components/OpAnimation';
import HeroScene, { prefersReducedMotion, useHeroReplay } from '../../components/HeroScene';
import { META } from '../../tools-meta';
import {
  convertPdfToDocx,
  convertDocxToPdf,
  downloadConvertedFile,
  isPdfFile,
  isDocxFile,
  type ConversionMode,
  type ConversionProgress,
} from '../../lib/convert';
import { convertFileName, sanitizeStem } from '../../lib/filename';
import { usePdfStore } from '../../lib/store';
import { buildPdf } from '../../lib/pdf';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface LoadedDocInfo {
  name: string;
  size?: number;
  file?: File;
  bytes?: Uint8Array;
}

export default function ConvertTool() {
  const storePages = usePdfStore((s) => s.pages);
  const storeDocs = usePdfStore((s) => s.docs);
  const notify = usePdfStore((s) => s.notify);

  const hasStorePages = storePages.length > 0;
  const firstStoreDocId = storePages[0]?.docId;
  const storeDocName = firstStoreDocId && storeDocs[firstStoreDocId] ? storeDocs[firstStoreDocId].name : 'document.pdf';

  const [mode, setMode] = useState<ConversionMode>('pdf-to-docx');
  // Hero animation in the empty state: plays on mount and whenever the direction changes, replays on hover/tap
  const [heroPlay, replayHero] = useHeroReplay(prefersReducedMotion() ? 0 : 1);
  const heroMode = useRef(mode);
  useEffect(() => {
    if (heroMode.current === mode) return; // first run: the initial play above covers it
    heroMode.current = mode;
    if (!prefersReducedMotion()) replayHero(true);
  }, [mode, replayHero]);
  const [selectedDoc, setSelectedDoc] = useState<LoadedDocInfo | null>(null);
  const [outputStem, setOutputStem] = useState<string>('');
  const [isStemCustomized, setIsStemCustomized] = useState(false);

  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState<ConversionProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [convertedResult, setConvertedResult] = useState<{
    bytes: Uint8Array;
    filename: string;
    targetExt: 'docx' | 'pdf';
  } | null>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Target extension based on active mode
  const targetExt = mode === 'pdf-to-docx' ? 'docx' : 'pdf';
  const sourceExt = mode === 'pdf-to-docx' ? 'pdf' : 'docx';

  // Compute final output filename
  const currentOutputName = `${sanitizeStem(outputStem || 'document')}.${targetExt}`;

  // When selected file changes, update suggested output stem
  useEffect(() => {
    if (selectedDoc) {
      const suggested = convertFileName(selectedDoc.name, targetExt);
      const stem = suggested.replace(new RegExp(`\\.${targetExt}$`, 'i'), '');
      setOutputStem(stem);
      setIsStemCustomized(false);
    } else {
      setOutputStem('');
      setIsStemCustomized(false);
    }
    setConvertedResult(null);
    setErrorMessage(null);
  }, [selectedDoc, targetExt]);

  const handleFile = (file: File) => {
    setErrorMessage(null);
    setConvertedResult(null);

    const isPdf = isPdfFile(file);
    const isDocx = isDocxFile(file);

    if (!isPdf && !isDocx) {
      setErrorMessage(
        'Unsupported file format. Please upload a .pdf document or a .docx Word document.',
      );
      return;
    }

    // Auto-switch mode based on file type if needed
    if (isDocx && mode !== 'docx-to-pdf') {
      setMode('docx-to-pdf');
    } else if (isPdf && mode !== 'pdf-to-docx') {
      setMode('pdf-to-docx');
    }

    setSelectedDoc({
      name: file.name,
      size: file.size,
      file,
    });
  };

  const handleUseStorePdf = async () => {
    setErrorMessage(null);
    setConvertedResult(null);
    setMode('pdf-to-docx');

    try {
      const bytes = await buildPdf(storeDocs, storePages);
      setSelectedDoc({
        name: storeDocName,
        size: bytes.byteLength,
        bytes,
      });
    } catch {
      notify('Could not prepare the loaded PDF.');
    }
  };

  const handleConvert = async () => {
    if (!selectedDoc || converting) return;
    setConverting(true);
    setErrorMessage(null);
    setConvertedResult(null);
    setProgress({ fraction: 0.05, label: 'Starting conversion…' });

    try {
      let resultBytes: Uint8Array;
      const finalName = currentOutputName;

      if (mode === 'pdf-to-docx') {
        const inputSource = selectedDoc.file || selectedDoc.bytes;
        if (!inputSource) throw new Error('No PDF file provided.');
        resultBytes = await convertPdfToDocx(inputSource, setProgress);
      } else {
        const inputSource = selectedDoc.file;
        if (!inputSource) throw new Error('No Word document provided.');
        resultBytes = await convertDocxToPdf(inputSource, setProgress);
      }

      setConvertedResult({
        bytes: resultBytes,
        filename: finalName,
        targetExt,
      });

      // Automatically trigger browser download on successful conversion
      downloadConvertedFile(resultBytes, finalName);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Conversion failed.';
      setErrorMessage(msg);
    } finally {
      setConverting(false);
      setProgress(null);
    }
  };

  const handleManualDownload = () => {
    if (!convertedResult) return;
    const finalName = currentOutputName;
    downloadConvertedFile(convertedResult.bytes, finalName);
  };

  const handleReset = () => {
    setSelectedDoc(null);
    setConvertedResult(null);
    setErrorMessage(null);
    setProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const switchMode = (next: ConversionMode) => {
    if (mode === next) return;
    setMode(next);
    setConvertedResult(null);
    setErrorMessage(null);
    if (selectedDoc) {
      const f = selectedDoc.file || new File([], selectedDoc.name);
      const matches = next === 'pdf-to-docx' ? isPdfFile(f) : isDocxFile(f);
      if (!matches) setSelectedDoc(null);
    }
  };

  const modes: { id: ConversionMode; from: string; to: string }[] = [
    { id: 'pdf-to-docx', from: 'PDF', to: 'Word' },
    { id: 'docx-to-pdf', from: 'Word', to: 'PDF' },
  ];

  return (
    <ToolShell meta={META.convert} hasContent={true}>
      <div className="mx-auto w-full max-w-xl pb-4">
      {/* Direction picker: same selected-state treatment as the other tools' option buttons */}
      <div className="mt-6 w-full rounded-2xl border border-line bg-card p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-display text-xl font-bold">Convert</p>
          <p className="text-sm text-mute">.{sourceExt} → .{targetExt}</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Conversion direction">
          {modes.map((m) => {
            const on = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                disabled={converting}
                aria-pressed={on}
                onClick={() => switchMode(m.id)}
                className={`flex min-h-16 items-center justify-center gap-1.5 rounded-2xl border px-1.5 py-3 text-center sm:gap-2 sm:px-2 hover:border-ink disabled:cursor-default disabled:opacity-60 ${
                  on ? 'border-ink bg-hl text-hl-ink' : 'border-line bg-card'
                }`}
              >
                <span className="font-display text-base font-bold sm:text-lg">{m.from}</span>
                <Icon name="arrow" className="size-4 shrink-0" />
                <span className="font-display text-base font-bold sm:text-lg">{m.to}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-mute">
          {mode === 'pdf-to-docx'
            ? 'Turns text and structure into an editable Word document.'
            : 'Turns a Word file into a clean, submission-ready PDF.'}
        </p>
      </div>

      {/* PDF already open in another tool */}
      {hasStorePages && mode === 'pdf-to-docx' && !selectedDoc && (
        <div className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl border border-line bg-card p-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Icon name="file" className="size-5 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{storeDocName}</p>
              <p className="text-[13px] text-mute">{storePages.length} {storePages.length === 1 ? 'page' : 'pages'} open from another tool</p>
            </div>
          </div>
          <button type="button" onClick={() => void handleUseStorePdf()} className="btn shrink-0">
            Use this PDF
          </button>
        </div>
      )}

      {!selectedDoc ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          className={`mt-3 flex w-full flex-col items-center rounded-2xl border-2 border-dashed px-4 py-8 sm:px-5 sm:py-10 text-center transition-colors ${
            isDragOver ? 'border-ink bg-line' : 'border-line bg-card'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={mode === 'pdf-to-docx' ? '.pdf,application/pdf' : '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document'}
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <div aria-hidden="true" className="mb-3 w-full max-w-[300px] sm:mb-4 sm:max-w-[340px]" onMouseEnter={() => replayHero()} onClick={() => replayHero()}>
            <HeroScene id="convert" mode={mode} play={heroPlay} />
          </div>
          <h2 className="h-display text-2xl">
            {mode === 'pdf-to-docx' ? 'Drop the PDF to convert' : 'Drop the Word file to convert'}
          </h2>
          <p className="mb-5 mt-1.5 max-w-[44ch] text-mute">
            {mode === 'pdf-to-docx' ? 'One PDF at a time. You get an editable .docx.' : 'One .docx at a time. You get a PDF.'}
          </p>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-hl btn-lg">
            {mode === 'pdf-to-docx' ? 'Choose PDF' : 'Choose Word file'}
          </button>
          <p className="mt-3.5 flex items-center gap-1.5 text-sm text-mute">
            <Icon name="lock" className="size-4" />Runs on your device. Nothing uploaded.
          </p>
          {mode === 'pdf-to-docx' && (
            <p className="mt-2 max-w-sm text-[13px] text-mute">
              Scanned or photo PDFs need{' '}
              <Link to="/ocr" className="underline hover:text-ink">OCR</Link> first.
            </p>
          )}
        </div>
      ) : (
        <>
          {/* File chip, same pill as the other tools */}
          <div className="mt-3 flex">
            <span className="inline-flex min-h-11 min-w-0 max-w-full items-center gap-2 rounded-full border border-line bg-card py-1 pl-3 pr-1 text-[13px]">
              <b className="min-w-0 truncate font-semibold" title={selectedDoc.name}>{selectedDoc.name}</b>
              {selectedDoc.size ? <span className="shrink-0 text-mute">{formatSize(selectedDoc.size)}</span> : null}
              <button
                type="button"
                onClick={handleReset}
                disabled={converting}
                className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-line disabled:opacity-45"
                aria-label={`Remove ${selectedDoc.name}`}
              >
                <Icon name="x" className="size-4" />
              </button>
            </span>
          </div>

          <div className="mt-3 w-full rounded-2xl border border-line bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="convert-output-stem" className="text-[13px] font-semibold">File name</label>
              <button
                type="button"
                onClick={() => {
                  const suggested = convertFileName(selectedDoc.name, targetExt);
                  setOutputStem(suggested.replace(new RegExp(`\\.${targetExt}$`, 'i'), ''));
                  setIsStemCustomized(false);
                }}
                disabled={!isStemCustomized || converting}
                className="-my-2 min-h-11 rounded-lg px-2 text-[13px] font-medium text-mute underline underline-offset-2 hover:text-ink disabled:no-underline disabled:opacity-45"
              >
                Reset to suggested
              </button>
            </div>
            <div className="fld mt-1 flex items-center p-0 focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-[#2F6BFF]">
              <input
                id="convert-output-stem"
                type="text"
                value={outputStem}
                disabled={converting}
                onChange={(e) => { setOutputStem(e.target.value); setIsStemCustomized(true); }}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' || e.repeat || e.nativeEvent.isComposing) return;
                  e.preventDefault();
                  if (!converting) void (convertedResult ? handleManualDownload() : handleConvert());
                }}
                autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false}
                className="min-h-11 min-w-0 flex-1 bg-transparent py-2 pl-3.5 pr-1 text-base text-ink outline-none placeholder:text-mute"
                placeholder="document"
              />
              <span aria-hidden="true" className="shrink-0 pr-3.5 text-base text-mute">.{targetExt}</span>
            </div>

            {converting && progress && (
              <div className="mt-4" role="status" aria-live="polite">
                <OpAnimation kind={mode} className="mx-auto mb-3" />
                <div className="h-1.5 overflow-hidden rounded-full bg-line">
                  <div className="h-full bg-ink transition-[width]" style={{ width: `${Math.round(progress.fraction * 100)}%` }} />
                </div>
                <p className="mt-2 text-sm text-mute">{progress.label}</p>
              </div>
            )}

            {errorMessage && (
              <p className="mt-4 flex items-start gap-3 rounded-2xl border border-danger bg-card p-3.5 text-sm text-danger" role="alert">
                <Icon name="x" className="mt-0.5 size-5 shrink-0" />
                <span><b>Couldn’t convert this file.</b> {errorMessage}</span>
              </p>
            )}
          </div>

          {convertedResult && !converting && (
            <div role="status" aria-live="polite" className="mt-3 w-full rounded-2xl border border-line bg-card p-4 sm:p-5">
              <p className="font-display text-2xl font-bold">Converted to .{targetExt}</p>
              <p className="mt-1.5 text-mute">Saved to your downloads. You can save it again or convert another file.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={handleManualDownload} className="btn btn-hl btn-lg w-full sm:w-auto">
                  <Icon name="download" />Download .{targetExt}
                </button>
                <button type="button" onClick={handleReset} className="btn btn-lg w-full sm:w-auto">
                  Convert another
                </button>
              </div>
            </div>
          )}

          {!convertedResult && (
            <Dock>
              <button
                type="button"
                onClick={() => void handleConvert()}
                disabled={converting}
                className="btn btn-hl btn-lg w-full max-w-md sm:max-w-2xl"
              >
                {converting ? (
                  <><Icon name="rotate" className="spin size-5" />Converting…</>
                ) : (
                  <><Icon name="convert" />Convert to {targetExt.toUpperCase()}</>
                )}
              </button>
            </Dock>
          )}
        </>
      )}
      </div>
    </ToolShell>
  );
}
