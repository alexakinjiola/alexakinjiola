/*
  Per-page link previews.
  WhatsApp, LinkedIn, X, Facebook and the rest read the <head> of the HTML they
  fetch; they don't run JavaScript. This runs after `vite build` and writes a copy
  of dist/index.html for every page and case study, with its own title,
  description, URL and share image. Vercel serves these static files before the
  SPA fallback (cleanUrls maps /work/bimetal to work/bimetal.html), and the app
  boots exactly as before.
*/
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { cases } from '../src/data/cases.js';

const SITE = 'https://alexakinjiola.vercel.app';
const DIST = 'dist';
const shell = readFileSync(join(DIST, 'index.html'), 'utf8');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clip = (s, n = 200) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(' ', n - 1)) + '…');

function setMeta(html, attr, key, value) {
  const re = new RegExp(`(<meta ${attr}="${key.replace(/:/g, '\\:')}" content=")[^"]*(")`);
  if (!re.test(html)) throw new Error(`missing <meta ${attr}="${key}"> in index.html`);
  return html.replace(re, `$1${esc(value)}$2`);
}

function page({ path, title, description, image, imageAlt, type = 'website' }) {
  const url = SITE + (path === '/' ? '/' : path);
  const img = SITE + image;
  let html = shell
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`);
  html = setMeta(html, 'name', 'description', description);
  for (const [k, v] of [
    ['og:type', type], ['og:url', url], ['og:title', title], ['og:description', description],
    ['og:image', img], ['og:image:secure_url', img], ['og:image:alt', imageAlt],
  ]) html = setMeta(html, 'property', k, v);
  for (const [k, v] of [
    ['twitter:title', title], ['twitter:description', description], ['twitter:image', img], ['twitter:image:alt', imageAlt],
  ]) html = setMeta(html, 'name', k, v);
  const file = join(DIST, path === '/' ? 'index.html' : `${path.slice(1)}.html`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  return file;
}

const DEFAULT_IMG = '/og-image.jpg';
const DEFAULT_ALT = 'Alex Akinjiola, Senior Product Designer: complex products, made clear.';
const pages = [
  { path: '/work', title: 'Work — Alex Akinjiola', description: `${cases.length} product design case studies across fintech, health, property, hiring and e-commerce, from research to shipped product.` },
  { path: '/about', title: 'About — Alex Akinjiola', description: 'The story behind Alex Akinjiola — from civil engineering to product design, frontend and data analytics.' },
  { path: '/capabilities', title: 'Capabilities — Alex Akinjiola', description: 'Product design, frontend development, data analysis and product strategy — the capabilities Alex Akinjiola brings to a product team.' },
  { path: '/experience', title: 'Experience — Alex Akinjiola', description: 'Work history, education, certifications and skills of Alex Akinjiola, Senior Product Designer.' },
  { path: '/contact', title: 'Contact — Alex Akinjiola', description: 'Get in touch with Alex Akinjiola — available for full-time, remote, hybrid, contract and relocation product design roles.' },
].map((p) => ({ ...p, image: DEFAULT_IMG, imageAlt: DEFAULT_ALT }));

for (const c of cases) {
  const image = `/og/${c.slug}.jpg`;
  if (!existsSync(join('public', image))) throw new Error(`missing share image public${image}`);
  pages.push({
    path: `/work/${c.slug}`,
    title: `${c.title} — Case study by Alex Akinjiola`,
    description: clip(c.tagline),
    image,
    imageAlt: `${c.title} case study cover`,
    type: 'article',
  });
}

const written = pages.map(page);
console.log(`prerender-meta: wrote ${written.length} pages with their own link previews`);
