import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { RootLayout } from "@/layout/RootLayout";
import Home from "@/pages/Home";

/**
 * Lazy-loaded page chunks — only downloaded when the user navigates to them.
 * Home is eagerly loaded since it's the landing page.
 */
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const Experience = lazy(() => import("@/pages/Experience"));
const Projects = lazy(() => import("@/pages/Projects"));
const Writing = lazy(() => import("@/pages/Writing"));
const Article = lazy(() => import("@/pages/Article"));
const Resume = lazy(() => import("@/pages/Resume"));
const MotionLab = lazy(() => import("@/pages/MotionLab"));
const Algorithms = lazy(() => import("@/pages/Algorithms"));
const NotFoundPage = lazy(() => import("@/pages/NotFound"));

/** Shared loading skeleton for all lazy-loaded pages. */
function PageSkeleton() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-[var(--color-ink-muted)] font-mono tracking-wider">
          Loading…
        </span>
      </div>
    </div>
  );
}

function basename(): string | undefined {
  const base = import.meta.env.BASE_URL ?? "/";
  if (!base || base === "/") return undefined;
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

export default function App() {
  return (
    <BrowserRouter basename={basename()}>
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<Suspense fallback={<PageSkeleton />}><About /></Suspense>} />
          <Route path="experience" element={<Suspense fallback={<PageSkeleton />}><Experience /></Suspense>} />
          <Route path="projects" element={<Suspense fallback={<PageSkeleton />}><Projects /></Suspense>} />
          <Route path="writing" element={<Suspense fallback={<PageSkeleton />}><Writing /></Suspense>} />
          <Route
            path="writing/:slug"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <Article />
              </Suspense>
            }
          />
          <Route path="resume" element={<Suspense fallback={<PageSkeleton />}><Resume /></Suspense>} />
          <Route path="motion" element={<Suspense fallback={<PageSkeleton />}><MotionLab /></Suspense>} />
          <Route path="algorithms" element={<Suspense fallback={<PageSkeleton />}><Algorithms /></Suspense>} />
          <Route path="contact" element={<Suspense fallback={<PageSkeleton />}><Contact /></Suspense>} />
          <Route path="404" element={<Suspense fallback={<PageSkeleton />}><NotFoundPage /></Suspense>} />
          <Route path="*" element={<Suspense fallback={<PageSkeleton />}><NotFoundPage /></Suspense>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
