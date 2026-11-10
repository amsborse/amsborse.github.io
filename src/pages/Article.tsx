import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getArticleSummaries, getPostBySlug, type ArticleSummary } from "@/utils/loadArticles";
import type { ParsedPost } from "@/utils/markdown";
import NotFoundPage from "@/pages/NotFound";
import { ArticleReader } from "@/components/writing/article/ArticleReader";
import "@/components/writing/article-polish.css";

export default function Article() {
  const { slug } = useParams();
  const [loaded, setLoaded] = useState<{
    slug: string;
    post: ParsedPost | null;
    summaries: ArticleSummary[];
  }>();
  const [failedSlug, setFailedSlug] = useState<string>();

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    Promise.all([getPostBySlug(slug), getArticleSummaries()])
      .then(([post, summaries]) => {
        if (!cancelled) {
          setLoaded({ slug, post: post ?? null, summaries });
          setFailedSlug(undefined);
        }
      })
      .catch(() => {
        if (!cancelled) setFailedSlug(slug);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!slug) return <NotFoundPage />;
  if (failedSlug === slug) {
    return (
      <div className="article-loading page-top" role="alert">
        <p>This essay could not be loaded.</p>
        <button className="article-focus-toggle" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    );
  }
  if (loaded?.slug !== slug) {
    return (
      <div className="article-loading page-top" role="status" aria-live="polite">
        <div className="article-loading__rule" aria-hidden="true" />
        <p>Loading essay…</p>
        <div className="article-loading__space" aria-hidden="true" />
      </div>
    );
  }
  if (!loaded.post) return <NotFoundPage />;
  return <ArticleReader key={slug} post={loaded.post} summaries={loaded.summaries} />;
}
