import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { EDGES, SERVICES, type ServiceId } from "../topology";
import { coreNodePosition } from "../layout";
import type { HeroState } from "../simulation";

const ERROR = new THREE.Color("#ff686b");
const SUCCESS = new THREE.Color("#5bd68d");
const AMBER = new THREE.Color("#ffc766");

interface CoreSphereProps {
  state: HeroState;
  now: number;
  reducedMotion: boolean;
  lightMode?: boolean;
}

export function CoreSphere({ state, now, reducedMotion, lightMode = false }: CoreSphereProps) {
  const coreRef = useRef<THREE.Group>(null);
  const nodeRefs = useRef<Record<ServiceId, THREE.Mesh | null>>({
    gateway: null,
    policy: null,
    ingest: null,
    orchestrator: null,
    inference: null,
    storage: null,
    observability: null,
  });
  const graph = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const points: number[] = [];
    const activeFallbacks = new Set(
      state.route?.hops
        .filter((hop) => EDGES.some((edge) => edge.id === hop.edgeId && edge.kind === "fallback"))
        .map((hop) => hop.edgeId) ?? []
    );
    for (const edge of EDGES) {
      if (edge.kind === "fallback" && !activeFallbacks.has(edge.id)) continue;
      const a = coreNodePosition(edge.from);
      const b = coreNodePosition(edge.to);
      points.push(...a, ...b);
    }
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    return geometry;
  }, [state.route]);

  useFrame(() => {
    if (coreRef.current && !reducedMotion) coreRef.current.rotation.y = now * 0.045;
    for (const service of SERVICES) {
      const node = nodeRefs.current[service.id];
      if (!node) continue;
      const material = node.material as THREE.MeshStandardMaterial;
      if (state.failed === service.id) material.color.copy(ERROR);
      else if (state.recovering === service.id) {
        const elapsed = state.startedAt === null ? 0 : Math.max(0, now - state.startedAt);
        if (elapsed < 1.6) material.color.copy(ERROR).lerp(SUCCESS, elapsed / 1.6);
        else material.color.copy(SUCCESS).lerp(AMBER, Math.min((elapsed - 1.6) / 0.8, 1));
      } else material.color.copy(AMBER);
    }
  });

  return (
    <group ref={coreRef} position={[0, 1.12, 0]}>
      <mesh>
        <icosahedronGeometry args={[0.84, 4]} />
        <meshPhysicalMaterial
          color="#16130f"
          metalness={0.78}
          roughness={0.29}
          clearcoat={1}
          clearcoatRoughness={0.19}
          emissive="#5c3510"
          emissiveIntensity={0.22}
          flatShading
        />
      </mesh>
      <mesh scale={1.012}>
        <sphereGeometry args={[0.84, 40, 32]} />
        <meshPhysicalMaterial
          color="#e7cda4"
          metalness={0.08}
          roughness={0.12}
          transmission={0.54}
          thickness={0.38}
          clearcoat={1}
          transparent
          opacity={0.32}
          depthWrite={false}
        />
      </mesh>
      <lineSegments geometry={graph}>
        <lineBasicMaterial color="#ffc766" transparent opacity={0.72} />
      </lineSegments>
      {SERVICES.map((service) => (
        <mesh
          key={service.id}
          ref={(mesh) => {
            nodeRefs.current[service.id] = mesh;
          }}
          position={coreNodePosition(service.id)}
          scale={service.id === "orchestrator" ? 0.075 : 0.052}
        >
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial
            color="#ffc766"
            emissive="#ffb547"
            emissiveIntensity={1.3}
            metalness={0.15}
            roughness={0.25}
          />
        </mesh>
      ))}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.26, 24, 20]} />
        <meshBasicMaterial color="#ffc766" transparent opacity={0.22} />
      </mesh>
      <mesh position={[0, -0.95, 0]}>
        <cylinderGeometry args={[0.025, 0.075, 1.98, 12, 1, true]} />
        <meshBasicMaterial
          color={lightMode ? "#b58b4a" : "#ffc766"}
          transparent
          opacity={lightMode ? 0.09 : 0.2}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
