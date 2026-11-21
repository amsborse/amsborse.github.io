import { useEffect, useLayoutEffect, useRef } from "react";
import { usePrefersReducedMotion } from "./usePlateMotion";
import type { LifeRenderer } from "./plateLife";
import type { PlateName, PlateTheme } from "./plateLifeMaps";
import "./plate-life.css";

let errorReported = false;
function reportError(error: unknown) {
  if (errorReported) return;
  errorReported = true;
  console.error("Plate life: keeping the still image", error);
}

/** Small shared still-first view. Its renderer, shader and maps enter the app only after decode,
 * intersection and idle. The canvas shares the image's transformed/masked parent, so pointer
 * lean is applied once to both. Instrumentation counts actual draws for browser verification. */
export function LivingPlate({
  name,
  theme,
  imageClassName,
  loading,
}: {
  name: PlateName;
  theme: PlateTheme;
  imageClassName?: string;
  loading?: "lazy" | "eager";
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const refreshRef = useRef<() => void>(() => {});
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const still = usePrefersReducedMotion();
  const base = `${import.meta.env.BASE_URL}assets/cinematic/${name}/${name}-${theme}`;

  useEffect(() => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (still || !image || !canvas) return;
    let renderer: LifeRenderer | null = null;
    let governor: ReturnType<typeof import("./plateLife").createLifeGovernor> | null = null;
    let disposed = false;
    let failed = false;
    let visible = false;
    let uploaded = false;
    let preparing = false;
    let generation = 0;
    let raf = 0;
    let idle = 0;
    let lastDraw = -Infinity;
    let source = "";
    let dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth <= 720 ? 1 : 1.5);
    let degraded = false;
    let frames = 0;
    canvas.dataset.state = "waiting";
    canvas.dataset.frames = "0";
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      lastDraw = -Infinity;
      governor?.reset();
    };
    const fail = (error: unknown) => {
      failed = true;
      uploaded = false;
      stop();
      canvas.dataset.ready = "false";
      canvas.dataset.state = "fallback";
      renderer?.dispose();
      renderer = null;
      reportError(error);
    };
    const resize = () => {
      if (!uploaded || !renderer) return;
      const { width, height } = image.getBoundingClientRect();
      if (width && height) {
        const cap = Math.min(window.devicePixelRatio || 1, window.innerWidth <= 720 ? 1 : 1.5);
        if (!degraded) dpr = cap;
        else dpr = Math.min(dpr, cap);
        if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr))
          canvas.dataset.ready = "false";
        renderer.resize(width, height, dpr, getComputedStyle(image).objectPosition);
        canvas.dataset.dpr = String(dpr);
      }
    };
    const allowed = () => visible && !document.hidden && uploaded && !disposed && !failed;
    const tick = (now: number) => {
      raf = 0;
      if (!allowed()) return;
      if (governor?.record(now)) {
        if (degraded) {
          uploaded = false;
          canvas.dataset.ready = "false";
          canvas.dataset.state = "still-slow";
          failed = true;
          renderer?.dispose();
          renderer = null;
          return;
        }
        degraded = true;
        dpr = Math.min(dpr * 0.65, 0.9);
        governor.reset();
        resize();
      }
      // Keep the phase remainder, avoiding a 60Hz rounding mismatch that produces 20fps.
      const elapsed = now - lastDraw;
      if (elapsed >= 1000 / 30 - 0.5) {
        try {
          renderer?.draw(now / 1000);
        } catch (error) {
          fail(error);
          return;
        }
        lastDraw = Number.isFinite(elapsed) ? now - (elapsed % (1000 / 30)) : now;
        canvas.dataset.frames = String(++frames);
        canvas.dataset.ready = "true";
        canvas.dataset.state = "running";
      }
      raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!raf && allowed()) raf = requestAnimationFrame(tick);
    };
    const cancelIdle = () => {
      if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      idle = 0;
    };
    const prepare = () => {
      if (
        disposed ||
        failed ||
        !visible ||
        document.hidden ||
        preparing ||
        uploaded ||
        !image.complete ||
        !image.naturalWidth ||
        !image.currentSrc.includes(`${name}-${themeRef.current}`)
      )
        return;
      preparing = true;
      const ticket = generation;
      const nextTheme = themeRef.current;
      const current = () =>
        !disposed && !failed && ticket === generation && nextTheme === themeRef.current;
      void image
        .decode()
        .then(() => {
          if (!current()) return;
          const nextSource = image.currentSrc;
          const upgrade = () => {
            idle = 0;
            if (!current()) return;
            if (!visible || document.hidden) {
              preparing = false;
              return;
            }
            void import("./plateLife")
              .then((module) => {
                if (!current()) return;
                preparing = false;
                if (!visible || document.hidden || image.currentSrc !== nextSource) return;
                try {
                  renderer ??= module.createLifeRenderer(canvas);
                  governor ??= module.createLifeGovernor();
                  renderer.setImage(image, name, nextTheme);
                  source = nextSource;
                  uploaded = true;
                  resize();
                  kick();
                } catch (error) {
                  fail(error);
                }
              })
              .catch((error) => {
                if (current()) fail(error);
              });
          };
          if (typeof window.requestIdleCallback === "function")
            idle = window.requestIdleCallback(upgrade, { timeout: 1500 });
          else idle = window.setTimeout(upgrade, 100);
        })
        .catch((error) => {
          if (current()) {
            preparing = false;
            fail(error);
          }
        });
    };
    const refresh = () => {
      generation++;
      cancelIdle();
      preparing = false;
      uploaded = false;
      canvas.dataset.ready = "false";
      stop();
      prepare();
    };
    refreshRef.current = refresh;
    const onLoad = () => {
      if (image.currentSrc !== source) refresh();
    };
    const sync = () => {
      if (visible && !document.hidden) {
        prepare();
        kick();
      } else {
        stop();
        canvas.dataset.state = "paused";
      }
    };
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    intersection.observe(canvas.closest("section") ?? image);
    const observer = new ResizeObserver(() => {
      if (uploaded && image.currentSrc !== source) refresh();
      else resize();
    });
    observer.observe(image);
    const onLost = (event: Event) => {
      if (disposed || failed) return;
      event.preventDefault();
      fail(new Error("Plate life: WebGL context lost"));
    };
    image.addEventListener("load", onLoad);
    document.addEventListener("visibilitychange", sync);
    canvas.addEventListener("webglcontextlost", onLost);
    return () => {
      disposed = true;
      generation++;
      cancelIdle();
      stop();
      intersection.disconnect();
      observer.disconnect();
      image.removeEventListener("load", onLoad);
      document.removeEventListener("visibilitychange", sync);
      canvas.removeEventListener("webglcontextlost", onLost);
      renderer?.dispose();
      refreshRef.current = () => {};
    };
  }, [name, still]);

  // Do not recreate the context when the source/theme changes. Hide the old composition
  // immediately, then re-upload only after the new responsive source has decoded.
  useLayoutEffect(() => {
    refreshRef.current();
  }, [theme]);

  return (
    <>
      <picture>
        <source media="(max-width: 720px)" srcSet={`${base}-960.webp`} />
        <img
          ref={imageRef}
          className={imageClassName}
          src={`${base}.webp`}
          alt=""
          width={1672}
          height={941}
          loading={loading}
          decoding="async"
          fetchPriority={loading === "lazy" ? "auto" : "high"}
        />
      </picture>
      {!still && (
        <canvas ref={canvasRef} className="plate-life" data-plate={name} aria-hidden="true" />
      )}
    </>
  );
}
