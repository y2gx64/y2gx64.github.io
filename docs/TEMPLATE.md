# Template map

## Page anatomy (`app/blog/[slug]/page.tsx`)
```
nav (sticky)                        components/Nav.tsx
#topProg                            2px reading-progress line (scaleX via --p)
.wrap
  header.hero                       12-col grid; .hd spans cols 5–13
    .hd-tile  pixel glyph tile
    h1, .standfirst
    .meta     AUTHOR · CATEGORY · PUBLISHED  (└ prefix via ::before)
  .body-grid                        12-col grid
    aside.rail  (cols 1–4, sticky)  components/ArticleClient.tsx
      title (fades in after 360px), TREE, ASCII progress, MIN READ, SHARE
    .prose      (cols 5–13, ≤720px) lib/posts.ts → <section.art-section> per "##"
  .more-sec                         components/Related.tsx  (other posts; category tabs appear when >1 category)
div.foot-art                        components/FooterArt.tsx  full-width pixel landscape with the fox
footer.foot                         app/layout.tsx
```

## Design tokens (`app/globals.css`)
Single monochrome fox theme: bg `#000`, ink `#fff`, accent `#fff`; no light/dark switch. The fox is traced to rectangles (viewBox `0 0 197 243`) and reused in `components/Nav.tsx`, the hero tile in `app/blog/[slug]/page.tsx` and `public/shared/img/favicon.svg`.
Muted ink scale `--ink-2..4`, hairlines `--line` / `--line-soft`. Type: sans for body/headings, **mono for every label**
(nav keys, meta labels, h2 section headers in UPPERCASE, rail, feed dates). Breakpoint 900px collapses to one column
(rail hidden, burger nav).

## Behaviours
- Nav shortcut keys come from `lib/site.ts` (default `H P A G`); they navigate (ignored in inputs / with modifiers).
- Scroll-spy highlights the active rail entry; ASCII bar `█░` ×28 plus `NN%`.
- `[data-reveal]` fade-up via IntersectionObserver; disabled under `prefers-reduced-motion`.
- Related list dims non-hovered rows to 35% opacity.
- `/blog/<slug>.md` is written to `out/` by `scripts/postbuild.mjs` (static export has no rewrites).

## Not implemented (present on original)
Hero art / lottie mascot animation, diagram PNG download, code syntax colouring, "Load more", CSP meta tag, OG image generation.

## Mobile (<900px)
Tested 2026-10-22 in headless Chromium, 390×844 @2x:
- `.hero .hd` spans all 12 columns; meta row is a 2×2 grid (READING TIME appears only on mobile).
- `.rail` is hidden; `.body-grid` becomes a block; `.prose` is full width.
- Nav shows logo + burger; the burger toggles `.nav-panel` (4 links).
- `.frow` feed rows stack (date above title, duration right) and are not dimmed.
- Diagram SVG scales with `max-width:100%` (text gets small; use a wider-viewBox-aware design for dense figures).
- `document.scrollWidth === clientWidth` (no sideways scroll) thanks to `overflow-x:clip` on `html, body`.

## Known visual gaps vs the reference
Fonts are system fallbacks, the fox mark and hero tile glyph are original, and the reference's hero art/animation is absent.
