import { lazy, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { trackPageview } from "@/experiments/client";
import { RootLayout } from "@/layout/RootLayout";
import Home from "@/pages/Home";

const About = lazy(() => import("@/pages/About"));
const Experience = lazy(() => import("@/pages/Experience"));
const Projects = lazy(() => import("@/pages/Projects"));
const Writing = lazy(() => import("@/pages/Writing"));
const Article = lazy(() => import("@/pages/Article"));
const Resume = lazy(() => import("@/pages/Resume"));
const Algorithms = lazy(() => import("@/pages/Algorithms"));
const Learning = lazy(() => import("@/pages/Learning"));
const CodingPatterns = lazy(() => import("@/pages/CodingPatterns"));
const LearningAlgorithmHub = lazy(() => import("@/pages/LearningAlgorithmHub"));
const SlidingWindow = lazy(() => import("@/pages/learning-algorithms/SlidingWindow"));
const AlgorithmSearch = lazy(() => import("@/pages/learning-algorithms/AlgorithmSearch"));
const AlgorithmGraph = lazy(() => import("@/pages/learning-algorithms/AlgorithmGraph"));
const AlgorithmDP = lazy(() => import("@/pages/learning-algorithms/AlgorithmDP"));
const AlgorithmGreedy = lazy(() => import("@/pages/learning-algorithms/AlgorithmGreedy"));
const AlgorithmTrees = lazy(() => import("@/pages/learning-algorithms/AlgorithmTrees"));
const SystemDesignConcepts = lazy(() => import("@/pages/learning-algorithms/SystemDesignConcepts"));
const ConsistencyModels = lazy(() => import("@/pages/learning-algorithms/ConsistencyModels"));
const LoadBalancing = lazy(() => import("@/pages/learning-algorithms/LoadBalancing"));
const CachingStrategies = lazy(() => import("@/pages/learning-algorithms/CachingStrategies"));
const DatabaseSharding = lazy(() => import("@/pages/learning-algorithms/DatabaseSharding"));
const ContentDeliveryNetwork = lazy(
  () => import("@/pages/learning-algorithms/ContentDeliveryNetwork")
);
const Arsenal = lazy(() => import("@/pages/Arsenal"));
const FutureProjectsHub = lazy(() => import("@/pages/arsenal/FutureProjectsHub"));
const CelestialGridLab = lazy(() => import("@/pages/arsenal/CelestialGridLab"));
const ParticleCoreLab = lazy(() => import("@/pages/arsenal/ParticleCoreLab"));
const AnomalyMatrixLab = lazy(() => import("@/pages/arsenal/AnomalyMatrixLab"));
const GravityWellLab = lazy(() => import("@/pages/arsenal/GravityWellLab"));
const QuantumMeshLab = lazy(() => import("@/pages/arsenal/QuantumMeshLab"));
const FlashcardsDeck = lazy(() => import("@/pages/FlashcardsDeck"));
const NotFoundPage = lazy(() => import("@/pages/NotFound"));
const Experiments = lazy(() => import("@/pages/Experiments"));

/** Counts each route as a page view for the design experiment (a no-op when not measuring). */
function ExperimentPageviews() {
  const { pathname } = useLocation();
  useEffect(() => trackPageview(window.location.pathname), [pathname]);
  return null;
}

/**
 * A redirect that holds a screen of height for the frame before it lands, so the footer never
 * flashes into view and then jumps away (that jump was a 0.17 layout shift on /arsenal).
 */
function Redirect({ to }: { to: string }) {
  return (
    <>
      <Navigate to={to} replace />
      <div className="min-h-[100svh]" aria-hidden />
    </>
  );
}

function WritingSlugRedirect() {
  const { slug } = useParams();
  return <Redirect to={`/arsenal/writing/${slug ?? ""}`} />;
}

function basename(): string | undefined {
  const base = import.meta.env.BASE_URL ?? "/";
  if (!base || base === "/") return undefined;
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

export default function App() {
  return (
    <BrowserRouter basename={basename()}>
      <ExperimentPageviews />
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="experience" element={<Experience />} />
          <Route path="projects" element={<Projects />} />
          <Route path="resume" element={<Resume />} />
          <Route path="learning" element={<Learning />} />
          <Route path="learning/coding-patterns" element={<CodingPatterns />} />
          <Route path="learning/coding-patterns/sliding-window" element={<SlidingWindow />} />
          <Route
            path="learning/coding-patterns/sliding-window/:problemId"
            element={<SlidingWindow />}
          />
          <Route path="learning/system-design-concepts" element={<SystemDesignConcepts />} />
          <Route
            path="learning/system-design-concepts/consistency"
            element={<ConsistencyModels />}
          />
          <Route
            path="learning/system-design-concepts/load-balancing"
            element={<LoadBalancing />}
          />
          <Route path="learning/system-design-concepts/caching" element={<CachingStrategies />} />
          <Route
            path="learning/system-design-concepts/database-sharding"
            element={<DatabaseSharding />}
          />
          <Route path="learning/system-design-concepts/cdn" element={<ContentDeliveryNetwork />} />
          <Route path="learning/algorithm" element={<LearningAlgorithmHub />} />
          <Route path="learning/algorithm/search" element={<AlgorithmSearch />} />
          <Route path="learning/algorithm/graph" element={<AlgorithmGraph />} />
          <Route path="learning/algorithm/dp" element={<AlgorithmDP />} />
          <Route path="learning/algorithm/greedy" element={<AlgorithmGreedy />} />
          <Route path="learning/algorithm/trees" element={<AlgorithmTrees />} />

          <Route path="arsenal" element={<Redirect to="/projects" />} />
          <Route path="arsenal/writing" element={<Writing />} />
          <Route path="arsenal/writing/:slug" element={<Article />} />
          <Route path="arsenal/future-projects" element={<FutureProjectsHub />} />
          <Route path="arsenal/algorithm" element={<Algorithms />} />
          <Route path="arsenal/celestial-grid" element={<CelestialGridLab />} />
          <Route path="arsenal/particle-core" element={<ParticleCoreLab />} />
          <Route path="arsenal/anomaly-matrix" element={<AnomalyMatrixLab />} />
          <Route path="arsenal/gravity-well" element={<GravityWellLab />} />
          <Route path="arsenal/quantum-mesh" element={<QuantumMeshLab />} />

          <Route path="writing" element={<Redirect to="/arsenal/writing" />} />
          <Route path="writing/:slug" element={<WritingSlugRedirect />} />
          <Route path="contact" element={<Redirect to="/about#contact" />} />
          <Route path="algorithm" element={<Redirect to="/arsenal/algorithm" />} />
          <Route path="motion" element={<Redirect to="/arsenal/celestial-grid" />} />
          <Route path="aether-lab" element={<Redirect to="/arsenal" />} />

          <Route path="learning/flashcards/:deckId" element={<FlashcardsDeck />} />
          <Route path="experiments" element={<Experiments />} />
          <Route path="404" element={<NotFoundPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
