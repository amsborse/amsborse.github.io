import type { ArticleSummary } from "@/utils/loadArticles";
import type { ParsedPost } from "@/utils/markdown";
import { categoriesFor } from "@/utils/writingCatalog";

export function primaryArticleTheme(post: Pick<ParsedPost, "tags" | "collection">) {
  return categoriesFor(post)[0]?.id;
}

function attribute(tag: string, name: string): string | undefined {
  return new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`, "i").exec(tag)?.[2];
}

function addClass(tag: string, name: string): string {
  return /\sclass\s*=/i.test(tag)
    ? tag.replace(/(\sclass\s*=\s*)(["'])(.*?)\2/i, `$1$2$3 ${name}$2`)
    : tag.replace(/\s*\/?>$/, (end) => ` class="${name}"${end}`);
}

/** Presentation classes only: source content, order, captions and image metadata stay intact. */
export function articlePresentation(post: Pick<ParsedPost, "html" | "cover">) {
  let bodyHtml = post.html.replace(/<img\b[^>]*>/gi, (tag) => {
    const width = Number(attribute(tag, "width"));
    const height = Number(attribute(tag, "height"));
    return width > 0 && height / width > 1.4 ? addClass(tag, "article-image--portrait") : tag;
  });
  const firstImage = /<img\b[^>]*>/i.exec(bodyHtml);
  const firstFigure = /<figure\b[^>]*>[\s\S]*?<\/figure>/i.exec(bodyHtml);
  let coverHtml: string | undefined;
  if (
    post.cover &&
    firstImage &&
    firstFigure &&
    firstImage.index >= firstFigure.index &&
    firstImage.index < firstFigure.index + firstFigure[0].length &&
    attribute(firstImage[0], "src")?.replaceAll("&amp;", "&") === post.cover
  ) {
    coverHtml = firstFigure[0].replace(/<img\b[^>]*>/i, (tag) =>
      tag.replace(/\sloading\s*=\s*(["'])lazy\1/i, ' loading="eager"')
    );
    const hidden = firstFigure[0].replace(/<figure\b[^>]*>/i, (tag) =>
      addClass(tag, "article-figure--duplicate")
    );
    bodyHtml =
      bodyHtml.slice(0, firstFigure.index) +
      hidden +
      bodyHtml.slice(firstFigure.index + firstFigure[0].length);
  }
  return { bodyHtml, coverHtml };
}

export function articleTranslations(
  post: Pick<ParsedPost, "slug" | "translationOf">,
  summaries: readonly ArticleSummary[]
) {
  return {
    original: summaries.find((item) => item.slug === post.translationOf),
    translations: summaries.filter((item) => item.translationOf === post.slug),
  };
}

export function articleLanguageLabel(lang: string | undefined) {
  return lang === "mr" ? "मराठी" : lang;
}

/** Progress starts at the body and completes when its bottom reaches the viewport bottom. */
export function articleProgress(top: number, height: number, viewportHeight: number) {
  const distance = height - viewportHeight;
  return distance > 0 ? Math.min(1, Math.max(0, -top / distance)) : top <= 0 ? 1 : 0;
}

export function isReadingShortcut(event: KeyboardEvent) {
  const target = event.target;
  return (
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.repeat &&
    !event.isComposing &&
    !(
      target instanceof Element &&
      target.closest("input, textarea, select, [contenteditable], [role='textbox']")
    )
  );
}
