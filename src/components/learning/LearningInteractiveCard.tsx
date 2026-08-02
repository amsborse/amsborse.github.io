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
  viewStyle = "glass",
}: {
  topic: LearningCardTopic;
  index: number;
  viewStyle?: "glass" | "nodes" | "weave";
}) {
  return (
    <HubInteractiveCard
      {...topic}
      index={index}
      viewStyle={viewStyle}
      status={topic.status as InteractiveCardStatus}
    />
  );
}
