import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

interface GravityWellProps {
  particleCount?: number;
  diskSpeed?: number;
  colorTheme?: "indigo" | "amber" | "emerald";
  autoColor?: boolean;
}

function AccretionDisk({
  particleCount = 2000,
  diskSpeed = 1.0,
  colorTheme = "indigo",
  autoColor = false,
}: GravityWellProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const shaderMaterialRef = useRef<THREE.ShaderMaterial>(null);

  const colors = useMemo(() => {
    switch (colorTheme) {
      case "amber":
        return {
          core: new THREE.Color("#f59e0b"),
          outer: new THREE.Color("#d97706"),
        };
      case "emerald":
        return {
          core: new THREE.Color("#10b981"),
          outer: new THREE.Color("#059669"),
        };
      default: // indigo
        return {
          core: new THREE.Color("#06b6d4"),
          outer: new THREE.Color("#4f46e5"),
        };
    }
  }, [colorTheme]);

  // Build spiral disk particles
  const [positions, speeds, randoms] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const spds = new Float32Array(particleCount);
    const rnds = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Logarithmic spiral math: r = a * e^(b*theta)
      const theta = Math.random() * Math.PI * 8; // 4 rotations
      const r = 1.2 + Math.pow(Math.random(), 1.5) * 4.5; // accretion disk boundary

      const angle = theta + (i % 2 === 0 ? 0 : Math.PI); // 2 spiral arms

      pos[i * 3] = r * Math.cos(angle);
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.15 * (5.5 - r); // thinner towards edge
      pos[i * 3 + 2] = r * Math.sin(angle);

      spds[i] = (2.0 / Math.sqrt(r)) * diskSpeed; // Keplerian rotation velocity: slower further out

      rnds[i * 3] = Math.random();
      rnds[i * 3 + 1] = Math.random();
      rnds[i * 3 + 2] = Math.random();
    }

    return [pos, spds, rnds];
  }, [particleCount, diskSpeed]);

  useFrame((state, delta) => {
    if (!pointsRef.current || !shaderMaterialRef.current) return;

    // Rotate accretion disk particles
    const positionsAttr = pointsRef.current.geometry.attributes.position;
    const array = positionsAttr.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      const x = array[idx];
      const z = array[idx + 2];
      const r = Math.hypot(x, z);

      // Rotate x and z coordinates based on speeds
      const angVel = speeds[i] * delta * 0.45;
      const cosVal = Math.cos(angVel);
      const sinVal = Math.sin(angVel);

      array[idx] = x * cosVal - z * sinVal;
      array[idx + 2] = x * sinVal + z * cosVal;
    }

    positionsAttr.needsUpdate = true;

    // Auto color cycling through spectrum
    if (autoColor && shaderMaterialRef.current) {
      const hue = (state.clock.getElapsedTime() * 0.08) % 1;
      const activeColor = new THREE.Color().setHSL(hue, 0.85, 0.55);
      shaderMaterialRef.current.uniforms.uColor.value.copy(activeColor);
    } else if (shaderMaterialRef.current) {
      shaderMaterialRef.current.uniforms.uColor.value.copy(colors.core);
    }

    shaderMaterialRef.current.uniforms.uTime.value += delta;
  });

  const vertexShader = `
    uniform float uTime;
    varying float vDistance;
    void main() {
      vDistance = length(position.xz);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = (14.0 / -mvPosition.z) * (1.0 + sin(uTime * 2.0 + position.x) * 0.2);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = `
    uniform vec3 uColor;
    varying float vDistance;
    void main() {
      // Draw circular soft glow particles
      float distToCenter = length(gl_PointCoord - vec2(0.5));
      if (distToCenter > 0.5) discard;
      float alpha = smoothstep(0.5, 0.1, distToCenter) * (0.85 / (vDistance * 0.45));
      gl_FragColor = vec4(uColor, alpha);
    }
  `;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderMaterialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uColor: { value: colors.core.clone() },
        }}
        transparent={true}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export default function GravityWell({
  particleCount = 2000,
  diskSpeed = 1.0,
  colorTheme = "indigo",
  autoColor = false,
}: GravityWellProps) {
  return (
    <div className="w-full h-full min-h-[400px] bg-black/90 rounded-2xl overflow-hidden border border-white/5 relative">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 4, 7]} fov={45} />
        <ambientLight intensity={0.1} />
        <directionalLight position={[0, 5, 0]} intensity={1.0} />
        <Environment preset="city" />

        {/* Singularity Horizon */}
        <mesh>
          <sphereGeometry args={[1.0, 32, 32]} />
          <meshBasicMaterial color="#000000" />
        </mesh>

        <AccretionDisk
          particleCount={particleCount}
          diskSpeed={diskSpeed}
          colorTheme={colorTheme}
          autoColor={autoColor}
        />
      </Canvas>
    </div>
  );
}
