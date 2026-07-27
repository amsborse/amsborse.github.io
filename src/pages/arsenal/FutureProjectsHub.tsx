import { FutureProjectsSection } from "@/components/FutureProjectsSection";
import { LearningHubLayout } from "@/components/learning/LearningHubLayout";

export default function FutureProjectsHub() {
  return (
    <LearningHubLayout
      seo={{
        title: "Future Projects — Arsenal",
        description:
          "Roadmap of platform ideas, AI infrastructure concepts, and long-horizon builds ranked by impact and leverage.",
        path: "/arsenal/future-projects",
      }}
      eyebrow="Arsenal // Roadmap"
      title="Future Projects"
      description="Strategic evaluation of potential builds designed for technical depth, leverage, and longevity."
      blobVariant="purple"
    >
      <FutureProjectsSection embedded />
    </LearningHubLayout>
  );
}
