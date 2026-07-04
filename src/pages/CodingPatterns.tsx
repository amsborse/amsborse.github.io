import { useMemo, useState } from "react";
import { LearningInteractiveCard } from "@/components/learning/LearningInteractiveCard";
import { LearningHubLayout } from "@/components/learning/LearningHubLayout";
import { HUB_CARD_GRID } from "@/components/InteractiveCard";
import { CODING_PATTERN_TOPICS } from "@/data/codingPatternTopics";

export default function CodingPatterns() {
  const [search, setSearch] = useState("");

  const filteredTopics = useMemo(
    () =>
      CODING_PATTERN_TOPICS.filter(
        (topic) =>
          topic.title.toLowerCase().includes(search.toLowerCase()) ||
          topic.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))
      ),
    [search]
  );

  return (
    <LearningHubLayout
      seo={{
        title: "Coding Patterns — Learning Lab",
        description:
          "Cracking the coding interview: 15 essential algorithms and pointer structures evaluated with real-world problems.",
        path: "/learning/coding-patterns",
      }}
      backLink={{ to: "/learning", label: "← Learning Lab" }}
      blobVariant="blue"
      eyebrow="Interview Toolkit"
      title="Coding Patterns Hub"
      description="Every coding interview question stems from one of these core algorithmic patterns. Master the patterns to recognize solution architectures instantly."
      headerMb="mb-16"
      toolbar={
        <div className="max-w-md mx-auto mb-16">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patterns (e.g. DFS, Two Heaps)..."
              className="w-full px-5 py-3 rounded-xl bg-white/[0.02] border border-white/10 text-sm text-[var(--color-ink)] placeholder-slate-500 focus:outline-none focus:border-[var(--color-accent)]/50 transition-all font-mono"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white font-mono text-xs"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      }
    >
      {filteredTopics.length === 0 ? (
        <p className="text-center text-slate-500 font-mono text-sm">
          No patterns match your search query.
        </p>
      ) : (
        <div className={HUB_CARD_GRID}>
          {filteredTopics.map((topic, index) => (
            <LearningInteractiveCard key={topic.id} topic={topic} index={index} />
          ))}
        </div>
      )}
    </LearningHubLayout>
  );
}
