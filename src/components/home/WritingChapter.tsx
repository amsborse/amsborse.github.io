import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ParsedPost } from "@/utils/markdown";
import { ChapterHeading } from "./ChapterHeading";
import { formatArticleDate } from "@/components/writing/formatArticleDate";

const SHOWN = 3;

/**
 * The latest essays. Articles load on demand, so the list keeps a reserved height
 * and fills in place: nothing below it moves when the titles arrive.
 */
export function WritingChapter() {
  const [posts, setPosts] = useState<ParsedPost[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    import("@/utils/loadArticles")
      .then(({ getAllPosts }) => getAllPosts())
      .then((all) => {
        if (alive) setPosts(all.slice(0, SHOWN));
      })
      .catch((error: unknown) => {
        console.error("[home] Could not load essays:", error);
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section id="writing" aria-labelledby="writing-title" className="chapter article-shell">
      <ChapterHeading id="writing-title" eyebrow="Writing" title="Thinking, written down.">
        Essays on reliability, API design and observability.
      </ChapterHeading>

      <ol className="essays" aria-busy={posts === null && !failed}>
        {failed ? (
          <li className="essays__notice" role="status">
            The essay list could not be loaded here. It is all on the writing page.
          </li>
        ) : (
          (posts ?? []).map((post, index) => (
            <li key={post.slug}>
              <Link to={`/arsenal/writing/${post.slug}`} className="essay">
                <span className="essay__index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="essay__text">
                  <span className="essay__title">{post.title}</span>
                  <span className="essay__body">{post.description}</span>
                </span>
                <span className="essay__meta">
                  <time dateTime={post.date}>{formatArticleDate(post.date)}</time>
                  <span aria-hidden="true"> · </span>
                  {post.readingMinutes} min read
                </span>
              </Link>
            </li>
          ))
        )}
      </ol>

      <p className="chapter-more">
        <Link to="/arsenal/writing" className="chapter-link">
          All writing
          <span aria-hidden="true">→</span>
        </Link>
      </p>
    </section>
  );
}
