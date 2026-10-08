# Watermark & page numbers
**Library:** pdf-lib only. Easiest next tool.

- Embed a font (`StandardFonts.Helvetica`, or `@pdf-lib/fontkit` for custom/Unicode) and use `page.drawText`.
- Watermark: draw rotated text (`rotate: degrees(45)`) with low `opacity`, centered via `font.widthOfTextAtSize`.
- Page numbers: position presets (bottom-center, bottom-right), start number, format (`1`, `1 / N`), skip first page.
- Respect page rotation and CropBox when positioning: compute from `page.getCropBox()` and the page's `Rotate`.
- Preview: draw the same text on a canvas overlay over the PDF.js render.
