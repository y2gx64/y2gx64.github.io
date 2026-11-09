"use client";
import Link from "next/link";
import { useState } from "react";

type R = { slug: string; title: string; date: string; min: number; category: string };

export default function Related({ posts, label = "More posts" }: { posts: R[]; label?: string }) {
  const cats = ["ALL", ...Array.from(new Set(posts.map((p) => p.category.toUpperCase())))];
  const [tab, setTab] = useState("ALL");
  const rows = posts.filter((p) => tab === "ALL" || p.category.toUpperCase() === tab);
  if (!posts.length) return null;
  return (
    <div className="more-sec">
      <div className="rel-lbl">{label}</div>
      {cats.length > 2 && (
        <div className="tabs-line"><div className="tabs">
          {cats.map((t) => <button key={t} className={"tab" + (t === tab ? " on" : "")} onClick={() => setTab(t)}>{t}</button>)}
        </div></div>
      )}
      <div>
        {rows.map((p) => (
          <Link key={p.slug} className="frow" href={`/blog/${p.slug}/`}>
            <span className="f-l">{new Date(p.date + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" })}</span>
            <span className="f-t">{p.title}</span>
            <span className="f-d">{p.min} min</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
