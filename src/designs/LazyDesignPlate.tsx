import { lazy, Suspense } from "react";
import type { SiteDesign } from "@/theme/design";

const DesignPlate = lazy(() =>
  import("./DesignPlate").then((module) => ({ default: module.DesignPlate }))
);

/** The design's redrawn plate, loaded only when a non-editorial design is active. */
export function LazyDesignPlate(props: {
  src: string;
  design: Exclude<SiteDesign, "editorial">;
  theme: "dark" | "light";
  className?: string;
}) {
  return (
    <Suspense fallback={null}>
      <DesignPlate {...props} />
    </Suspense>
  );
}
