# Tools

Live tools, one folder each. Registered in `src/tools.ts` and lazy-loaded per route.

- `organize/` Merge, Organize and Split & extract (shared page grid)
- `crop/` Crop
- `ocr/` OCR (makes scans searchable; engine in `src/lib/ocr.ts`)
- `unlock/` Remove password (decryption happens when a file is opened, see `src/lib/unlock.ts`)
- `protect/` Add password (AES-256 via qpdf-wasm, see `src/lib/protect.ts` and its README)

See `src/future-tools/` for planned tools.

## File names

Output names come from one place, `src/lib/filename.ts` (`suggestName`, the `SUFFIX` table, sanitizing). Tools never build names themselves: they call `useFileName(operation, pageNames(pages, docs), docKey(pages))`, show it with `<DownloadRow>` (rename field + download button) and pass `name.filename` to `downloadBytes`. The "Name files automatically" setting lives in `src/lib/settings.ts`. Check the naming rules with `npm run test:names`.
