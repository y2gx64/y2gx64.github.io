// ONE place to personalise the blog. Everything else reads from here.
// Values can be overridden at build time with env vars (the deploy workflow sets them).
const basePath = process.env.BASE_PATH ?? ""; // "" for <user>.github.io, "/<repo>" for project pages
const origin = process.env.SITE_ORIGIN ?? "http://localhost:3000"; // e.g. https://<user>.github.io

export const site = {
  name: "Y2GX64",
  title: "Y2GX64 Blog",
  description: "Notes on code, projects and things I'm learning.",
  bio: "Y2GX64, i write about malware that i analyse during my free time.",
  githubUser: "y2gx64",
  repoUrl: "https://github.com/y2gx64/y2gx64.github.io",
  basePath,
  origin,
  /** absolute URL of the site root, no trailing slash */
  url: origin + basePath,
  nav: [
    { key: "H", label: "HOME", href: "/" },
    { key: "P", label: "POSTS", href: "/blog/" },
    { key: "A", label: "ABOUT", href: "/about/" },
    { key: "G", label: "GITHUB", href: "https://github.com/y2gx64" },
  ],
};
