import { useEffect } from "react";
import { designById } from "@/designs/registry";
import { useTheme } from "@/theme/ThemeProvider";

/** Mounts the active design's own interactions, as declared in the design registry. */
export function DesignEffects() {
  const { design } = useTheme();

  useEffect(() => {
    const load = designById(design).effects;
    if (!load) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    load()
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
