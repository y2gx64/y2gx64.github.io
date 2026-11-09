// ONE place to personalise the blog. Everything else reads from here.
// Values can be overridden at build time with env vars (the deploy workflow sets them).
const basePath = process.env.BASE_PATH ?? ""; // "" for <user>.github.io, "/<repo>" for project pages
const origin = process.env.SITE_ORIGIN ?? "http://localhost:3000"; // e.g. https://<user>.github.io

export const site = {
  name: "Your Name",
  title: "Your Name's Blog",
  description: "Notes on code, projects and things I'm learning.",
  bio: "I write about software, side projects and what I learn along the way.",
  githubUser: "your-github-username",
  repoUrl: "https://github.com/your-github-username/your-repo",
  basePath,
  origin,
  /** absolute URL of the site root, no trailing slash */
  url: origin + basePath,
  nav: [
    { key: "H", label: "HOME", href: "/" },
    { key: "P", label: "POSTS", href: "/blog/" },
    { key: "A", label: "ABOUT", href: "/about/" },
    { key: "G", label: "GITHUB", href: "https://github.com/your-github-username" },
  ],
};
