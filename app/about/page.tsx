import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "About" };

// Edit this page freely - it's plain JSX.
export default function About() {
  return (
    <div className="wrap" data-tpl="article">
      <div className="hero no-art"><div className="hd">
        <h1>About</h1>
        <p className="standfirst">Hi, I'm {site.name}. {site.bio}</p>
      </div></div>
      <div className="body-grid"><div className="prose" style={{ gridColumn: "5/13" }}>
        <section className="art-section">
          <h2>Elsewhere</h2>
          <ul>
            <li><a href={`https://github.com/${site.githubUser}`}>GitHub</a></li>
            <li><a href={`${site.basePath}/rss.xml`}>RSS feed</a></li>
          </ul>
        </section>
      </div></div>
    </div>
  );
}
