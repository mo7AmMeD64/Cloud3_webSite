// Zero-dependency site build: render templates, bundle CSS/JS, fingerprint, copy.
import { createHash } from 'node:crypto';
import {
  cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ICONS } from './build/icons.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');

const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const write = (p, data) => {
  const file = path.join(DIST, p);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, data);
};
const hash = (data) => createHash('sha256').update(data).digest('hex').slice(0, 8);

/* ------------------------------------------------------------------ data */

const site = json('src/data/site.json');
const en = json('src/i18n/en.json');
const ar = json('src/i18n/ar.json');
const ui = { en, ar };
const screensData = json('src/data/screens.json');
const releaseSnapshot = existsSync(path.join(ROOT, 'src/data/release.json'))
  ? read('src/data/release.json')
  : '{}';


/* --------------------------------------------------------------- cleaning */

rmSync(DIST, { recursive: true, force: true });
mkdirSync(path.join(DIST, 'assets'), { recursive: true });

/* ----------------------------------------------------------------- assets */

const imageFiles = existsSync(path.join(SRC, 'assets/img')) ? readdirSync(path.join(SRC, 'assets/img')) : [];
const images = {};
imageFiles.filter((f) => f.endsWith('.webp')).forEach((file) => {
  const buf = readFileSync(path.join(SRC, 'assets/img', file));
  const id = file.replace(/-\d+\.webp$/, '');
  const size = (file.match(/-(\d+)\.webp$/) || [])[1];
  const out = `img/${file.replace(/\.webp$/, '.' + hash(buf) + '.webp')}`;
  write(`assets/${out}`, buf);
  images[id] = images[id] || {};
  images[id][size] = out;
});

for (const icon of ['favicon-32.png', 'apple-touch-icon.png', 'icon-64.png', 'icon-192.png', 'icon-512.png']) {
  const from = path.join(SRC, 'assets', icon);
  if (existsSync(from)) cpSync(from, path.join(DIST, icon));
}
if (existsSync(path.join(SRC, 'assets/og.jpg'))) cpSync(path.join(SRC, 'assets/og.jpg'), path.join(DIST, 'og.jpg'));

for (const font of readdirSync(path.join(SRC, 'fonts'))) {
  mkdirSync(path.join(DIST, 'fonts'), { recursive: true });
  cpSync(path.join(SRC, 'fonts', font), path.join(DIST, 'fonts', font));
}

if (existsSync(path.join(SRC, 'static'))) {
  cpSync(path.join(SRC, 'static'), DIST, { recursive: true });
}

/* ------------------------------------------------------------- CSS and JS */

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

const cssOrder = [
  'css/fonts.css', 'css/tokens.css', 'css/base.css',
  'css/sections/nav.css', 'css/sections/hero.css', 'css/sections/features.css',
  'css/sections/screens.css', 'css/sections/music.css', 'css/sections/download.css',
  'css/sections/faq.css', 'css/sections/community.css', 'css/sections/footer.css',
  'css/overlay.css'
];
const cssSource = cssOrder.map((f) => `/* ${f} */\n${read('src/' + f)}`).join('\n');
const cssName = `app.${hash(cssSource)}.css`;
write(`assets/${cssName}`, minifyCss(cssSource));

const headSource = ['js/lite.js', 'js/i18n-switch.js'].map((f) => read('src/' + f)).join('\n;\n');
const headName = `head.${hash(headSource)}.js`;
write(`assets/${headName}`, headSource);

const appSource = ['js/main.js', 'js/music.js', 'js/download.js']
  .map((f) => read('src/' + f)).join('\n;\n');
const appName = `app.${hash(appSource)}.js`;
write(`assets/${appName}`, appSource);

/* ------------------------------------------------------------------- CNC */

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function parseTemplate(source) {
  const root = { children: [] };
  const stack = [root];
  const re = /\{\{\{([\s\S]+?)\}\}\}|\{\{([\s\S]+?)\}\}/g;
  let last = 0;
  let match;
  while ((match = re.exec(source))) {
    if (match.index > last) {
      stack[stack.length - 1].children.push({ type: 'text', value: source.slice(last, match.index) });
    }
    last = re.lastIndex;
    if (match[1] !== undefined) {
      stack[stack.length - 1].children.push({ type: 'var', key: match[1].trim(), raw: true });
      continue;
    }
    const tag = match[2].trim();
    if (tag.startsWith('#each ')) {
      const node = { type: 'each', key: tag.slice(6).trim(), children: [] };
      stack[stack.length - 1].children.push(node);
      stack.push(node);
    } else if (tag.startsWith('#if ')) {
      const node = { type: 'if', key: tag.slice(4).trim(), children: [] };
      stack[stack.length - 1].children.push(node);
      stack.push(node);
    } else if (tag.startsWith('/')) {
      if (stack.length > 1) stack.pop();
    } else if (tag.startsWith('>')) {
      stack[stack.length - 1].children.push({ type: 'partial', name: tag.slice(1).trim() });
    } else if (tag) {
      stack[stack.length - 1].children.push({ type: 'var', key: tag, raw: false });
    }
  }
  if (last < source.length) {
    stack[stack.length - 1].children.push({ type: 'text', value: source.slice(last) });
  }
  return root;
}

function lookup(stack, key) {
  for (let i = stack.length - 1; i >= 0; i--) {
    const ctx = stack[i];
    if (key === '.') {
      if (ctx['.'] !== undefined) return ctx['.'];
      continue;
    }
    let cur = ctx;
    let ok = true;
    for (const part of key.split('.')) {
      if (cur === null || cur === undefined || typeof cur !== 'object' || !(part in cur)) { ok = false; break; }
      cur = cur[part];
    }
    if (ok) return cur;
  }
  return undefined;
}

function renderNodes(nodes, stack, out) {
  for (const node of nodes) {
    if (node.type === 'text') {
      out.push(node.value);
    } else if (node.type === 'var') {
      const value = lookup(stack, node.key);
      out.push(value === undefined || value === null ? '' : (node.raw ? String(value) : escapeHtml(value)));
    } else if (node.type === 'partial') {
      const p = partials[node.name];
      if (p) renderNodes(p.children, stack, out);
    } else if (node.type === 'each') {
      const list = lookup(stack, node.key);
      if (Array.isArray(list)) {
        list.forEach((item, i) => {
          const ctx = (item && typeof item === 'object')
            ? Object.assign({}, item, { '.': item, '@index': i, '@first': i === 0, '@last': i === list.length - 1 })
            : { '.': item, '@index': i, '@first': i === 0, '@last': i === list.length - 1 };
          renderNodes(node.children, stack.concat([ctx]), out);
        });
      }
    } else if (node.type === 'if') {
      if (lookup(stack, node.key)) renderNodes(node.children, stack, out);
    }
  }
}

const partials = {};
const partialDir = path.join(SRC, 'templates/partials');
for (const file of readdirSync(partialDir)) {
  if (!file.endsWith('.html')) continue;
  partials[file.replace(/\.html$/, '')] = parseTemplate(readFileSync(path.join(partialDir, file), 'utf8'));
}

const templates = {
  base: parseTemplate(read('src/templates/base.html')),
  home: parseTemplate(read('src/templates/home.html')),
  legal: parseTemplate(read('src/templates/legal.html')),
  notfound: parseTemplate(read('src/templates/404.html'))
};

function render(ast, data) {
  const out = [];
  renderNodes(ast.children, [data], out);
  return out.join('');
}

/* ------------------------------------------------------------- page data */

const year = new Date().getFullYear();

function buildPageData(lang, kind) {
  const t = ui[lang];
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const root = kind === 'enHome' ? '../'
    : kind === 'enLegal' ? '../../'
      : kind === 'legal' ? '../' : '';
  const selfPrefix = kind === 'enLegal' || kind === 'legal' ? '../' : '';

  const altLang = lang === 'ar' ? 'en' : 'ar';
  const isLegal = kind === 'legal' || kind === 'enLegal';
  const altAr = site.siteUrl + (isLegal ? 'legal/' : '');
  const altEn = site.siteUrl + (isLegal ? 'en/legal/' : 'en/');

  const altUrl = kind === 'notfound'
    ? (lang === 'ar' ? `${root}en/index.html` : `${root}index.html`)
    : lang === 'ar'
      ? `${root}${altLang}/index.html`
      : `${root}index.html`;

  const canonical = kind === 'notfound' ? `${site.siteUrl}404.html`
    : lang === 'ar'
      ? (kind === 'legal' ? `${site.siteUrl}legal/` : site.siteUrl)
      : (kind === 'legal' ? `${site.siteUrl}en/legal/` : `${site.siteUrl}en/`);

  const homeHref = `${selfPrefix}index.html`;
  const legalHref = `${selfPrefix}legal/index.html`;
  const navPrefix = kind === 'home' || kind === 'enHome' ? '#' : `${homeHref}#`;

  const featureItems = t.features.items.map((item) => Object.assign({}, item, {
    svg: ICONS[item.icon] || ''
  }));

  const reel = t.screens.items.map((item, i) => {
    const meta = screensData.items.find((s) => s.id === item.src) || screensData.items[0];
    const set = images[meta.img] || images.home;
    return Object.assign({}, item, {
      num: String(i + 1).padStart(2, '0'),
      src: `${root}assets/${set['760']}`,
      srcset: `${root}assets/${set['480']} 480w, ${root}assets/${set['760']} 760w`,
      width: meta.width,
      height: meta.height
    });
  });

  function heroImage(id, alt) {
    const set = images[id] || images.home;
    const big = set['900'] || set['760'];
    const small = set['620'] || set['480'];
    const width = id === 'makima' ? 620 : (screensData.items.find((s) => s.img === id) || {}).width || 620;
    const height = id === 'makima' ? 1335 : (screensData.items.find((s) => s.img === id) || {}).height || 978;
    return {
      src: `${root}assets/${big}`,
      srcset: `${root}assets/${small} ${id === 'makima' ? 620 : 480}w, ${root}assets/${big} ${id === 'makima' ? 900 : 760}w`,
      width,
      height,
      alt
    };
  }

  const hero = heroImage('makima', t.hero.alt);
  const preloadImage = kind === 'home' || kind === 'enHome'
    ? `<link rel="preload" as="image" href="${hero.src}" imagesrcset="${hero.srcset}" imagesizes="(max-width: 820px) 62vw, 46vw" fetchpriority="high">`
    : '';

  return {
    lang,
    htmlLang: lang,
    dir,
    t,
    site,
    root,
    year,
    kind,
    bodyClass: `page--${kind} lang-${lang}`,
    title: kind === 'legal' || kind === 'enLegal' ? `${t.legal.title} — cloud3`
      : kind === 'notfound' ? `${t.notfound.title} — cloud3`
        : t.meta.title,
    desc: kind === 'legal' || kind === 'enLegal' ? t.footer.disclaimer
      : kind === 'notfound' ? t.notfound.text
        : t.meta.desc,
    ogLocale: lang === 'ar' ? 'ar_IQ' : 'en_US',
    canonical,
    altAr,
    altEn,
    altUrl,
    altLang,
    homeHref,
    legalHref,
    navPrefix,
    github: site.github,
    telegram: site.telegram,
    donate: site.donate,
    releasesApi: site.releasesApi,
    siteUrl: site.siteUrl,
    css: cssName,
    headJs: headName,
    appJs: appName,
    preloadImage,
    features: { items: featureItems },
    screens: { items: reel },
    hero: Object.assign({}, t.hero),
    heroImage: hero,
    album: {
      art: `${root}assets/${images.album['420']}`,
      tracks: site.album.tracks.map((track, i) => Object.assign({}, track, {
        num: String(i + 1).padStart(2, '0'),
        src: `${root}${track.file}`
      }))
    }
  };
}

/* ---------------------------------------------------------------- output */

const pages = [
  { kind: 'home', lang: 'ar', out: 'index.html' },
  { kind: 'enHome', lang: 'en', out: 'en/index.html' },
  { kind: 'legal', lang: 'ar', out: 'legal/index.html' },
  { kind: 'enLegal', lang: 'en', out: 'en/legal/index.html' },
  { kind: 'notfound', lang: 'ar', out: '404.html' }
];

for (const page of pages) {
  const data = buildPageData(page.lang, page.kind);
  const bodyTemplate = page.kind === 'legal' || page.kind === 'enLegal' ? templates.legal
    : page.kind === 'notfound' ? templates.notfound
      : templates.home;
  data.content = render(bodyTemplate, data);
  write(page.out, render(templates.base, data));
}

/* ------------------------------------------------------------- meta files */

write('manifest.webmanifest', JSON.stringify({
  name: 'cloud3 — Watch. Read.',
  short_name: 'cloud3',
  description: en.meta.desc,
  start_url: './index.html',
  scope: './',
  display: 'standalone',
  background_color: '#0d0d0f',
  theme_color: '#0d0d0f',
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
}, null, 2));

const today = new Date().toISOString().slice(0, 10);
const urls = [
  [site.siteUrl, 'ar'],
  [`${site.siteUrl}en/`, 'en'],
  [`${site.siteUrl}legal/`, 'ar'],
  [`${site.siteUrl}en/legal/`, 'en']
];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map(([u]) => `  <url>
    <loc>${u}</loc>
    <lastmod>${today}</lastmod>
    <xhtml:link rel="alternate" hreflang="ar" href="${u.includes('/en/') ? u.replace('/en/', '/') : u}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${u.includes('/en/') ? u : u + 'en/'}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${u.includes('/en/') ? u.replace('/en/', '/') : u}"/>
  </url>`).join('\n')}
</urlset>
`);

write('robots.txt', `User-agent: *
Allow: /

Sitemap: ${site.siteUrl}sitemap.xml
`);

write('release.json', releaseSnapshot);
write('.nojekyll', '');

/* ------------------------------------------------------------------ check */

const missing = [
  'index.html', 'en/index.html', 'legal/index.html', 'en/legal/index.html', '404.html',
  'manifest.webmanifest', 'sitemap.xml', 'robots.txt', `assets/${cssName}`, `assets/${appName}`
].filter((f) => !existsSync(path.join(DIST, f)));

if (missing.length) {
  console.error('build: missing output', missing);
  process.exit(1);
}
console.log(`build: ${pages.length} pages, css ${cssName}, js ${appName} (${(appSource.length / 1024).toFixed(1)} KB)`);
