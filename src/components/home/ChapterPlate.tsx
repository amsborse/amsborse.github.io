import { useDocumentTheme } from "@/components/stage/PageStage";
import { LivingPlate } from "@/components/stage/LivingPlate";

type PlateName = "horizon" | "contact";

/** A generated art plate behind a chapter: decorative, theme-aware and lazy. */
export function ChapterPlate({ name, className }: { name: PlateName; className: string }) {
  const theme = useDocumentTheme();
  return (
    <div className={className} aria-hidden="true">
      <LivingPlate name={name} theme={theme} loading="lazy" />
    </div>
  );
}
