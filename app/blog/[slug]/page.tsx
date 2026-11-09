import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllPosts, getPost, renderMarkdown, fmtDate, listItems } from "@/lib/posts";
import { site } from "@/lib/site";
import Rail from "@/components/ArticleClient";
import Related from "@/components/Related";

const SITE = site.url;
export const dynamicParams = false;
export const generateStaticParams = () => getAllPosts().map((p) => ({ slug: p.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = getPost((await params).slug); if (!p) return {};
  const url = `${SITE}/blog/${p.slug}/`;
  return {
    title: p.title, description: p.description, authors: p.authors.map((name) => ({ name })),
    alternates: { canonical: url, types: { "text/markdown": `${SITE}/blog/${p.slug}.md` } },
    openGraph: { type: "article", title: p.title, description: p.description, url, publishedTime: p.date, authors: p.authors, section: p.category },
    twitter: { card: "summary_large_image" },
  };
}

const join = (a: string[]) => (a.length < 3 ? a.join(" and ") : a.slice(0, -1).join(", ") + ", and " + a.at(-1));

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const p = getPost((await params).slug); if (!p) notFound();
  const html = await renderMarkdown(p.body);
  return (
    <div data-tpl="article">
      <div id="topProg" aria-hidden />
      <div className="wrap">
        <header className="hero no-art"><div className="hd">
          <div className="hd-tile"><svg className="pxg" viewBox="0 0 197 243" shapeRendering="crispEdges" aria-hidden><path d="M126 0h25v1h-25zM81 1h25v53h-25zM126 1h25v53h-25zM81 54h70v31h-70zM41 85h110v32h-110zM81 117h70v7h-70zM81 124h116v68h-116zM0 192h197v51h-197z" /></svg></div>
          <span className="cat-chip" data-reveal>{p.category}</span>
          <h1 data-reveal>{p.title}</h1>
          <p className="standfirst" data-reveal style={{ "--reveal-delay": ".1s" } as React.CSSProperties}>{p.description}</p>
          <div className="meta" data-reveal style={{ "--reveal-delay": ".16s" } as React.CSSProperties}>
            <div className="m1"><div className="lb">AUTHOR</div><div className="vv">{join(p.authors)}</div></div>
            <div className="m2"><div className="lb">CATEGORY</div><div className="vv">{p.category}</div></div>
            <div className="m3"><div className="lb">PUBLISHED</div><div className="vv">{fmtDate(p.date)}</div></div>
            <div className="m4"><div className="lb">READING TIME</div><div className="vv">{p.readingTime} min</div></div>
          </div>
        </div></header>
        <div className="body-grid">
          <Rail title={p.title} sections={p.sections} minutes={p.readingTime} url={`${SITE}/blog/${p.slug}/`} />
          <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
        <Related posts={listItems(p.slug)} />
      </div>
    </div>
  );
}
