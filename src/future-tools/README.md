# Future tools

Planned tools that are **not wired into the app yet**. Each folder holds a plan (`README.md`):
the libraries, the approach, and the gotchas. Nothing here is imported, so it never affects the build.

## Promoting a tool to `src/tools/`
1. Move the folder: `src/future-tools/<name>` → `src/tools/<name>`.
2. Add `<Name>Tool.tsx` wrapped in `<ToolShell>` (see `src/tools/crop/CropTool.tsx`).
3. Add its copy to `src/tools-meta.ts` and an entry in `src/tools.ts` with `component: lazy(() => import('./tools/<name>/<Name>Tool'))`; remove it from `SOON` in `tools-meta.ts`.
4. Delete the plan's README once the tool ships.

| Folder | Difficulty | Core library |
| --- | --- | --- |
| `watermark-pagenumbers` | easy | pdf-lib |
| `images` | medium | pdfjs-dist + pdf-lib |
| `sign-annotate` | medium | pdf-lib + canvas overlay |
