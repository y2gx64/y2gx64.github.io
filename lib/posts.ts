import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { site } from "./site";

const DIR = path.join(process.cwd(), "content/posts");

export type Post = {
  slug: string; title: string; description: string; authors: string[];
  category: string; date: string; body: string;
  readingTime: number; sections: { id: string; text: string }[];
};

export function getAllPosts(): Post[] {
  return fs.readdirSync(DIR).filter((f) => f.endsWith(".md")).map((f) => {
    const { data, content } = matter(fs.readFileSync(path.join(DIR, f), "utf8"));
    const sections = [...content.matchAll(/^## (.+)$/gm)].map((m) => ({
      text: m[1], id: m[1].toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-"),
    }));
    return {
      slug: f.replace(/\.md$/, ""), title: data.title, description: data.description,
      authors: data.authors, category: data.category, date: data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date).slice(0, 10),
      body: content, sections, readingTime: Math.max(1, Math.round(content.split(/\s+/).length / 230)),
    } satisfies Post;
  }).sort((a, b) => b.date.localeCompare(a.date));
}

export const getPost = (slug: string) => getAllPosts().find((p) => p.slug === slug);

export async function renderMarkdown(md: string): Promise<string> {
  // Mirrors the reference markup: each "## " opens a <section class="art-section">.
  const html = String(await unified().use(remarkParse).use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true }).use(rehypeRaw).use(rehypeSlug).use(rehypeStringify).process(md));
  // root-relative links/images in markdown must honour the GitHub Pages base path
  const withBase = html.replace(/(href|src)="\/(?!\/)/g, `$1="${site.basePath}/`);
  const parts = withBase.split(/(?=<h2 )/);
  return parts.map((p, i) => `<section class="art-section" data-reveal id="s${i}">${p}</section>`).join("")
    .replace(/<td>(Dropped|Downloaded|Modified|Pre-existing)<\/td>/g, (_, v) => `<td><span class="ioc-status ioc-${v.toLowerCase()}">${v}</span></td>`)
    .replace(/<table>/g, '<div class="art-table"><table>').replace(/<\/table>/g, "</table></div>");
}

export const fmtDate = (iso: string) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", {
    month: "short", day: "2-digit", year: "numeric", timeZone: "UTC",
  });

export const listItems = (exclude?: string) =>
  getAllPosts().filter((p) => p.slug !== exclude)
    .map((p) => ({ slug: p.slug, title: p.title, date: p.date, min: p.readingTime, category: p.category }));
