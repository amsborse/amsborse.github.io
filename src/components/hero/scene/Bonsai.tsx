import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ISLAND } from "../layout";

type WindShader = { uniforms: { uWindTime: { value: number } } };

const PAD_LAYOUT = [
  [-0.55, 0.98, 0.02, 0.42, 0.13, 0.28],
  [-0.04, 1.01, 0, 0.45, 0.14, 0.3],
  [0.47, 1.04, -0.02, 0.38, 0.13, 0.26],
  [-0.42, 1.29, 0.01, 0.45, 0.14, 0.29],
  [0.12, 1.32, -0.02, 0.48, 0.15, 0.3],
  [0.58, 1.36, -0.03, 0.34, 0.13, 0.24],
  [-0.25, 1.6, 0.02, 0.41, 0.14, 0.28],
  [0.2, 1.64, -0.02, 0.43, 0.14, 0.27],
  [0.27, 1.9, -0.01, 0.3, 0.11, 0.22],
] as const;
const PAD_COLORS = ["#20392b", "#29452e", "#344e35", "#253e2d", "#3a5437"];
const PAD_COLORS_LIGHT = ["#40513b", "#4c5c40", "#586547", "#455840", "#65714c"];

function makeBranches() {
  const curves: THREE.BufferGeometry[] = [];
  const trunk = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-0.1, 0.35, 0.02),
    new THREE.Vector3(0.06, 0.74, -0.02),
    new THREE.Vector3(0.24, 1.1, 0.03),
    new THREE.Vector3(0.11, 1.47, 0.02),
    new THREE.Vector3(0.31, 1.79, 0.04),
  ]);
  curves.push(new THREE.TubeGeometry(trunk, 48, 0.095, 9, false));
  const branches = [
    [
      [-0.02, 0.53, 0],
      [-0.36, 0.72, 0.03],
      [-0.72, 0.91, 0.02],
    ],
    [
      [0.04, 0.71, 0],
      [0.34, 0.88, -0.04],
      [0.72, 1.02, -0.08],
    ],
    [
      [0.11, 0.91, 0],
      [-0.2, 1.12, 0.03],
      [-0.54, 1.28, 0.01],
    ],
    [
      [0.19, 1.16, 0],
      [0.52, 1.35, -0.04],
      [0.82, 1.44, -0.05],
    ],
    [
      [0.17, 1.4, 0],
      [-0.08, 1.57, 0.01],
      [-0.4, 1.64, 0.03],
    ],
    [
      [0.23, 1.56, 0],
      [0.48, 1.69, -0.03],
      [0.68, 1.79, -0.04],
    ],
  ];
  for (let index = 0; index < branches.length; index++) {
    const curve = new THREE.CatmullRomCurve3(
      branches[index].map(([x, y, z]) => new THREE.Vector3(x, y, z))
    );
    curves.push(new THREE.TubeGeometry(curve, 18, 0.032 - index * 0.0022, 6, false));
  }
  const merged = mergeGeometries(curves, false);
  curves.forEach((geometry) => geometry.dispose());
  if (!merged) throw new Error("Could not merge hero bonsai branches");
  return merged;
}

function foliageInstances(count: number, lightMode: boolean) {
  const geometry = new THREE.SphereGeometry(1, 20, 12);
  const material = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 0.86,
    metalness: 0.01,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();
  for (let index = 0; index < count; index++) {
    const [x, y, z, sx, sy, sz] = PAD_LAYOUT[index];
    dummy.position.set(x, y, z);
    dummy.scale.set(sx, sy, sz);
    dummy.rotation.set(0.015 * (index % 3), 0.08 * (index % 2), 0.012 * (index % 4));
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    mesh.setColorAt(index, new THREE.Color((lightMode ? PAD_COLORS_LIGHT : PAD_COLORS)[index % 5]));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

export function Bonsai({
  now,
  quality = "high",
  animate,
  reducedMotion = false,
  lightMode = false,
}: {
  now: number;
  quality?: "high" | "medium" | "low";
  animate: boolean;
  reducedMotion?: boolean;
  lightMode?: boolean;
}) {
  const treeRef = useRef<THREE.Group>(null);
  const shaderRef = useRef<WindShader | null>(null);
  const branches = useMemo(makeBranches, []);
  const foliageCount = quality === "high" ? 9 : quality === "medium" ? 7 : 5;
  const foliage = useMemo(
    () => foliageInstances(foliageCount, lightMode),
    [foliageCount, lightMode]
  );
  const foliageMaterial = useMemo(() => {
    const material = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.86,
      metalness: 0.01,
    });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uWindTime = { value: 0 };
      shaderRef.current = shader as unknown as WindShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        "#include <common>\nuniform float uWindTime;"
      );
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ntransformed.x += sin(uWindTime * 0.7 + position.y * 2.3) * 0.008;"
      );
    };
    material.customProgramCacheKey = () => "bonsai-wind-v2";
    return material;
  }, []);

  useFrame((frame) => {
    const time = animate ? frame.clock.elapsedTime : now;
    if (shaderRef.current) shaderRef.current.uniforms.uWindTime.value = reducedMotion ? 0 : time;
    if (treeRef.current) {
      treeRef.current.rotation.z = reducedMotion ? 0 : Math.sin((time * Math.PI * 2) / 9) * 0.004;
    }
  });

  return (
    <group
      ref={treeRef}
      position={[ISLAND.center[0] + ISLAND.tree[0], ISLAND.center[1] + 0.08, ISLAND.tree[2]]}
      scale={[0.92, 1, 0.92]}
    >
      <mesh geometry={branches} castShadow>
        <meshStandardMaterial
          color={lightMode ? "#785e42" : "#59432f"}
          roughness={0.88}
          metalness={0.02}
        />
      </mesh>
      <primitive object={foliage} material={foliageMaterial} castShadow />
    </group>
  );
}
