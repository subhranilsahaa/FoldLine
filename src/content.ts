import { META } from './tools-meta';

/** Set VITE_SITE_URL at build time (no trailing slash). Used for canonical URLs and the sitemap. */
export const SITE_URL: string = (import.meta.env.VITE_SITE_URL ?? 'https://foldline.example').replace(/\/$/, '');
/** Shown on Contact and Privacy; VITE_CONTACT_EMAIL can override it. */
export const CONTACT_EMAIL: string = import.meta.env.VITE_CONTACT_EMAIL ?? 'contact.foldline@gmail.com';
/** AdSense publisher id like "ca-pub-1234567890123456". Ads and their privacy text stay off while this is unset. */
export const ADSENSE_CLIENT: string | undefined = import.meta.env.VITE_ADSENSE_CLIENT || undefined;
export const ADSENSE_SLOT: string | undefined = import.meta.env.VITE_ADSENSE_SLOT || undefined;
export const UPDATED = 'October 5, 2026';
/** True when VITE_SITE_URL was not provided at build time: canonical and sitemap URLs then point at a placeholder. */
export const SITE_URL_IS_DEFAULT: boolean = !import.meta.env.VITE_SITE_URL;

export interface Faq { q: string; a: string }
export interface ToolCopy {
  metaTitle: string;
  metaDescription: string;
  intro: string;
  steps: string[];
  faq: Faq[];
}

const SHARED_FAQ: Faq[] = [
  {
    q: 'Are my files uploaded anywhere?',
    a: 'No. Foldline opens and edits your PDFs with code that runs inside this browser tab. The file is read into your device’s memory, processed there, and handed back to you as a download. Nothing is sent to a server, and closing the tab discards it.',
  },
  {
    q: 'Can I open password-protected PDFs?',
    a: 'Yes. If a PDF needs a password, Foldline asks for it as soon as you open the file, then works on an unlocked copy inside your browser. You need to know the password: Foldline cannot guess or recover a forgotten one. Use the Remove password tool if you want to save an unlocked copy.',
  },
];

export const TOOL_COPY: Record<keyof typeof META, ToolCopy> = {
  merge: {
    metaTitle: 'Merge PDF files online, free and private · Foldline',
    metaDescription: 'Combine several PDFs into one file in your browser. Reorder pages by dragging, then download. Your files are never uploaded.',
    intro: 'Merging joins two or more PDFs into a single document. Foldline shows every page of every file as a thumbnail, so you can fix the order before you save instead of merging blind and starting over.',
    steps: [
      'Choose the PDFs you want to combine, or drop them anywhere on the page. You can add more files at any time.',
      'Drag page thumbnails into the order you want. Use the page controls to rotate or remove a page that doesn’t belong.',
      'Download the merged PDF. It is built on your device and saved straight to your downloads.',
    ],
    faq: [
      { q: 'Is there a limit on file size or page count?', a: 'Foldline sets no limit of its own. Because everything happens on your device, very large files are bounded by your browser’s available memory. If a big merge feels slow or fails, try fewer files at a time.' },
      { q: 'Does merging reduce quality or turn pages into images?', a: 'No. Pages are copied into the new document as they are, so text stays selectable and images keep their original quality.' },
      { q: 'Can I merge only some pages from each file?', a: 'Yes. Remove the pages you don’t want in the thumbnail view before downloading, or use Split & extract to pull a few pages out first.' },
      ...SHARED_FAQ,
    ],
  },
  organize: {
    metaTitle: 'Reorder, rotate and delete PDF pages online · Foldline',
    metaDescription: 'Rearrange PDF pages, rotate them, or delete the ones you don’t need. Runs entirely in your browser, so nothing is uploaded.',
    intro: 'Scans arrive upside down, pages end up out of order, and a stray cover sheet needs to go. Organize pages puts the whole document on one screen so you can fix all of that at once.',
    steps: [
      'Choose the PDF you want to fix. Each page appears as a thumbnail.',
      'Drag pages to reorder them, rotate the ones that are sideways, and delete the ones you don’t need.',
      'Download the result as a new PDF. Your original file is not changed.',
    ],
    faq: [
      { q: 'Does this change my original file?', a: 'No. Foldline builds a new PDF from your edits and downloads it. The original stays where it was.' },
      { q: 'Can I rotate just one page?', a: 'Yes. Rotate applies to the page you choose, or to all the pages you have selected.' },
      { q: 'Will text and images survive?', a: 'Page content, including selectable text and images, is carried over unchanged. Document-level extras such as bookmarks may not be kept.' },
      ...SHARED_FAQ,
    ],
  },
  extract: {
    metaTitle: 'Split a PDF and extract pages online · Foldline',
    metaDescription: 'Pick the pages you want from a PDF and save them as a new file. Free, private and processed in your browser.',
    intro: 'Sometimes you need three pages out of a hundred. Split & extract lets you tick the pages you want and saves just those as a new PDF, which is handy for sending one chapter, one invoice or one signed page.',
    steps: [
      'Choose the PDF to take pages from. Pages appear as thumbnails.',
      'Tap the pages you want to keep. You can select as many as you like, including pages that aren’t next to each other.',
      'Extract them, then download the new PDF containing only your selection.',
    ],
    faq: [
      { q: 'Can I extract pages that are not next to each other?', a: 'Yes. Select any combination of pages, for example 2, 7 and 31, and they are saved together in one file.' },
      { q: 'Does it split a PDF into many files?', a: 'It saves your selection as one new PDF. To split a document into several parts, extract each part in turn.' },
      { q: 'Is the original file kept intact?', a: 'Yes. The original is never modified, and the extracted PDF is a separate download.' },
      ...SHARED_FAQ,
    ],
  },
  crop: {
    metaTitle: 'Crop PDF pages online · Foldline',
    metaDescription: 'Trim margins from PDF pages by drawing the area to keep. Apply one crop to every page. Private, runs in your browser.',
    intro: 'Cropping trims the white margins or scanner borders from a PDF so the content fills the screen or the printed page. You draw the area to keep right on the page, and can reuse the same box for the whole document.',
    steps: [
      'Choose the PDF you want to crop. Pages appear on screen for you to mark up.',
      'Draw the box around the area you want to keep. Adjust it per page, or apply the same crop to all pages.',
      'Download the cropped PDF.',
    ],
    faq: [
      { q: 'Does cropping permanently remove the cut-off area?', a: 'No. Foldline sets each page’s visible area, the same way most PDF viewers treat a crop. The trimmed region is hidden rather than erased, so don’t rely on cropping to redact sensitive information.' },
      { q: 'Can I use different crops on different pages?', a: 'Yes. Draw a separate box on each page, or draw one and apply it to all.' },
      { q: 'Will the page size change?', a: 'The visible page becomes the size of your crop box, so viewers and printers show the trimmed page.' },
      ...SHARED_FAQ,
    ],
  },
  compress: {
    metaTitle: 'Compress a PDF online: best, medium or low quality · Foldline',
    metaDescription: 'Make a PDF smaller in one tap. Pick Best, Medium or Low quality and keep the text selectable. Runs in your browser, so nothing is uploaded.',
    intro: 'Big PDFs are usually heavy because of the photos and scans inside them. Pick Best, Medium or Low and Foldline shrinks those images to match, then shows you exactly how much smaller the file got. Text and graphics are left alone, so what you can select and search today still works afterwards.',
    steps: [
      'Choose the PDF you want to shrink. You can add several files and they are compressed as one document.',
      'Tap Best, Medium or Low. The file downloads when it is ready.',
      'Not happy with the size or the look? Tap another level to compare. Each result stays on its button.',
    ],
    faq: [
      { q: 'Which level should I pick?', a: 'Best keeps images looking the same and saves what it can. Medium is the everyday choice: sharp on screen and in print, and much smaller. Low gives the smallest file, with images a little softer.' },
      { q: 'What exactly changes in my PDF?', a: 'Only the photos and scans inside it. Each one is reduced to the detail the chosen level needs at the size it appears on the page. Text, fonts and vector graphics are left exactly as they were.' },
      { q: 'Can I still select and search the text afterwards?', a: 'Yes. Text is never converted to images.' },
      { q: 'Why did a mostly-text PDF not shrink?', a: 'Text and vector graphics are already compact, so there is little to gain. Foldline says so and keeps your original rather than making the file bigger.' },
      { q: 'Do I need a specific file size, like under 1 MB?', a: 'Try Medium first, then Low if it is still too big. You can also remove pages you don’t need before compressing.' },
      ...SHARED_FAQ,
    ],
  },
  ocr: {
    metaTitle: 'OCR a PDF: make scanned pages searchable online · Foldline',
    metaDescription: 'Turn a scanned PDF into one you can search and copy text from. Text recognition runs in your browser, so your file is never uploaded.',
    intro: 'A scanned PDF is just pictures of pages, so you can’t search it or copy a sentence out of it. OCR (optical character recognition) reads the pictures and adds an invisible text layer on top. The pages look exactly the same, but now Ctrl+F finds words and you can select and copy text. Foldline does this on your device, so the scan never leaves your computer.',
    steps: [
      'Choose the scanned PDF, or drop it anywhere on the page.',
      'Check the language (Foldline picks one from your browser) and press Make searchable & download.',
      'Wait while the pages are read. The new PDF downloads on its own when it is ready.',
    ],
    faq: [
      { q: 'Does OCR change how my pages look?', a: 'No. Your original pages are kept as they are. The recognized words are added as a hidden layer behind the page image, which is what makes the file searchable.' },
      { q: 'Which languages are supported?', a: 'Languages written in the Latin alphabet, including English, Spanish, French, German, Italian, Portuguese, Dutch, Polish and Turkish. Pick every language that appears in the document. Languages with other alphabets, such as Arabic, Cyrillic or Indic scripts, are not supported yet.' },
      { q: 'Is my file uploaded for recognition?', a: 'No. The first time you use OCR, your browser downloads the recognition engine and language data from a public content delivery network and caches them. Your PDF itself is processed in your browser and is never sent anywhere.' },
      { q: 'Why is it slow on big scans?', a: 'Recognition is demanding, and it runs on your own device instead of a server. Expect a few seconds per page. You can cancel at any time, and pages that already contain text are skipped by default.' },
      { q: 'How accurate is it?', a: 'Clean, upright, printed text at a reasonable scan resolution reads very well. Handwriting, faint copies, skewed pages and unusual fonts are harder, so treat the result as searchable rather than perfect.' },
      ...SHARED_FAQ,
    ],
  },
  unlock: {
    metaTitle: 'Remove a PDF password online, free and private · Foldline',
    metaDescription: 'Enter the password once and save a copy of your PDF that opens without one. Runs in your browser, so the file and password are never uploaded.',
    intro: 'If you have a PDF that asks for a password every time you open it, you can save a copy that doesn’t. Foldline opens the file with the password you give it and writes a new PDF without the encryption. It happens inside your browser tab, so neither the file nor the password is sent anywhere.',
    steps: [
      'Choose the protected PDF, or drop it anywhere on the page.',
      'Type the password when asked and press Enter.',
      'Download the unlocked copy. The content is exactly the same, only the password is gone.',
    ],
    faq: [
      { q: 'Can you unlock a PDF if I forgot the password?', a: 'No. You must know the password to open the file. Foldline removes protection from files you can already open; it does not guess, crack or bypass passwords.' },
      { q: 'What about PDFs that open fine but won’t let me edit, copy or print?', a: 'Those carry permission restrictions rather than an opening password. Foldline removes the restrictions too when it opens them, so the saved copy has no limits. Only do this for files that are yours or that you have permission to change.' },
      { q: 'Does unlocking change or re-compress my PDF?', a: 'No. The pages, text, images and bookmarks are kept as they are. Only the encryption is removed.' },
      { q: 'Is the password stored or sent anywhere?', a: 'No. It is used inside this tab to open the file and is discarded afterwards.' },
      { q: 'Will other Foldline tools work on protected files?', a: 'Yes. Whichever tool you use, a protected file triggers the same password prompt, and from then on it behaves like any other PDF.' },
      { q: 'Are my files uploaded anywhere?', a: SHARED_FAQ[0].a },
    ],
  },
  protect: {
    metaTitle: 'Add a password to a PDF online, free and private · Foldline',
    metaDescription: 'Lock a PDF with a password using AES-256 encryption. Optionally block printing, copying or editing. Runs in your browser, so nothing is uploaded.',
    intro: 'Adding a password means nobody can open the PDF without it. Foldline encrypts the file with AES-256 and can also block printing, copying or editing. Everything happens inside your browser tab, so neither the file nor the password is sent anywhere. Keep the password somewhere safe: if it is lost, the file cannot be recovered.',
    steps: [
      'Choose the PDF you want to lock, or drop it anywhere on the page.',
      'Type a password twice. Optionally set an owner password and tick what to block: printing, copying or editing.',
      'Press Add password. The protected copy downloads as your file name plus “-protected”.',
    ],
    faq: [
      { q: 'What if I forget the password?', a: 'It cannot be recovered. Foldline never sees or stores your password, and AES-256 cannot be broken by guessing in any practical time. Keep the password in a password manager, and keep an unprotected original somewhere safe.' },
      { q: 'How strong is the encryption?', a: 'Foldline uses 256-bit AES, the strongest standard PDF encryption. How well it protects the file still depends on your password, so pick a long one that is hard to guess.' },
      { q: 'What is the owner password for?', a: 'The password you type first opens the file. An owner password is a second one that controls the restrictions, such as printing or copying. If you block anything and leave it empty, Foldline sets a random owner password so the restrictions cannot be lifted without breaking the encryption.' },
      { q: 'Do the restrictions stop everyone?', a: 'Restrictions are honored by most PDF apps, but they are a courtesy rather than a lock. Only the opening password truly keeps people out.' },
      { q: 'Can I protect several files at once?', a: 'Foldline saves one protected PDF. If you load several files they are combined into one document first, in the order you see them in Merge PDFs.' },
      { q: 'Are my files uploaded anywhere?', a: SHARED_FAQ[0].a },
    ],
  },
  convert: {
    metaTitle: 'Convert PDF and Word documents online · Foldline',
    metaDescription: 'Convert PDF to editable DOCX or convert DOCX to PDF in your browser. Fast, private, and student-ready with zero file uploads.',
    intro: 'Convert assignments, lecture notes, and essays between PDF and Word formats in seconds. Everything processes privately on your device without uploading your files.',
    steps: [
      'Choose whether to convert PDF to DOCX or DOCX to PDF, then select your file.',
      'Click Convert to process your document directly inside your browser.',
      'Download your converted document. Your files never leave your device.',
    ],
    faq: [
      { q: 'Can I edit the generated DOCX in Microsoft Word or Google Docs?', a: 'Yes. The generated .docx is an open Office document compatible with Microsoft Word, Google Docs, LibreOffice, and Pages.' },
      { q: 'Can scanned PDFs be converted to Word?', a: 'This converter extracts digital text. If your PDF is a scanned image, use the OCR tool first to recognize the text before converting.' },
      { q: 'Will headings and paragraphs be preserved in DOCX to PDF?', a: 'Headings, paragraphs, bullet points, and numbered lists are preserved in a clean, multi-page PDF ready for sharing or submission.' },
      ...SHARED_FAQ,
    ],
  },
};

export interface PageHead { title: string; description: string }

export const PAGES: Record<string, PageHead> = {
  '/': {
    title: 'Foldline: free PDF tools that run on your device',
    description: 'Merge, reorder, split, crop, compress, OCR, lock and unlock PDFs in your browser. No uploads, no sign-up. Your files stay on your device.',
  },
  '/about': { title: 'About Foldline', description: 'What Foldline is, how it works without uploading your files, and how the site is funded.' },
  '/contact': { title: 'Contact · Foldline', description: 'Get in touch with Foldline for feedback, bug reports or questions.' },
  '/privacy': { title: 'Privacy Policy · Foldline', description: 'How Foldline handles your files, data and cookies.' },
  '/terms': { title: 'Terms and Conditions · Foldline', description: 'The terms for using Foldline’s free, on-device PDF tools.' },
  '/cookies': { title: 'Cookie Policy · Foldline', description: 'Which cookies and local storage Foldline and its ad partners use, and how to control them.' },
  '/disclaimer': { title: 'Disclaimer · Foldline', description: 'Important limits on the accuracy and use of Foldline’s PDF tools and content.' },
};

export const TOOL_PATHS = Object.values(META).map((m) => m.path);
/** Every URL that gets prerendered to its own HTML file (the 404 page is separate). */
export const ALL_PATHS = ['/', ...TOOL_PATHS, '/about', '/contact', '/privacy', '/terms', '/cookies', '/disclaimer'];

export const normalizePath = (p: string) => (p.length > 1 ? p.replace(/\/+$/, '') : p) || '/';

export function headFor(path: string): PageHead & { canonical: string; noindex: boolean } {
  const p = normalizePath(path);
  const tool = Object.values(META).find((m) => m.path === p);
  const head = tool
    ? { title: TOOL_COPY[tool.id as keyof typeof META].metaTitle, description: TOOL_COPY[tool.id as keyof typeof META].metaDescription }
    : PAGES[p];
  if (!head) return { title: 'Page not found · Foldline', description: 'This page does not exist.', canonical: SITE_URL + '/', noindex: true };
  return { ...head, canonical: SITE_URL + (p === '/' ? '/' : p), noindex: false };
}

/** 1200x630 share image in public/. */
export const OG_IMAGE = `${SITE_URL}/og-image.png`;

type Json = Record<string, unknown>;

/** JSON-LD blocks for a route. Built from the same copy that is visible on the page. */
export function structuredData(path: string): Json[] {
  const p = normalizePath(path);
  const url = SITE_URL + (p === '/' ? '/' : p);
  if (p === '/') {
    return [
      { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Foldline', url: SITE_URL + '/', description: PAGES['/'].description },
      { '@context': 'https://schema.org', '@type': 'Organization', name: 'Foldline', url: SITE_URL + '/', logo: `${SITE_URL}/icon-512.png` },
    ];
  }
  const tool = Object.values(META).find((m) => m.path === p);
  if (!tool) return [];
  const copy = TOOL_COPY[tool.id as keyof typeof META];
  return [
    {
      '@context': 'https://schema.org', '@type': 'SoftwareApplication',
      name: tool.title, url, description: copy.metaDescription,
      applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
    {
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: copy.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Foldline', item: SITE_URL + '/' },
        { '@type': 'ListItem', position: 2, name: tool.title, item: url },
      ],
    },
  ];
}

/** Tools worth suggesting next to a given tool (shown as "Related tools" on its page). */
export const RELATED: Record<keyof typeof META, (keyof typeof META)[]> = {
  merge: ['organize', 'compress', 'extract'],
  organize: ['merge', 'extract', 'crop'],
  extract: ['organize', 'merge', 'compress'],
  crop: ['organize', 'compress', 'ocr'],
  compress: ['merge', 'protect', 'ocr'],
  ocr: ['compress', 'crop', 'unlock'],
  unlock: ['protect', 'merge', 'compress'],
  protect: ['unlock', 'compress', 'merge'],
  convert: ['compress', 'ocr', 'organize'],
};

/** What to suggest after a download, per tool. */
export const NEXT_STEP: Record<keyof typeof META, { id: keyof typeof META; ask: string } | null> = {
  merge: { id: 'compress', ask: 'Compress it?' },
  organize: { id: 'compress', ask: 'Compress it?' },
  extract: { id: 'compress', ask: 'Compress it?' },
  crop: { id: 'compress', ask: 'Compress it?' },
  compress: { id: 'protect', ask: 'Add a password?' },
  ocr: { id: 'compress', ask: 'Compress it?' },
  unlock: { id: 'organize', ask: 'Reorder pages?' },
  protect: null,
  convert: { id: 'compress', ask: 'Compress PDF?' },
};
