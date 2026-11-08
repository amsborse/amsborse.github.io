import { useLayoutEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { EDGES, type Edge, type EdgeKind } from "../topology";
import { dimmedEdges, type HeroState, type RouteSample } from "../simulation";
import { servicePosition } from "../layout";

const EDGE_COLOR: Record<EdgeKind, string> = {
  request: "#ffc766",
  response: "#dec89e",
  telemetry: "#89949a",
  fallback: "#ffb74f",
};
const LIGHT_EDGE_COLOR: Record<EdgeKind, string> = {
  request: "#9b6429",
  response: "#756b59",
  telemetry: "#7a807e",
  fallback: "#a15d26",
};
const PACKET_AMBER = new THREE.Color("#ffc766");
const PACKET_ERROR = new THREE.Color("#ff686b");
const PATH_KINDS: readonly EdgeKind[] = ["request", "response", "telemetry", "fallback"];

interface PathData {
  edge: Edge;
  curve: THREE.QuadraticBezierCurve3;
}

interface EdgeRange {
  edge: Edge;
  start: number;
  count: number;
}

interface MergedPath {
  kind: EdgeKind;
  geometry: THREE.BufferGeometry;
  ranges: EdgeRange[];
}

function makeCurve(edge: Edge) {
  const from = servicePosition(edge.from);
  const to = servicePosition(edge.to);
  const start = new THREE.Vector3(from[0], from[1] + 1.12, from[2]);
  const end = new THREE.Vector3(to[0], to[1] + 1.12, to[2]);
  const control = new THREE.Vector3(
    (start.x + end.x) * 0.5,
    (start.y + end.y) * 0.5 + 1.18,
    (start.z + end.z) * 0.5
  );
  const curve = new THREE.QuadraticBezierCurve3(start, control, end);
  curve.getLengths(32);
  return curve;
}

function buildPaths() {
  const paths = EDGES.map((edge): PathData => ({ edge, curve: makeCurve(edge) }));
  const byKind = new Map<EdgeKind, THREE.BufferGeometry[]>(PATH_KINDS.map((kind) => [kind, []]));
  const ranges = new Map<EdgeKind, EdgeRange[]>(PATH_KINDS.map((kind) => [kind, []]));

  for (const { edge, curve } of paths) {
    const geometry = new THREE.TubeGeometry(
      curve,
      edge.kind === "telemetry" ? 24 : 32,
      edge.kind === "telemetry" ? 0.008 : 0.014,
      5,
      false
    );
    const count = geometry.getAttribute("position").count;
    const opacity = new Float32Array(count);
    geometry.setAttribute("aOpacity", new THREE.BufferAttribute(opacity, 1));
    const pieces = byKind.get(edge.kind)!;
    const edgeRanges = ranges.get(edge.kind)!;
    const start = edgeRanges.reduce((total, range) => total + range.count, 0);
    pieces.push(geometry);
    edgeRanges.push({ edge, start, count });
  }

  const merged = PATH_KINDS.flatMap((kind): MergedPath[] => {
    const pieces = byKind.get(kind)!;
    if (pieces.length === 0) return [];
    const geometry = mergeGeometries(pieces, false);
    pieces.forEach((piece) => piece.dispose());
    if (!geometry) throw new Error(`Could not merge ${kind} hero paths`);
    return [{ kind, geometry, ranges: ranges.get(kind)! }];
  });
  return { paths, merged };
}

const pathVertexShader = `
  attribute float aOpacity;
  varying float vOpacity;
  void main() {
    vOpacity = aOpacity;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const pathFragmentShader = `
  uniform vec3 uColor;
  varying float vOpacity;
  void main() {
    gl_FragColor = vec4(uColor, vOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

interface DataPathsProps {
  state: HeroState;
  now: number;
  animate: boolean;
  lightMode?: boolean;
  sampleRef: MutableRefObject<RouteSample | null>;
  reducedMotion: boolean;
}

export function DataPaths({
  state,
  now,
  animate,
  lightMode = false,
  sampleRef,
  reducedMotion,
}: DataPathsProps) {
  const packet = useRef<THREE.Mesh>(null);
  const requestMarker = useRef<THREE.Mesh>(null);
  const telemetryPackets = useRef<THREE.InstancedMesh>(null);
  const dimmed = useMemo(() => dimmedEdges(state.failed), [state.failed]);
  const { paths, merged } = useMemo(buildPaths, []);
  const curves = useMemo(() => new Map(paths.map(({ edge, curve }) => [edge.id, curve])), [paths]);
  const telemetry = useMemo(() => EDGES.filter((edge) => edge.kind === "telemetry"), []);
  const usedFallbacks = useMemo(
    () =>
      new Set(
        state.route?.hops
          .filter((hop) => EDGES.some((edge) => edge.id === hop.edgeId && edge.kind === "fallback"))
          .map((hop) => hop.edgeId) ?? []
      ),
    [state.route]
  );
  const telemetryTransform = useMemo(() => new THREE.Object3D(), []);
  const telemetryGeometry = useMemo(() => new THREE.SphereGeometry(1, 8, 8), []);
  const telemetryMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#9ca8ad", transparent: true, opacity: 0.62 }),
    []
  );
  const pathMaterials = useMemo(
    () =>
      new Map(
        PATH_KINDS.map((kind) => [
          kind,
          new THREE.ShaderMaterial({
            uniforms: {
              uColor: {
                value: new THREE.Color(lightMode ? LIGHT_EDGE_COLOR[kind] : EDGE_COLOR[kind]),
              },
            },
            vertexShader: pathVertexShader,
            fragmentShader: pathFragmentShader,
            transparent: true,
            depthWrite: false,
          }),
        ])
      ),
    [lightMode]
  );

  useLayoutEffect(() => {
    for (const path of merged) {
      const attribute = path.geometry.getAttribute("aOpacity") as THREE.BufferAttribute;
      for (const range of path.ranges) {
        const active =
          state.hovered === range.edge.from ||
          state.hovered === range.edge.to ||
          state.selected === range.edge.from ||
          state.selected === range.edge.to;
        const visible = range.edge.kind !== "fallback" || usedFallbacks.has(range.edge.id);
        const opacity = !visible
          ? 0
          : dimmed.has(range.edge.id)
            ? 0.13
            : range.edge.kind === "telemetry"
              ? active
                ? 0.42
                : 0.18
              : active
                ? 0.82
                : 0.29;
        for (let vertex = range.start; vertex < range.start + range.count; vertex++) {
          attribute.setX(vertex, opacity);
        }
      }
      attribute.needsUpdate = true;
    }
  }, [dimmed, merged, state.hovered, state.selected, usedFallbacks]);

  useFrame((frame) => {
    const time = animate ? frame.clock.elapsedTime : now;
    const telemetryMesh = telemetryPackets.current;
    if (telemetryMesh) {
      for (let index = 0; index < telemetry.length; index++) {
        const curve = curves.get(telemetry[index].id);
        if (!curve) continue;
        const phase = reducedMotion ? 0 : (time * 0.13 + index / telemetry.length) % 1;
        curve.getPointAt(phase, telemetryTransform.position);
        telemetryTransform.scale.setScalar(reducedMotion ? 0.0001 : 0.022);
        telemetryTransform.updateMatrix();
        telemetryMesh.setMatrixAt(index, telemetryTransform.matrix);
      }
      telemetryMesh.instanceMatrix.needsUpdate = true;
    }

    const sample = sampleRef.current;
    const packetMesh = packet.current;
    if (packetMesh) {
      if (!sample || reducedMotion) packetMesh.visible = false;
      else {
        const curve = curves.get(sample.edgeId);
        if (!curve) packetMesh.visible = false;
        else {
          packetMesh.visible = true;
          curve.getPointAt(sample.progress, packetMesh.position);
          const material = packetMesh.material as THREE.MeshBasicMaterial;
          material.color.copy(sample.status === "blocked" ? PACKET_ERROR : PACKET_AMBER);
          material.opacity =
            sample.status === "blocked" ? Math.max(0.08, 1 - sample.progress * 2) : 0.95;
        }
      }
    }

    if (requestMarker.current) {
      const markerTime = reducedMotion ? 0 : time;
      requestMarker.current.position.y = 1.12 + 0.86 + Math.sin(markerTime * 0.8) * 0.06;
    }
  });

  return (
    <group>
      {merged.map(({ kind, geometry }) => (
        <mesh key={kind} geometry={geometry} material={pathMaterials.get(kind)} />
      ))}
      <mesh ref={packet} visible={false} scale={0.055}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshBasicMaterial color="#ffc766" transparent opacity={1} />
      </mesh>
      <instancedMesh
        ref={telemetryPackets}
        args={[telemetryGeometry, telemetryMaterial, telemetry.length]}
      />
      <mesh
        ref={requestMarker}
        visible={state.mode === "request"}
        position={[0, 1.98, 0]}
        scale={0.03}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color="#ffc766" />
      </mesh>
    </group>
  );
}
