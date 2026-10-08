# PDF ↔ images
**Libraries:** pdfjs-dist (render), pdf-lib (embed), fflate (zip).

- PDF → images: render each page to canvas at a chosen scale, `canvas.toBlob('image/png' | 'image/jpeg')`, bundle many pages into a zip.
- Images → PDF: `embedPng` / `embedJpg`, one page per image sized to the image (or A4 with fit options). Convert WebP/HEIC to PNG via canvas first.
- Options: DPI/scale, JPEG quality, page selection, page size and margins.
