import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { EDGES, SERVICES } from "../topology";
import { coreNodePosition } from "../layout";
import type { HeroState } from "../simulation";

const ERROR = new THREE.Color("#ff686b");
const SUCCESS = new THREE.Color("#5bd68d");
const AMBER = new THREE.Color("#ffc766");
const AMBER_LIGHT = new THREE.Color("#9b6a32");
const NODE_COLOR = new THREE.Color();

const rimVertexShader = `
  varying vec3 vWorldNormal;
  varying vec3 vViewDirection;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewDirection = cameraPosition - worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const rimFragmentShader = `
  uniform float uLightMode;
  varying vec3 vWorldNormal;
  varying vec3 vViewDirection;
  void main() {
    float facing = max(dot(normalize(vWorldNormal), normalize(vViewDirection)), 0.0);
    float rim = pow(1.0 - facing, 3.2);
    vec3 amber = uLightMode > 0.5 ? vec3(0.42, 0.29, 0.14) : vec3(0.92, 0.58, 0.22);
    float alpha = rim * (uLightMode > 0.5 ? 0.16 : 0.32);
    gl_FragColor = vec4(amber, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

interface CoreSphereProps {
  state: HeroState;
  now: number;
  animate: boolean;
  reducedMotion: boolean;
  lightMode?: boolean;
}

export function CoreSphere({
  state,
  now,
  animate,
  reducedMotion,
  lightMode = false,
}: CoreSphereProps) {
  const coreRef = useRef<THREE.Group>(null);
  const nodeRef = useRef<THREE.InstancedMesh>(null);
  const nodeTransform = useMemo(() => new THREE.Object3D(), []);
  const nodeGeometry = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const nodeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        emissive: lightMode ? "#5e431f" : "#8c5017",
        emissiveIntensity: lightMode ? 0.18 : 0.52,
        metalness: 0.12,
        roughness: 0.28,
      }),
    [lightMode]
  );
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

  useLayoutEffect(() => {
    const nodes = nodeRef.current;
    if (!nodes) return;
    for (let index = 0; index < SERVICES.length; index++) {
      const service = SERVICES[index];
      const [x, y, z] = coreNodePosition(service.id);
      nodeTransform.position.set(x, y, z);
      const scale = service.id === "orchestrator" ? 0.082 : 0.064;
      nodeTransform.scale.setScalar(scale);
      nodeTransform.updateMatrix();
      nodes.setMatrixAt(index, nodeTransform.matrix);
      nodes.setColorAt(index, lightMode ? AMBER_LIGHT : AMBER);
    }
    nodes.instanceMatrix.needsUpdate = true;
    if (nodes.instanceColor) nodes.instanceColor.needsUpdate = true;
  }, [lightMode, nodeTransform]);

  useFrame((frame) => {
    const time = animate ? frame.clock.elapsedTime : now;
    if (coreRef.current) coreRef.current.rotation.y = reducedMotion ? 0 : time * 0.045;
    const nodes = nodeRef.current;
    if (!nodes) return;
    for (let index = 0; index < SERVICES.length; index++) {
      const service = SERVICES[index];
      if (state.failed === service.id) NODE_COLOR.copy(ERROR);
      else if (state.recovering === service.id) {
        const elapsed = state.startedAt === null ? 0 : Math.max(0, now - state.startedAt);
        if (elapsed < 1.6) NODE_COLOR.copy(ERROR).lerp(SUCCESS, elapsed / 1.6);
        else
          NODE_COLOR.copy(SUCCESS).lerp(
            lightMode ? AMBER_LIGHT : AMBER,
            Math.min((elapsed - 1.6) / 0.8, 1)
          );
      } else NODE_COLOR.copy(lightMode ? AMBER_LIGHT : AMBER);
      nodes.setColorAt(index, NODE_COLOR);
    }
    if (nodes.instanceColor) nodes.instanceColor.needsUpdate = true;
  });

  return (
    <group ref={coreRef} position={[0, 1.12, 0]}>
      <mesh>
        <sphereGeometry args={[0.84, 40, 32]} />
        <meshPhysicalMaterial
          color={lightMode ? "#625747" : "#0b1114"}
          metalness={0.22}
          roughness={0.24}
          clearcoat={1}
          clearcoatRoughness={0.14}
          transmission={lightMode ? 0.28 : 0.14}
          thickness={0.72}
          emissive={lightMode ? "#312719" : "#1e1308"}
          emissiveIntensity={lightMode ? 0.015 : 0.035}
        />
      </mesh>
      <mesh scale={1.012}>
        <sphereGeometry args={[0.84, 40, 32]} />
        <meshPhysicalMaterial
          color={lightMode ? "#dfc9a3" : "#8d9b9f"}
          metalness={0.02}
          roughness={0.13}
          transmission={0.82}
          thickness={0.9}
          clearcoat={1}
          transparent
          opacity={lightMode ? 0.12 : 0.2}
          depthWrite={false}
        />
      </mesh>
      <mesh scale={1.025}>
        <sphereGeometry args={[0.84, 36, 28]} />
        <shaderMaterial
          uniforms={{ uLightMode: { value: lightMode ? 1 : 0 } }}
          vertexShader={rimVertexShader}
          fragmentShader={rimFragmentShader}
          transparent
          depthWrite={false}
          side={THREE.FrontSide}
        />
      </mesh>
      <lineSegments geometry={graph}>
        <lineBasicMaterial color={lightMode ? "#a87537" : "#ffc766"} transparent opacity={0.9} />
      </lineSegments>
      <instancedMesh ref={nodeRef} args={[nodeGeometry, nodeMaterial, SERVICES.length]} />
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.105, 16, 12]} />
        <meshBasicMaterial
          color={lightMode ? "#a87537" : "#ffc766"}
          transparent
          opacity={lightMode ? 0.1 : 0.18}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, -0.95, 0]}>
        <cylinderGeometry args={[0.035, 0.11, 1.9, 20, 1, true]} />
        <meshBasicMaterial
          color={lightMode ? "#b58b4a" : "#ffc766"}
          transparent
          opacity={lightMode ? 0.035 : 0.075}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
