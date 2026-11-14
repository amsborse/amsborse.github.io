import { lazy, Suspense } from "react";
import type { PlateTreatment } from "./registry";

const DesignPlate = lazy(() =>
  import("./DesignPlate").then((module) => ({ default: module.DesignPlate }))
);

/** The design's redrawn plate, loaded only when a non-editorial design is active. */
export function LazyDesignPlate(props: {
  src: string;
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
