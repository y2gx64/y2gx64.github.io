const basePath = process.env.BASE_PATH ?? "";

/** @type {import('next').NextConfig} */
export default {
  output: "export",        // static HTML in ./out, deployable to GitHub Pages
  trailingSlash: true,     // /blog/<slug>/index.html works on Pages without rewrites
  basePath,                // "/<repo>" for project pages, "" for <user>.github.io
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
};
