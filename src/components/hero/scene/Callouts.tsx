import { useMemo } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { ORBITS, type ServiceId } from "../topology";
import { servicePosition } from "../layout";

const SERVICE_Y = 1.12;
const anchors: {
  id: (typeof ORBITS)[number]["id"];
  service: ServiceId;
  position: [number, number, number];
}[] = [
  { id: "ingestion", service: "policy", position: [-3.5, 1.05, 0] },
  { id: "processing", service: "orchestrator", position: [2.45, 1.35, -0.05] },
  { id: "persistence", service: "storage", position: [2.45, -1.25, 0.05] },
];

function makeLeaderGeometry() {
  const positions: number[] = [];
  for (const anchor of anchors) {
    const start = servicePosition(anchor.service);
    const [endX, endY, endZ] = anchor.position;
    const elbow: [number, number, number] = [endX, start[1], endZ];
    positions.push(...start, ...elbow, ...elbow, endX, endY, endZ);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

export function Callouts({ lightMode = false }: { lightMode?: boolean }) {
  const leaders = useMemo(makeLeaderGeometry, []);

  return (
    <group position={[0, SERVICE_Y, 0]}>
      <lineSegments geometry={leaders} frustumCulled={false}>
        <lineBasicMaterial
          color={lightMode ? "#9b6a32" : "#ffc766"}
          transparent
          opacity={lightMode ? 0.55 : 0.68}
          depthWrite={false}
        />
      </lineSegments>
      {anchors.map(({ id, position }) => {
        const orbit = ORBITS.find((candidate) => candidate.id === id);
        if (!orbit) return null;
        return (
          <Html key={id} position={position} center={false} style={{ pointerEvents: "none" }}>
            <div className="hero-callout">
              <strong>{orbit.label}</strong>
              <span>{orbit.meaning}</span>
            </div>
          </Html>
        );
      })}
    </group>
  );
}
