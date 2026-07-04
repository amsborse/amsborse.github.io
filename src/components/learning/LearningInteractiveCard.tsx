import { ReactNode } from "react";
import {
  HubInteractiveCard,
  type HubCardProps,
  type InteractiveCardStatus,
} from "@/components/InteractiveCard";

export type LearningCardTopic = HubCardProps & {
  status: "active" | "coming-soon";
  renderPortalVisual: () => ReactNode;
};

export function LearningInteractiveCard({
  topic,
  index,
}: {
  topic: LearningCardTopic;
  index: number;
}) {
  return (
    <HubInteractiveCard {...topic} index={index} status={topic.status as InteractiveCardStatus} />
  );
}
