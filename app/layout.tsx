import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
import FooterArt from "@/components/FooterArt";
import { site } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url + "/"),
  title: { default: site.title, template: `%s / ${site.title}` },
  description: site.description,
  alternates: { types: { "application/rss+xml": `${site.url}/rss.xml` } },
  icons: { icon: `${site.basePath}/shared/img/favicon.svg` },
};
export const viewport: Viewport = {
  themeColor: [
    { color: "#000000" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div id="app"><Nav links={site.nav} github={`https://github.com/${site.githubUser}`} rss={`${site.basePath}/rss.xml`} /></div>
        {children}
        <FooterArt />
        <footer className="foot wrap">
          <span>© {new Date().getFullYear()} {site.name}</span>
          <span><a href={site.repoUrl}>Source</a> · <a href={`${site.basePath}/rss.xml`}>RSS</a></span>
        </footer>
      </body>
    </html>
  );
}
