import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ORBITS } from "../topology";
import type { HeroState } from "../simulation";

function makeBand(radius: number, width: number, thickness: number) {
  const segments = 192;
  const sides = 12;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (let j = 0; j <= sides; j++) {
      const around = (j / sides) * Math.PI * 2;
      const radial = Math.cos(around) * width * 0.5;
      const vertical = Math.sin(around) * thickness * 0.5;
      positions.push((radius + radial) * cos, vertical, (radius + radial) * sin);
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < sides; j++) {
      const a = i * (sides + 1) + j;
      const b = a + sides + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function OrbitRings({
  now,
  state,
  reducedMotion,
  lightMode = false,
}: {
  now: number;
  state: HeroState;
  reducedMotion: boolean;
  lightMode?: boolean;
}) {
  const streakRefs = useRef<(THREE.Mesh | null)[]>([]);
  const geometries = useMemo(() => ORBITS.map((orbit) => makeBand(orbit.radius, 0.075, 0.045)), []);
  const active = state.hovered ?? state.selected;

  useFrame(() => {
    for (let index = 0; index < ORBITS.length; index++) {
      const orbit = ORBITS[index];
      const streak = streakRefs.current[index];
      if (!streak) continue;
      const phase = reducedMotion ? 0.14 : (now / orbit.periodSec) * Math.PI * 2;
      streak.position.set(Math.cos(phase) * orbit.radius, 0, Math.sin(phase) * orbit.radius);
    }
  });

  return (
    <group position={[0, 1.12, 0]}>
      {ORBITS.map((orbit, index) => (
        <group key={orbit.id} rotation={[orbit.tilt[0], 0, orbit.tilt[1]]}>
          <mesh geometry={geometries[index]}>
            <meshPhysicalMaterial
              color={lightMode ? "#aa9577" : "#9e8b70"}
              metalness={0.62}
              roughness={0.21}
              clearcoat={1}
              clearcoatRoughness={0.1}
              transmission={0.18}
              transparent
              opacity={active ? 0.94 : 0.76}
              emissive={lightMode ? "#33291b" : "#492a0d"}
              emissiveIntensity={lightMode ? 0.04 : active ? 0.28 : 0.12}
              depthWrite={false}
            />
          </mesh>
          <mesh
            ref={(mesh) => {
              streakRefs.current[index] = mesh;
            }}
            scale={0.075}
          >
            <sphereGeometry args={[1, 12, 10]} />
            <meshBasicMaterial color="#ffc766" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
