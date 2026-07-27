import { ParticleCore } from "@/components/canvas/ParticleCore";
import { ArsenalLabShell } from "@/components/arsenal/ArsenalLabShell";

export default function ParticleCoreLab() {
  return (
    <ArsenalLabShell
      seo={{
        title: "Particle Core — Arsenal",
        description:
          "Ignite spark bursts with gravity, wall bounce, and exponential fade in a kinetic emitter sandbox.",
        path: "/arsenal/particle-core",
      }}
      backLink={{ to: "/arsenal", label: "← Arsenal" }}
      eyebrow="System Parameter // Emitter"
      title="Particle Core"
      subtitle="Release energy waves and watch sparks simulate gravity, velocity, and decay."
      maxWidth="max-w-3xl"
    >
      <ParticleCore />
    </ArsenalLabShell>
  );
}
