import React from "react";

export function ShowcaseCard({ title }: { title: string }) {
  return (
    <article data-testid="showcase-card" className="showcase-card">
      <h2>{title}</h2>
      <p data-testid="showcase-blurb">Scoped autoreview fixture</p>
      <button type="button" data-testid="showcase-open">
        Open
      </button>
    </article>
  );
}
