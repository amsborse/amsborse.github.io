import { LearningInteractiveCard } from "@/components/learning/LearningInteractiveCard";
import { LearningHubLayout } from "@/components/learning/LearningHubLayout";
import { HUB_CARD_GRID } from "@/components/InteractiveCard";
import { ARSENAL_HUB_SECTIONS } from "@/data/arsenalTopics";

export default function Arsenal() {
  return (
    <LearningHubLayout
      seo={{
        title: "Arsenal — Akshay Borse",
        description:
          "Writing archive, project roadmap, algorithm visualizer, and interactive visual labs.",
        path: "/arsenal",
      }}
      eyebrow="Extended Portfolio // Not in main nav"
      title="Arsenal"
      description="Everything beyond the core portfolio — essays, experiments, roadmaps, and visual sandboxes."
      blobVariant="purple"
    >
      <div className={HUB_CARD_GRID}>
        {ARSENAL_HUB_SECTIONS.map((topic, index) => (
          <LearningInteractiveCard key={topic.id} topic={topic} index={index} />
        ))}
      </div>
    </LearningHubLayout>
  );
}
