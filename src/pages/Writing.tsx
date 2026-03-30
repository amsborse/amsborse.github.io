import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { Reveal } from "@/components/Reveal";
import { Seo } from "@/components/Seo";
import { contentPaths } from "@/data";
import { getAllPosts, getFeaturedPosts } from "@/utils/loadArticles";

export default function WritingPage() {
  const all = getAllPosts();
  const featured = getFeaturedPosts();

  return (
    <>
      <Seo
        title="Writing"
        description="Essays on systems, APIs, reliability, and engineering practice by Akshay Borse."
        path="/writing"
      />

      <div className="writing-index writing-index--editorial article-shell max-w-3xl py-16 sm:py-20 lg:py-24">
        <Reveal>
          <p className="section-label">Writing</p>
          <h1 className="mt-5 font-display text-[2.35rem] font-semibold tracking-[-0.03em] text-[var(--color-ink)] sm:text-[2.75rem]">
            Essays
          </h1>
          <p className="mt-7 max-w-xl text-[1.0625rem] leading-[1.78] text-[var(--color-body)]">
            Long-form pieces meant to be read slowly. Markdown files live in{" "}
            <code className="rounded border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-1.5 py-0.5 font-mono text-[0.85em] text-[var(--color-ink-soft)]">
              {contentPaths.articlesFolder}
            </code>
            ; order is set in{" "}
            <code className="rounded border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-1.5 py-0.5 font-mono text-[0.85em] text-[var(--color-ink-soft)]">
              {contentPaths.articlesOrderFile}
            </code>
            .
          </p>
        </Reveal>

        <Reveal className="mt-20" delayMs={30}>
          <h2 className="section-label">Featured</h2>
        </Reveal>
        <Reveal className="mt-8" stagger staggerMs={72}>
          <ul className="flex flex-col gap-4">
            {featured.map((post, i) => (
              <li
                key={post.slug}
                className="reveal-stagger-item"
                style={{ "--reveal-index": i } as CSSProperties}
              >
                <Link
                  to={`/writing/${post.slug}`}
                  className="writing-entry-card group block px-6 py-7 sm:px-8 sm:py-8"
                >
                  <div className="writing-entry-card__inner">
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-10">
                      <div className="flex shrink-0 flex-col sm:w-32">
                        <span className="writing-entry-card__eyebrow">Featured</span>
                        <time
                          className="mt-3 block font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-[var(--color-ink-muted)]"
                          dateTime={post.date}
                        >
                          {post.date}
                        </time>
                        <p className="mt-2 font-mono text-[0.6875rem] text-[var(--color-gold-muted)]">
                          {post.readingMinutes} min
                        </p>
                        <span className="writing-entry-card__read">
                          Read
                          <span className="writing-entry-card__read-arrow" aria-hidden>
                            →
                          </span>
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 sm:pl-2">
                        <h3 className="font-display text-[1.2rem] font-semibold leading-snug text-[var(--color-ink)] transition-colors duration-300 group-hover:text-[var(--color-accent)] sm:text-[1.28rem]">
                          {post.title}
                        </h3>
                        <p className="mt-3 text-sm leading-[1.72] text-[var(--color-body)] sm:text-[0.9375rem]">
                          {post.description}
                        </p>
                        <p className="mt-4 font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">
                          {post.tags.join(" · ")}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal className="mt-24" delayMs={20}>
          <h2 className="section-label">Archive</h2>
          <ul className="mt-8 divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
            {all.map((post) => (
              <li key={post.slug}>
                <Link
                  to={`/writing/${post.slug}`}
                  className="group flex flex-col gap-1 py-5 transition-colors motion-reduce:transition-none sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 sm:py-6"
                >
                  <span className="font-display text-[1.05rem] font-semibold text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-accent)]">
                    {post.title}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-[var(--color-ink-muted)]">
                    {post.date}
                    <span className="mx-2 opacity-40">·</span>
                    {post.readingMinutes} min
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </>
  );
}
