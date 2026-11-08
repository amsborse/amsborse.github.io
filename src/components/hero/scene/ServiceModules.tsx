import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { SERVICES, type ServiceId } from "../topology";
import type { HeroState } from "../simulation";
import { servicePosition } from "../layout";

const RED = new THREE.Color("#ff686b");
const GREEN = new THREE.Color("#5bd68d");
const AMBER = new THREE.Color("#ffc766");
const AMBER_LIGHT = new THREE.Color("#9b6a32");
const STATUS = new THREE.Color();
const DIM_STATUS = new THREE.Color("#4c493f");
const SERVICE_Y = 1.12;
const SERVICE_POSITIONS = SERVICES.map((service) => servicePosition(service.id));

interface ServiceModulesProps {
  state: HeroState;
  now: number;
  animate: boolean;
  lightMode?: boolean;
  onHover: (id: ServiceId | null) => void;
  onSelect: (id: ServiceId) => void;
}

export function ServiceModules({
  state,
  now,
  animate,
  lightMode = false,
  onHover,
  onSelect,
}: ServiceModulesProps) {
  const structureRef = useRef<THREE.InstancedMesh>(null);
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const detailsRef = useRef<THREE.InstancedMesh>(null);
  const statusRef = useRef<THREE.InstancedMesh>(null);
  const transform = useMemo(() => new THREE.Object3D(), []);
  const structureGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const bodyGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const detailGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const statusGeometry = useMemo(() => new THREE.RingGeometry(0.31, 0.35, 40), []);
  const structureMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 0.64, roughness: 0.34 }),
    []
  );
  const bodyMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 0.56, roughness: 0.3 }),
    []
  );
  const detailMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }),
    []
  );
  const statusMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    []
  );

  useLayoutEffect(() => {
    const structure = structureRef.current;
    const body = bodyRef.current;
    const details = detailsRef.current;
    const status = statusRef.current;
    if (!structure || !body || !details || !status) return;

    SERVICES.forEach((service, index) => {
      const [x, y, z] = SERVICE_POSITIONS[index];
      const moduleY = y + SERVICE_Y;
      transform.position.set(x, moduleY - 0.11, z);
      transform.rotation.set(0, service.angle * 0.12, 0);
      transform.scale.set(0.58, 0.12, 0.45);
      transform.updateMatrix();
      structure.setMatrixAt(index, transform.matrix);
      structure.setColorAt(index, new THREE.Color(lightMode ? "#574f43" : "#252521"));

      transform.position.set(x, moduleY + 0.045, z);
      transform.scale.set(0.36, 0.24 + (index % 3) * 0.025, 0.32);
      transform.updateMatrix();
      body.setMatrixAt(index, transform.matrix);
      body.setColorAt(index, new THREE.Color(lightMode ? "#736957" : "#3b3b35"));

      transform.position.set(x, moduleY + 0.19, z);
      transform.scale.set(0.41, 0.035, 0.37);
      transform.updateMatrix();
      structure.setMatrixAt(index + SERVICES.length, transform.matrix);
      structure.setColorAt(
        index + SERVICES.length,
        new THREE.Color(lightMode ? "#95866c" : "#4b463a")
      );

      for (let windowIndex = 0; windowIndex < 4; windowIndex++) {
        const detailIndex = index * 4 + windowIndex;
        const isIndicator = windowIndex === 3;
        transform.position.set(
          x + (isIndicator ? 0 : (windowIndex - 1) * 0.105),
          moduleY + (isIndicator ? -0.07 : 0.045),
          z + 0.164
        );
        transform.rotation.set(0, 0, 0);
        transform.scale.set(isIndicator ? 0.26 : 0.062, isIndicator ? 0.035 : 0.105, 0.018);
        transform.updateMatrix();
        details.setMatrixAt(detailIndex, transform.matrix);
        details.setColorAt(
          detailIndex,
          new THREE.Color(
            isIndicator ? (lightMode ? "#bf8541" : "#ffc766") : lightMode ? "#c58c48" : "#f6ac45"
          )
        );
      }

      transform.position.set(x, moduleY - 0.022, z);
      transform.rotation.set(-Math.PI / 2, 0, 0);
      transform.scale.setScalar(0.0001);
      transform.updateMatrix();
      status.setMatrixAt(index, transform.matrix);
      status.setColorAt(index, DIM_STATUS);
    });

    structure.instanceMatrix.needsUpdate = true;
    body.instanceMatrix.needsUpdate = true;
    details.instanceMatrix.needsUpdate = true;
    status.instanceMatrix.needsUpdate = true;
    if (structure.instanceColor) structure.instanceColor.needsUpdate = true;
    if (body.instanceColor) body.instanceColor.needsUpdate = true;
    if (details.instanceColor) details.instanceColor.needsUpdate = true;
    if (status.instanceColor) status.instanceColor.needsUpdate = true;
  }, [bodyGeometry, detailGeometry, lightMode, statusGeometry, structureGeometry, transform]);

  const structurePointerOver = (event: ThreeEvent<PointerEvent>) => {
    if (event.instanceId === undefined) return;
    event.stopPropagation();
    onHover(SERVICES[event.instanceId % SERVICES.length].id);
  };
  const detailPointerOver = (event: ThreeEvent<PointerEvent>) => {
    if (event.instanceId === undefined) return;
    event.stopPropagation();
    onHover(SERVICES[Math.floor(event.instanceId / 4)].id);
  };
  const structureClick = (event: ThreeEvent<MouseEvent>) => {
    if (event.instanceId === undefined) return;
    event.stopPropagation();
    onSelect(SERVICES[event.instanceId % SERVICES.length].id);
  };
  const detailClick = (event: ThreeEvent<MouseEvent>) => {
    if (event.instanceId === undefined) return;
    event.stopPropagation();
    onSelect(SERVICES[Math.floor(event.instanceId / 4)].id);
  };
  const pointerOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    onHover(null);
  };

  useFrame((frame) => {
    const status = statusRef.current;
    const details = detailsRef.current;
    if (!status || !details) return;
    const pulseTime = animate ? frame.clock.elapsedTime : now;
    const pulse = 0.66 + Math.max(0, Math.sin(pulseTime * 7.5)) * 0.34;

    for (let index = 0; index < SERVICES.length; index++) {
      const service = SERVICES[index];
      const failed = state.failed === service.id;
      const recovering = state.recovering === service.id;
      const focused = state.hovered === service.id || state.selected === service.id;
      const elapsed = state.startedAt === null ? 0 : Math.max(0, now - state.startedAt);
      if (failed) STATUS.copy(RED).multiplyScalar(animate ? pulse : 1);
      else if (recovering && elapsed < 1.6) STATUS.copy(RED).lerp(GREEN, elapsed / 1.6);
      else if (recovering) STATUS.copy(GREEN).lerp(AMBER, Math.min((elapsed - 1.6) / 0.8, 1));
      else STATUS.copy(lightMode ? AMBER_LIGHT : AMBER);

      for (let windowIndex = 0; windowIndex < 4; windowIndex++) {
        details.setColorAt(index * 4 + windowIndex, STATUS);
      }
      const size = failed
        ? 1.04 + (animate ? Math.max(0, Math.sin(pulseTime * 7.5)) * 0.18 : 0)
        : recovering
          ? 1.02
          : focused
            ? 1
            : 0.0001;
      const [x, y, z] = SERVICE_POSITIONS[index];
      transform.position.set(x, y + SERVICE_Y - 0.022, z);
      transform.rotation.set(-Math.PI / 2, 0, 0);
      transform.scale.setScalar(size);
      transform.updateMatrix();
      status.setMatrixAt(index, transform.matrix);
      if (!failed && !recovering && !focused) STATUS.copy(DIM_STATUS);
      status.setColorAt(index, STATUS);
    }
    if (details.instanceColor) details.instanceColor.needsUpdate = true;
    status.instanceMatrix.needsUpdate = true;
    if (status.instanceColor) status.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh
        ref={structureRef}
        args={[structureGeometry, structureMaterial, SERVICES.length * 2]}
        castShadow
        receiveShadow
        onPointerOver={structurePointerOver}
        onPointerOut={pointerOut}
        onClick={structureClick}
      />
      <instancedMesh
        ref={bodyRef}
        args={[bodyGeometry, bodyMaterial, SERVICES.length]}
        castShadow
        receiveShadow
        onPointerOver={structurePointerOver}
        onPointerOut={pointerOut}
        onClick={structureClick}
      />
      <instancedMesh
        ref={detailsRef}
        args={[detailGeometry, detailMaterial, SERVICES.length * 4]}
        onPointerOver={detailPointerOver}
        onPointerOut={pointerOut}
        onClick={detailClick}
      />
      <instancedMesh ref={statusRef} args={[statusGeometry, statusMaterial, SERVICES.length]} />
    </group>
  );
}
