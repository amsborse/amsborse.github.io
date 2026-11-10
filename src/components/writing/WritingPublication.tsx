import { useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { ArticleSummary } from "@/utils/loadArticles";
import { categoriesFor, isPrimaryLanguage } from "@/utils/writingCatalog";
import { writingCategories } from "@/data/writingCategories";
import { formatArticleDate } from "@/components/writing/formatArticleDate";
import {
  articlesByYear,
  featuredArticles,
  filterArchive,
  homeSearchParams,
  parseHomeFilters,
  readingShelves,
  themeCounts,
  type HomeFilters,
} from "./home/catalog";
import { ReadingReveal, ThemeConstellation } from "./home/ReadingMotion";

function ArticleMeta({ post }: { post: ArticleSummary }) {
  return (
    <span className="writing-publication__meta">
      <time dateTime={post.date}>{formatArticleDate(post.date)}</time>
      <span aria-hidden="true"> · </span>
      <span>{post.readingMinutes} min read</span>
    </span>
  );
}

function Cover({ post, lead = false }: { post: ArticleSummary; lead?: boolean }) {
  if (!post.cover) return null;
  return (
    <span className="reading-cover">
      <img
        src={post.cover}
        alt=""
        width={post.coverWidth}
        height={post.coverHeight}
        loading={lead ? "eager" : "lazy"}
        decoding="async"
      />
    </span>
  );
}

function Feature({ post, lead = false }: { post: ArticleSummary; lead?: boolean }) {
  return (
    <article
      className={`reading-feature${lead ? " reading-feature--lead" : ""}${post.cover ? "" : " reading-feature--text"}`}
    >
      <Link to={`/arsenal/writing/${post.slug}`}>
        <Cover post={post} lead={lead} />
        <div className="reading-feature__copy">
          {post.kicker ? <p className="reading-kicker">{post.kicker}</p> : null}
          <h3>{post.title}</h3>
          {post.subtitle || post.description ? (
            <p className="reading-description">{post.subtitle || post.description}</p>
          ) : null}
          <ArticleMeta post={post} />
          {lead ? (
            <span className="reading-feature__action">
              Read essay{" "}
              <span className="writing-publication__arrow" aria-hidden="true">
                ↗
              </span>
            </span>
          ) : null}
        </div>
      </Link>
    </article>
  );
}

export function WritingPublication({ posts }: { posts: ArticleSummary[] }) {
  const [params, setParams] = useSearchParams();
  const filters = parseHomeFilters(params);
  const searchRef = useRef<HTMLInputElement>(null);
  const featured = useMemo(() => featuredArticles(posts), [posts]);
  const shelves = useMemo(() => readingShelves(posts), [posts]);
  const counts = useMemo(() => themeCounts(posts), [posts]);
  const matches = useMemo(
    () => filterArchive(posts, { theme: filters.theme, query: filters.query }),
    [posts, filters.theme, filters.query]
  );
  const years = useMemo(() => articlesByYear(matches), [matches]);
  const translations = posts.filter((post) => !isPrimaryLanguage(post));
  const total = posts.filter(isPrimaryLanguage).length;
  const active = filters.theme !== null || filters.query.trim() !== "";
  const update = (next: HomeFilters, replace = false) => {
    setParams((current) => homeSearchParams(current, next), { replace, preventScrollReset: true });
  };

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.key !== "/" ||
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        (target instanceof HTMLElement &&
          target.closest(
            "input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='textbox']"
          ))
      )
        return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  return (
    <div className="writing-publication">
      {featured.length > 0 ? (
        <ReadingReveal>
          <section className="reading-features" aria-labelledby="reading-featured-title">
            <div className="reading-section-heading">
              <h2 id="reading-featured-title" className="reading-label">
                Selected essays
              </h2>
              <span className="reading-label reading-label--quiet">A place to begin</span>
            </div>
            <div className="reading-features__layout">
              <Feature post={featured[0]} lead />
              {featured.length > 1 ? (
                <div className="reading-features__secondary">
                  {featured.slice(1).map((post) => (
                    <Feature key={post.slug} post={post} />
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        </ReadingReveal>
      ) : null}

      <ReadingReveal>
        <section className="reading-themes" aria-labelledby="reading-themes-title">
          <ThemeConstellation selected={filters.theme} />
          <div className="reading-section-heading">
            <h2 id="reading-themes-title">Follow a thread</h2>
            <button
              className="reading-reset"
              type="button"
              aria-pressed={!filters.theme}
              onClick={() => update({ ...filters, theme: null })}
            >
              All themes <span>{total}</span>
            </button>
          </div>
          <div className="reading-themes__strip" role="group" aria-label="Filter archive by theme">
            {writingCategories.map((category) => (
              <button
                type="button"
                key={category.id}
                className="reading-theme"
                aria-pressed={filters.theme === category.id}
                aria-controls="reading-archive"
                onClick={() =>
                  update({ ...filters, theme: filters.theme === category.id ? null : category.id })
                }
              >
                <span className="reading-theme__count">{counts.get(category.id)} essays</span>
                <span className="reading-theme__name">{category.label}</span>
                <span className="reading-theme__line">{category.line}</span>
              </button>
            ))}
          </div>
        </section>
      </ReadingReveal>

      {shelves.length > 0 ? (
        <ReadingReveal>
          <section className="reading-shelves" aria-labelledby="reading-shelves-title">
            <div className="reading-section-heading">
              <h2 id="reading-shelves-title">Longer threads</h2>
              <span className="reading-label reading-label--quiet">Collections & series</span>
            </div>
            <div className="reading-shelves__layout">
              {shelves
                .filter((shelf) => shelf.kind === "collection")
                .map((shelf) => (
                  <Link
                    key={shelf.name}
                    className="reading-shelf"
                    to={`/arsenal/writing/${shelf.articles[0].slug}`}
                  >
                    <span className="reading-label">
                      Collection · {shelf.articles.length} essays
                    </span>
                    <h3>{shelf.name}</h3>
                    <span className="reading-shelf__start">
                      Start reading{" "}
                      <span className="writing-publication__arrow" aria-hidden="true">
                        ↗
                      </span>
                    </span>
                  </Link>
                ))}
              <div className="reading-series">
                {shelves
                  .filter((shelf) => shelf.kind === "series")
                  .map((shelf) => (
                    <Link key={shelf.name} to={`/arsenal/writing/${shelf.articles[0].slug}`}>
                      <span>
                        {shelf.name}
                        <span className="writing-publication__meta">
                          {shelf.articles.length} parts
                        </span>
                      </span>
                      <span className="writing-publication__arrow" aria-hidden="true">
                        ↗
                      </span>
                    </Link>
                  ))}
              </div>
            </div>
          </section>
        </ReadingReveal>
      ) : null}

      <ReadingReveal>
        <section
          id="reading-archive"
          className="reading-archive"
          aria-labelledby="reading-archive-title"
        >
          <div className="reading-section-heading">
            <h2 id="reading-archive-title">The archive</h2>
            <span className="reading-label reading-label--quiet">Newest first</span>
          </div>
          <form
            className="reading-search"
            role="search"
            onSubmit={(event) => event.preventDefault()}
          >
            <label htmlFor="writing-search" className="sr-only">
              Search essays
            </label>
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m16 16 5 5" />
            </svg>
            <input
              ref={searchRef}
              id="writing-search"
              type="search"
              placeholder="Search essays, ideas, questions…"
              autoComplete="off"
              value={filters.query}
              aria-controls="reading-results"
              onChange={(event) => update({ ...filters, query: event.target.value }, true)}
            />
            {filters.query ? (
              <button
                type="button"
                onClick={() => {
                  update({ ...filters, query: "" });
                  searchRef.current?.focus();
                }}
              >
                Clear search
              </button>
            ) : (
              <kbd aria-hidden="true">/</kbd>
            )}
          </form>
          <div className="reading-results-summary">
            <p role="status" aria-live="polite" aria-atomic="true">
              {matches.length} {matches.length === 1 ? "essay" : "essays"}
              {filters.theme
                ? ` · ${writingCategories.find((category) => category.id === filters.theme)?.label}`
                : ""}
              {filters.query.trim() ? ` matching “${filters.query.trim()}”` : ""}
            </p>
            {active ? (
              <button
                type="button"
                className="reading-reset"
                onClick={() => update({ theme: null, query: "" })}
              >
                Clear filters
              </button>
            ) : null}
          </div>
          <div id="reading-results">
            {years.map(({ year, articles }) => (
              <section className="reading-year" key={year} aria-labelledby={`reading-year-${year}`}>
                <h3 id={`reading-year-${year}`}>{year}</h3>
                <ol className="reading-rows">
                  {articles.map((post) => (
                    <li key={post.slug}>
                      <Link
                        className={`reading-row${post.cover ? "" : " reading-row--text"}`}
                        to={`/arsenal/writing/${post.slug}`}
                      >
                        <Cover post={post} />
                        <div className="reading-row__copy">
                          <h4>{post.title}</h4>
                          {post.subtitle || post.description ? (
                            <p className="reading-description">
                              {post.subtitle || post.description}
                            </p>
                          ) : null}
                          <ArticleMeta post={post} />
                          <span className="reading-row__themes">
                            {categoriesFor(post).map((category) => (
                              <span key={category.id}>{category.label}</span>
                            ))}
                          </span>
                        </div>
                        <span className="writing-publication__arrow" aria-hidden="true">
                          ↗
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
            {matches.length === 0 ? (
              <div className="reading-empty">
                <h3>Nothing matched.</h3>
                <p>Try another word or return to all essays.</p>
                <button
                  type="button"
                  className="reading-reset"
                  onClick={() => update({ theme: null, query: "" })}
                >
                  Clear filters
                </button>
              </div>
            ) : null}
          </div>
          {translations.length > 0 ? (
            <aside className="reading-translations" aria-labelledby="reading-translations-title">
              <h3 id="reading-translations-title" className="reading-label">
                Translations
              </h3>
              <ul>
                {translations.map((post) => (
                  <li key={post.slug}>
                    <Link to={`/arsenal/writing/${post.slug}`}>
                      <span lang={post.lang}>{post.lang === "mr" ? "मराठी" : post.lang}</span>
                      <span>{post.title}</span>
                      <span aria-hidden="true">↗</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
          ) : null}
        </section>
      </ReadingReveal>
    </div>
  );
}
