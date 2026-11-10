import { Link } from "react-router-dom";
import type { ParsedPost } from "@/utils/markdown";
import { formatArticleDate } from "@/components/writing/formatArticleDate";

type WritingPublicationProps = { posts: ParsedPost[] };

function newestFirst(posts: ParsedPost[]): ParsedPost[] {
  return [...posts].sort((a, b) => b.date.localeCompare(a.date));
}

export function WritingPublication({ posts }: WritingPublicationProps) {
  const lead = newestFirst(posts.filter((post) => post.featured))[0];
  const contents = posts.filter((post) => post.slug !== lead?.slug);

  return (
    <div className="writing-publication">
      {lead ? (
        <section className="writing-feature" aria-labelledby="writing-feature-title">
          <p className="writing-feature__eyebrow">Featured essay</p>
          <h2 id="writing-feature-title" className="writing-feature__title">
            {lead.title}
          </h2>
          <p className="writing-feature__description">{lead.description}</p>
          <p className="writing-publication__meta">
            <time dateTime={lead.date}>{formatArticleDate(lead.date)}</time>
            <span aria-hidden="true"> · </span>
            <span>{lead.readingMinutes} min read</span>
            {lead.tags.length > 0 ? (
              <>
                <span aria-hidden="true"> · </span>
                <span>{lead.tags.join(", ")}</span>
              </>
            ) : null}
          </p>
          <Link className="writing-feature__action" to={`/arsenal/writing/${lead.slug}`}>
            <span>Read essay</span>
            <span className="writing-publication__arrow" aria-hidden="true">
              →
            </span>
          </Link>
        </section>
      ) : null}

      {contents.length > 0 ? (
        <section className="writing-contents" aria-labelledby="writing-contents-title">
          <h2 id="writing-contents-title" className="writing-contents__heading">
            Contents
          </h2>
          <ol className="writing-contents__list">
            {contents.map((post, index) => (
              <li key={post.slug}>
                <Link className="writing-contents__link" to={`/arsenal/writing/${post.slug}`}>
                  <span className="writing-contents__number" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="writing-contents__copy">
                    <span className="writing-contents__title">{post.title}</span>
                    <span className="writing-contents__description">{post.description}</span>
                    <span className="writing-publication__meta">
                      <time dateTime={post.date}>{formatArticleDate(post.date)}</time>
                      <span aria-hidden="true"> · </span>
                      <span>{post.readingMinutes} min read</span>
                    </span>
                    {post.tags.length > 0 ? (
                      <span className="writing-contents__tags">{post.tags.join(", ")}</span>
                    ) : null}
                  </span>
                  <span className="writing-publication__arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
