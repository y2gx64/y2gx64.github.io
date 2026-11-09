"use client";
import { useEffect, useState } from "react";

type S = { id: string; text: string };
const BAR = 28;

/** Sticky "TREE" rail: scroll-spy, ASCII progress bar, top progress line, reveal-on-scroll. */
export default function Rail({ title, sections, minutes, url }: { title: string; sections: S[]; minutes: number; url: string }) {
  const [active, setActive] = useState(0);
  const [pct, setPct] = useState(0);
  const [titleOn, setTitleOn] = useState(false);

  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add("in")), { threshold: 0, rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll("[data-reveal]").forEach((n) => io.observe(n));
    const onScroll = () => {
      const h = document.documentElement;
      const p = Math.min(1, Math.max(0, h.scrollTop / (h.scrollHeight - h.clientHeight || 1)));
      setPct(p);
      document.getElementById("topProg")?.style.setProperty("--p", String(p));
      setTitleOn(scrollY > 360);
      let cur = 0;
      sections.forEach((s, i) => { const el = document.getElementById(s.id); if (el && el.getBoundingClientRect().top < innerHeight * 0.35) cur = i; });
      setActive(cur);
    };
    onScroll(); addEventListener("scroll", onScroll, { passive: true });
    return () => { removeEventListener("scroll", onScroll); io.disconnect(); };
  }, [sections]);

  const filled = Math.round(pct * BAR);
  const enc = encodeURIComponent;
  return (
    <aside className="rail">
      <div className={"rail-title" + (titleOn ? " on" : "")}>{title}</div>
      <div className="th">TREE</div>
      <div>
        {sections.map((s, i) => (
          <a key={s.id} href={"#" + s.id} className={i === active ? "on" : ""}><span className="br">└</span>{s.text}</a>
        ))}
      </div>
      <div className="prog"><b>{"█".repeat(filled)}</b>{"░".repeat(BAR - filled)}<span className="pct">{String(Math.round(pct * 100)).padStart(2, "0")}%</span></div>
      <div className="rail-time">{minutes} MIN READ</div>
      <div className="share">
        <div className="th">SHARE</div>
        <a href={`https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`} target="_blank" rel="noopener">X.com</a>
        <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`} target="_blank" rel="noopener">LinkedIn</a>
        <a href={`mailto:?subject=${enc(title)}&body=${enc(url)}`}>Email</a>
      </div>
    </aside>
  );
}
