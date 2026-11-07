import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Reveal } from "@/components/Reveal";
import { Seo } from "@/components/Seo";
import { PageStage } from "@/components/stage/PageStage";
import { HubInteractiveCard } from "@/components/InteractiveCard";
import { getAllPosts, getFeaturedPosts } from "@/utils/loadArticles";
import type { ParsedPost } from "@/utils/markdown";

function FeaturedWritingCard({ post, i }: { post: ParsedPost; i: number }) {
  return (
    <li>
      <HubInteractiveCard
        id={post.slug}
        title={post.title}
        description={post.description}
        path={`/arsenal/writing/${post.slug}`}
        status="active"
        statusLabel="Featured"
        tags={[...post.tags, `${post.readingMinutes} min`, post.date]}
        color="from-indigo-500 to-purple-600"
        icon="📝"
        index={i}
        ctaLabel="Read Essay"
      />
    </li>
  );
}

export default function WritingPage() {
  const [all, setAll] = useState<ParsedPost[]>([]);
  const [featured, setFeatured] = useState<ParsedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAllPosts(), getFeaturedPosts()]).then(([posts, featuredPosts]) => {
      if (!cancelled) {
        setAll(posts);
        setFeatured(featuredPosts);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Seo
        title="Writing"
        description="Essays on systems, APIs, reliability, and engineering practice by Akshay Borse."
        path="/arsenal/writing"
      />

      <div className="writing-index writing-index--editorial article-shell max-w-3xl py-16 sm:py-20 lg:py-24">
        <PageStage
          motif="writing"
          eyebrow="Writing"
          title="Essays"
          lede="Notes on building systems that hold up — reliability, API design, observability, and why writing things down is part of the engineering."
        />
        {loading ? (
          <p className="mt-16 text-sm text-[var(--color-ink-muted)]">Loading essays…</p>
        ) : (
          <>
            <Reveal className="mt-20" delayMs={30}>
              <h2 className="section-label">Featured</h2>
            </Reveal>
            <Reveal className="mt-8" stagger staggerMs={72}>
              <ul className="grid grid-cols-1 gap-5 sm:grid-cols-3 items-stretch">
                {featured.map((post, i) => (
                  <FeaturedWritingCard key={post.slug} post={post} i={i} />
                ))}
              </ul>
            </Reveal>

            <Reveal className="mt-24" delayMs={20}>
              <h2 className="section-label">Archive</h2>
              <ul className="mt-8 divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
                {all.map((post) => (
                  <li key={post.slug}>
                    <Link
                      to={`/arsenal/writing/${post.slug}`}
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
          </>
        )}
      </div>
    </>
  );
}
