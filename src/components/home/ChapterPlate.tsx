import { useDocumentTheme } from "@/components/stage/PageStage";
import { LazyDesignPlate } from "@/designs/LazyDesignPlate";
import { useDocumentDesign } from "@/theme/useDocumentDesign";

type PlateName = "horizon" | "contact";

/** A generated art plate behind a chapter: decorative, theme-aware and lazy. */
export function ChapterPlate({ name, className }: { name: PlateName; className: string }) {
  const theme = useDocumentTheme();
  const design = useDocumentDesign();
  const base = `${import.meta.env.BASE_URL}assets/cinematic/${name}/${name}-${theme}`;
  if (design !== "editorial") {
    return (
      <div className={className} aria-hidden="true">
        <LazyDesignPlate src={`${base}.webp`} design={design} theme={theme} />
      </div>
    );
  }
  return (
    <picture key={theme} className={className} aria-hidden="true">
      <source media="(max-width: 720px)" srcSet={`${base}-960.webp`} />
      <img src={`${base}.webp`} alt="" width={1672} height={941} loading="lazy" decoding="async" />
    </picture>
  );
}
