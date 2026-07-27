import { MorphingSphere } from "@/components/MorphingSphere";
import { ArsenalLabShell } from "@/components/arsenal/ArsenalLabShell";

export default function CelestialGridLab() {
  return (
    <ArsenalLabShell
      seo={{
        title: "Celestial Grid — Arsenal",
        description:
          "Drag to rotate a projected node mesh and morph between sphere, torus, wave, and galaxy maps.",
        path: "/arsenal/celestial-grid",
      }}
      backLink={{ to: "/arsenal", label: "← Arsenal" }}
      eyebrow="3D Node Mesh // Projection"
      title="Celestial Grid"
      subtitle="Hover and drag to rotate the matrix. Toggle shapes below to morph between coordinate maps."
    >
      <div className="flex min-h-[480px] flex-col rounded-2xl border border-white/5 bg-[#0b0c13]/55 p-6">
        <div className="relative flex flex-1 items-center justify-center min-h-[400px]">
          <MorphingSphere />
        </div>
      </div>
    </ArsenalLabShell>
  );
}
