# cloud3 website

The official one-page site for **cloud3**, the Android app for movies, series and (soon) manga.

- Arabic home (RTL): `/`
- English home: `/en/`
- Legal: `/legal/` and `/en/legal/`
- 404: `/404.html`
- The Vinyl record player is embedded in the home page; `/vinyl/` is its full-screen version.

Static pages, no framework, no runtime dependencies. `build.mjs` renders the HTML from templates and JSON, bundles and
fingerprints the CSS/JS, and writes `dist/`.

## Build and check

```bash
node build.mjs        # writes dist/
npm ci && npx playwright install chromium
node tests/check.mjs  # serves dist under /Cloud3_webSite/ and runs 165 checks
```

`tests/check.mjs` covers both languages at 390x844, 768x1024 and 1440x900: no horizontal scroll, console errors, one
`h1`, the hero key art painting, the three screen cards, the music player (play, pause, track switch), the release card
with a mocked GitHub response / an error / offline, language switch with the section hash, the FAQ by keyboard, reduced
motion, lite mode, JavaScript disabled, and it writes screenshots to `tests/screenshots/`.

## Edit the text

All copy is in `src/i18n/ar.json` and `src/i18n/en.json`. Keep the two files structurally identical: every key in one
needs the same key in the other. Text is plain; the release-notes area is the only place that renders a little Markdown
(`**bold**`, `` `code` ``, links), and it does so with an allow-list, never `innerHTML` of raw input.

Fixed links and the release API live in `src/data/site.json`. The track list and the release-snapshot are in the same
folder.

## The manga card

The site carries no manga section: the manga feature card says "Soon" via `features.items[1].tag` in both i18n files.
Delete the `tag` key when the reader ships, and reword the line next to it. Never claim the reader works while it does
not.

## Add or replace a screenshot

1. Drop the full-size PNG/JPG in `src/assets/shots/`.
2. Produce the two responsive sizes:
   ```bash
   magick shots/home.png -resize 760x -strip -quality 74 img/home-760.webp
   magick shots/home.png -resize 480x -strip -quality 72 img/home-480.webp
   ```
   (ImageMagick is optional; any tool that writes WebP works.)
3. Add the entry to `src/data/screens.json` with the real pixel width/height of the 760 px file.
4. Add the matching `id` + caption to `screens.items` in both `ar.json` and `en.json`.

The frames are a fixed 9:16, so a screenshot with another ratio is letterboxed rather than cropped. The build
fingerprints the images and emits `srcset`, so old cache entries never mix with new files.

## The download card

`src/js/download.js` reads the latest official release from `https://api.github.com/repos/mo7AmMeD64/cloudSTREAM3/releases/latest`
(picks the non-debug `.apk`), caches it in `localStorage` for one hour, and falls back in this order:

1. API → 2. `release.json` snapshot committed in `src/data/release.json` (the workflow overwrites it on every run) →
3. the plain "latest release" link with no version text, plus an offline note.

The version, date, size, notes and the APK button all come from that one record. Nothing else on the page repeats the
version, so the card is the only place to update when a release ships.

## Deploy

`.github/workflows/pages.yml` runs on push to `main`, on a published release, weekly, and by hand. The **check** job
builds and runs the browser suite, then uploads `site-screenshots`; the **deploy** job publishes `dist/` with GitHub
Pages. Set the repository's Pages source to **GitHub Actions** once (Settings → Pages).

The site is served from a sub-path, so every link in the templates is relative (`{{root}}`), never root-absolute.
