// Runs after `vite build` and `vite build --ssr`. Writes one static HTML file per route
// (dist/merge.html, dist/about.html, ...), plus 404.html, sitemap.xml and robots.txt,
// then prints a summary of every page with its title and canonical URL.
import { readFile, writeFile, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const dist = path.resolve('dist');
const server = path.resolve('dist-server');
const {
  render, ALL_PATHS, SITE_URL, SITE_URL_IS_DEFAULT, OG_IMAGE, TOOL_COPY, META, headFor, structuredData,
} = await import(pathToFileURL(path.join(server, 'entry-server.js')).href);
const template = await readFile(path.join(dist, 'index.html'), 'utf8');

// ---- canonical and sitemap URLs depend on VITE_SITE_URL ----
if (SITE_URL_IS_DEFAULT) {
  const bar = '!'.repeat(72);
  console.warn(`\n${bar}\n  VITE_SITE_URL is not set. Canonical URLs, og:url, JSON-LD and sitemap.xml\n  all point at the placeholder ${SITE_URL}.\n  Set it at build time, e.g. VITE_SITE_URL=https://your-domain.com npm run build\n${bar}\n`);
  if (process.env.CI || process.env.STRICT_SITE_URL) {
    console.error('Failing the build because VITE_SITE_URL is unset (CI or STRICT_SITE_URL is set).');
    process.exit(1);
  }
}

if (process.env.VITE_ADSENSE_CLIENT || /VITE_ADSENSE_CLIENT/.test(await readFile('.env.production', 'utf8').catch(() => ''))) {
  if (!process.env.VITE_CONTACT_EMAIL && !/^VITE_CONTACT_EMAIL=/m.test(await readFile('.env.production', 'utf8').catch(() => ''))) {
    console.warn('\nWARNING: VITE_CONTACT_EMAIL is not set, so the Contact and Privacy pages show the placeholder contact.foldline@gmail.com. AdSense reviewers expect a working contact address.\n');
  }
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
/** JSON for an inline <script>: "<" is escaped so copy can never close the tag. */
const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c');
const warnings = [];
const warn = (url, msg) => warnings.push(`${url}: ${msg}`);

function page(url, html) {
  const h = headFor(url);
  if (!h.noindex) {
    if (h.title.length > 60) warn(url, `title is ${h.title.length} characters (keep it under 60)`);
    if (h.description.length > 160) warn(url, `description is ${h.description.length} characters (keep it under 160)`);
  }
  const tags = [
    h.noindex && '<meta name="robots" content="noindex" />',
    `<link rel="canonical" href="${esc(h.canonical)}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="Foldline" />',
    `<meta property="og:title" content="${esc(h.title)}" />`,
    `<meta property="og:description" content="${esc(h.description)}" />`,
    `<meta property="og:url" content="${esc(h.canonical)}" />`,
    `<meta property="og:image" content="${esc(OG_IMAGE)}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta property="og:image:alt" content="Foldline: PDF tools that stay on your device" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(h.title)}" />`,
    `<meta name="twitter:description" content="${esc(h.description)}" />`,
    `<meta name="twitter:image" content="${esc(OG_IMAGE)}" />`,
    ...(h.noindex ? [] : structuredData(url).map((o) => `<script type="application/ld+json">${json(o)}</script>`)),
  ].filter(Boolean).join('\n    ');
  return template
    .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${esc(h.title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, () => `<meta name="description" content="${esc(h.description)}" />`)
    .replace('</head>', () => `    ${tags}\n  </head>`)
    .replace('<div id="root"></div>', () => `<div id="root">${html}</div>`);
}

const rows = [];
function check(url, out) {
  const h1s = [...out.matchAll(/<h1[\s>]/g)].length;
  if (h1s !== 1) warn(url, `expected exactly one <h1>, found ${h1s}`);
  const tool = Object.values(META).find((m) => m.path === url);
  if (tool) {
    const copy = TOOL_COPY[tool.id];
    if (!out.includes(tool.h1)) warn(url, `<h1> text "${tool.h1}" is missing from the prerendered HTML`);
    if (!out.includes(copy.intro.slice(0, 40))) warn(url, 'intro text is missing from the prerendered HTML');
    if (!copy.faq.every((f) => out.includes(f.q))) warn(url, 'some FAQ questions are missing from the prerendered HTML');
  }
}

for (const url of ALL_PATHS) {
  const file = url === '/' ? 'index.html' : `${url.slice(1)}.html`;
  const out = page(url, await render(url));
  check(url, out);
  await writeFile(path.join(dist, file), out);
  const h = headFor(url);
  rows.push({ url, file, title: h.title, canonical: h.canonical, ld: structuredData(url).map((o) => o['@type']).join(', ') || '-' });
}
const notFound = page('/404', await render('/404'));
await writeFile(path.join(dist, '404.html'), notFound);
rows.push({ url: '/404', file: '404.html', title: headFor('/404').title, canonical: '(noindex)', ld: '-' });

const lastmod = process.env.SITEMAP_LASTMOD || new Date().toISOString().slice(0, 10);
const urls = ALL_PATHS.map((u) => `  <url><loc>${SITE_URL}${u === '/' ? '/' : u}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n');
await writeFile(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
await writeFile(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
await rm(server, { recursive: true, force: true });

// ---- summary ----
console.log(`\nPrerendered ${rows.length} pages (site ${SITE_URL}, sitemap lastmod ${lastmod})\n`);
for (const r of rows) {
  console.log(`  ${r.url.padEnd(10)} ${r.file.padEnd(14)} ${r.title}`);
  console.log(`  ${' '.repeat(10)} ${r.canonical}   [${r.ld}]`);
}
if (warnings.length) {
  console.warn(`\n${warnings.length} SEO warning${warnings.length > 1 ? 's' : ''}:`);
  warnings.forEach((w) => console.warn(`  - ${w}`));
} else {
  console.log('\nSEO checks passed: one <h1> per page, titles under 60, descriptions under 160, copy present in HTML.');
}
