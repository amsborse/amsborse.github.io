import { useEffect } from "react";
import { useTheme } from "@/theme/ThemeProvider";

const loaders = {
  blueprint: () => import("@/designs/blueprint/effects"),
  broadsheet: () => import("@/designs/broadsheet/effects"),
} as const;

/** Mounts the active design's own interactions; the original design has none. */
export function DesignEffects() {
  const { design } = useTheme();

  useEffect(() => {
    if (design === "editorial") return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    loaders[design]()
      .then((mod) => {
        if (!cancelled) cleanup = mod.mount();
      })
      .catch((error: unknown) => {
        console.error(`[design] could not load ${design} effects`, error);
      });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [design]);

  return null;
}
