import { lazy, Suspense } from "react";
import type { Chapter } from "./chapterScenes";
import type { PlateTreatment } from "./registry";

const DesignPlate = lazy(() =>
  import("./DesignPlate").then((module) => ({ default: module.DesignPlate }))
);

/** The design's own plate, loaded only when a non-editorial design is active. */
export function LazyDesignPlate(props: {
  chapter: Chapter;
  treatment: PlateTreatment;
  theme: "dark" | "light";
  className?: string;
}) {
  return (
    <Suspense fallback={null}>
      <DesignPlate {...props} />
    </Suspense>
  );
}
