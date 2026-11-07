import { Html } from "@react-three/drei";
import { ORBITS } from "../topology";

const anchors = [
  { id: "ingestion", side: "right", position: [-2.65, 2.28, 0] as [number, number, number] },
  { id: "processing", side: "left", position: [2.65, 2.02, -0.05] as [number, number, number] },
  { id: "persistence", side: "left", position: [2.7, -0.12, 0.05] as [number, number, number] },
];

export function Callouts() {
  return (
    <group position={[0, 1.12, 0]}>
      {anchors.map(({ id, position, side }) => {
        const orbit = ORBITS.find((candidate) => candidate.id === id);
        if (!orbit) return null;
        return (
          <Html key={id} position={position} center={false} style={{ pointerEvents: "none" }}>
            <div className={`hero-callout hero-callout-${side}`}>
              <strong>{orbit.label}</strong>
              <span>{orbit.meaning}</span>
            </div>
          </Html>
        );
      })}
    </group>
  );
}
