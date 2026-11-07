import { useEffect, useRef, useState, type RefObject } from "react";

/** What a hero's WebGPU scene offers the page that shows it. */
export interface GpuScene {
  /** Starts the frame loop; a no-op while it is running. */
  start(): void;
  /** Stops the frame loop and keeps the last frame on screen. */
  stop(): void;
  /** Draws one frame without starting the loop. */
  still(): void;
  /** Settles if the GPU device is lost or errs; the page then goes static. */
  readonly lost: Promise<void>;
  dispose(): void;
}

/**
 * The life of a hero's WebGPU scene (#402, #462), shared by every hero that has one. The scene
 * exists only while motion is allowed, and its code loads only when it will run. A canvas has one
 * GPU context, so a scene is created only after the previous one is disposed. The static art is the
 * immediate baseline and stays visible through `pending` (adapter/device/pipeline setup); the page
 * never waits on WebGPU to show something useful (#perf-progressive-first-paint). `pending` gives up
 * after three seconds, same as a scene that fails or is lost, and the static art keeps showing.
 * Reaching `gpu` crossfades the canvas over the static art rather than replacing an empty gap. The
 * scene runs only while `watch` is on screen in a visible tab and `active` says there is something
 * to show; a quiet scene draws one still frame. `watch` carries `data-running` for tests.
 */
export function useGpuScene<S extends GpuScene>(
  canvas: RefObject<HTMLCanvasElement | null>,
  watch: RefObject<HTMLElement | null>,
  create: ((canvas: HTMLCanvasElement, small: boolean) => Promise<S>) | undefined,
  active = true,
  enabled = true,
  backend: "webgpu" | "webgl" = "webgpu"
) {
  const scene = useRef<S | null>(null);
  const creation = useRef<Promise<unknown>>(Promise.resolve());
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const [ready, setReady] = useState(false);
  const supported = backend === "webgl" ? "WebGLRenderingContext" in window : "gpu" in navigator;
  const [waiting, setWaiting] = useState(() => enabled && !!create && supported && !reduced);

  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(motion.matches);
    motion.addEventListener("change", sync);
    return () => motion.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!enabled || !create || reduced || !supported || !canvas.current) return;
    const element = canvas.current;
    let cancelled = false;
    let created: S | null = null;
    const small = matchMedia("(max-width: 48rem), (pointer: coarse)").matches;
    setWaiting(true);
    const giveUp = setTimeout(() => setWaiting(false), 3000);
    const run = creation.current
      .then(() => (cancelled ? null : create(element, small)))
      .then((next) => {
        if (!next) return;
        if (cancelled) return next.dispose();
        created = next;
        scene.current = next;
        setReady(true);
        setWaiting(false);
        void next.lost.then(() => {
          if (scene.current === next) {
            scene.current = null;
            setReady(false);
          }
        });
      })
      .catch(() => {
        // No adapter, blocked GPU or a failed pipeline: show the static art.
        setWaiting(false);
      });
    creation.current = run;
    return () => {
      cancelled = true;
      clearTimeout(giveUp);
      setWaiting(false);
      created?.dispose();
      scene.current = null;
      setReady(false);
    };
    // `create` is stable: rebuild only when the motion/capability gate changes.
  }, [reduced, enabled, supported, backend]);

  useEffect(() => {
    const element = watch.current!;
    let visible = false;
    const sync = () => {
      const running = ready && visible && !document.hidden && active;
      element.dataset.running = String(running);
      const current = scene.current;
      if (!current) return;
      if (running) current.start();
      else if (visible && !document.hidden) current.still();
      else current.stop();
    };
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) => {
            visible = entry?.isIntersecting ?? false;
            sync();
          });
    observer?.observe(element);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", sync);
      scene.current?.stop();
    };
  }, [ready, active, watch]);

  return {
    scene,
    ready,
    renderer:
      !enabled || !create
        ? ("static" as const)
        : ready
          ? ("gpu" as const)
          : waiting
            ? ("pending" as const)
            : ("static" as const),
  };
}
