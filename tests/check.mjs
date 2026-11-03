// Site checks: static assertions plus real browser runs in both languages.
// Usage: node tests/check.mjs   (SITE_DIST, SHOTS and PORT are optional)

import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = process.env.SITE_DIST || path.join(HERE, '..', 'dist');
const SHOTS = process.env.SHOTS || path.join(HERE, 'screenshots');
const PREFIX = '/Cloud3_webSite';
const PORT = Number(process.env.PORT || 4179);
const BASE = `http://127.0.0.1:${PORT}${PREFIX}/`;

const release = JSON.parse(readFileSync(path.join(DIST, 'release.json'), 'utf8'));
const VERSION = release.tag_name;

let failed = 0;
const all = [];
function check(name, ok, detail = '') {
  all.push({ name, ok });
  if (!ok) {
    failed++;
    console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`);
  }
}

/* ---------------------------------------------------------------- server */

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.webmanifest': 'application/manifest+json'
};

const server = createServer((req, res) => {
  let url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (!url.startsWith(PREFIX)) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('outside the site root');
    return;
  }
  url = url.slice(PREFIX.length) || '/';
  let file = path.join(DIST, url);
  if (url.endsWith('/')) file = path.join(file, 'index.html');
  else if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!existsSync(file)) {
    res.writeHead(404, { 'content-type': TYPES['.html'] });
    res.end(readFileSync(path.join(DIST, '404.html')));
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});

await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));

/* ------------------------------------------------------- static checks */

const pages = [
  ['index.html', 'ar', 'rtl'],
  ['en/index.html', 'en', 'ltr'],
  ['legal/index.html', 'ar', 'rtl'],
  ['en/legal/index.html', 'en', 'ltr'],
  ['404.html', 'ar', 'rtl']
];

for (const [file, lang, dir] of pages) {
  const html = readFileSync(path.join(DIST, file), 'utf8');
  const label = file;
  check(`${label}: lang/dir`, html.includes(`<html lang="${lang}" dir="${dir}"`));
  check(`${label}: one h1`, (html.match(/<h1[\s>]/g) || []).length === 1);
  check(`${label}: no inline scripts`, !/<script(?![^>]*\bsrc=)[^>]*>/i.test(html));
  check(`${label}: no inline styles`, !/\sstyle="/i.test(html));
  check(`${label}: relative assets`, !/src="\/(?!\/)/.test(html) && !/href="\/(?!\/)/.test(html));
  check(`${label}: hreflang ar/en/x-default`,
    /hreflang="ar"/.test(html) && /hreflang="en"/.test(html) && /hreflang="x-default"/.test(html));
  check(`${label}: canonical`, /<link rel="canonical" href="https:\/\/[^"]+"/.test(html));
  check(`${label}: csp`, /Content-Security-Policy/.test(html) && /script-src 'self'/.test(html));
  check(`${label}: og image`, /og:image" content="https:\/\/[^"]+og\.jpg"/.test(html));
}

const home = readFileSync(path.join(DIST, 'index.html'), 'utf8');
check('home: no leftover sections', !/id="(manga|how)"|data-scene-tab|data-screens-track|data-loader/.test(home));
check('home: music player markup', /data-player/.test(home) && (home.match(/data-track="/g) || []).length === 3);
check('home: hero key art', /makima-900\.[a-f0-9]+\.webp/.test(home));
check('home: album art', /album-420\.[a-f0-9]+\.webp/.test(home));

check('dist has no un-fingerprinted css/js', !readdirSync(path.join(DIST, 'assets')).some((f) => /^[a-z]+\.(css|js)$/.test(f)));
check('dist favicons', ['favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png']
  .every((f) => existsSync(path.join(DIST, f))));
check('dist sitemap/robots/manifest/.nojekyll',
  ['sitemap.xml', 'robots.txt', 'manifest.webmanifest', '.nojekyll'].every((f) => existsSync(path.join(DIST, f))));
check('dist og image 1200x630', await jpegSize(path.join(DIST, 'og.jpg')).then((s) => s === '1200x630'));
check('dist vinyl tracks', ['tracks/firepower.mp3', 'tracks/i-dont-know-erika.mp3', 'tracks/candy.mp3']
  .every((f) => existsSync(path.join(DIST, 'vinyl', f))));
check('dist has no separate vinyl page', !existsSync(path.join(DIST, 'vinyl', 'index.html')));
check('home: player lives on the page', !/vinyl\/index\.html/.test(home));

async function jpegSize(file) {
  const buf = readFileSync(file);
  for (let i = 2; i < buf.length - 8; ) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return `${buf.readUInt16BE(i + 7)}x${buf.readUInt16BE(i + 5)}`;
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return '';
}

/* ------------------------------------------------------------ helpers */

mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch();
const consoleErrors = [];

function attach(page) {
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`${page.url()} ${m.text()}`); });
  page.on('pageerror', (e) => consoleErrors.push(`${page.url()} pageerror ${e.message}`));
}

async function mockApi(context, mode = 'success') {
  await context.route('https://api.github.com/**', (route) => {
    if (mode === 'success') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(release) });
    if (mode === 'error') return route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"boom"}' });
    return route.abort();
  });
  if (mode === 'offline') {
    await context.route('**/release.json', (route) => route.abort());
  }
}

async function newPage({ width = 1440, height = 900, lang = 'ar', js = true, motion = 'no-preference', mode = 'success' } = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    locale: lang === 'ar' ? 'ar-IQ' : 'en-US',
    javaScriptEnabled: js,
    reducedMotion: motion,
    deviceScaleFactor: 1
  });
  await mockApi(context, mode);
  // CI runners report few cores, which would switch the site into lite mode.
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
  });
  const page = await context.newPage();
  if (mode === 'success') attach(page);
  return { context, page };
}

const settle = (page) => page.waitForTimeout(900);

/* ---------------------------------------------------------- matrix */
const viewports = [[390, 844], [768, 1024], [1440, 900]];
const langs = [['ar', ''], ['en', 'en/']];

for (const [lang, prefix] of langs) {
  for (const [w, h] of viewports) {
    const tag = `${lang} ${w}x${h}`;
    const { context, page } = await newPage({ width: w, height: h, lang });
    await page.goto(BASE + prefix, { waitUntil: 'load' });
    await settle(page);
    const m = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      h1: document.querySelectorAll('h1').length,
      hscroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      version: document.querySelector('[data-rel="version"]')?.textContent.trim(),
      notes: document.querySelector('[data-rel="notes"]')?.textContent.trim().length,
      link: document.querySelector('[data-rel="link"]')?.getAttribute('href'),
      cards: document.querySelectorAll('[data-screen-card]').length,
      figure: (() => { const i = document.querySelector('.hero__figure'); const r = i?.getBoundingClientRect(); return r ? Math.round(r.height) : 0; })(),
      music: !!document.querySelector('[data-player]')
    }));
    check(`${tag}: html lang/dir`, m.lang === lang && m.dir === (lang === 'ar' ? 'rtl' : 'ltr'));
    check(`${tag}: no horizontal scroll`, m.hscroll <= 1, `${m.hscroll}px`);
    check(`${tag}: one h1`, m.h1 === 1, String(m.h1));
    check(`${tag}: release version ${VERSION}`, m.version === VERSION, String(m.version));
    check(`${tag}: release notes rendered`, m.notes > 20, String(m.notes));
    check(`${tag}: apk link is the release asset`, /releases\/download\/.+\/cloud3-.+\.apk$/.test(m.link || ''), String(m.link));
    check(`${tag}: three screen cards`, m.cards === 3, String(m.cards));
    check(`${tag}: hero figure painted`, m.figure >= 300, String(m.figure));
    check(`${tag}: music section present`, m.music);
    check(`${tag}: lite mode on phone`, w <= 600
      ? await page.evaluate(() => document.documentElement.classList.contains('lite'))
      : true);

    const theme = await page.evaluate(() => {
      const el = document.querySelector('.hero__title');
      return el ? getComputedStyle(el).fontSize : '';
    });
    check(`${tag}: hero title sized`, parseFloat(theme) >= 28, theme);

    await page.screenshot({ path: path.join(SHOTS, `${lang}-${w}-hero.png`) });

    if (w <= 820) {
      const snap = await page.evaluate(() => {
        const el = document.querySelector('.screens__grid');
        return { flow: getComputedStyle(el).scrollSnapType, over: el.scrollWidth > el.clientWidth + 4 };
      });
      check(`${tag}: screens row scrolls sideways`, snap.over && /x/.test(snap.flow), JSON.stringify(snap));
    }
    await context.close();
  }
}

/* ------------------------------------------------------- mobile menu */

{
  const { context, page } = await newPage({ width: 390, height: 844, lang: 'en' });
  await page.goto(BASE + 'en/', { waitUntil: 'load' });
  await page.waitForTimeout(600);

  await page.click('[data-menu-open]');
  await page.waitForTimeout(450);
  const open = await page.evaluate(() => ({
    open: document.querySelector('[data-menu]').classList.contains('is-open'),
    lock: getComputedStyle(document.documentElement).overflow,
    expanded: document.querySelector('[data-menu-open]').getAttribute('aria-expanded'),
    focus: document.activeElement.getAttribute('href') || document.activeElement.tagName
  }));
  check('menu: opens and locks the page', open.open && open.lock === 'hidden' && open.expanded === 'true', JSON.stringify(open));

  await page.evaluate(() => {
    const f = document.querySelector('[data-menu]').querySelectorAll('a[href], button:not([disabled])');
    f[0].focus();
  });
  await page.keyboard.press('Shift+Tab');
  const wrapped = await page.evaluate(() => {
    const f = document.querySelector('[data-menu]').querySelectorAll('a[href], button:not([disabled])');
    return document.activeElement === f[f.length - 1];
  });
  check('menu: focus wraps inside the dialog', wrapped);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  check('menu: escape closes and restores scroll',
    await page.evaluate(() => !document.querySelector('[data-menu]').classList.contains('is-open')
      && getComputedStyle(document.documentElement).overflow !== 'hidden'));
  await context.close();
}

/* --------------------------------------------- sections + screenshots */

for (const [lang, prefix] of langs) {
  const { context, page } = await newPage({ lang });
  await page.goto(BASE + prefix, { waitUntil: 'load' });
  await page.waitForTimeout(1200);

  for (const id of ['features', 'screens', 'music', 'download', 'faq']) {
    await page.evaluate((id) => {
      const el = document.getElementById(id);
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 20);
    }, id);
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(SHOTS, `${lang}-${id}.png`) });
  }
  await context.close();
}

/* ------------------------------------------- screens focus + parallax */

{
  const { context, page } = await newPage({ width: 1440, height: 900, lang: 'en' });
  await page.goto(BASE + 'en/', { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const el = document.getElementById('screens');
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 20);
  });
  await page.waitForTimeout(900);

  const strip = await page.evaluate(() => {
    const grid = document.querySelector('.screens__grid');
    const cards = [...grid.querySelectorAll('[data-screen-card]')];
    return {
      strip: grid.classList.contains('is-strip'),
      active: cards.findIndex((c) => c.classList.contains('is-active')),
      meta: cards.map((c) => getComputedStyle(c.querySelector('.screen-card__meta')).opacity),
      line: cards.map((c) => getComputedStyle(c.querySelector('.screen-card__line')).opacity)
    };
  });
  check('screens: centre plate focused by default', strip.strip && strip.active === 1, JSON.stringify(strip));
  check('screens: only the focused caption shows',
    strip.meta[1] === '1' && strip.meta[0] === '0' && strip.meta[2] === '0' && strip.line[1] === '1',
    JSON.stringify(strip.meta));

  await page.locator('[data-screen-focus]').nth(2).click();
  await page.waitForTimeout(1100);
  const focused = await page.evaluate(() => {
    const grid = document.querySelector('.screens__grid');
    const cards = [...grid.querySelectorAll('[data-screen-card]')];
    return {
      active: cards.findIndex((c) => c.classList.contains('is-active')),
      widths: cards.map((c) => Math.round(c.getBoundingClientRect().width)),
      meta: cards.map((c) => getComputedStyle(c.querySelector('.screen-card__meta')).opacity),
      strip: grid.classList.contains('is-strip'),
      current: document.querySelectorAll('[data-screen-focus][aria-current="true"]').length
    };
  });
  check('screens: click focuses the chosen plate',
    focused.active === 2 && focused.meta[2] === '1' && focused.meta[0] === '0', JSON.stringify(focused));
  check('screens: focused plate is the largest',
    focused.widths[2] > focused.widths[1] && focused.widths[0] === focused.widths[1],
    JSON.stringify(focused.widths));
  check('screens: one plate is current', focused.current === 1, String(focused.current));

  await page.locator('[data-screen-focus]').first().focus();
  await page.waitForTimeout(1100);
  check('screens: keyboard focus moves the strip',
    await page.evaluate(() => document.querySelector('[data-screen-card]').classList.contains('is-active')));
  await context.close();
}

{
  const { context, page } = await newPage({ width: 390, height: 844, lang: 'en' });
  await page.goto(BASE + 'en/', { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const el = document.getElementById('screens');
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 20);
  });
  await page.waitForTimeout(500);

  const first = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-screen-card]')];
    return {
      focused: document.querySelector('.screens__grid').classList.contains('has-focus'),
      active: cards.findIndex((c) => c.classList.contains('is-active'))
    };
  });
  check('screens phone: nearest card is focused', first.focused && first.active === 0, JSON.stringify(first));

  await page.evaluate(() => {
    const grid = document.querySelector('.screens__grid');
    grid.scrollTo({ left: grid.scrollWidth, behavior: 'instant' });
  });
  await page.waitForTimeout(450);
  const last = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-screen-card]')];
    return {
      active: cards.findIndex((c) => c.classList.contains('is-active')),
      scroll: Math.round(document.querySelector('.screens__grid').scrollLeft)
    };
  });
  check('screens phone: swipe moves the focus', last.active === 2, JSON.stringify(last));
  await context.close();
}

{
  const { context, page } = await newPage({ width: 390, height: 844, lang: 'ar' });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const el = document.getElementById('screens');
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 20);
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const grid = document.querySelector('.screens__grid');
    grid.scrollLeft = -grid.scrollWidth;
  });
  await page.waitForTimeout(450);
  const rtl = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-screen-card]')];
    return {
      dir: document.documentElement.dir,
      active: cards.findIndex((c) => c.classList.contains('is-active'))
    };
  });
  check('screens phone rtl: swipe focuses the last card', rtl.dir === 'rtl' && rtl.active === 2, JSON.stringify(rtl));
  await context.close();
}

/* ------------------------------------------------------------- music */

{
  const { context, page } = await newPage({ lang: 'en' });
  await page.goto(BASE + 'en/#music', { waitUntil: 'load' });
  await page.waitForTimeout(900);

  await page.click('[data-play]');
  await page.waitForTimeout(1200);
  const playing = await page.evaluate(() => ({
    paused: document.querySelector('[data-audio]').paused,
    cls: document.querySelector('[data-player]').className,
    label: document.querySelector('[data-play]').getAttribute('aria-label'),
    now: document.querySelector('[data-now]').textContent.trim(),
    disc: getComputedStyle(document.querySelector('.disc')).animationName
  }));
  check('music: play starts the audio', playing.paused === false, String(playing.paused));
  check('music: playing state + pause label', /is-playing/.test(playing.cls) && /pause/i.test(playing.label), JSON.stringify(playing));
  check('music: now playing shows the track', playing.now === 'Firepower', playing.now);
  check('music: disc spins', playing.disc === 'spin', playing.disc);

  await page.click('[data-play]');
  await page.waitForTimeout(300);
  check('music: pause stops the audio', await page.evaluate(() => document.querySelector('[data-audio]').paused));
  check('music: pause clears the playing state',
    await page.evaluate(() => !document.querySelector('[data-player]').classList.contains('is-playing')));

  await page.click('[data-track="1"]');
  await page.waitForTimeout(1200);
  const second = await page.evaluate(() => ({
    src: document.querySelector('[data-audio]').currentSrc,
    pressed: [...document.querySelectorAll('[data-track]')].map((b) => b.getAttribute('aria-pressed')),
    paused: document.querySelector('[data-audio]').paused
  }));
  check('music: track row switches the source', /i-dont-know-erika\.mp3$/.test(second.src), second.src);
  check('music: one track marked pressed', second.pressed.join(',') === 'false,true,false', second.pressed.join(','));
  check('music: picking a track plays it', second.paused === false, String(second.paused));

  const label = await page.evaluate(() => {
    const btn = document.querySelector('[data-track="1"]');
    return btn.getBoundingClientRect().height;
  });
  check('music: track rows are 44px tall', label >= 44, String(label));
  await page.screenshot({ path: path.join(SHOTS, 'en-music-playing.png') });
  await context.close();
}

/* ------------------------------------------------- language switch */

{
  const { context, page } = await newPage({ lang: 'ar' });
  await page.goto(BASE + '#faq', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
  await page.click('.nav__tools [data-lang-switch]');
  await page.waitForLoadState('load');
  await page.waitForTimeout(900);
  const m = await page.evaluate(() => ({ path: location.pathname, hash: location.hash, lang: document.documentElement.lang }));
  check('lang switch lands on en page', /\/en\/(index\.html)?$/.test(m.path), m.path);
  check('lang switch keeps the hash', m.hash === '#faq', m.hash);
  check('lang switch swaps html lang', m.lang === 'en', m.lang);
  const stored = await page.evaluate(() => localStorage.getItem('c3-lang'));
  check('lang switch remembers the choice', stored === 'en', String(stored));
  await context.close();
}

/* ------------------------------------------------- download fallbacks */

{
  const success = await newPage({ mode: 'success' });
  await success.page.goto(BASE, { waitUntil: 'load' });
  await success.page.waitForTimeout(1500);
  const s = await success.page.evaluate(() => ({
    version: document.querySelector('[data-rel="version"]').textContent.trim(),
    offline: document.querySelector('[data-offline]').classList.contains('hide'),
    size: document.querySelector('[data-rel="size"]').textContent.trim()
  }));
  check('release from API: version', s.version === VERSION, s.version);
  check('release from API: size', /^\d+\.\d MB$/.test(s.size), s.size);
  check('release from API: no offline note', s.offline);
  await success.context.close();
}

{
  const error = await newPage({ mode: 'error' });
  await error.page.goto(BASE, { waitUntil: 'load' });
  await error.page.waitForTimeout(1800);
  const s = await error.page.evaluate(() => ({
    version: document.querySelector('[data-rel="version"]').textContent.trim(),
    offline: document.querySelector('[data-offline]').classList.contains('hide'),
    label: document.querySelector('[data-rel="link-label"]').textContent.trim()
  }));
  check('API error falls back to release.json', s.version === VERSION, s.version);
  check('API error keeps the offline note hidden', s.offline);
  check('API error keeps the version label', s.label.includes(VERSION), s.label);
  await error.context.close();
}

{
  const down = await newPage({ mode: 'offline' });
  await down.page.goto(BASE, { waitUntil: 'load' });
  await down.page.waitForTimeout(1800);
  const s = await down.page.evaluate(() => ({
    version: document.querySelector('[data-rel="version"]').textContent.trim(),
    offline: !document.querySelector('[data-offline]').classList.contains('hide'),
    href: document.querySelector('[data-rel="link"]').getAttribute('href'),
    label: document.querySelector('[data-rel="link-label"]').textContent.trim()
  }));
  check('offline: shows the note', s.offline);
  check('offline: version is a dash', s.version === '—', s.version);
  check('offline: plain releases link', /\/releases\/latest$/.test(s.href), s.href);
  check('offline: plain label', !/v\d/.test(s.label), s.label);
  await down.context.close();
}

/* ---------------------------------------------------- keyboard + a11y */

{
  const { context, page } = await newPage({});
  await page.goto(BASE + 'en/', { waitUntil: 'load' });
  await page.waitForTimeout(1600);

  await page.evaluate(() => document.querySelector('[data-faq-btn]').focus());
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  const faq = await page.evaluate(() => {
    const items = [...document.querySelectorAll('[data-faq]')];
    return items.map((i) => i.querySelector('[data-faq-btn]').getAttribute('aria-expanded'));
  });
  check('faq keyboard toggle works', faq[0] === 'false' && faq.filter((v) => v === 'true').length === 0, JSON.stringify(faq));

  const a11y = await page.evaluate(() => {
    const small = [...document.querySelectorAll('a, button')].filter((el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && (r.width < 44 || r.height < 44)
        && !el.closest('.nav__links, .menu, .footer, .breadcrumb, .notes, p');
    }).map((el) => (el.className || el.tagName) + ` ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`);
    const skip = document.querySelector('.skip');
    return {
      small,
      skip: !!skip,
      landmarks: ['header', 'main', 'footer'].every((t) => !!document.querySelector(t)),
      alts: [...document.querySelectorAll('img')].every((i) => i.alt !== null),
      lang: document.documentElement.lang
    };
  });
  check('skip link + landmarks', a11y.skip && a11y.landmarks);
  check('every image has alt', a11y.alts);
  check('primary touch targets >= 44px', a11y.small.length === 0, a11y.small.slice(0, 4).join(', '));

  await page.screenshot({ path: path.join(SHOTS, 'en-keyboard.png') });
  await context.close();
}

/* -------------------------------------------- reduced motion + no JS */

{
  const { context, page } = await newPage({ motion: 'reduce' });
  await page.goto(BASE + 'en/', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  const m = await page.evaluate(() => {
    document.querySelector('[data-player]').classList.add('is-playing');
    return {
      reduce: document.documentElement.classList.contains('reduce'),
      reveals: document.querySelectorAll('.reveal').length,
      screens: document.querySelectorAll('.screen-card[style]').length,
      disc: getComputedStyle(document.querySelector('.disc')).animationName,
      hero: document.querySelector('.hero__title').getBoundingClientRect().height
    };
  });
  check('reduced motion: class set', m.reduce);
  check('reduced motion: nothing hidden for reveals', m.reveals === 0, String(m.reveals));
  check('reduced motion: screens stay still', m.screens === 0, String(m.screens));
  check('reduced motion: disc still', m.disc === 'none', m.disc);
  check('reduced motion: content visible', m.hero > 20, String(m.hero));
  await context.close();
}

{
  const { context, page } = await newPage({ js: false });
  await page.goto(BASE, { waitUntil: 'load' });
  const m = await page.evaluate(() => ({
    h1: document.querySelector('h1').textContent.trim().length,
    answers: [...document.querySelectorAll('.faq__a')].filter((el) => el.getBoundingClientRect().height > 10).length,
    href: document.querySelector('[data-rel="link"]')?.getAttribute('href'),
    figure: document.querySelector('.hero__figure').getBoundingClientRect().height,
    controls: document.querySelectorAll('[data-track]').length
  }));
  check('no JS: heading readable', m.h1 > 5, String(m.h1));
  check('no JS: faq answers open', m.answers >= 4, String(m.answers));
  check('no JS: download link points at releases', /releases\/latest$/.test(m.href || ''), String(m.href));
  check('no JS: hero art painted', m.figure >= 300, String(Math.round(m.figure)));
  check('no JS: tracks still listed', m.controls === 3, String(m.controls));
  await context.close();
}

/* ------------------------------------------------------------- 404 */

{
  const { context, page } = await newPage({});
  const res = await page.goto(BASE + '404.html', { waitUntil: 'load' });
  await page.waitForTimeout(700);
  check('404 page loads', res.status() === 200);
  check('404 page has one h1', (await page.locator('h1').count()) === 1);
  await page.screenshot({ path: path.join(SHOTS, '404.png') });
  await context.close();
}

/* ----------------------------------------------------------- wrap up */

check('no console errors during the run', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

await browser.close();
server.close();

const passed = all.length - failed;
writeFileSync(path.join(SHOTS, 'summary.txt'),
  `${passed}/${all.length} checks passed\n${all.filter((c) => !c.ok).map((c) => 'FAIL ' + c.name).join('\n')}\n`);

console.log(`\n${passed}/${all.length} checks passed, ${failed} failed. Screenshots in ${SHOTS}`);
process.exit(failed ? 1 : 0);
