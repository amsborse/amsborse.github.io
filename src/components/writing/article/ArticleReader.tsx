import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { site } from "@/data";
import { toSummary, type ArticleSummary } from "@/utils/loadArticles";
import type { ParsedPost } from "@/utils/markdown";
import { categoriesFor, relatedArticles } from "@/utils/writingCatalog";
import { formatArticleDate } from "../formatArticleDate";
import { ArticleAtmosphere } from "./ArticleAtmosphere";
import { ArticleContents, ArticleReadingProgress, ArticleTimeLeft } from "./ReadingTools";
import { useReadingFocus } from "./useReadingFocus";
import {
  articleLanguageLabel,
  articlePresentation,
  articleSections,
  articleTranslations,
  primaryArticleTheme,
} from "./articleHelpers";

export function ArticleReader({
  post,
  summaries,
}: {
  post: ParsedPost;
  summaries: ArticleSummary[];
}) {
  const [focused, toggleFocus] = useReadingFocus();
  const { bodyHtml, coverHtml } = articlePresentation(post);
  const sections = useMemo(() => articleSections(post.toc), [post.toc]);
  const { original, translations } = articleTranslations(post, summaries);
  const related = relatedArticles(toSummary(post), summaries);
  const index = summaries.findIndex((item) => item.slug === post.slug);
  const next = index >= 0 ? summaries[index + 1] : undefined;
  const subtitle = post.subtitle || post.description;

  return (
    <>
      <Seo
        title={post.title}
        description={post.description}
        path={`/arsenal/writing/${post.slug}`}
      />
      <ArticleReadingProgress />
      <ArticleTimeLeft key={post.slug} readingMinutes={post.readingMinutes} />
      <ArticleAtmosphere theme={primaryArticleTheme(post)} focused={focused} />
      <ArticleContents items={sections} />
      {focused ? (
        <button
          type="button"
          className="article-focus-toggle article-focus-return"
          aria-pressed="true"
          onClick={toggleFocus}
        >
          Exit focus
        </button>
      ) : null}
      <article className="article-reading page-top" lang={post.lang} data-focus={focused}>
        <div className="article-shell">
          <div className="article-toolbar">
            <nav aria-label="Breadcrumb" className="article-chrome">
              <Link to="/arsenal/writing" className="article-back-link">
                <span aria-hidden="true">← </span>All writing
              </Link>
            </nav>
            <button
              type="button"
              className="article-focus-toggle"
              aria-pressed={focused}
              aria-keyshortcuts="f Escape"
              onClick={toggleFocus}
            >
              {focused ? "Exit focus" : "Focus mode"}
              <kbd aria-hidden="true">{focused ? "Esc" : "F"}</kbd>
            </button>
            <span className="sr-only" role="status" aria-live="polite">
              {focused ? "Focus mode on" : "Focus mode off"}
            </span>
          </div>
          <header className="article-reading__header">
            {post.kicker ? <p className="article-kicker">{post.kicker}</p> : null}
            <h1 className="font-display">{post.title}</h1>
            {subtitle ? <p className="article-subtitle">{subtitle}</p> : null}
            <div className="article-meta">
              <time dateTime={post.date}>{formatArticleDate(post.date)}</time>
              <span aria-hidden="true">·</span>
              <span>{post.readingMinutes} min read</span>
              {categoriesFor(post).map((theme) => (
                <span className="article-meta__item" key={theme.id}>
                  <span aria-hidden="true">·</span>
                  <Link to={`/arsenal/writing?theme=${theme.id}`}>{theme.label}</Link>
                </span>
              ))}
              {post.series ? (
                <span className="article-meta__item">
                  <span aria-hidden="true">·</span>
                  <Link to={`/arsenal/writing?q=${encodeURIComponent(post.series)}`}>
                    {post.series}
                    {post.seriesPart !== undefined ? ` · Part ${post.seriesPart}` : ""}
                  </Link>
                </span>
              ) : null}
            </div>
          </header>
          {post.cover ? (
            coverHtml ? (
              <div className="article-cover" dangerouslySetInnerHTML={{ __html: coverHtml }} />
            ) : (
              <figure className="article-cover">
                <img
                  src={post.cover}
                  width={post.coverWidth}
                  height={post.coverHeight}
                  alt=""
                  decoding="async"
                  className={
                    post.coverWidth && post.coverHeight && post.coverHeight / post.coverWidth > 1.4
                      ? "article-image--portrait"
                      : undefined
                  }
                />
              </figure>
            )
          ) : null}
          <div className="article-reading__layout">
            <div
              id="article-body"
              className="prose-article"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          </div>
          <footer className="article-ending article-chrome">
            <nav className="article-source-links" aria-label="Other editions">
              {post.mediumUrl ? (
                <a href={post.mediumUrl} target="_blank" rel="noopener">
                  Read on the original<span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : null}
              {original ? (
                <Link to={`/arsenal/writing/${original.slug}`} lang="en">
                  Read in English
                </Link>
              ) : null}
              {translations
                .filter((item) => item.lang)
                .map((item) => (
                  <Link key={item.slug} to={`/arsenal/writing/${item.slug}`} lang={item.lang}>
                    Also in {articleLanguageLabel(item.lang)}
                  </Link>
                ))}
            </nav>
            {related.length ? (
              <section className="article-related" aria-labelledby="related-reading">
                <h2 id="related-reading" className="article-section-label">
                  Related reading
                </h2>
                <div className="article-related__list">
                  {related.map((item) => (
                    <Link
                      key={item.slug}
                      to={`/arsenal/writing/${item.slug}`}
                      className="article-related__link"
                    >
                      {item.cover ? (
                        <img
                          src={item.cover}
                          width={item.coverWidth}
                          height={item.coverHeight}
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      ) : null}
                      <span>
                        <span className="article-related__title">{item.title}</span>
                        <span className="article-related__time">
                          {item.readingMinutes} min read
                        </span>
                      </span>
                      <span aria-hidden="true">↗</span>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
            {next ? (
              <nav className="article-next" aria-label="Essay navigation">
                <Link to={`/arsenal/writing/${next.slug}`} className="article-next__link">
                  <span className="article-next__label">Next essay</span>
                  <span className="article-next__title">{next.title}</span>
                  <span className="article-next__arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              </nav>
            ) : null}
            <p className="article-signoff">
              {site.name}
              <span aria-hidden="true"> · </span>
              <Link to="/arsenal/writing">All writing</Link>
            </p>
          </footer>
        </div>
      </article>
    </>
  );
}
