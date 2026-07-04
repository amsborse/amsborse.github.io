import type { LearningCardTopic } from "@/components/learning/LearningInteractiveCard";
import { PatternPortalVisual } from "@/components/learning/patternVisuals";
import { CODING_PATTERNS } from "@/data/codingPatterns";

export const CODING_PATTERN_TOPICS: LearningCardTopic[] = CODING_PATTERNS.map((pattern) => ({
  id: pattern.id,
  title: pattern.title,
  description: pattern.description,
  icon: pattern.icon,
  path: pattern.path,
  status: pattern.path ? "active" : "coming-soon",
  tags: [...pattern.tags, `Time ${pattern.timeComplexity}`, `Space ${pattern.spaceComplexity}`],
  color: pattern.color,
  renderPortalVisual: () => <PatternPortalVisual patternId={pattern.id} color={pattern.color} />,
}));
