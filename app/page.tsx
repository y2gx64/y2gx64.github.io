import Link from "next/link";
import { getAllPosts, fmtDate } from "@/lib/posts";
import { site } from "@/lib/site";

export default function Home() {
  const posts = getAllPosts().slice(0, 8);
  return (
    <div className="wrap" data-tpl="index">
      <div className="hero no-art">
        <div className="hd">
          <h1>{site.name}</h1>
          <p className="standfirst">{site.bio}</p>
          <p className="home-links"><Link href="/about/">About</Link> · <a href={`https://github.com/${site.githubUser}`}>GitHub</a> · <a href={`${site.basePath}/rss.xml`}>RSS</a></p>
        </div>
      </div>
      <div className="more-sec" style={{ marginTop: 0, paddingTop: "2rem" }}>
        <div className="rel-lbl">Latest posts</div>
        {posts.map((p) => (
          <Link key={p.slug} className="frow" href={`/blog/${p.slug}/`}>
            <span className="f-l">{fmtDate(p.date)}</span><span className="f-t">{p.title}</span><span className="f-d">{p.readingTime} min</span>
          </Link>
        ))}
        <p style={{ marginTop: "1.5rem" }}><Link className="more-link" href="/blog/">All posts →</Link></p>
      </div>
    </div>
  );
}
