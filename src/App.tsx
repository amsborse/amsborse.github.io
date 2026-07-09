import { lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { RootLayout } from "@/layout/RootLayout";
import Home from "@/pages/Home";

const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const Experience = lazy(() => import("@/pages/Experience"));
const Projects = lazy(() => import("@/pages/Projects"));
const Writing = lazy(() => import("@/pages/Writing"));
const Article = lazy(() => import("@/pages/Article"));
const Resume = lazy(() => import("@/pages/Resume"));
const MotionLab = lazy(() => import("@/pages/MotionLab"));
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
const AetherLab = lazy(() => import("@/pages/AetherLab"));
const NotFoundPage = lazy(() => import("@/pages/NotFound"));

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
          <Route path="writing/:slug" element={<Article />} />
          <Route path="resume" element={<Resume />} />
          <Route path="motion" element={<MotionLab />} />
          <Route path="learning" element={<Learning />} />
          <Route path="learning/coding-patterns" element={<CodingPatterns />} />
          <Route path="learning/coding-patterns/sliding-window" element={<SlidingWindow />} />
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
          <Route path="algorithm" element={<Algorithms />} />
          <Route path="aether-lab" element={<AetherLab />} />
          <Route path="contact" element={<Contact />} />
          <Route path="404" element={<NotFoundPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
