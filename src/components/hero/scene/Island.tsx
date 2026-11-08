import { useMemo } from "react";
import * as THREE from "three";
import { ISLAND } from "../layout";

function seededNoise(x: number, z: number) {
  return Math.sin(x * 9.13 + z * 4.77) * Math.cos(z * 11.3 - x * 2.19);
}

const STRATA_PROFILE = [1.01, 0.96, 1.03, 1.08, 0.98, 0.9, 0.78, 0.62, 0.43, 0.27];

function islandTop(lightMode: boolean) {
  const radial = 14;
  const around = 72;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  for (let ring = 0; ring <= radial; ring++) {
    const radius = ring / radial;
    for (let segment = 0; segment <= around; segment++) {
      const angle = (segment / around) * Math.PI * 2;
      const edgeNoise = seededNoise(Math.cos(angle) * 1.7, Math.sin(angle) * 1.1) * 0.045 * radius;
      const x = Math.cos(angle) * (ISLAND.width * 0.5) * radius * (1 + edgeNoise);
      const z = Math.sin(angle) * (ISLAND.depth * 0.5) * radius * (1 + edgeNoise);
      const y = 0.06 + Math.max(0, 1 - radius) * 0.04 + seededNoise(x, z) * 0.018;
      positions.push(x, y, z);
      const patch = Math.max(0, seededNoise(x * 1.4, z * 1.4) * 0.38 + 0.3);
      const edge = Math.max(0, Math.min(1, (radius - 0.72) / 0.28));
      const moss = new THREE.Color(lightMode ? "#7f8956" : "#43502a");
      const stone = new THREE.Color(lightMode ? "#9a907c" : "#454039");
      stone.lerp(moss, patch * (1 - edge * 0.52));
      colors.push(stone.r, stone.g, stone.b);
    }
  }
  for (let ring = 0; ring < radial; ring++) {
    for (let segment = 0; segment < around; segment++) {
      const a = ring * (around + 1) + segment;
      const b = a + around + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function islandStrata(lightMode: boolean) {
  const around = 72;
  const levels = 12;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  for (let level = 0; level <= levels; level++) {
    const t = level / levels;
    const profilePosition = t * (STRATA_PROFILE.length - 1);
    const profileIndex = Math.min(Math.floor(profilePosition), STRATA_PROFILE.length - 2);
    const profileMix = profilePosition - profileIndex;
    const profile =
      STRATA_PROFILE[profileIndex] * (1 - profileMix) +
      STRATA_PROFILE[profileIndex + 1] * profileMix;
    const shelf = level > 0 && level % 4 === 0 ? 0.035 : 0;
    const y = 0.03 - t * ISLAND.height * 1.18 + Math.sin(t * Math.PI * 12) * 0.012;
    const scale = profile + shelf + Math.sin(t * Math.PI * 6) * 0.012;
    for (let segment = 0; segment <= around; segment++) {
      const angle = (segment / around) * Math.PI * 2;
      const rough =
        seededNoise(Math.cos(angle) * 3 + t, Math.sin(angle) * 2 - t) * (0.055 + t * 0.065);
      positions.push(
        Math.cos(angle) * (ISLAND.width * 0.5) * scale * (1 + rough),
        y + rough * 0.18,
        Math.sin(angle) * (ISLAND.depth * 0.5) * scale * (1 + rough)
      );
      const stone = new THREE.Color(
        lightMode
          ? t > 0.78
            ? "#403c35"
            : t > 0.48
              ? "#625b4e"
              : "#958975"
          : t > 0.78
            ? "#171817"
            : t > 0.48
              ? "#292824"
              : "#514b3f"
      );
      const layerTone = level % 4 === 1 ? 1.08 : level % 4 === 2 ? 0.88 : 1;
      const variation = layerTone * (0.88 + Math.max(0, seededNoise(segment, level) * 0.12));
      colors.push(stone.r * variation, stone.g * variation, stone.b * variation);
    }
  }
  for (let level = 0; level < levels; level++) {
    for (let segment = 0; segment < around; segment++) {
      const a = level * (around + 1) + segment;
      const b = a + around + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const bottom = positions.length / 3;
  positions.push(0, -ISLAND.height * 1.24, 0);
  colors.push(lightMode ? 0.19 : 0.045, lightMode ? 0.18 : 0.043, lightMode ? 0.16 : 0.04);
  const bottomRing = levels * (around + 1);
  for (let segment = 0; segment < around; segment++) {
    indices.push(bottomRing + segment, bottomRing + segment + 1, bottom);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function instances(
  count: number,
  geometry: THREE.BufferGeometry,
  seed: number,
  width: number,
  color: string
) {
  const mesh = new THREE.InstancedMesh(
    geometry,
    new THREE.MeshStandardMaterial({ color, roughness: 0.92 }),
    count
  );
  const dummy = new THREE.Object3D();
  for (let index = 0; index < count; index++) {
    const angle = index * 2.3999632297 + seed;
    const radius = 0.2 + ((index * 37) % 97) / 130;
    dummy.position.set(Math.cos(angle) * width * radius, 0.08, Math.sin(angle) * 0.85 * radius);
    const size = 0.035 + ((index * 13) % 19) / 190;
    dummy.scale.set(size, size * (1.8 + (index % 3) * 0.28), size);
    dummy.rotation.set(0, angle, Math.sin(index) * 0.11);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

export function Island({
  quality = "high",
  lightMode = false,
}: {
  quality?: "high" | "medium" | "low";
  lightMode?: boolean;
}) {
  const top = useMemo(() => islandTop(lightMode), [lightMode]);
  const strata = useMemo(() => islandStrata(lightMode), [lightMode]);
  const leaves = quality === "high" ? 36 : quality === "medium" ? 25 : 17;
  const rockCount = quality === "high" ? 14 : quality === "medium" ? 10 : 8;
  const foliage = useMemo(
    () =>
      instances(
        leaves,
        new THREE.ConeGeometry(0.06, 0.28, 5),
        0.3,
        2.15,
        lightMode ? "#556346" : "#304733"
      ),
    [leaves, lightMode]
  );
  const rocks = useMemo(
    () =>
      instances(
        rockCount,
        new THREE.IcosahedronGeometry(0.18, 1),
        1.7,
        2.2,
        lightMode ? "#827a69" : "#4d483d"
      ),
    [lightMode, rockCount]
  );

  return (
    <group position={ISLAND.center}>
      <mesh geometry={strata} castShadow receiveShadow>
        <meshStandardMaterial vertexColors color="#ffffff" roughness={0.86} metalness={0.09} />
      </mesh>
      <mesh geometry={top} position={[0, 0.025, 0]} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.94} metalness={0.02} />
      </mesh>
      <mesh position={[0.72, 0.092, -0.02]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.22, 0.42, 1]}>
        <circleGeometry args={[1, 64]} />
        <meshPhysicalMaterial
          color={lightMode ? "#b7aa91" : "#172226"}
          metalness={lightMode ? 0.16 : 0.4}
          roughness={lightMode ? 0.2 : 0.12}
          clearcoat={1}
          clearcoatRoughness={0.08}
          transmission={lightMode ? 0.22 : 0.42}
          thickness={0.14}
          transparent
          opacity={lightMode ? 0.72 : 0.86}
          depthWrite={false}
        />
      </mesh>
      <primitive object={foliage} />
      <primitive object={rocks} />
    </group>
  );
}
