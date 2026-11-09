import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap"><div className="hero no-art"><div className="hd">
      <h1>Page not found</h1>
      <p className="standfirst"><Link href="/">Back to the home page</Link></p>
    </div></div></div>
  );
}
