import { getPdfjs, DOWNLOAD_EVENT } from './pdf';

export type ConversionMode = 'pdf-to-docx' | 'docx-to-pdf';

export interface ConversionProgress {
  fraction: number; // 0 to 1
  label: string;
}

/**
 * Downloads converted bytes under `filename` and notifies the application
 * (triggering the DoneCard).
 */
export function downloadConvertedFile(bytes: Uint8Array, filename: string, mimeType?: string) {
  const isDocx = filename.toLowerCase().endsWith('.docx');
  const type = mimeType || (isDocx
    ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    : 'application/pdf');

  const blob = new Blob([bytes as BlobPart], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);

  window.dispatchEvent(new CustomEvent(DOWNLOAD_EVENT, { detail: { filename } }));
}

/** Validates that a file is a PDF */
export function isPdfFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
}

/** Validates that a file is a DOCX */
export function isDocxFile(file: File): boolean {
  return (
    file.name.toLowerCase().endsWith('.docx') ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );
}

interface TextItemWithPos {
  str: string;
  x: number;
  y: number;
  height: number;
  width: number;
}

/**
 * Converts a PDF file or bytes into an editable DOCX document.
 * Extracts text page-by-page preserving paragraphs, headings, and page boundaries.
 */
export async function convertPdfToDocx(
  input: File | Uint8Array,
  onProgress?: (progress: ConversionProgress) => void,
): Promise<Uint8Array> {
  onProgress?.({ fraction: 0.05, label: 'Loading conversion libraries…' });
  const [{ Document, Paragraph, TextRun, HeadingLevel, Packer }, pdfjs] = await Promise.all([
    import('docx'),
    getPdfjs(),
  ]);

  const bytes = input instanceof Uint8Array ? input : new Uint8Array(await input.arrayBuffer());
  if (bytes.length === 0) {
    throw new Error('The PDF file is empty.');
  }

  onProgress?.({ fraction: 0.15, label: 'Reading PDF pages…' });
  let pdf;
  try {
    pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('Password') || (err as { name?: string })?.name === 'PasswordException') {
      throw new Error('This PDF is password-protected. Please unlock it using the Remove Password tool first.');
    }
    throw new Error('Could not open the PDF file. It may be corrupt or damaged.');
  }

  const numPages = pdf.numPages;
  if (numPages === 0) {
    await pdf.destroy();
    throw new Error('The PDF contains no pages.');
  }

  const paragraphs: InstanceType<typeof Paragraph>[] = [];
  let totalCharacters = 0;

  try {
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const pageFraction = 0.15 + (pageNum / numPages) * 0.65;
      onProgress?.({
        fraction: pageFraction,
        label: `Extracting text from page ${pageNum} of ${numPages}…`,
      });

      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Collect valid text items with coordinates
      const items: TextItemWithPos[] = [];
      for (const rawItem of textContent.items) {
        if ('str' in rawItem && typeof rawItem.str === 'string' && rawItem.str.length > 0) {
          const transform = rawItem.transform;
          items.push({
            str: rawItem.str,
            x: transform[4],
            y: transform[5],
            height: rawItem.height || Math.abs(transform[3]) || 12,
            width: rawItem.width || 0,
          });
        }
      }

      if (items.length === 0) {
        continue;
      }

      // Group items into lines by Y position (within 3pt tolerance)
      items.sort((a, b) => {
        if (Math.abs(b.y - a.y) > 3) return b.y - a.y; // Top to bottom
        return a.x - b.x; // Left to right
      });

      const lines: { text: string; y: number; height: number; x: number }[] = [];
      let currentLineItems: TextItemWithPos[] = [];
      let currentLineY: number | null = null;

      for (const item of items) {
        if (currentLineY === null || Math.abs(item.y - currentLineY) <= 3.5) {
          currentLineItems.push(item);
          if (currentLineY === null) currentLineY = item.y;
        } else {
          // Finish previous line
          currentLineItems.sort((a, b) => a.x - b.x);
          let lineText = '';
          for (let k = 0; k < currentLineItems.length; k++) {
            const it = currentLineItems[k];
            if (k > 0) {
              const prev = currentLineItems[k - 1];
              const gap = it.x - (prev.x + prev.width);
              if (gap > 2 && !lineText.endsWith(' ') && !it.str.startsWith(' ')) {
                lineText += ' ';
              }
            }
            lineText += it.str;
          }
          if (lineText.trim()) {
            lines.push({
              text: lineText.trim(),
              y: currentLineY,
              height: currentLineItems[0]?.height || 12,
              x: currentLineItems[0]?.x || 0,
            });
          }
          currentLineItems = [item];
          currentLineY = item.y;
        }
      }

      // Flush final line on page
      if (currentLineItems.length > 0 && currentLineY !== null) {
        currentLineItems.sort((a, b) => a.x - b.x);
        let lineText = '';
        for (let k = 0; k < currentLineItems.length; k++) {
          const it = currentLineItems[k];
          if (k > 0) {
            const prev = currentLineItems[k - 1];
            const gap = it.x - (prev.x + prev.width);
            if (gap > 2 && !lineText.endsWith(' ') && !it.str.startsWith(' ')) {
              lineText += ' ';
            }
          }
          lineText += it.str;
        }
        if (lineText.trim()) {
          lines.push({
            text: lineText.trim(),
            y: currentLineY,
            height: currentLineItems[0]?.height || 12,
            x: currentLineItems[0]?.x || 0,
          });
        }
      }

      // Group consecutive lines into paragraphs based on vertical spacing
      let currentParaLines: string[] = [];
      let isFirstParaOnPage = pageNum > 1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        totalCharacters += line.text.length;

        const isHeading = line.height >= 16;
        const prevLine = lines[i - 1];
        const isBigGap = prevLine ? (prevLine.y - line.y) > line.height * 1.6 : false;

        if (isHeading) {
          // Flush pending paragraph
          if (currentParaLines.length > 0) {
            paragraphs.push(
              new Paragraph({
                children: [new TextRun(currentParaLines.join(' '))],
                spacing: { after: 120 },
                pageBreakBefore: isFirstParaOnPage,
              }),
            );
            isFirstParaOnPage = false;
            currentParaLines = [];
          }
          // Add heading
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: line.text, bold: true })],
              heading: line.height >= 20 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 },
              pageBreakBefore: isFirstParaOnPage,
            }),
          );
          isFirstParaOnPage = false;
        } else if (isBigGap && currentParaLines.length > 0) {
          // Paragraph boundary
          paragraphs.push(
            new Paragraph({
              children: [new TextRun(currentParaLines.join(' '))],
              spacing: { after: 120 },
              pageBreakBefore: isFirstParaOnPage,
            }),
          );
          isFirstParaOnPage = false;
          currentParaLines = [line.text];
        } else {
          currentParaLines.push(line.text);
        }
      }

      if (currentParaLines.length > 0) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun(currentParaLines.join(' '))],
            spacing: { after: 120 },
            pageBreakBefore: isFirstParaOnPage,
          }),
        );
      }
    }
  } finally {
    await pdf.destroy();
  }

  if (totalCharacters < 10 || paragraphs.length === 0) {
    throw new Error(
      'No readable text found in this PDF. It appears to be an image or scanned document. Please run it through the OCR tool first to recognize the text.',
    );
  }

  onProgress?.({ fraction: 0.9, label: 'Building Word document…' });
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  const buffer = await Packer.toArrayBuffer(doc);
  onProgress?.({ fraction: 1, label: 'Conversion complete!' });
  return new Uint8Array(buffer);
}

/**
 * Safely parses CSS length strings (pt, mm, cm, in, px) to PDF points (pt).
 */
function parseLengthToPt(val: string | null | undefined, fallback: number): number {
  if (!val || typeof val !== 'string') return fallback;
  const trimmed = val.trim().toLowerCase();
  const num = parseFloat(trimmed);
  if (isNaN(num) || num <= 0) return fallback;

  if (trimmed.endsWith('pt')) return num;
  if (trimmed.endsWith('mm')) return num * (72 / 25.4);
  if (trimmed.endsWith('cm')) return num * (72 / 2.54);
  if (trimmed.endsWith('in')) return num * 72;
  if (trimmed.endsWith('px')) return num * 0.75;
  if (trimmed.endsWith('pc')) return num * 12;
  return num;
}

/**
 * Converts a DOCX file or bytes into a high-fidelity PDF document.
 * Uses docx-preview to render the Word OpenXML document with full page geometry,
 * margins, headings, typography, tables, borders, shading, lists, equations,
 * superscripts/subscripts, images, and headers/footers, then captures each page
 * at high DPI into a clean, multi-page PDF via jsPDF.
 */
export async function convertDocxToPdf(
  input: File | Uint8Array,
  onProgress?: (progress: ConversionProgress) => void,
): Promise<Uint8Array> {
  onProgress?.({ fraction: 0.1, label: 'Loading document rendering engine…' });
  const [docxPreview, { default: html2canvas }, { jsPDF }, jszipModule] = await Promise.all([
    import('docx-preview'),
    import('html2canvas'),
    import('jspdf'),
    import('jszip'),
  ]);

  // Ensure JSZip is globally available if docx-preview expects it on window
  const JSZip = jszipModule.default || jszipModule;
  if (typeof window !== 'undefined' && !(window as any).JSZip) {
    (window as any).JSZip = JSZip;
  }

  const arrayBuffer =
    input instanceof Uint8Array
      ? (input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer)
      : await input.arrayBuffer();

  if (arrayBuffer.byteLength === 0) {
    throw new Error('The DOCX file is empty.');
  }

  if (typeof document === 'undefined') {
    throw new Error('DOCX to PDF conversion requires a browser DOM environment.');
  }

  onProgress?.({ fraction: 0.25, label: 'Parsing Word OpenXML styles & layout…' });

  // Create isolated container in DOM positioned at (0,0) with tiny opacity and negative z-index
  const container = document.createElement('div');
  container.setAttribute('aria-hidden', 'true');
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = 'auto';
  container.style.height = 'auto';
  container.style.opacity = '0.01';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '-99999';
  container.style.overflow = 'hidden';
  document.body.appendChild(container);

  try {
    onProgress?.({ fraction: 0.4, label: 'Rendering document pages, tables & math…' });
    await docxPreview.renderAsync(arrayBuffer, container, undefined, {
      className: 'docx',
      inWrapper: false,
      ignoreWidth: false,
      ignoreHeight: false,
      ignoreFonts: false,
      breakPages: true,
      ignoreLastRenderedPageBreak: false,
      experimental: true,
      trimXmlDeclaration: true,
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
      renderEndnotes: true,
      useBase64URL: true,
    });

    // Inject fidelity normalization CSS for Word document rendering
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .docx {
        hyphens: none !important;
        word-break: normal !important;
      }
      .docx p {
        word-break: normal !important;
        overflow-wrap: break-word !important;
      }
      /* Only runs of 2+ empty paragraphs are collapsed; the first stays a normal blank line as in Word */
      .docx p.docx-empty-spacer {
        min-height: 0 !important;
        margin-top: 0 !important;
        margin-bottom: 0 !important;
        line-height: 1 !important;
        padding: 0 !important;
        height: 4pt !important;
      }
      .docx table {
        border-collapse: collapse !important;
      }
    `;
    container.appendChild(styleEl);

    // Wait for fonts and styles to render
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    await new Promise((r) => setTimeout(r, 200));

    // Post-process DOM for Word document fidelity:
    // 1. Collapse artificial empty paragraphs that blow up vertical gaps between content/equations
    const allParas = container.querySelectorAll<HTMLElement>('p');
    let prevEmpty = false;
    for (const p of allParas) {
      const text = (p.innerText || '').trim();
      const hasMedia = p.querySelector('img, svg, canvas, table, math') !== null;
      const isEmpty = !hasMedia && text.length === 0;
      // Keep the first empty paragraph in a run (Word renders it as a blank line); collapse the rest
      if (isEmpty && prevEmpty && p.previousElementSibling?.tagName === 'P') {
        p.classList.add('docx-empty-spacer');
      }
      prevEmpty = isEmpty;
    }

    // 2. Identify rendered page elements/sections produced by docx-preview
    const rawSections = Array.from(container.querySelectorAll<HTMLElement>('section.docx, section'));
    const sections =
      rawSections.length > 0
        ? rawSections
        : Array.from(container.children).filter(
            (el): el is HTMLElement => el instanceof HTMLElement && el.tagName !== 'STYLE',
          );

    // 3. Clean up split artifacts at section boundaries (e.g. dangling empty list numbers like "(ii)")
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      const paras = Array.from(s.querySelectorAll<HTMLElement>('article > p, p'));
      if (paras.length > 0) {
        const lastP = paras[paras.length - 1];
        if ((lastP.innerText || '').trim() === '' && lastP.className.includes('docx-num-')) {
          lastP.remove();
        }
      }
    }

    // 4. Orphan trailing heading reconciliation:
    // If Word placed a soft lastRenderedPageBreak before a final heading (e.g. "Questions"),
    // producing an extra section with only a heading and zero body text/tables, merge it into
    // the preceding section so it doesn't create an unnecessary blank page.
    if (sections.length > 1) {
      const lastSec = sections[sections.length - 1];
      const lastText = (lastSec.innerText || '').trim();
      const lastTables = lastSec.querySelectorAll('table').length;
      const lastParas = Array.from(lastSec.querySelectorAll('p')).filter(
        (p) => (p.innerText || '').trim().length > 0,
      );

      if (lastTables === 0 && lastParas.length <= 1 && lastText.length > 0 && lastText.length < 80) {
        const prevSec = sections[sections.length - 2];
        const prevArticle = prevSec.querySelector('article') || prevSec;
        const lastArticle = lastSec.querySelector('article') || lastSec;

        while (lastArticle.firstChild) {
          prevArticle.appendChild(lastArticle.firstChild);
        }
        lastSec.remove();
        sections.pop();
      }
    }

    // Re-measure after DOM adjustment
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    await new Promise((r) => setTimeout(r, 100));

    const totalElements = sections.length;
    if (totalElements === 0) {
      throw new Error('No readable pages were found in the Word document.');
    }

    onProgress?.({
      fraction: 0.5,
      label: `Generating PDF (${totalElements} ${totalElements === 1 ? 'page' : 'pages'})…`,
    });

    let pdf: InstanceType<typeof jsPDF> | null = null;

    for (let i = 0; i < totalElements; i++) {
      const pageEl = sections[i];
      pageEl.style.backgroundColor = '#ffffff';
      pageEl.style.boxSizing = 'border-box';

      const pageFraction = 0.5 + (i / totalElements) * 0.45;
      onProgress?.({
        fraction: pageFraction,
        label: `Rendering page ${i + 1} of ${totalElements}…`,
      });

      // 1. Determine exact page dimensions in points (pt) from the rendered DOCX page
      const nominalWidthPt = parseLengthToPt(pageEl.style.width, 595.28);
      const nominalHeightPt = parseLengthToPt(pageEl.style.minHeight || pageEl.style.height, 841.89);
      const isLandscape = nominalWidthPt > nominalHeightPt;

      // 2. Measure element's rendered layout dimensions in CSS pixels
      const rect = pageEl.getBoundingClientRect();
      const elWidthPx = rect.width || pageEl.offsetWidth || 1;
      const pxPerPt = elWidthPx > 0 ? elWidthPx / nominalWidthPt : 96 / 72;
      const expectedPageHeightPx = nominalHeightPt * pxPerPt;

      // 3. Capture each page independently at high resolution (scale 2 = crisp 192-300 DPI)
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const singlePageCanvasHeight = expectedPageHeightPx * 2;
      const numSubPages = Math.max(1, Math.ceil(canvas.height / singlePageCanvasHeight));

      if (canvas.height <= singlePageCanvasHeight * 1.35 || numSubPages === 1) {
        // Place exactly one rendered DOCX page onto each PDF page
        if (!pdf) {
          pdf = new jsPDF({
            orientation: isLandscape ? 'landscape' : 'portrait',
            unit: 'pt',
            format: [nominalWidthPt, nominalHeightPt],
            compress: true,
          });
        } else {
          pdf.addPage([nominalWidthPt, nominalHeightPt], isLandscape ? 'landscape' : 'portrait');
        }

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, nominalWidthPt, nominalHeightPt, undefined, 'FAST');
      } else {
        // Fallback: If content within an unpaginated section flows across multiple pages,
        // paginate each slice onto its own separate PDF page so no content is clipped.
        const sliceCanvasHeight = singlePageCanvasHeight;
        for (let s = 0; s < numSubPages; s++) {
          const yStart = Math.round(s * sliceCanvasHeight);
          if (yStart >= canvas.height) break;
          const currentSliceHeight = Math.min(sliceCanvasHeight, canvas.height - yStart);

          const subCanvas = document.createElement('canvas');
          subCanvas.width = canvas.width;
          subCanvas.height = sliceCanvasHeight;
          const subCtx = subCanvas.getContext('2d');
          if (subCtx) {
            subCtx.fillStyle = '#ffffff';
            subCtx.fillRect(0, 0, subCanvas.width, subCanvas.height);
            subCtx.drawImage(
              canvas,
              0,
              yStart,
              canvas.width,
              currentSliceHeight,
              0,
              0,
              canvas.width,
              currentSliceHeight,
            );
          }

          if (!pdf) {
            pdf = new jsPDF({
              orientation: isLandscape ? 'landscape' : 'portrait',
              unit: 'pt',
              format: [nominalWidthPt, nominalHeightPt],
              compress: true,
            });
          } else {
            pdf.addPage([nominalWidthPt, nominalHeightPt], isLandscape ? 'landscape' : 'portrait');
          }

          const imgData = subCanvas.toDataURL('image/jpeg', 0.95);
          pdf.addImage(imgData, 'JPEG', 0, 0, nominalWidthPt, nominalHeightPt, undefined, 'FAST');
        }
      }
    }

    if (!pdf) {
      throw new Error('Failed to generate PDF document.');
    }

    onProgress?.({ fraction: 1, label: 'Conversion complete!' });
    const pdfBuffer = pdf.output('arraybuffer');
    return new Uint8Array(pdfBuffer);
  } finally {
    container.remove();
  }
}
