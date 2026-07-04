import { LearningInteractiveCard } from "@/components/learning/LearningInteractiveCard";
import { LearningHubLayout } from "@/components/learning/LearningHubLayout";
import { HUB_CARD_GRID } from "@/components/InteractiveCard";
import { ALGORITHM_CATEGORIES } from "@/data/algorithmCategories";

export default function LearningAlgorithmHub() {
  return (
    <LearningHubLayout
      seo={{
        title: "Algorithm Sandboxes — Learning Lab",
        description:
          "Interactive visualizations for sorting, search, graphs, dynamic programming, greedy methods, and tree structures.",
        path: "/learning/algorithm",
      }}
      backLink={{ to: "/learning", label: "← Learning Lab" }}
      eyebrow="CS Fundamentals // Visualized"
      title="Algorithm Visualizer Hub"
      description="Pick a category to launch an interactive sandbox. Sorting opens the full multi-theme visualizer; each other card runs a focused simulation you can step through."
      headerMb="mb-16"
    >
      <div className={HUB_CARD_GRID}>
        {ALGORITHM_CATEGORIES.map((topic, index) => (
          <LearningInteractiveCard key={topic.id} topic={topic} index={index} />
        ))}
      </div>
    </LearningHubLayout>
  );
}
