import { useEffect } from "react";
import { site } from "@/data";

type SeoProps = {
  title: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
};

export function Seo({ title, description = site.description, path = "", noIndex }: SeoProps) {
  useEffect(() => {
    document.title = title.includes(site.name) ? title : `${title} · ${site.name}`;

    const setMeta = (name: string, attr: "name" | "property", content: string) => {
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const canonicalUrl = `${site.url.replace(/\/$/, "")}${path || "/"}`;
    setMeta("description", "name", description);
    setMeta("robots", "name", noIndex ? "noindex" : "index, follow");
    setMeta("og:title", "property", title);
    setMeta("og:description", "property", description);
    setMeta("og:url", "property", canonicalUrl);
    setMeta("og:type", "property", "website");
    setMeta("twitter:card", "name", "summary_large_image");
    setMeta("twitter:title", "name", title);
    setMeta("twitter:description", "name", description);

    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = canonicalUrl;
  }, [title, description, path, noIndex]);

  return null;
}
