# Foldline Project Architecture & Map

Foldline is a high-performance, fully client-side suite of document and PDF utilities. Files never leave the browser, ensuring 100% privacy and local-only processing.

## Tech Stack
- **Framework & Runtime**: React 19, TypeScript (~5.7), Vite 6, Tailwind CSS v4
- **State & Routing**: Zustand (page/document store), React Router 7
- **PDF Core**: `pdfjs-dist` (rendering & text extraction), `pdf-lib` (editing, manipulating, and reordering)
- **Document Conversion**: `docx` (Word generation), `mammoth` (Word content extraction), `jspdf` (PDF generation)
- **Security & Cryptography**: `@neslinesli93/qpdf-wasm` (AES-256 PDF encryption/decryption)
- **OCR Engine**: `tesseract.js` (client-side text recognition)
- **Static Generation**: Static SSR prerendering via `scripts/prerender.mjs` and `src/entry-server.tsx`

---

## Directory Structure

```
├── public/                 # Static assets, icons, manifest, and CNAME
├── scripts/
│   ├── check-filenames.mjs # Filename sanitization, suffix, and extension unit tests
│   └── prerender.mjs       # Static HTML generator for all routes, sitemap.xml, robots.txt
├── src/
│   ├── App.tsx             # Root application shell, navigation, global drag-and-drop, notifications
│   ├── content.ts          # Page and tool copy, SEO metadata, FAQs, RELATED, NEXT_STEP mappings
│   ├── entry-server.tsx    # SSR static renderer entry point
│   ├── main.tsx            # Client entry point
│   ├── tools-meta.ts       # Tool metadata definitions (id, h1, anchor, outcome, short, blurb, dropCopy, icon)
│   ├── tools.ts            # Tool registry with dynamic chunk loaders and lazy components
│   ├── types.d.ts          # Ambient TypeScript declarations
│   ├── components/         # Shared UI components
│   │   ├── Dock.tsx        # Bottom fixed action dock
│   │   ├── DoneCard.tsx    # Global download toast notification card
│   │   ├── DownloadRow.tsx # Action row combining filename field and primary download button
│   │   ├── Dropzone.tsx    # Drag-and-drop and file selection buttons
│   │   ├── FileChips.tsx   # Loaded document indicator chips
│   │   ├── FileNameField.tsx # Accessible output filename editor with extension lock
│   │   ├── Footer.tsx      # Global footer with navigation links
│   │   ├── Icon.tsx        # Lightweight SVG icon component
│   │   ├── Notice.tsx      # Global toast alerts
│   │   ├── PageCanvas.tsx  # Canvas thumbnail renderer for PDF pages
│   │   ├── PasswordPrompt.tsx # Decryption password modal
│   │   ├── ThemeToggle.tsx # Light/dark theme switcher
│   │   ├── ToolContent.tsx # Prerendered tool content (h1, intro, steps, FAQs, related tools)
│   │   └── ToolShell.tsx   # Common page container with dropzone fallback
│   ├── lib/                # Core business logic and engines
│   │   ├── convert.ts      # Document conversion engine (PDF ↔ DOCX)
│   │   ├── filename.ts     # File naming, sanitization, suffixing, and extension safety
│   │   ├── ocr.ts          # Tesseract OCR engine & invisible text layer insertion
│   │   ├── pdf.ts          # PDF loading, rendering, building, and download dispatch
│   │   ├── protect.ts      # QPDF AES-256 encryption & permission enforcement
│   │   ├── store.ts        # Zustand global store for loaded documents and pages
│   │   ├── theme.ts        # System/dark/light theme manager
│   │   ├── unlock.ts       # QPDF password removal and decryption
│   │   └── useFileName.ts  # React hook for managing output filename state
│   ├── pages/              # Informational & legal routes
│   │   ├── Pages.tsx       # Home, About, Contact, 404 pages
│   │   └── Legal.tsx       # Privacy, Terms, Cookies, Disclaimer
│   └── tools/              # Tool implementations (code-split)
│       ├── compress/       # PDF compression
│       ├── convert/        # Document Converter (PDF ↔ DOCX)
│       ├── crop/           # Page cropping
│       ├── ocr/            # Searchable OCR text generation
│       ├── organize/       # Merge, reorder, split, and extract pages
│       ├── protect/        # Password protection
│       └── unlock/         # Password removal
```

---

## Document Converter Feature (`convert`)

### Architecture
- **Engine (`src/lib/convert.ts`)**:
  - `convertPdfToDocx`: Extracts text page-by-page from PDFs using `pdfjs-dist`, categorizes lines and paragraph breaks by coordinate spacing, detects headings, and outputs clean `.docx` via `docx`. Gracefully alerts users if a PDF is a scanned image requiring OCR.
  - `convertDocxToPdf`: Parses `.docx` content using `mammoth`, structures elements (headings, paragraphs, lists, tables), and creates a clean, selectable, multi-page vector PDF via `jspdf`.
  - `downloadConvertedFile`: Dispatches `foldline:download` custom event to trigger the application's native `DoneCard` toast upon completion.
  - Dynamically imports heavy libraries (`docx`, `mammoth`, `jspdf`) so non-converter tools maintain lightweight initial loads.

- **UI Component (`src/tools/convert/ConvertTool.tsx`)**:
  - Student-focused interface providing two straightforward conversion paths:
    1. **PDF → DOCX**
    2. **DOCX → PDF**
  - Instant file-type detection and mode switching on drag-and-drop or selection.
  - Visual display of input file name, formatted size, and target conversion format.
  - Inline progress bar with step descriptions during conversion.
  - Download row with editable output filename (sanitized via `convertFileName` in `src/lib/filename.ts` to prevent duplicate `.pdf.docx` / `.docx.pdf` extensions).
  - Cross-tool integration allowing conversion of already-loaded PDFs from `usePdfStore`.

- **Registry & Content**:
  - Registered in `src/tools-meta.ts` with metadata, icon, and SEO parameters.
  - Lazy-loaded via `convertChunk` in `src/tools.ts`.
  - Prerendered content, steps, FAQs, and next steps documented in `src/content.ts`.
