// Runs after `next build`: writes the markdown twin of each post (out/blog/<slug>.md)
// and .nojekyll so GitHub Pages serves the _next/ folder.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const src = "content/posts", out = "out";
fs.mkdirSync(path.join(out, "blog"), { recursive: true });
for (const f of fs.readdirSync(src).filter((f) => f.endsWith(".md"))) {
  const { data, content } = matter(fs.readFileSync(path.join(src, f), "utf8"));
  const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date);
  const md = `# ${data.title}\n\n${data.description}\n\n- Author: ${[].concat(data.authors).join(", ")}\n- Published: ${date}\n\n---\n\n${content}`;
  fs.writeFileSync(path.join(out, "blog", f), md);
}
fs.writeFileSync(path.join(out, ".nojekyll"), "");
console.log("postbuild: wrote markdown twins + .nojekyll");
