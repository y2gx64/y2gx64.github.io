# Personal blog for GitHub Pages

A static personal blog (Next.js 15 + React 19 + TypeScript) with a minimal, mono-accented
article layout modelled on `claude.dev/blog` (see `docs/STACK.md`). Posts are markdown files;
`next build` exports plain HTML to `out/`, and a GitHub Actions workflow publishes it to
GitHub Pages. No server, no database.

## 1. Make it yours (5 minutes)

1. Edit **`lib/site.ts`**: `name`, `title`, `description`, `bio`, `githubUser`, `repoUrl`, and the `nav` GitHub link.
2. Replace the two sample posts in `content/posts/` (or delete them).
3. Edit `app/about/page.tsx` (plain JSX) and, if you like, the logo in `components/Nav.tsx` / `public/shared/img/favicon.svg`.

## 2. Run locally

Requires Node 20+ (developed on Node 22).

```bash
npm install
npm run dev          # http://localhost:3000
npm run typecheck
```

## 3. Publish to GitHub Pages

1. Create a GitHub repo and push this project to its **`main`** branch.
   (If this folder lives inside a bigger repo, copy it out first. The workflow must be at the repo root as `.github/workflows/deploy.yml`.)
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main`. The workflow runs `npm ci && npm run build` and deploys `out/`.

The workflow picks the right URL automatically:

| Repo name | Site URL | `BASE_PATH` |
|---|---|---|
| `<user>.github.io` | `https://<user>.github.io/` | *(empty)* |
| anything else, e.g. `blog` | `https://<user>.github.io/blog/` | `/blog` |

Custom domain: add a `public/CNAME` file containing the domain, and set `SITE_ORIGIN`/`BASE_PATH=""` in the workflow `env`.

### Preview the production build locally

```bash
BASE_PATH=/blog SITE_ORIGIN=https://you.github.io npm run build
mkdir -p /tmp/srv && rm -rf /tmp/srv/blog && cp -r out /tmp/srv/blog
python3 -m http.server 3200 --directory /tmp/srv     # http://localhost:3200/blog/
```
(Omit `BASE_PATH` for a user/org site and serve `out/` directly.)

## Writing a post

Create `content/posts/<slug>.md` (filename = URL slug):

```yaml
---
title: My post title
description: One or two sentences. Used as the standfirst, meta and social description.
authors: [Your Name]        # one or more
category: Notes             # drives the category tabs on post lists
date: 2026-10-22            # YYYY-MM-DD; newest first
---
```

- Standard markdown + GFM (tables, task lists, fenced code, quotes). Text before the first `##` is the intro.
- Each `## Heading` becomes a section and an entry in the sticky outline (**TREE**) rail; `###` are sub-headings.
- Raw HTML is allowed. Diagrams use this frame (style SVGs with `var(--ink)`, `var(--ink-3)`, `var(--accent)`, `var(--line)` so they follow dark mode); see `content/posts/how-this-blog-works.md`:

  ```html
  <figure class="art-fig art-diagram">
    <div class="fig-head"><div class="fig-title">Title</div><div class="fig-sub">Subtitle</div></div>
    <div class="fig-draw"><!-- inline <svg> or <img> --></div>
  </figure>
  ```
- Images: put files in `public/` and reference them as `/images/x.png`. Root-relative links and `src`s in markdown get the `BASE_PATH` prefix automatically.

## What's generated

| URL | Source |
|---|---|
| `/` | Intro + latest posts (`app/page.tsx`) |
| `/blog/` | All posts with category tabs |
| `/blog/<slug>/` | Article (hero, sticky rail, progress, related posts) |
| `/blog/<slug>.md` | Markdown twin of each post (`scripts/postbuild.mjs`) |
| `/about/` | `app/about/page.tsx` |
| `/rss.xml` | RSS 2.0 feed |
| `/404.html` | `app/not-found.tsx` (GitHub Pages serves it for unknown URLs) |

Also: canonical + Open Graph tags per post (using `SITE_ORIGIN` + `BASE_PATH`), `.nojekyll`, a single black-and-white fox theme, keyboard shortcuts `H P A G`, reduced-motion support, and a mobile layout (<900px: burger nav, rail hidden).

## Customising the look

Design tokens (colours, fonts, spacing) are the `:root` variables at the top of `app/globals.css`. Nav links and shortcut keys are in `lib/site.ts`. To use real web fonts, add woff2 files under `public/` plus `@font-face` rules and update `--sans` / `--mono`.

## Known limitations

- No comments, search or tag pages (categories only), no OG image generation, no manual theme toggle.
- No syntax colouring in code blocks.
- The logo and hero glyph are simple original pixel art; swap them for your own.
- Verified with headless Chromium at desktop (1440px) and mobile (390px) widths, under a `/myblog` base path served statically; not tested on a live GitHub Pages deployment.

See `docs/STACK.md` and `docs/TEMPLATE.md` for architecture and design notes.
