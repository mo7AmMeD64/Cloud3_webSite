# Design notes

Short, in English: the pattern taken, never the assets.

## References

- **3bdalr7man.vip** — an Arabic-first creator site that is not a translation of an English one. Taken: Arabic is the
  default, the RTL page is `/` and English lives on its own path, and the copy is written for Arabic readers instead
  of mirrored.
- **`Reference/1.jpg`, `2.jpg`, `3.jpg`** — film key-art pages (samurai "LAST", Deadpool 2, IT Chapter Two). Taken: one
  full-bleed dark still, a huge title with a red accent word, an outlined ghost word behind the art, a small metadata
  row, and one dominant action. Not taken: any frame, logo or typeface from them.
- **serene-template.modulify.website** — the quiet neighbour: generous vertical space and soft raised surfaces so the
  cinematic hero is not followed by more shouting.
- **landonorris.com** — big type. Taken: the display scale only. The scene rotation, the pinned reel and the scroll
  hijacking are gone; the whole page is one linear read.

## The hero

Makima is the key art, not a mascot: the cut-out PNG sits at the bottom-right of the hero, bleeding past the column,
with a red radial glow behind her and `cloud3` outlined in the background. Left column: eyebrow, `شاهد. اقرأ.` + red
`استمع.`, one paragraph, two buttons, four facts. On phones the column stacks and the art sits below the copy at full
width. The fan-art credit is a small line under the image, and the legal page repeats it.

## Tokens

`src/css/tokens.css` is the single source: `#0d0d0f` background, `#17171a` surface, hairline borders at 8% white,
`#f4f4f5` text, `#a1a1aa` muted, accent `#e5333f` (dark `#b3202b`, glow `rgba(229,51,63,.35)`), paper `#f2efe8` for
the record sleeve, radii 24/16/pill, a fluid type scale, and the easing curves. Components use the tokens, not literal
colours, so contrast fixes happen once.

Type: **Sora** for Latin display and UI, **Readex Pro** for Arabic, both self-hosted as variable `woff2` (no Google
Fonts request). Large Latin headings get tight tracking; Arabic gets `letter-spacing: 0` everywhere — tracked Arabic
breaks the joins.

## Motion

No animation library. `main.js` adds `.reveal` and removes it on an IntersectionObserver callback; everything else is
CSS transitions and the spinning disc. The JS bundle is ~13 KB, and deleting GSAP/ScrollTrigger/Lenis is what made the
page feel fast again.

- **Lite mode** (reduced motion, ≤ 4 CPU cores, ≤ 4 GB memory, or a viewport under 600 px): no reveals at all — the
  elements are never hidden, so the page is instantly complete.
- **`prefers-reduced-motion: reduce`**: no reveals, no spinning disc, no scroll cue bounce, no smooth scrolling.
- There is no intro loader. The first paint is the page.

## RTL

One stylesheet serves both directions: logical properties throughout (`margin-inline`, `inset-inline`, `text-align:
start`), mirrored disc/cover offsets, and a snap row that starts at the right in Arabic. Values that mix scripts are
wrapped in `<bdi>` (`43 MB`, the APK size) so the number and unit keep their order; digits stay Latin in both languages.

## Accessibility and weight

Landmarks, one `h1` per page, skip link, visible focus, 44 px targets, `aria-expanded` FAQ, `aria-pressed` on the music
buttons with a label that follows play/pause, real `alt` text on screenshots and empty `alt` on decoration. The hero
art is preloaded (~60 KB WebP), everything else is lazy and responsive; audio is `preload="none"` until someone presses
play. With JavaScript disabled the page is fully readable, the FAQ stays open, and the download button still points at
the latest release.
