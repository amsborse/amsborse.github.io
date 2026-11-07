import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ISLAND } from "../layout";

type WindShader = { uniforms: { uWindTime: { value: number } } };

function makeBranches() {
  const curves: THREE.TubeGeometry[] = [];
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
  return curves;
}

function foliageInstances(count: number) {
  const geometry = new THREE.DodecahedronGeometry(0.29, 1);
  const material = new THREE.MeshStandardMaterial({
    color: "#809344",
    roughness: 0.78,
    metalness: 0.02,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();
  for (let index = 0; index < count; index++) {
    const angle = index * 2.3999632297;
    const layer = Math.floor(index / 7);
    const within = index % 7;
    const radius = 0.25 + (within % 3) * 0.16;
    dummy.position.set(
      Math.cos(angle) * radius + (layer === 1 ? 0.18 : 0),
      0.83 + layer * 0.32 + (within % 2) * 0.08,
      Math.sin(angle) * radius * 0.72
    );
    dummy.scale.set(0.88 + (within % 3) * 0.15, 0.44 + (layer % 2) * 0.08, 0.72);
    dummy.rotation.set(0.05 * Math.sin(angle), angle, 0.14 * Math.cos(angle));
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

export function Bonsai({
  now,
  quality = "high",
  reducedMotion = false,
  lightMode = false,
}: {
  now: number;
  quality?: "high" | "medium" | "low";
  reducedMotion?: boolean;
  lightMode?: boolean;
}) {
  const treeRef = useRef<THREE.Group>(null);
  const shaderRef = useRef<WindShader | null>(null);
  const branches = useMemo(makeBranches, []);
  const foliageCount = quality === "high" ? 28 : quality === "medium" ? 20 : 14;
  const foliage = useMemo(() => foliageInstances(foliageCount), [foliageCount]);
  const foliageMaterial = useMemo(() => {
    const material = new THREE.MeshStandardMaterial({
      color: "#8b9a44",
      roughness: 0.76,
      metalness: 0.02,
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
        "#include <begin_vertex>\ntransformed.x += sin(uWindTime * 0.8 + position.y * 2.3) * 0.018;"
      );
    };
    material.customProgramCacheKey = () => "bonsai-wind-v1";
    return material;
  }, []);

  useFrame(() => {
    if (shaderRef.current) shaderRef.current.uniforms.uWindTime.value = reducedMotion ? 0 : now;
    if (treeRef.current && !reducedMotion) {
      treeRef.current.rotation.z = Math.sin((now * Math.PI * 2) / 9) * 0.006;
    }
  });

  return (
    <group
      ref={treeRef}
      position={[ISLAND.center[0] + ISLAND.tree[0], ISLAND.center[1] + 0.08, ISLAND.tree[2]]}
      scale={[1.05, 1.27, 1]}
    >
      {branches.map((geometry, index) => (
        <mesh key={index} geometry={geometry} castShadow>
          <meshStandardMaterial
            color={
              lightMode
                ? index === 0
                  ? "#765b3e"
                  : "#866644"
                : index === 0
                  ? "#5b432e"
                  : "#674d31"
            }
            roughness={0.88}
            metalness={0.02}
          />
        </mesh>
      ))}
      <primitive object={foliage} material={foliageMaterial} castShadow />
      <mesh position={[0.23, 1.78, 0.04]} scale={[0.19, 0.14, 0.19]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={lightMode ? "#838b4c" : "#9b9f4e"} roughness={0.87} />
      </mesh>
    </group>
  );
}
