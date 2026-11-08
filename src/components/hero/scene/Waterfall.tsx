import { useLayoutEffect, useMemo, useRef } from "react";
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
    float flow = vUv.y * 24.0 - uTime * 2.1 + sin(vUv.x * 20.0 + uTime * 0.32) * 0.75;
    float streak = pow(max(0.0, sin(flow)), 12.0);
    float thread = pow(max(0.0, sin(vUv.x * 43.0 + sin(vUv.y * 9.0 - uTime) * 1.6)), 18.0);
    float edge = smoothstep(0.0, 0.1, vUv.x) * (1.0 - smoothstep(0.9, 1.0, vUv.x));
    float alpha = edge * (0.18 + streak * 0.4 + thread * 0.15);
    vec3 water = uLightMode > 0.5 ? vec3(0.58, 0.64, 0.64) : vec3(0.28, 0.4, 0.47);
    vec3 highlight = uLightMode > 0.5 ? vec3(0.88, 0.78, 0.61) : vec3(0.82, 0.87, 0.88);
    gl_FragColor = vec4(mix(water, highlight, clamp(streak * 0.72 + thread * 0.38, 0.0, 0.8)), alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function Waterfall({
  now,
  animate,
  lightMode = false,
  reducedMotion = false,
}: {
  now: number;
  animate: boolean;
  lightMode?: boolean;
  reducedMotion?: boolean;
}) {
  const materials = useRef<(THREE.ShaderMaterial | null)[]>([]);
  const mistRef = useRef<THREE.InstancedMesh>(null);
  const mistGeometry = useMemo(() => new THREE.SphereGeometry(1, 12, 8), []);
  const mistMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: lightMode ? "#a39680" : "#9dafb4",
        transparent: true,
        opacity: lightMode ? 0.1 : 0.13,
        depthWrite: false,
      }),
    [lightMode]
  );
  const mistTransform = useMemo(() => new THREE.Object3D(), []);
  const uniforms = useMemo(
    () =>
      ISLAND.falls.map(() => ({
        uTime: { value: 0 },
        uLightMode: { value: lightMode ? 1 : 0 },
      })),
    [lightMode]
  );

  useLayoutEffect(() => {
    const mist = mistRef.current;
    if (!mist) return;
    for (let fallIndex = 0; fallIndex < ISLAND.falls.length; fallIndex++) {
      const [x, , z] = ISLAND.falls[fallIndex];
      for (let puff = 0; puff < 3; puff++) {
        const index = fallIndex * 3 + puff;
        mistTransform.position.set(
          ISLAND.center[0] + x + (puff - 1) * 0.2,
          ISLAND.center[1] - 0.84 + (puff % 2) * 0.035,
          z + 0.24 + fallIndex * 0.1
        );
        mistTransform.rotation.set(0, 0, 0);
        mistTransform.scale.set(0.25 + (puff % 2) * 0.07, 0.055, 0.13);
        mistTransform.updateMatrix();
        mist.setMatrixAt(index, mistTransform.matrix);
      }
    }
    mist.instanceMatrix.needsUpdate = true;
  }, [mistTransform]);

  useFrame((frame) => {
    const time = animate ? frame.clock.elapsedTime : now;
    for (let index = 0; index < materials.current.length; index++) {
      const material = materials.current[index];
      if (!material) continue;
      material.uniforms.uTime.value = reducedMotion ? 0 : time;
      material.uniforms.uLightMode.value = lightMode ? 1 : 0;
    }
  });

  return (
    <group>
      {ISLAND.falls.map(([x, , z], index) => (
        <group
          key={index}
          position={[ISLAND.center[0] + x, ISLAND.center[1] + 0.05, z + 0.1]}
          rotation={[0, index === 0 ? -0.1 : 0.12, 0]}
        >
          <mesh position={[0, -0.48, 0]}>
            <planeGeometry args={[index === 0 ? 0.54 : 0.44, 1.16, 1, 24]} />
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
        </group>
      ))}
      <instancedMesh ref={mistRef} args={[mistGeometry, mistMaterial, ISLAND.falls.length * 3]} />
    </group>
  );
}
