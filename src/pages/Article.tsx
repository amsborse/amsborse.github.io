import { Link, useParams } from "react-router-dom";
import { ReadingProgress } from "@/components/ReadingProgress";
import { Seo } from "@/components/Seo";
import { TableOfContents } from "@/components/TableOfContents";
import { getPostBySlug } from "@/content/loadPosts";
import { site } from "@/content";
import NotFoundPage from "@/pages/NotFound";

export default function Article() {
  const { slug } = useParams();
  const post = slug ? getPostBySlug(slug) : undefined;

  if (!post) {
    return <NotFoundPage />;
  }

  const tagLine = post.tags.join(" · ");

  return (
    <>
      <ReadingProgress />
      <Seo title={post.title} description={post.description} path={`/writing/${post.slug}`} />

      <article className="article-reading pb-32 pt-8 sm:pt-10">
        <div className="article-shell max-w-6xl">
          <nav aria-label="Breadcrumb">
            <Link
              to="/writing"
              className="inline-block text-sm text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-accent)]"
            >
              ← All writing
            </Link>
          </nav>

          <header className="mx-auto mt-12 max-w-[var(--article-measure-reading)] lg:mt-16">
            <h1 className="font-display text-[1.75rem] font-semibold leading-[1.22] tracking-[-0.02em] text-[var(--color-ink)] sm:text-[2rem] sm:leading-[1.2] lg:text-[2.15rem]">
              {post.title}
            </h1>
            <p className="mt-6 text-[1.05rem] leading-[1.72] text-[var(--color-body)] sm:text-[1.0625rem] sm:leading-[1.75]">
              {post.description}
            </p>
            <div className="mt-8 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[0.8125rem] text-[var(--color-ink-muted)]">
              <time dateTime={post.date}>{post.date}</time>
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
              <footer className="mx-auto mt-24 max-w-[var(--article-measure-reading)] pt-2">
                <p className="text-center text-[0.8125rem] leading-relaxed text-[var(--color-ink-muted)]">
                  {site.name}
                  <span className="mx-2 opacity-30">·</span>
                  <Link
                    to="/writing"
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
