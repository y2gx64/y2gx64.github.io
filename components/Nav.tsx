"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type L = { key: string; label: string; href: string };

export function Mark() {
  // white pixel-art fox (from icon.png), traced to rectangles
  return (
    <svg className="mark" viewBox="0 0 197 243" shapeRendering="crispEdges" width="34" height="42" aria-hidden>
      <path fill="currentColor" d="M126 0h25v1h-25zM81 1h25v53h-25zM126 1h25v53h-25zM81 54h70v31h-70zM41 85h110v32h-110zM81 117h70v7h-70zM81 124h116v68h-116zM0 192h197v51h-197z" />
    </svg>
  );
}

export default function Nav({ links: LINKS, github, rss }: { links: L[]; github: string; rss: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // keyboard nav: pressing H / M / D / T jumps to that link (like the reference)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (/INPUT|TEXTAREA/.test(t.tagName) || t.isContentEditable) return;
      const l = LINKS.find((x) => x.key === e.key.toUpperCase());
      if (!l) return;
      l.href.startsWith("http") ? window.open(l.href, "_blank") : router.push(l.href);
    };
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    addEventListener("keydown", onKey); addEventListener("click", onDoc);
    return () => { removeEventListener("keydown", onKey); removeEventListener("click", onDoc); };
  }, [router]);

  const items = LINKS.map((l) => (
    <Link key={l.key} href={l.href}><span className="k">[{l.key}]</span><span className="w">{l.label}</span></Link>
  ));
  return (
    <nav className="nav">
      <div className="nav-in">
        <Link className="nav-brand" href="/" aria-label="Home"><Mark /></Link>
        <div className="nav-links">{items}</div>
        <div className="nav-cta">
          <span className="dd" ref={ref}>
            <button className="btn solid" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
              Follow <span className="dd-caret">▾</span>
            </button>
            {open && <div className="dd-menu" role="menu"><a href={github} target="_blank" rel="noopener">GitHub</a><a href={rss}>RSS feed</a></div>}
          </span>
        </div>
        <button className="nav-burger" aria-label="menu" aria-expanded={menu} onClick={() => setMenu(!menu)}><i /><i /><i /></button>
      </div>
      {menu && <div className="nav-panel">{items}</div>}
    </nav>
  );
}
