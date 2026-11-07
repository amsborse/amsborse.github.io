import { ORBITS, SERVICES, type ServiceId } from "./topology";

export type Vec3Tuple = readonly [number, number, number];

/** Visual-only placement. Service angles and orbit dimensions stay authoritative in topology.ts. */
export const servicePosition = (id: ServiceId): Vec3Tuple => {
  const service = SERVICES.find((candidate) => candidate.id === id);
  if (!service) throw new Error(`Unknown service ${id}`);
  const orbit = ORBITS.find((candidate) => candidate.id === service.orbit);
  if (!orbit) throw new Error(`Unknown orbit ${service.orbit}`);

  const x = Math.cos(service.angle) * orbit.radius;
  const z = Math.sin(service.angle) * orbit.radius;
  const [tiltX, tiltZ] = orbit.tilt;
  const rotatedY = -z * Math.sin(tiltX);
  const tiltedZ = z * Math.cos(tiltX);
  return [
    x * Math.cos(tiltZ) - rotatedY * Math.sin(tiltZ),
    x * Math.sin(tiltZ) + rotatedY * Math.cos(tiltZ),
    tiltedZ,
  ];
};

/** Sphere coordinates reuse the service's orbit slot and normalize it onto the core surface. */
export const coreNodePosition = (id: ServiceId, radius = 0.78): Vec3Tuple => {
  const [x, y, z] = servicePosition(id);
  const length = Math.hypot(x, y, z) || 1;
  return [(x / length) * radius, (y / length) * radius, (z / length) * radius];
};

export const ISLAND = {
  center: [-1, -0.9, 0] as Vec3Tuple,
  width: 5.8,
  depth: 2.35,
  height: 0.74,
  tree: [-1.28, 0.3, 0.08] as Vec3Tuple,
  falls: [[-0.52, -0.3, 0.94] as Vec3Tuple, [0.82, -0.32, 0.83] as Vec3Tuple],
};

export const CAMERA = {
  fov: 34,
  position: [0.15, 1.95, 10.8] as Vec3Tuple,
  lookAt: [0.12, 0.12, 0] as Vec3Tuple,
};
