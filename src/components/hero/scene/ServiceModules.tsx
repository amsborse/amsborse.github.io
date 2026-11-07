import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { dependenciesOf, SERVICES, type ServiceId } from "../topology";
import type { HeroState } from "../simulation";
import { servicePosition } from "../layout";

const LED_RED = new THREE.Color("#ff686b");
const LED_GREEN = new THREE.Color("#5bd68d");
const LED_AMBER = new THREE.Color("#ffc766");

interface ServiceModulesProps {
  state: HeroState;
  now: number;
  onHover: (id: ServiceId | null) => void;
  onSelect: (id: ServiceId) => void;
}

export function ServiceModules({ state, now, onHover, onSelect }: ServiceModulesProps) {
  const ledRefs = useRef<Record<ServiceId, THREE.Mesh | null>>({
    gateway: null,
    policy: null,
    ingest: null,
    orchestrator: null,
    inference: null,
    storage: null,
    observability: null,
  });
  const slabGeometry = useMemo(() => new THREE.BoxGeometry(0.52, 0.11, 0.42), []);
  const dependencies = useMemo(() => {
    const focus = state.hovered ?? state.selected;
    if (!focus) return new Set<ServiceId>();
    const graph = dependenciesOf(focus);
    return new Set([focus, ...graph.upstream, ...graph.downstream]);
  }, [state.hovered, state.selected]);

  useFrame(() => {
    for (const service of SERVICES) {
      const led = ledRefs.current[service.id];
      if (!led) continue;
      const material = led.material as THREE.MeshBasicMaterial;
      if (state.failed === service.id) material.color.copy(LED_RED);
      else if (state.recovering === service.id) {
        const elapsed = state.startedAt === null ? 0 : Math.max(0, now - state.startedAt);
        if (elapsed < 1.6) material.color.copy(LED_RED).lerp(LED_GREEN, elapsed / 1.6);
        else material.color.copy(LED_GREEN).lerp(LED_AMBER, Math.min((elapsed - 1.6) / 0.8, 1));
      } else material.color.copy(LED_AMBER);
    }
  });

  return (
    <group>
      {SERVICES.map((service) => {
        const [x, y, z] = servicePosition(service.id);
        const position: [number, number, number] = [x, y + 1.12, z];
        const failed = state.failed === service.id;
        const emphasized = !state.hovered || dependencies.has(service.id);

        return (
          <group
            key={service.id}
            position={position}
            scale={emphasized ? 1 : 0.86}
            onPointerOver={(event) => {
              event.stopPropagation();
              onHover(service.id);
            }}
            onPointerOut={(event) => {
              event.stopPropagation();
              onHover(null);
            }}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(service.id);
            }}
          >
            <mesh geometry={slabGeometry} position={[0, -0.1, 0]} castShadow receiveShadow>
              <meshStandardMaterial
                color={failed ? "#211d19" : "#24221c"}
                metalness={0.55}
                roughness={0.38}
                transparent={failed}
                opacity={failed ? 0.6 : 1}
              />
            </mesh>
            <mesh position={[0, -0.035, 0]} scale={[0.38, 0.018, 0.3]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#365132" roughness={0.92} />
            </mesh>
            {service.id === "gateway" && (
              <group position={[0, 0.14, 0]}>
                <mesh position={[-0.11, 0.07, 0]} castShadow>
                  <boxGeometry args={[0.07, 0.29, 0.09]} />
                  <meshStandardMaterial color="#4b4436" metalness={0.65} roughness={0.3} />
                </mesh>
                <mesh position={[0.11, 0.07, 0]} castShadow>
                  <boxGeometry args={[0.07, 0.29, 0.09]} />
                  <meshStandardMaterial color="#4b4436" metalness={0.65} roughness={0.3} />
                </mesh>
                <mesh position={[0, 0.23, 0]}>
                  <torusGeometry args={[0.11, 0.035, 8, 20, Math.PI]} />
                  <meshStandardMaterial color="#aa8853" metalness={0.8} roughness={0.22} />
                </mesh>
              </group>
            )}
            {service.id === "storage" && (
              <group position={[0, 0.09, 0]}>
                {[0, 1, 2].map((tier) => (
                  <mesh key={tier} position={[0, tier * 0.085, 0]} castShadow>
                    <boxGeometry args={[0.27 - tier * 0.025, 0.065, 0.24 - tier * 0.02]} />
                    <meshStandardMaterial color="#383a37" metalness={0.58} roughness={0.32} />
                  </mesh>
                ))}
              </group>
            )}
            {service.id === "observability" && (
              <group position={[0, 0.18, 0]}>
                <mesh position={[0, 0.11, 0]}>
                  <cylinderGeometry args={[0.018, 0.024, 0.38, 8]} />
                  <meshStandardMaterial color="#c2a364" metalness={0.75} roughness={0.25} />
                </mesh>
                <mesh position={[0, 0.3, 0]}>
                  <sphereGeometry args={[0.055, 12, 10]} />
                  <meshBasicMaterial color="#ffc766" />
                </mesh>
              </group>
            )}
            {service.id === "policy" && (
              <mesh position={[0, 0.16, 0]} rotation={[0.12, 0, 0]} castShadow>
                <octahedronGeometry args={[0.18, 0]} />
                <meshStandardMaterial color="#534934" metalness={0.68} roughness={0.27} />
              </mesh>
            )}
            {service.id === "ingest" && (
              <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.12, 0.12, 0.25, 16]} />
                <meshStandardMaterial color="#4c4638" metalness={0.66} roughness={0.3} />
              </mesh>
            )}
            {(service.id === "inference" || service.id === "orchestrator") && (
              <group position={[0, 0.08, 0]}>
                <mesh position={[0, 0.095, 0]} castShadow>
                  <boxGeometry
                    args={service.id === "inference" ? [0.18, 0.22, 0.18] : [0.26, 0.18, 0.24]}
                  />
                  <meshStandardMaterial color="#4b4436" metalness={0.64} roughness={0.28} />
                </mesh>
                {service.id === "orchestrator" && (
                  <mesh position={[0.16, 0.02, 0]} rotation={[0, Math.PI / 4, 0]}>
                    <octahedronGeometry args={[0.105, 0]} />
                    <meshStandardMaterial color="#6c5535" metalness={0.7} roughness={0.23} />
                  </mesh>
                )}
              </group>
            )}
            <mesh
              ref={(mesh) => {
                ledRefs.current[service.id] = mesh;
              }}
              position={[0, 0.09, 0.215]}
              scale={[0.19, 0.055, 0.012]}
            >
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial
                color={failed ? "#ff686b" : "#ffc766"}
                transparent
                opacity={state.hovered || state.selected === service.id ? 1 : 0.75}
              />
            </mesh>
            <mesh position={[0, -0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.36, 0.4, 48]} />
              <meshBasicMaterial
                color={failed ? "#ff686b" : "#ffc766"}
                transparent
                opacity={
                  state.selected === service.id ? 0.75 : state.hovered === service.id ? 0.5 : 0
                }
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh position={[0, 0.085, 0.3]} scale={0.045}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshBasicMaterial color={failed ? "#ff686b" : "#ffc766"} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
