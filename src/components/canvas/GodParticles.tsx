import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function GodParticles({ count = 2000 }) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const introScaleRef = useRef(0);
  const isMouseDown = useRef(false);

  // Track mouse click state locally
  useEffect(() => {
    const handleDown = () => { isMouseDown.current = true; };
    const handleUp = () => { isMouseDown.current = false; };
    window.addEventListener('mousedown', handleDown);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchstart', handleDown);
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchstart', handleDown);
      window.removeEventListener('touchend', handleUp);
    };
  }, []);

  const { particlesPosition, particlesColor } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    const themeColors = [
      new THREE.Color('#38bdf8'), // Neon Cyan
      new THREE.Color('#a855f7'), // Neon Purple
      new THREE.Color('#f59e0b'), // Cosmic Gold
      new THREE.Color('#ec4899'), // Nebula Pink
    ];

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 3.2 + Math.random() * 3.8; // Radius between 3.2 and 7.0

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

  // Keep a copy of the baseline positions for offset calculations
  const baselinePositions = useMemo(() => new Float32Array(particlesPosition), [particlesPosition]);
  // Offset arrays for the delta deviation (x, y, z) for each particle
  const particleOffsets = useRef(new Float32Array(count * 3));

  useFrame((state, delta) => {
    // Smoothly scale up from 0 to 1 on load (syncs with canvas fade)
    if (introScaleRef.current < 1.0) {
      introScaleRef.current = THREE.MathUtils.damp(introScaleRef.current, 1.0, 0.8, delta);
    }

    if (materialRef.current) {
      // Fade opacity in unison with scale
      materialRef.current.opacity = introScaleRef.current * 0.75;
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

      // Perform local particle attraction and repulsion
      const posAttr = pointsRef.current.geometry.attributes.position;
      const posArray = posAttr.array as Float32Array;
      const offsets = particleOffsets.current;

      // Cursor position mapped to approximate WebGL coordinates
      const pointerX = state.pointer.x * 5.5;
      const pointerY = state.pointer.y * 5.5;
      const isClick = isMouseDown.current;

      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        
        // Baseline coordinates
        const bx = baselinePositions[idx];
        const by = baselinePositions[idx + 1];
        const bz = baselinePositions[idx + 2];

        // Current coordinates
        const cx = bx + offsets[idx];
        const cy = by + offsets[idx + 1];
        const cz = bz + offsets[idx + 2];

        // Distance from current particle position to cursor (projected on z plane)
        const dx = pointerX - cx;
        const dy = pointerY - cy;
        const dz = 0 - cz;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (isClick) {
          // Attract towards mouse cursor (more intense)
          // Build up speed progressively based on z-depth
          const strength = 0.04 * (1.5 / (bz + 8.5));
          offsets[idx] += (pointerX - bx - offsets[idx]) * strength;
          offsets[idx + 1] += (pointerY - by - offsets[idx + 1]) * strength;
          offsets[idx + 2] += (0 - bz - offsets[idx + 2]) * strength;
        } else {
          // Decay offset back to normal baseline
          offsets[idx] += (0 - offsets[idx]) * 0.06;
          offsets[idx + 1] += (0 - offsets[idx + 1]) * 0.06;
          offsets[idx + 2] += (0 - offsets[idx + 2]) * 0.06;

          // Repel gently on hover
          const maxRepelDist = 3.2;
          if (dist < maxRepelDist) {
            const force = (maxRepelDist - dist) / maxRepelDist;
            offsets[idx] -= (dx / dist) * force * delta * 5.0;
            offsets[idx + 1] -= (dy / dist) * force * delta * 5.0;
          }
        }

        // Apply updated coordinates
        posArray[idx] = bx + offsets[idx];
        posArray[idx + 1] = by + offsets[idx + 1];
        posArray[idx + 2] = bz + offsets[idx + 2];
      }

      posAttr.needsUpdate = true;
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
        ref={materialRef}
        vertexColors
        size={0.065}
        transparent
        opacity={0.0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
