import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { EDGES, type Edge, type ServiceId } from "../topology";
import { dimmedEdges, type HeroState, type RouteSample } from "../simulation";
import { servicePosition } from "../layout";

const EDGE_COLOR: Record<Edge["kind"], string> = {
  request: "#ffc766",
  response: "#dec89e",
  telemetry: "#89949a",
  fallback: "#ffb74f",
};
const PACKET_AMBER = new THREE.Color("#ffc766");
const PACKET_ERROR = new THREE.Color("#ff686b");

interface PathMesh {
  edge: Edge;
  curve: THREE.QuadraticBezierCurve3;
  geometry: THREE.BufferGeometry;
  line?: THREE.Line<THREE.BufferGeometry, THREE.LineDashedMaterial>;
}

function makePath(edge: Edge) {
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
  return EDGES.map((edge): PathMesh => {
    const curve = makePath(edge);
    if (edge.kind === "telemetry") {
      const points = curve.getPoints(48);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(
        geometry,
        new THREE.LineDashedMaterial({
          color: EDGE_COLOR.telemetry,
          dashSize: 0.095,
          gapSize: 0.085,
          transparent: true,
          opacity: 0.18,
        })
      );
      line.computeLineDistances();
      return { edge, curve, geometry, line };
    }
    return { edge, curve, geometry: new THREE.TubeGeometry(curve, 32, 0.014, 5, false) };
  });
}

interface DataPathsProps {
  state: HeroState;
  now: number;
  sampleRef: MutableRefObject<RouteSample | null>;
  reducedMotion: boolean;
}

export function DataPaths({ state, now, sampleRef, reducedMotion }: DataPathsProps) {
  const packet = useRef<THREE.Mesh>(null);
  const telemetryPackets = useRef<(THREE.Mesh | null)[]>([]);
  const dimmed = useMemo(() => dimmedEdges(state.failed), [state.failed]);
  const paths = useMemo(buildPaths, []);
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
  const endpointActive = (id: ServiceId) => state.hovered === id || state.selected === id;

  useFrame(() => {
    for (let index = 0; index < telemetry.length; index++) {
      const edge = telemetry[index];
      const mesh = telemetryPackets.current[index];
      const curve = curves.get(edge.id);
      if (!mesh || !curve) continue;
      if (reducedMotion) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      curve.getPointAt((now * 0.13 + index / telemetry.length) % 1, mesh.position);
    }
    const sample = sampleRef.current;
    const mesh = packet.current;
    if (!mesh) return;
    if (!sample || reducedMotion) {
      mesh.visible = false;
      return;
    }
    const curve = curves.get(sample.edgeId);
    if (!curve) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    curve.getPointAt(sample.progress, mesh.position);
    const material = mesh.material as THREE.MeshBasicMaterial;
    material.color.copy(sample.status === "blocked" ? PACKET_ERROR : PACKET_AMBER);
    material.opacity = sample.status === "blocked" ? Math.max(0.08, 1 - sample.progress * 2) : 0.95;
  });

  return (
    <group>
      {paths.map(({ edge, geometry, line }) => {
        const active = endpointActive(edge.from) || endpointActive(edge.to);
        const visible = edge.kind !== "fallback" || usedFallbacks.has(edge.id);
        const focus = state.hovered ?? state.selected;
        const opacity = !visible
          ? 0
          : dimmed.has(edge.id)
            ? 0.13
            : edge.kind === "telemetry"
              ? active
                ? 0.42
                : 0.18
              : active
                ? 0.82
                : 0.29;
        const showDirection = visible && focus === edge.from && edge.kind !== "telemetry";
        const curve = curves.get(edge.id)!;
        const arrowPosition = showDirection ? curve.getPointAt(0.68) : null;
        const arrowQuaternion = showDirection
          ? new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 1, 0),
              curve.getTangentAt(0.68)
            )
          : null;
        if (line) {
          line.material.opacity = opacity;
        }
        return (
          <group key={edge.id}>
            {line ? (
              <primitive object={line} />
            ) : (
              <mesh geometry={geometry}>
                <meshBasicMaterial
                  color={EDGE_COLOR[edge.kind]}
                  transparent
                  opacity={opacity}
                  depthWrite={false}
                />
              </mesh>
            )}
            {arrowPosition && arrowQuaternion && (
              <mesh
                position={arrowPosition}
                quaternion={arrowQuaternion}
                visible={opacity > 0.3}
                scale={0.62}
              >
                <coneGeometry args={[0.045, 0.12, 5]} />
                <meshBasicMaterial color={EDGE_COLOR[edge.kind]} />
              </mesh>
            )}
          </group>
        );
      })}
      <mesh ref={packet} visible={false} scale={0.055}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshBasicMaterial color="#ffc766" transparent opacity={1} />
      </mesh>
      {telemetry.map((edge, index) => (
        <mesh
          key={edge.id}
          ref={(mesh) => {
            telemetryPackets.current[index] = mesh;
          }}
          scale={0.022}
        >
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color="#9ca8ad" transparent opacity={0.62} />
        </mesh>
      ))}
      <group visible={state.mode === "request"} position={[0, 1.12, 0]}>
        <mesh
          position={[0, 0.86 + Math.sin(now * (reducedMotion ? 0.02 : 0.8)) * 0.06, 0]}
          scale={0.03}
        >
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color="#ffc766" />
        </mesh>
      </group>
    </group>
  );
}
