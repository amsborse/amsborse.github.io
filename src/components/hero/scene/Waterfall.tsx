import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ISLAND } from "../layout";

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uLightMode;
  varying vec2 vUv;
  void main() {
    float flow = vUv.y * 18.0 - uTime * 2.2 + sin(vUv.x * 19.0 + uTime * 0.4) * 0.9;
    float streak = pow(max(0.0, sin(flow)), 10.0);
    float edge = smoothstep(0.0, 0.14, vUv.x) * (1.0 - smoothstep(0.84, 1.0, vUv.x));
    float alpha = edge * (0.3 + streak * 0.6) * (0.45 + 0.55 * sin(vUv.y * 3.14159));
    vec3 deep = uLightMode > 0.5 ? vec3(0.52, 0.55, 0.55) : vec3(0.25, 0.34, 0.38);
    vec3 glint = uLightMode > 0.5 ? vec3(0.94, 0.79, 0.55) : vec3(0.94, 0.76, 0.48);
    vec3 color = mix(deep, glint, clamp(streak * 0.8, 0.0, 1.0));
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function Waterfall({
  now,
  lightMode = false,
  reducedMotion = false,
}: {
  now: number;
  lightMode?: boolean;
  reducedMotion?: boolean;
}) {
  const uniforms = useMemo(
    () => [0, 1].map(() => ({ uTime: { value: 0 }, uLightMode: { value: lightMode ? 1 : 0 } })),
    [lightMode]
  );
  const materials = useRef<(THREE.ShaderMaterial | null)[]>([]);
  useFrame(() => {
    for (let index = 0; index < materials.current.length; index++) {
      const material = materials.current[index];
      if (!material) continue;
      material.uniforms.uTime.value = reducedMotion ? now * 0.04 : now;
      material.uniforms.uLightMode.value = lightMode ? 1 : 0;
      uniforms[index].uLightMode.value = lightMode ? 1 : 0;
    }
  });

  return (
    <group>
      {ISLAND.falls.map(([x, , z], index) => (
        <group
          key={index}
          position={[ISLAND.center[0] + x, ISLAND.center[1] - 0.42 - (index % 2) * 0.05, z + 0.1]}
          rotation={[0, index === 0 ? -0.12 : 0.16, 0]}
        >
          <mesh position={[0, 0.23, 0]}>
            <planeGeometry args={[0.34, 0.92, 1, 1]} />
            <shaderMaterial
              ref={(material) => {
                materials.current[index] = material;
              }}
              vertexShader={vertexShader}
              fragmentShader={fragmentShader}
              uniforms={uniforms[index]}
              transparent
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh
            position={[0, 0.69, 0.02]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[0.19, 0.055, 0.02]}
          >
            <torusGeometry args={[1, 0.055, 6, 24]} />
            <meshBasicMaterial
              color={lightMode ? "#fff1d8" : "#f2e5ca"}
              transparent
              opacity={0.55}
            />
          </mesh>
          <mesh position={[0, -0.22, 0.02]} scale={[0.42, 0.1, 0.12]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshBasicMaterial
              color={lightMode ? "#f7e8c9" : "#aebcc0"}
              transparent
              opacity={0.075}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
