import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { contentPaths } from "@/content";
import { getAllPosts, getFeaturedPosts } from "@/content/loadPosts";

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

      <div className="writing-index article-shell max-w-3xl py-16 sm:py-20 lg:py-24">
        <p className="section-label">Writing</p>
        <h1 className="mt-4 font-display text-[2.25rem] font-semibold tracking-tight text-[var(--color-ink)] sm:text-[2.65rem]">
          Essays
        </h1>
        <p className="mt-6 max-w-xl text-[1.0625rem] leading-[1.75] text-[var(--color-body)]">
          Long-form pieces meant to be read slowly. Markdown files live in{" "}
          <code className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[0.85em] text-[var(--color-ink-soft)]">
            {contentPaths.posts}
          </code>
          ; order is set in{" "}
          <code className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[0.85em] text-[var(--color-ink-soft)]">
            {contentPaths.articlesOrderFile}
          </code>
          .
        </p>

        <section className="mt-16">
          <h2 className="section-label">Featured</h2>
          <ul className="mt-6 divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
            {featured.map((post) => (
              <li key={post.slug}>
                <Link
                  to={`/writing/${post.slug}`}
                  className="group block py-7 transition-colors motion-reduce:transition-none sm:py-8"
                >
                  <h3 className="font-display text-xl font-semibold leading-snug text-[var(--color-ink)] group-hover:text-[var(--color-accent)]">
                    {post.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-body)]">{post.description}</p>
                  <p className="mt-4 font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">
                    {post.date}
                    <span className="mx-2 opacity-40">·</span>
                    {post.readingMinutes} min
                    <span className="mx-2 opacity-40">·</span>
                    {post.tags.join(" · ")}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-20">
          <h2 className="section-label">Archive</h2>
          <ul className="mt-6 divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
            {all.map((post) => (
              <li key={post.slug}>
                <Link
                  to={`/writing/${post.slug}`}
                  className="group flex flex-col gap-1 py-4 transition-colors motion-reduce:transition-none sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 sm:py-5"
                >
                  <span className="font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-accent)]">
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
        </section>
      </div>
    </>
  );
}
