# Tech stack

## Observed on the reference site (evidence: REA `inspect_web_page`, evidence id `ev_…` captured live, plus fetched HTML/CSS)

| Layer | Observation | How known |
|---|---|---|
| Framework | **Next.js, App Router, React server-rendered** (`<div hidden><!--$--><!--/$--></div>` Suspense markers, `/_next/static/chunks/*`) | HTML + resource list |
| Bundler | **Turbopack** (`chunks/turbopack-*.js`, hashed short chunk names) | resource list |
| Styling | Hand-written global CSS split into ~5 chunks; **no utility framework seen**. Tokens as CSS custom properties on `:root`, light/dark via `prefers-color-scheme` | CSS chunks |
| Fonts | Self-hosted variable woff2: *Anthropic Sans* (roman + italic), *Anthropic Mono* | `<link rel=preload>` |
| Images | Pixel-art mascot PNG, logo SVG, inline SVG pixel glyph (`viewBox 0 0 16 16`, `crispEdges`) | HTML |
| Content | Markdown source; article HTML grouped into `<section class="art-section">` per `##`; markdown twin served at `/blog/<slug>.md` | `<link rel=alternate type=text/markdown>` |
| Diagrams | Hand-authored inline SVG using CSS vars (`--viz-*`) + "png" download button | HTML |
| Syndication | RSS 2.0 at `/rss.xml` | `<link rel=alternate>` |
| SEO | OpenGraph article tags, per-author `<meta name=author>`, canonical, theme-color per scheme, 1200×630 `og.png` | `<meta>` |
| Security | Strict **CSP via `<meta>`**: `default-src 'self'`, hashed inline scripts, no third-party origins, `frame-src 'none'`, `object-src 'none'`, `upgrade-insecure-requests` | `<meta http-equiv>` |
| Client JS | Keyboard nav (`[H] [M] [D] [T]`), scroll-spy TOC, ASCII progress bar, reveal-on-scroll, category tabs, dropdown, lottie (`vendor/lottie_canvas.min.js`) for the mascot animation | HTML + scripts |
| Hosting | Unknown (plain `curl` UA gets 403; a browser UA gets 200) — not inferable from evidence | — |

Unknowns: server/CDN, how posts are authored upstream (CMS vs repo), exact Next.js version.

## What this repo uses

| Concern | Choice |
|---|---|
| Framework | Next.js 15.5.28, App Router, React 19, TypeScript (strict) |
| Output | **`output: "export"`** - fully static HTML in `out/` (no server features: no rewrites, no ISR, no image optimiser) |
| Hosting | GitHub Pages via `.github/workflows/deploy.yml` (Actions → `upload-pages-artifact` → `deploy-pages`) |
| Base path | `BASE_PATH` env → `basePath`/`assetPrefix`; markdown links are prefixed in `lib/posts.ts` |
| Dev bundler | Turbopack (`next dev --turbopack`) |
| Content | Markdown + frontmatter (`gray-matter`) → `unified` (`remark-parse`, `remark-gfm`, `remark-rehype`, `rehype-raw`, `rehype-slug`, `rehype-stringify`) |
| Styling | One global stylesheet, same custom-property token names as the original |
| Fonts | System fallbacks (`--sans`, `--mono` list the original names first) |
| Config | `lib/site.ts` is the single place for name, URLs, nav |
| Extras | `scripts/postbuild.mjs` writes `/blog/<slug>.md` twins and `.nojekyll`; RSS is a `force-static` route handler |

Next 15.5.4 was initially installed and bumped to 15.5.28 because npm flagged 15.5.4 with a known vulnerability (CVE-2025-66478).

## Deliberately not copied
- Article text and the diagram SVGs/images (Anthropic content) — replaced by original sample posts.
- *Anthropic Sans/Mono* fonts, the mascot PNG and logo (proprietary brand assets) — replaced by an original pixel mark and system fonts.
- The original's CSS was read for values (tokens, grid columns, sizes) but not copied verbatim.
