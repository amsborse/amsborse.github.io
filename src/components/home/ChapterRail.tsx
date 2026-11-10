import { ChapterRail as Rail } from "@/components/ChapterRail";
import { homeChapters } from "./chapters";

/** The home page's six chapters on the shared rail. */
export function ChapterRail() {
  return <Rail chapters={homeChapters} />;
}
