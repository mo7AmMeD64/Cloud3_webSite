# Design notes

Short, in English, one paragraph per reference: the pattern taken, never the assets.

## References

- **3bdalr7man.vip** — an Arabic-first creator site that is not a translation of an English one. Taken: Arabic is the
  default, the RTL page is `/` and English lives on its own path, and the copy is written for Arabic readers instead
  of mirrored. Not taken: anything from its pages.
- **basilforge.github.io** — a small project hub with one product and one download action. Taken: one clear primary
  action per screen, a per-locale URL pair (`/` and `/en/`) with `hreflang`, and honest, plain status wording.
- **serene-template.modulify.website** — a calm marketing layout. Taken: the reading rhythm (one idea per screen,
  generous vertical space, soft raised surfaces) so that the cinematic parts have quiet neighbours.
- **landonorris.com** — big type and scroll-driven scenes. Taken: the kinetic heading and the scene-based hero. Bounded
  here: three scenes, six seconds each, a visible pause control, and a lite mode that drops the motion entirely.

## The two preview images

From `preview.jpg`: the hero stage (phone mockup floating in front of a large red circle, a smaller one at the bottom),
the thin `01 ——— 03` scene meter, the outlined circular arrow with a text label, and giant outlined ghost words used
once or twice per section.

From `preview2.jpg`: the manga section only — light paper ground with a CSS grain, a diagonal clip-path cut, black
display type with a ghost outline behind it, a halftone dot field, and the vertical dot pager. No statue, no character,
no logo, no artwork from either image is used; the phone mockups are the app's own screenshots and a hand-built SVG
placeholder.

## Tokens

`src/css/tokens.css` is the single source: `#0d0d0f` background, `#17171a` surface, hairline borders at 8% white,
`#f4f4f5` text, `#a1a1aa` muted, accent `#e5333f` (dark `#b3202b`, glow `rgba(229,51,63,.35)`), paper `#f4f1ea` for the
manga scene, radii 24/16/pill, a fluid type scale, and the easing curves. Components use the tokens, not literal
colours, so contrast fixes happen once.

Type: **Sora** for Latin display and UI, **Readex Pro** for Arabic and Arabic-in-Latin contexts, both self-hosted as
variable `woff2` (no Google Fonts request). Large Latin headings get tight tracking; Arabic gets `letter-spacing: 0`
everywhere — tracked Arabic breaks the joins.

## Motion

GSAP 3.15 + ScrollTrigger 3.15 drive the reveals, the pinned horizontal Screens reel and the manga clip-path wipe;
Lenis 1.3 handles smooth scrolling. Both are vendored and loaded with `defer`.

- **Lite mode** (reduced motion, ≤ 4 CPU cores, ≤ 4 GB memory, or a viewport under 600 px): no Lenis, no cursor, no
  parallax or 3D tilt, no clip-path wipe. Content and the reel still work; reveals are pre-set to their final state.
- **`prefers-reduced-motion: reduce`**: no intro loader, no smooth scrolling, no marquee, no page-flip animation, and
  the hero does not auto-advance. Everything stays reachable.
- The intro loader is capped at 1.4 s in code and has a 2.6 s safety timer that removes it even if a script fails.

## RTL

One stylesheet serves both directions: logical properties throughout (`margin-inline`, `inset-inline`,
`text-align: start`), mirrored arrow glyphs, reversed marquee and swipe directions, and a right-opening page flip in
the manga demo. Latin names sit in `<bdi>`-safe contexts and digits stay Latin in both languages.

## Accessibility and weight

Landmarks, one `h1` per page, skip link, visible focus, 44 px targets, `aria-expanded` FAQ, `role="tablist"` hero
scenes with arrow-key control and a pause button, real `alt` text on screenshots and empty `alt` on decoration. The
hero screenshot is preloaded (~70 KB WebP), everything else is lazy and responsive; the total page weight stays well
under 1.5 MB before the release call. With JavaScript disabled the page is fully readable and the download button
still points at the latest release.
