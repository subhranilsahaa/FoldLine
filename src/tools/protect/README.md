# Add password (protect)
**Shipped.** Route `/protect`, UI in `ProtectTool.tsx`, encryption in `src/lib/protect.ts`.

- Uses the shared qpdf-wasm loader from `src/lib/unlock.ts` (`createQpdf`, `runQpdf`). A fresh module instance is created per file.
- `encryptPdf(bytes, { userPassword, ownerPassword?, permissions })` calls qpdf with each value as its own argument:
  `['--encrypt', user, owner, '256', ...flags, '--', '/in.pdf', '/out.pdf']`. 256-bit keys are always AES, so `--use-aes` is not passed.
- Flags: `--print=none` (no printing), `--extract=n` (no copying), `--modify=none` (no editing).
- Blocking something with no owner password would let anyone lift the block, so a random owner password is generated in that case.
- Source: a single untouched file's original bytes are encrypted as they are; otherwise the page list is built with `buildPdf` first (several files combine into one).
- Runs on the main thread with a busy state. Moving it into a Web Worker is the next step: the qpdf loader already only needs `fetch` and dynamic `import`, so it should move over unchanged.
- Output name: `<name>-protected.pdf`.
