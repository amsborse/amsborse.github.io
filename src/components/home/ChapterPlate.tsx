import { useDocumentTheme } from "@/components/stage/PageStage";

type PlateName = "horizon" | "contact";

/** A generated art plate behind a chapter: decorative, theme-aware and lazy. */
export function ChapterPlate({ name, className }: { name: PlateName; className: string }) {
  const theme = useDocumentTheme();
  const base = `${import.meta.env.BASE_URL}assets/cinematic/${name}/${name}-${theme}`;
  return (
    <picture key={theme} className={className} aria-hidden="true">
      <source media="(max-width: 720px)" srcSet={`${base}-960.webp`} />
      <img src={`${base}.webp`} alt="" width={1672} height={941} loading="lazy" decoding="async" />
    </picture>
  );
}
