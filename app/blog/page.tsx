import type { Metadata } from "next";
import Related from "@/components/Related";
import { listItems } from "@/lib/posts";

export const metadata: Metadata = { title: "Posts" };

export default function Posts() {
  return (
    <div className="wrap" data-tpl="index">
      <div className="hero no-art"><div className="hd"><h1>Posts</h1></div></div>
      <Related posts={listItems()} label="All posts" />
    </div>
  );
}
