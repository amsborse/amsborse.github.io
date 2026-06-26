import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function GodParticles({ count = 2000 }) {
  const pointsRef = useRef<THREE.Points>(null);
  const introScaleRef = useRef(0);

  const { particlesPosition, particlesColor } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    // Exact colors matching the 2D InteractiveParticles theme
    const themeColors = [
      new THREE.Color('#38bdf8'), // Neon Cyan
      new THREE.Color('#a855f7'), // Neon Purple
      new THREE.Color('#f59e0b'), // Cosmic Gold
      new THREE.Color('#ec4899'), // Nebula Pink
    ];

    for (let i = 0; i < count; i++) {
      // Spherical distribution
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 3 + Math.random() * 4; // Radius between 3 and 7

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const color = themeColors[Math.floor(Math.random() * themeColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    return { particlesPosition: positions, particlesColor: colors };
  }, [count]);

  useFrame((state, delta) => {
    // Smoothly scale up from 0 to 1 on load (syncs with canvas fade)
    if (introScaleRef.current < 1.0) {
      introScaleRef.current = THREE.MathUtils.damp(introScaleRef.current, 1.0, 0.8, delta);
    }

    if (pointsRef.current) {
      pointsRef.current.scale.setScalar(introScaleRef.current);
      
      // Idle slow spin
      pointsRef.current.rotation.y -= delta * 0.02;
      
      // Interactive mouse tilt: align the rotation angle with current pointer coordinates
      const targetRotationX = state.pointer.y * 0.22;
      const targetRotationY = -state.pointer.x * 0.22;
      
      pointsRef.current.rotation.x = THREE.MathUtils.damp(pointsRef.current.rotation.x, targetRotationX, 1.8, delta);
      pointsRef.current.rotation.y = THREE.MathUtils.damp(pointsRef.current.rotation.y, pointsRef.current.rotation.y + targetRotationY * 0.02, 1.8, delta);
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[particlesPosition, 3]}
          count={particlesPosition.length / 3}
          array={particlesPosition}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[particlesColor, 3]}
          count={particlesColor.length / 3}
          array={particlesColor}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={0.065}
        transparent
        opacity={0.75}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
