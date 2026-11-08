import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ORBITS } from "../topology";
import type { HeroState } from "../simulation";

function makeBand(radius: number, width: number, thickness: number, span = Math.PI * 2) {
  const segments = span < Math.PI * 2 ? 40 : 192;
  const sides = 12;
  const positions: number[] = [];
  const indices: number[] = [];
  const start = span < Math.PI * 2 ? -span * 0.5 : 0;
  for (let i = 0; i <= segments; i++) {
    const angle = start + (i / segments) * span;
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
  animate,
  reducedMotion,
  lightMode = false,
}: {
  now: number;
  state: HeroState;
  animate: boolean;
  reducedMotion: boolean;
  lightMode?: boolean;
}) {
  const streakRefs = useRef<(THREE.Group | null)[]>([]);
  const geometries = useMemo(() => ORBITS.map((orbit) => makeBand(orbit.radius, 0.14, 0.075)), []);
  const streaks = useMemo(
    () => ORBITS.map((orbit) => makeBand(orbit.radius, 0.105, 0.065, 0.52)),
    []
  );
  const active = state.hovered ?? state.selected;

  useFrame((frame) => {
    for (let index = 0; index < ORBITS.length; index++) {
      const orbit = ORBITS[index];
      const streak = streakRefs.current[index];
      if (!streak) continue;
      const time = animate ? frame.clock.elapsedTime : now;
      const phase = reducedMotion ? 0.14 : (time / orbit.periodSec) * Math.PI * 2;
      streak.rotation.y = phase;
    }
  });

  return (
    <group position={[0, 1.12, 0]}>
      {ORBITS.map((orbit, index) => (
        <group key={orbit.id} rotation={[orbit.tilt[0], 0, orbit.tilt[1]]}>
          <mesh geometry={geometries[index]}>
            <meshPhysicalMaterial
              color={lightMode ? "#c4b193" : "#94a1a4"}
              metalness={0.28}
              roughness={0.14}
              clearcoat={1}
              clearcoatRoughness={0.08}
              transmission={0.38}
              transparent
              opacity={active ? 0.94 : 0.72}
              emissive={lightMode ? "#392d1c" : "#472a0e"}
              emissiveIntensity={lightMode ? 0.015 : active ? 0.24 : 0.1}
              depthWrite={false}
            />
          </mesh>
          <group
            ref={(group) => {
              streakRefs.current[index] = group;
            }}
          >
            <mesh geometry={streaks[index]}>
              <meshBasicMaterial
                color={lightMode ? "#a56d2e" : "#ffc766"}
                transparent
                opacity={lightMode ? 0.58 : 0.82}
                toneMapped={false}
                depthWrite={false}
              />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}
