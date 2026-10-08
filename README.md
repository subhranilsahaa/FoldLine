# Foldline

Client-side PDF tools. Files never leave the browser.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build to dist/
```

## Stack
React 19, TypeScript, Vite, Tailwind v4, react-router, zustand, pdf-lib (editing), pdfjs-dist (rendering), dnd-kit (page drag & drop), qpdf-wasm (adding and removing passwords), tesseract.js (OCR).

## Structure
- `src/lib/pdf.ts` loading, rendering, `buildPdf` (rotate/crop/reorder/merge), download
- `src/lib/unlock.ts` qpdf-wasm decryption. Protected files are decrypted when opened (`loadPdfBytes`), so every tool works on them; a password prompt (`PasswordPrompt`) appears when one is needed
- `src/lib/protect.ts` qpdf-wasm AES-256 encryption (Add password tool), sharing the loader in `unlock.ts`
- `src/lib/ocr.ts` Tesseract recognition plus an invisible text layer written with pdf-lib
- `src/lib/theme.ts` System / Light / Dark theme (follows the OS by default; the choice is saved in localStorage; a tiny script in `index.html` applies it before first paint)
- `src/lib/compress.worker.ts` text-preserving compression at Best / Medium / Low: measures each image's on-page size, downsamples to the level's dpi and recompresses as JPEG only when that is really smaller; runs in a Web Worker
- `src/lib/store.ts` shared page list so files carry between tools; also the 5-second undo entry and group move/reorder helpers
- `src/tools-meta.ts` copy, icons and empty-state text per tool; `src/tools.ts` attaches the lazy component (the sidebar and routes are generated from it)
- `src/tools/<tool>/` live tools, one folder each, lazy-loaded per route
- `src/future-tools/<tool>/` plans for upcoming tools (not imported; see its README for how to promote one)
- `preview/foldline.html` standalone single-file demo with the same tools (opens by double-click; needs internet for the CDN libraries)
- `src/pages/Pages.tsx` home, about, contact; `src/pages/Legal.tsx` Privacy, Terms, Cookie Policy and Disclaimer (each its own route; ad wording appears only when `VITE_ADSENSE_CLIENT` is set; update `UPDATED` in `content.ts` when you change them)
- `src/components/*` shared UI (dropzone, page canvas, shell)

## Adding a tool
1. Create `src/tools/my-tool/MyTool.tsx` wrapped in `<ToolShell>`.
2. Add its copy to `src/tools-meta.ts` and an entry in `src/tools.ts` (the sidebar item, route and empty state appear automatically).

## Deploying
`npm run build` produces static, prerendered HTML: `dist/index.html`, `dist/merge.html`, `dist/privacy.html`, ... plus `404.html`, `sitemap.xml` and `robots.txt`. The tool UI hydrates on top of that HTML. Host `dist/` on any static host that serves `/merge` from `merge.html` (Netlify, Cloudflare Pages and GitHub Pages do) and uses `404.html` for unknown paths. No SPA rewrite is needed.

Environment variables (set at build time, e.g. in `.env.production`):
- `VITE_SITE_URL` the live origin, e.g. `https://example.com`. Used for canonical URLs, JSON-LD, og:image and the sitemap. If unset, the build prints a loud warning, and **fails** when `CI` or `STRICT_SITE_URL` is set.
- `SITEMAP_LASTMOD` (optional, `YYYY-MM-DD`) overrides the `<lastmod>` date; it defaults to the build date.
- `VITE_CONTACT_EMAIL` shown on the Contact and Privacy pages.
- `VITE_OCR_BASE_URL` (optional) self-host the OCR engine. Expects `worker.min.js`, `core/` (tesseract.js-core files) and `lang/` (`<code>.traineddata.gz`) below it. Unset, tesseract.js loads them from its public CDNs.
- `VITE_ADSENSE_CLIENT` (`ca-pub-...`) and `VITE_ADSENSE_SLOT`. While unset, no ad code loads and the privacy text omits the advertising section.

Adding a tool: also add its copy (and `h1`, `anchor`, `outcome` in `tools-meta.ts`, plus `RELATED` and `NEXT_STEP` in `content.ts`) (meta title/description, intro, steps, FAQ) to `TOOL_COPY` in `src/content.ts`, because each tool page is prerendered with that content.

## Next
Move `buildPdf`, `encryptPdf` into Web Workers, then sign/annotate, watermark/page numbers and OCR for non-Latin scripts (needs an embedded Unicode font).

## Notes on the OCR and password tools
- After pulling this change run `npm install` once (it adds `@neslinesli93/qpdf-wasm` and `tesseract.js` and updates `package-lock.json`).
- OCR languages are limited to Latin-script ones because the hidden text layer uses a built-in PDF font. Other scripts need a Unicode font embedded via `@pdf-lib/fontkit`.
- The standalone `preview/foldline.html` demo has not been updated with these tools.
