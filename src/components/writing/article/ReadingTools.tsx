import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChapterRail } from "@/components/ChapterRail";
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

/**
 * The dot rail shows the essay's main sections; subsections fold into the section above
 * them. Essays without h2 headings use every heading instead.
 */
export function railSections(items: TocItem[]) {
  const main = items.filter((item) => item.level === 2);
  return (main.length >= 3 ? main : items).map(({ id, text }) => ({ id, label: text }));
}

/** The rail stop for the heading being read: itself, or the nearest rail section above it. */
export function railStopFor(items: TocItem[], stops: { id: string }[], activeId?: string) {
  const ids = new Set(stops.map((stop) => stop.id));
  const index = items.findIndex((item) => item.id === activeId);
  for (let i = index; i >= 0; i--) if (ids.has(items[i].id)) return items[i].id;
  return stops[0]?.id;
}

/** Ways to fit the contents in one screen, roomiest first; "window" always fits (it follows the reader). */
export const CONTENTS_FIT_MODES = ["roomy", "compact", "sections", "dense", "window"] as const;
export type ContentsFit = (typeof CONTENTS_FIT_MODES)[number];

/** Applies each fit mode in turn and keeps the first one whose list no longer overflows. */
export function fitContents(apply: (mode: ContentsFit) => void, fits: () => boolean): ContentsFit {
  for (const mode of CONTENTS_FIT_MODES) {
    apply(mode);
    if (mode === "window" || fits()) return mode;
  }
  return "window";
}

/** Left: the full table of contents. Right: the shared chapter dot rail. One tracker drives both. */
export function ArticleContents({ items }: { items: TocItem[] }) {
  const rail = useRef<HTMLElement>(null);
  const stops = useMemo(() => railSections(items), [items]);
  const [current, setCurrent] = useState<string>();
  const reducedMotion = usePrefersReducedMotion();
  useLayoutEffect(() => {
    const aside = rail.current;
    const nav = aside?.querySelector("nav");
    if (!aside || !nav) return;
    const fit = () =>
      fitContents(
        (mode) => (aside.dataset.fit = mode),
        () => nav.scrollHeight <= nav.clientHeight + 1
      );
    fit();
    void document.fonts?.ready.then(fit);
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [items]);
  useEffect(() => {
    if (items.length < 3) return;
    const links = rail.current?.querySelectorAll("a");
    let windowed: string | undefined;
    const update = () => {
      // Look the headings up each frame: the article body can re-render its markup after this
      // effect runs, and a detached heading reports top 0, which reads as "already passed".
      const headings = items.flatMap((item) => {
        const heading = document.getElementById(item.id);
        return heading ? [heading] : [];
      });
      const body = document.getElementById("article-body");
      const line = window.innerHeight * 0.25;
      const bounds = body?.getBoundingClientRect();
      if (rail.current && bounds)
        rail.current.dataset.visible = String(bounds.top <= line && bounds.bottom > line);
      const passed = headings.filter((heading) => heading.getBoundingClientRect().top <= line);
      const active = passed.at(-1) ?? headings[0];
      setCurrent(active?.id);
      // Folded modes hide subsections, so their section carries the highlight.
      const fit = rail.current?.dataset.fit;
      const marked =
        fit === "sections" || fit === "dense" || fit === "window"
          ? railStopFor(items, stops, active?.id)
          : active?.id;
      let markedLink: HTMLAnchorElement | undefined;
      links?.forEach((link) => {
        if (link.hash.slice(1) !== marked) return link.removeAttribute("aria-current");
        link.setAttribute("aria-current", "location");
        markedLink = link;
      });
      // A list too long for the screen does not scroll by hand: it keeps the current section
      // centred in a fixed window.
      const nav = rail.current?.querySelector("nav");
      if (fit === "window" && nav && markedLink && windowed !== marked) {
        windowed = marked;
        nav.scrollTo({
          top: markedLink.offsetTop - nav.clientHeight / 2 + markedLink.offsetHeight / 2,
          behavior: reducedMotion ? "auto" : "smooth",
        });
      }
    };
    // Recompute once per frame while scrolling. Observer bands alone miss a glide that comes
    // to rest inside a band (the heading never crosses the reading line in a reported frame).
    let frame = 0;
    const schedule = () => {
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          update();
        });
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [items, stops, reducedMotion]);
  if (items.length < 3) return null;
  return (
    <>
      <aside
        ref={rail}
        className="article-contents article-chrome"
        aria-label="Article sections"
        data-visible="false"
      >
        <TableOfContents items={items} variant="minimal" />
      </aside>
      <ChapterRail
        chapters={stops}
        label="Sections of this essay"
        activeId={railStopFor(items, stops, current)}
        progressTargetId="article-body"
        className="article-rail"
      />
    </>
  );
}

type ReadingBlock = { top: number; bottom: number; words: number };

/** Words still ahead of the reading line; the block it crosses counts the part below it. */
export function wordsRemaining(blocks: readonly ReadingBlock[], line: number) {
  let words = 0;
  for (const { top, bottom, words: count } of blocks) {
    if (top >= line) words += count;
    else if (bottom > line) words += (count * (bottom - line)) / (bottom - top);
  }
  return Math.round(words);
}

/**
 * "4 min left" … "1 min left", then "Finished". The essay's own reading time (its word count
 * at 220 words a minute) scaled by the share of words still ahead, so the countdown starts
 * at the "N min read" in the header.
 */
export function timeLeftLabel(remaining: number, total: number, readingMinutes: number) {
  if (remaining <= 0 || total <= 0) return "Finished";
  return `${Math.max(1, Math.round((readingMinutes * remaining) / total))} min left`;
}

/** The same share as a digital clock, "05:00" … "00:00", so it ticks with every scroll. */
export function timeLeftClock(remaining: number, total: number, readingMinutes: number) {
  const seconds =
    remaining > 0 && total > 0 ? Math.round((readingMinutes * 60 * remaining) / total) : 0;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
}

const countWords = (text: string | null) => (text ?? "").split(/\s+/).filter(Boolean).length;

/** Counts down the minutes left from the words below the reading line, as the reader scrolls. */
export function ArticleTimeLeft({ readingMinutes }: { readingMinutes: number }) {
  const [label, setLabel] = useState<string>();
  const [clock, setClock] = useState("00:00");
  const [reading, setReading] = useState(false);
  useEffect(() => {
    const body = document.getElementById("article-body");
    if (!body) return;
    let blocks: { element: Element; words: number }[] = [];
    let total = 0;
    // Hidden blocks (the essay's own contents list, the duplicated cover) are not read.
    const measure = () => {
      blocks = Array.from(body.children, (element) => ({
        element,
        words: element.getClientRects().length ? countWords(element.textContent) : 0,
      })).filter((block) => block.words > 0);
      total = blocks.reduce((sum, block) => sum + block.words, 0);
    };
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.3;
      const bounds = body.getBoundingClientRect();
      setReading(bounds.top <= line && bounds.bottom > 0);
      const words = wordsRemaining(
        blocks.map(({ element, words }) => {
          const rect = element.getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom, words };
        }),
        line
      );
      setLabel(timeLeftLabel(words, total, readingMinutes));
      setClock(timeLeftClock(words, total, readingMinutes));
    };
    const schedule = () => {
      if (!frame && !document.hidden) frame = requestAnimationFrame(update);
    };
    const resize = new ResizeObserver(() => {
      measure();
      schedule();
    });
    resize.observe(body);
    measure();
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    document.addEventListener("visibilitychange", schedule);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [readingMinutes]);
  return (
    <p className="article-time-left" data-visible={reading && label ? "true" : "false"}>
      <span className="sr-only">Reading time: </span>
      <span className="article-time-left__clock" aria-hidden="true">
        {clock}
      </span>
      <span className="article-time-left__label">{label}</span>
    </p>
  );
}
