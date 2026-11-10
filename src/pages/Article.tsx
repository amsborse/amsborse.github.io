import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ReadingProgress } from "@/components/ReadingProgress";
import { Seo } from "@/components/Seo";
import { TableOfContents } from "@/components/TableOfContents";
import { site } from "@/data";
import { getAllPosts, getPostBySlug } from "@/utils/loadArticles";
import type { ParsedPost } from "@/utils/markdown";
import NotFoundPage from "@/pages/NotFound";
import { formatArticleDate } from "@/components/writing/formatArticleDate";
import "@/components/writing/article-polish.css";

export default function Article() {
  const { slug } = useParams();
  const [post, setPost] = useState<ParsedPost | null | undefined>(undefined);
  const [posts, setPosts] = useState<ParsedPost[]>([]);

  useEffect(() => {
    if (!slug) {
      setPost(null);
      return;
    }
    let cancelled = false;
    Promise.all([getPostBySlug(slug), getAllPosts()]).then(([found, allPosts]) => {
      if (!cancelled) {
        setPost(found ?? null);
        setPosts(allPosts);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (post === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-[var(--color-ink-muted)]">
        Loading…
      </div>
    );
  }

  if (!post) {
    return <NotFoundPage />;
  }

  const tagLine = post.tags.join(" · ");
  const currentIndex = posts.findIndex((item) => item.slug === post.slug);
  const nextPost = currentIndex >= 0 ? posts[currentIndex + 1] : undefined;

  return (
    <>
      <ReadingProgress />
      <Seo
        title={post.title}
        description={post.description}
        path={`/arsenal/writing/${post.slug}`}
      />

      <article className="article-reading page-top pb-32">
        <div className="article-shell max-w-6xl">
          <nav aria-label="Breadcrumb">
            <Link
              to="/arsenal/writing"
              className="article-back-link inline-flex min-h-11 items-center gap-2 text-base text-[var(--color-body)] transition-colors hover:text-[var(--color-accent)]"
            >
              <span aria-hidden="true">←</span>
              <span>All writing</span>
            </Link>
          </nav>

          <header className="article-reading__header mx-auto mt-12 max-w-[68ch] lg:mt-16">
            <h1 className="font-display text-[1.75rem] font-semibold leading-[1.22] tracking-[-0.02em] text-[var(--color-ink)] sm:text-[2rem] sm:leading-[1.2] lg:text-[2.15rem]">
              {post.title}
            </h1>
            <p className="mt-6 text-[1.05rem] leading-[1.72] text-[var(--color-body)] sm:text-[1.0625rem] sm:leading-[1.75]">
              {post.description}
            </p>
            <div className="mt-8 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[0.9375rem] text-[var(--color-body)]">
              <time dateTime={post.date}>{formatArticleDate(post.date)}</time>
              <span className="opacity-40" aria-hidden>
                ·
              </span>
              <span>{post.readingMinutes} min read</span>
              {tagLine ? (
                <>
                  <span className="opacity-40" aria-hidden>
                    ·
                  </span>
                  <span className="max-w-prose">{tagLine}</span>
                </>
              ) : null}
            </div>
          </header>

          <div
            className={`mx-auto mt-16 grid max-w-6xl gap-14 lg:mt-20 lg:gap-x-12 xl:gap-x-16 ${
              post.toc.length > 0
                ? "lg:grid-cols-[minmax(0,1fr)_200px] xl:grid-cols-[minmax(0,1fr)_210px]"
                : ""
            }`}
          >
            {post.toc.length > 0 ? (
              <aside className="lg:col-start-2 lg:row-start-1">
                <div className="lg:sticky lg:top-28">
                  <TableOfContents items={post.toc} variant="minimal" />
                </div>
              </aside>
            ) : null}

            <div className="min-w-0 lg:col-start-1 lg:row-start-1">
              <div
                id="article-body"
                className="prose-article pb-6"
                dangerouslySetInnerHTML={{ __html: post.html }}
              />
              {nextPost ? (
                <nav
                  className="article-next mx-auto mt-16 max-w-[68ch]"
                  aria-label="Essay navigation"
                >
                  <Link to={`/arsenal/writing/${nextPost.slug}`} className="article-next__link">
                    <span className="article-next__label">Next essay</span>
                    <span className="article-next__title">{nextPost.title}</span>
                    <span className="article-next__arrow" aria-hidden="true">
                      →
                    </span>
                  </Link>
                </nav>
              ) : null}
              <footer className="mx-auto mt-24 max-w-[var(--article-measure-reading)] pt-2">
                <p className="text-center text-base leading-relaxed text-[var(--color-body)]">
                  {site.name}
                  <span className="mx-2 opacity-30">·</span>
                  <Link
                    to="/arsenal/writing"
                    className="text-[var(--color-accent)] underline decoration-[var(--color-accent)]/30 underline-offset-4 transition-colors hover:decoration-[var(--color-accent)]/55"
                  >
                    All writing
                  </Link>
                </p>
              </footer>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
