import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";
import { ISLAND } from "../layout";

const RIPPLE_POSITIONS = ISLAND.falls.map(
  ([x, , z]) =>
    [ISLAND.center[0] + x, ISLAND.center[1] - 0.835, z + 0.22] as [number, number, number]
);
const RIPPLE_AMBER = new THREE.Color("#ffc766");
const RIPPLE_PAPER = new THREE.Color("#9b7442");
const RIPPLE_TEMP = new THREE.Color();

export function Pool({
  lightMode = false,
  quality = "high",
  reducedMotion = false,
  animate,
  now,
}: {
  lightMode?: boolean;
  quality?: "high" | "medium" | "low";
  reducedMotion?: boolean;
  animate: boolean;
  now: number;
}) {
  const ripples = useRef<THREE.InstancedMesh>(null);
  const transform = useMemo(() => new THREE.Object3D(), []);
  const rippleGeometry = useMemo(() => new THREE.RingGeometry(0.17, 0.19, 48), []);
  const rippleMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        vertexColors: true,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    []
  );

  useLayoutEffect(() => {
    const mesh = ripples.current;
    if (!mesh) return;
    for (let index = 0; index < RIPPLE_POSITIONS.length; index++) {
      transform.position.set(...RIPPLE_POSITIONS[index]);
      transform.rotation.set(-Math.PI / 2, 0, 0);
      transform.scale.setScalar(1);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
      mesh.setColorAt(index, lightMode ? RIPPLE_PAPER : RIPPLE_AMBER);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [lightMode, transform]);

  useFrame((frame) => {
    const mesh = ripples.current;
    if (!mesh) return;
    const time = animate ? frame.clock.elapsedTime : now;
    for (let index = 0; index < RIPPLE_POSITIONS.length; index++) {
      const position = RIPPLE_POSITIONS[index];
      const period = reducedMotion ? 60 : 6.3 + index * 0.8;
      const phase = (time % period) / period;
      transform.position.set(position[0], position[1], position[2]);
      transform.rotation.set(-Math.PI / 2, 0, 0);
      transform.scale.setScalar(0.45 + phase * 2.5);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
      RIPPLE_TEMP.copy(lightMode ? RIPPLE_PAPER : RIPPLE_AMBER).multiplyScalar(1 - phase);
      mesh.setColorAt(index, RIPPLE_TEMP);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
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
            roughness={lightMode ? 0.34 : 0.22}
            blur={[144, 48]}
            mixBlur={1}
            mixStrength={lightMode ? 0.3 : 0.52}
            resolution={quality === "medium" ? 192 : 256}
            mirror={lightMode ? 0.2 : 0.38}
            depthScale={0.28}
            minDepthThreshold={0.25}
            maxDepthThreshold={1.2}
            depthToBlurRatioBias={0.2}
            reflectorOffset={0.02}
          />
        )}
      </mesh>
      <instancedMesh
        ref={ripples}
        args={[rippleGeometry, rippleMaterial, RIPPLE_POSITIONS.length]}
      />
    </group>
  );
}
