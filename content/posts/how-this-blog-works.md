---
title: How this blog works
description: A Next.js static site published to GitHub Pages. Write markdown, push to main, and the workflow does the rest.
authors: [Your Name]
category: Meta
date: 2026-10-21
---

This blog is a static site: markdown files are turned into HTML at build time and served by GitHub Pages. There is no server and no database.

## The publishing pipeline

<figure class="art-fig art-diagram"><div class="fig-head"><div class="fig-title">From markdown to live site</div><div class="fig-sub">Everything after the push is automatic</div></div><div class="fig-draw" role="img" aria-label="Write a post, push to main, GitHub Actions builds, the out folder is uploaded, and the site goes live on GitHub Pages."><svg viewBox="0 0 520 344" width="520" height="344" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" style="font-family:var(--sans);max-width:100%;height:auto"><path d="M11 28 L11 308" fill="none" stroke-width="1" style="stroke:var(--line)"/><circle cx="11" cy="28" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><path d="M8 28 L10.2 30.3 L14.2 25.8" fill="none" stroke-width="1.2" stroke-linecap="round" style="stroke:var(--ink-3)"/><text x="34" y="26" font-size="15" style="fill:var(--ink)">Write a post</text><text x="34" y="44" font-size="13" style="fill:var(--ink-3)">content/posts/&lt;slug&gt;.md</text><circle cx="11" cy="98" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><path d="M8 98 L10.2 100.3 L14.2 95.8" fill="none" stroke-width="1.2" stroke-linecap="round" style="stroke:var(--ink-3)"/><text x="34" y="96" font-size="15" style="fill:var(--ink)">git push to main</text><text x="34" y="114" font-size="13" style="fill:var(--ink-3)">Triggers the workflow</text><circle cx="11" cy="168" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><path d="M8 168 L10.2 170.3 L14.2 165.8" fill="none" stroke-width="1.2" stroke-linecap="round" style="stroke:var(--ink-3)"/><text x="34" y="166" font-size="15" style="fill:var(--ink)">GitHub Actions builds</text><text x="34" y="184" font-size="13" style="fill:var(--ink-3)">npm ci, next build, static export to out/</text><circle cx="11" cy="238" r="7" style="fill:var(--bg);stroke:var(--ink-3)" stroke-width="1.2"/><path d="M8 238 L10.2 240.3 L14.2 235.8" fill="none" stroke-width="1.2" stroke-linecap="round" style="stroke:var(--ink-3)"/><text x="34" y="236" font-size="15" style="fill:var(--ink)">Upload Pages artifact</text><text x="34" y="254" font-size="13" style="fill:var(--ink-3)">The out/ folder</text><circle cx="11" cy="308" r="7" style="fill:var(--bg);stroke:var(--accent)" stroke-width="1.2"/><circle cx="11" cy="308" r="3" style="fill:var(--accent)"/><text x="34" y="306" font-size="15" style="fill:var(--ink)">Live on GitHub Pages</text><text x="34" y="324" font-size="13" style="fill:var(--ink-3)">https://&lt;user&gt;.github.io/</text></svg></div></figure>

## Writing a post

Add a file to `content/posts/`. The filename becomes the URL.

```yaml
---
title: My post
description: One or two sentences for the hero and link previews.
authors: [Your Name]
category: Notes
date: 2026-10-22
---
```

Every `## Heading` appears in the sticky outline on the left of the page.

## Running it locally

```bash
npm install
npm run dev     # http://localhost:3000
```

## Publishing

1. Create a repository on GitHub and push this project to the `main` branch.
2. In **Settings, Pages**, set the source to **GitHub Actions**.
3. Push. The workflow in `.github/workflows/deploy.yml` builds and deploys the site.

## Where do I change the site name?

Edit `lib/site.ts`. It holds your name, description, GitHub username, repository URL and nav links.
