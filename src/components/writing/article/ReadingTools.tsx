import { useEffect, useRef } from "react";
import { TableOfContents } from "@/components/TableOfContents";
import { usePrefersReducedMotion } from "@/hooks/useParallax";
import type { TocItem } from "@/utils/markdown";
import { articleProgress } from "./articleHelpers";

/** The shared progress component assumes a scroll container; this body scrolls with the window. */
export function ArticleReadingProgress() {
  const fill = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  useEffect(() => {
    if (reducedMotion) return;
    const body = document.getElementById("article-body");
    if (!body) return;
    let frame = 0;
    let visible = false;
    const update = () => {
      frame = 0;
      const bounds = body.getBoundingClientRect();
      if (fill.current)
        fill.current.style.transform = `scaleX(${articleProgress(bounds.top, bounds.height, window.innerHeight)})`;
    };
    const schedule = () => {
      if (!document.hidden && visible && !frame) frame = requestAnimationFrame(update);
    };
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    intersection.observe(body);
    const resize = new ResizeObserver(schedule);
    resize.observe(body);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    document.addEventListener("visibilitychange", schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      intersection.disconnect();
      resize.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [reducedMotion]);
  return (
    <div className="article-progress" aria-hidden="true">
      <div ref={fill} className="article-progress__fill" />
    </div>
  );
}

export function ArticleContents({ items }: { items: TocItem[] }) {
  const rail = useRef<HTMLElement>(null);
  useEffect(() => {
    if (items.length < 3) return;
    const headings = items.flatMap((item) => {
      const heading = document.getElementById(item.id);
      return heading ? [heading] : [];
    });
    const links = rail.current?.querySelectorAll("a");
    const body = document.getElementById("article-body");
    const update = () => {
      const line = window.innerHeight * 0.25;
      const bounds = body?.getBoundingClientRect();
      if (rail.current && bounds)
        rail.current.dataset.visible = String(bounds.top <= line && bounds.bottom > line);
      const passed = headings.filter((heading) => heading.getBoundingClientRect().top <= line);
      const active = passed.at(-1) ?? headings[0];
      links?.forEach((link) => {
        if (link.hash.slice(1) === active?.id) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    };
    const observer = new IntersectionObserver(update, { rootMargin: "-15% 0px -60% 0px" });
    headings.forEach((heading) => observer.observe(heading));
    if (body) observer.observe(body);
    update();
    return () => observer.disconnect();
  }, [items]);
  if (items.length < 3) return null;
  return (
    <aside
      ref={rail}
      className="article-contents article-chrome"
      aria-label="Article sections"
      data-visible="false"
    >
      <TableOfContents items={items} variant="minimal" />
    </aside>
  );
}
