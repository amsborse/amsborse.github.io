import { Seo } from "@/components/Seo";
import { SelectedWork } from "@/components/SelectedWork";
import { Facets } from "@/components/Facets";
import { experience } from "@/data";
import { HeroSection } from "@/components/hero/HeroSection";
import { ChapterRail } from "@/components/home/ChapterRail";
import { ContactChapter } from "@/components/home/ContactChapter";
import { DepthChapter } from "@/components/home/DepthChapter";
import { ExperienceChapter } from "@/components/home/ExperienceChapter";
import { HorizonInterlude } from "@/components/home/HorizonInterlude";
import { WritingChapter } from "@/components/home/WritingChapter";
import "@/components/home/home-story.css";

const microsoft = experience.find((entry) => entry.id === "microsoft");
const proofPoints = [
  {
    value: microsoft?.achievements.find((achievement) => achievement.includes("237K+"))
      ? "237K+"
      : null,
    label: "AI agents governed",
  },
  {
    value: microsoft?.achievements.find((achievement) => achievement.includes("28 Azure regions"))
      ? "28"
      : null,
    label: "Azure regions",
  },
  {
    value: microsoft?.achievements.find((achievement) => achievement.includes("135K+"))
      ? "135K+"
      : null,
    label: "signals / day",
  },
].filter((point): point is { value: string; label: string } => point.value !== null);

export default function Home() {
  return (
    <>
      <Seo
        title="Akshay Borse — Senior Software Engineer"
        description="Akshay Borse is a Senior Software Engineer at Microsoft building enterprise AI governance and risk-detection systems, alongside independent product and interface work."
        path="/"
      />

      <div className="home-page relative w-full selection:bg-[var(--color-accent-soft)]">
        <div id="introduction">
          <HeroSection proofPoints={proofPoints} />

          <HorizonInterlude />
        </div>

        <ExperienceChapter />

        <section id="work" aria-label="Projects">
          <SelectedWork />
        </section>

        <DepthChapter />
        <WritingChapter />
        <Facets />
        <ContactChapter />
        <ChapterRail />
      </div>
    </>
  );
}
