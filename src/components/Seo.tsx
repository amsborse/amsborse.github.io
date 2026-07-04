import { useEffect } from "react";
import { site } from "@/data";

type SeoProps = {
  title: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
  image?: string;
};

function absoluteUrl(path: string): string {
  const base = site.url.replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function Seo({
  title,
  description = site.description,
  path = "",
  noIndex,
  image = "/favicon.svg",
}: SeoProps) {
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

    const canonicalUrl = absoluteUrl(path || "/");
    const imageUrl = image.startsWith("http") ? image : absoluteUrl(image);

    setMeta("description", "name", description);
    setMeta("robots", "name", noIndex ? "noindex" : "index, follow");
    setMeta("og:title", "property", title);
    setMeta("og:description", "property", description);
    setMeta("og:url", "property", canonicalUrl);
    setMeta("og:type", "property", "website");
    setMeta("og:image", "property", imageUrl);
    setMeta("twitter:card", "name", "summary");
    setMeta("twitter:title", "name", title);
    setMeta("twitter:description", "name", description);
    setMeta("twitter:image", "name", imageUrl);

    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = canonicalUrl;
  }, [title, description, path, noIndex, image]);

  return null;
}
