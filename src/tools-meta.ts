import type { IconName } from './components/Icon';

export interface ToolMeta {
  id: string;
  path: string;
  title: string;
  /** the one <h1> on the tool page: the phrase people search for */
  h1: string;
  /** descriptive link text for footers and related-tool lists */
  anchor: string;
  /** one-line outcome shown on home cards (under 10 words) */
  outcome: string;
  /** one-liner under the title in the sidebar */
  short: string;
  /** what the tool does, shown at the top of its page */
  blurb: string;
  /** headline of the empty state */
  dropTitle: string;
  dropHint: string;
  icon: IconName;
}

/** Copy and icons for live tools. Components are attached in tools.ts. */
export const META = {
  merge: {
    id: 'merge', h1: 'Merge PDF files online', anchor: 'Merge PDF files', outcome: 'Combine files into one PDF.', path: '/merge', title: 'Merge PDFs', short: 'Combine files', icon: 'merge',
    blurb: 'Add files, drag pages into order, then download one PDF.',
    dropTitle: 'Drop the PDFs you want to merge', dropHint: 'Pick two or more files. You can add more later.',
  },
  organize: {
    id: 'organize', h1: 'Reorder, rotate and delete PDF pages online', anchor: 'Reorder PDF pages', outcome: 'Fix page order, turn or remove pages.', path: '/organize', title: 'Organize pages', short: 'Reorder, rotate, delete', icon: 'grid',
    blurb: 'Rearrange pages, turn them, or remove the ones you don’t need.',
    dropTitle: 'Drop the PDF you want to reorganize', dropHint: 'Pages appear as thumbnails you can drag around.',
  },
  extract: {
    id: 'extract', h1: 'Split a PDF and extract pages online', anchor: 'Split a PDF', outcome: 'Save just the pages you pick.', path: '/extract', title: 'Split & extract', short: 'Pick pages out', icon: 'cut',
    blurb: 'Select the pages you want and save them as a new PDF.',
    dropTitle: 'Drop the PDF to pull pages from', dropHint: 'Tap the pages to keep, then extract them.',
  },
  crop: {
    id: 'crop', h1: 'Crop PDF pages online', anchor: 'Crop a PDF', outcome: 'Trim margins from every page.', path: '/crop', title: 'Crop pages', short: 'Trim the margins', icon: 'crop',
    blurb: 'Draw the area to keep on each page, or apply one crop to all.',
    dropTitle: 'Drop the PDF you want to crop', dropHint: 'You’ll draw the crop box right on the page.',
  },
  compress: {
    id: 'compress', h1: 'Compress a PDF online', anchor: 'Compress a PDF', outcome: 'Make it smaller, keep it sharp.', path: '/compress', title: 'Compress PDF', short: 'Make it smaller', icon: 'minimize',
    blurb: 'Pick Best, Medium or Low quality and get a smaller PDF.',
    dropTitle: 'Drop the PDF you want to shrink', dropHint: 'You’ll pick Best, Medium or Low quality.',
  },
  ocr: {
    id: 'ocr', h1: 'OCR a PDF online: make scans searchable', anchor: 'Make a scanned PDF searchable', outcome: 'Search and copy text from scans.', path: '/ocr', title: 'OCR PDF', short: 'Make scans searchable', icon: 'scan',
    blurb: 'Turn scanned pages into a PDF you can search and copy text from.',
    dropTitle: 'Drop the scanned PDF to make searchable', dropHint: 'Pages without text are read in the background; your pages look exactly the same.',
  },
  unlock: {
    id: 'unlock', h1: 'Remove a PDF password online', anchor: 'Remove a PDF password', outcome: 'Save a copy that opens freely.', path: '/unlock', title: 'Remove password', short: 'Unlock a PDF', icon: 'unlock',
    blurb: 'Enter the password once and save a copy that opens without one.',
    dropTitle: 'Drop the password-protected PDF', dropHint: 'You’ll be asked for its password, then you can save an unlocked copy.',
  },
  protect: {
    id: 'protect', h1: 'Add a password to a PDF online', anchor: 'Password-protect a PDF', outcome: 'Lock a PDF with a password.', path: '/protect', title: 'Add password', short: 'Lock a PDF', icon: 'shield',
    blurb: 'Choose a password and save an encrypted copy of your PDF.',
    dropTitle: 'Drop the PDF you want to lock', dropHint: 'You’ll set a password, then save an encrypted copy.',
  },
  convert: {
    id: 'convert', h1: 'Convert PDF and Word documents online', anchor: 'Convert PDF or Word', outcome: 'Convert between PDF and DOCX.', path: '/convert', title: 'Convert', short: 'PDF ↔ Word', icon: 'convert',
    blurb: 'Convert PDF files to editable Word documents, or Word documents to PDF.',
    dropTitle: 'Drop the document you want to convert', dropHint: 'Convert PDF to Word (.docx) or Word (.docx) to PDF.',
  },
} satisfies Record<string, ToolMeta>;

export const SOON: { id: string; title: string; icon: IconName }[] = [
  { id: 'sign', title: 'Sign & annotate', icon: 'pen' },
  { id: 'watermark', title: 'Watermark & numbers', icon: 'type' },
  { id: 'images', title: 'PDF ↔ images', icon: 'image' },
];
