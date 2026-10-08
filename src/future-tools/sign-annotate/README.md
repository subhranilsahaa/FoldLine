# Sign & annotate
**Libraries:** pdf-lib + a canvas/SVG overlay on the PDF.js render.

- Signature: draw pad (pointer events → smoothed path) or type-to-sign; save as PNG, `embedPng`, `drawImage`.
- Annotations: text, highlight rectangles, freehand, shapes. Store as normalized coordinates (0-1) per page, like the crop tool, then map to PDF coordinates on export.
- Handle page rotation and CropBox in the coordinate mapping (reuse `toCropBox` logic in `src/lib/pdf.ts`).
- Keep signatures in IndexedDB so they can be reused (on-device only).
- Redaction is a different feature: it must rasterize or remove the underlying content, not draw black boxes.
