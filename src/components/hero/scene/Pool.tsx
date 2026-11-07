import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";
import { ISLAND } from "../layout";

export function Pool({
  lightMode = false,
  quality = "high",
  reducedMotion = false,
  now,
}: {
  lightMode?: boolean;
  quality?: "high" | "medium" | "low";
  reducedMotion?: boolean;
  now: number;
}) {
  const ripples = useRef<(THREE.Mesh | null)[]>([]);
  const ripplePositions = useMemo(
    () =>
      ISLAND.falls.map(
        ([x, , z]) =>
          [ISLAND.center[0] + x, ISLAND.center[1] - 0.835, z + 0.22] as [number, number, number]
      ),
    []
  );

  useFrame(() => {
    for (let index = 0; index < ripples.current.length; index++) {
      const mesh = ripples.current[index];
      if (!mesh) continue;
      const period = reducedMotion ? 60 : 6.3 + index * 0.8;
      const phase = (now % period) / period;
      mesh.scale.setScalar(0.45 + phase * 2.5);
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = (1 - phase) * (reducedMotion ? 0.08 : 0.19);
    }
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, ISLAND.center[1] - 0.87, 0]}>
        <planeGeometry args={[22, 12]} />
        {quality === "low" ? (
          <meshPhysicalMaterial
            color={lightMode ? "#c9bda7" : "#101416"}
            metalness={lightMode ? 0.18 : 0.72}
            roughness={lightMode ? 0.32 : 0.19}
            clearcoat={0.72}
            clearcoatRoughness={0.16}
          />
        ) : (
          <MeshReflectorMaterial
            color={lightMode ? "#cbbfa9" : "#17191a"}
            metalness={lightMode ? 0.18 : 0.6}
            roughness={lightMode ? 0.32 : 0.2}
            blur={[320, 80]}
            mixBlur={1}
            mixStrength={lightMode ? 0.34 : 0.58}
            resolution={quality === "medium" ? 256 : 384}
            mirror={lightMode ? 0.22 : 0.4}
            depthScale={0.32}
            minDepthThreshold={0.25}
            maxDepthThreshold={1.2}
            depthToBlurRatioBias={0.2}
            reflectorOffset={0.02}
          />
        )}
      </mesh>
      {ripplePositions.map((position, index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            ripples.current[index] = mesh;
          }}
          position={position}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.17, 0.19, 64]} />
          <meshBasicMaterial
            color={lightMode ? "#9b7442" : "#ffc766"}
            transparent
            opacity={0.15}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
