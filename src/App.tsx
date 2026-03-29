import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { RootLayout } from "@/layout/RootLayout";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Experience from "@/pages/Experience";
import Home from "@/pages/Home";
import NotFoundPage from "@/pages/NotFound";
import Projects from "@/pages/Projects";
import Resume from "@/pages/Resume";
import Writing from "@/pages/Writing";

const Article = lazy(() => import("@/pages/Article"));

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
          <Route path="about" element={<About />} />
          <Route path="experience" element={<Experience />} />
          <Route path="projects" element={<Projects />} />
          <Route path="writing" element={<Writing />} />
          <Route
            path="writing/:slug"
            element={
              <Suspense
                fallback={
                  <div className="flex min-h-[50vh] items-center justify-center text-sm text-[var(--color-ink-muted)]">
                    Loading article…
                  </div>
                }
              >
                <Article />
              </Suspense>
            }
          />
          <Route path="resume" element={<Resume />} />
          <Route path="contact" element={<Contact />} />
          <Route path="404" element={<NotFoundPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
