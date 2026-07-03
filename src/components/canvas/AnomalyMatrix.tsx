import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import GodSphere from './GodSphere';

interface AnomalyMatrixProps {
  sphereSpeed: number;
  sphereScale: number;
  colorTheme: 'indigo' | 'amber' | 'emerald';
  particleCount: number;
  particleSpeed: number;
  autoColor?: boolean;
}

function CustomParticles({ count, speed, colorTheme, autoColor = false }: { count: number; speed: number; colorTheme: string; autoColor?: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  const particles = useMemo(() => {
    const data = [];
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 2.5 + Math.random() * 3.5;
      data.push({
        r,
        theta,
        phi,
        rotSpeed: (Math.random() * 0.2 + 0.1) * speed,
      });
    }
    return data;
  }, [count, speed]);

  const pColor = useMemo(() => {
    switch (colorTheme) {
      case 'amber': return '#f59e0b';
      case 'emerald': return '#10b981';
      default: return '#6366f1';
    }
  }, [colorTheme]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const tempObject = new THREE.Object3D();
    const time = state.clock.getElapsedTime();

    if (autoColor && materialRef.current) {
      const hue = (time * 0.08) % 1;
      materialRef.current.color.setHSL(hue, 0.85, 0.55);
    } else if (materialRef.current) {
      materialRef.current.color.set(pColor);
    }

    particles.forEach((p, i) => {
      const curTheta = p.theta + time * p.rotSpeed;
      const x = p.r * Math.sin(p.phi) * Math.cos(curTheta);
      const y = p.r * Math.sin(p.phi) * Math.sin(curTheta);
      const z = p.r * Math.cos(p.phi);

      tempObject.position.set(x, y, z);
      const s = 0.04 + Math.sin(time + i) * 0.015;
      tempObject.scale.set(s, s, s);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null as any, null as any, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial ref={materialRef} color={pColor} transparent opacity={0.7} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  );
}

export default function AnomalyMatrix({
  sphereSpeed,
  sphereScale,
  colorTheme,
  particleCount,
  particleSpeed,
  autoColor = false,
}: AnomalyMatrixProps) {
  const activeColorTheme = autoColor ? undefined : colorTheme;
  // If autoColor is enabled, we'll override colorTheme color mappings by supplying a custom shader uniform hue transition
  
  return (
    <div className="w-full h-full min-h-[400px] bg-black/90 rounded-2xl overflow-hidden border border-white/5 relative">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={45} />
        <ambientLight intensity={0.2} />
        <directionalLight position={[5, 5, 5]} intensity={1.5} />
        <Environment preset="city" />

        <GodSphere speed={sphereSpeed} scale={sphereScale} colorTheme={colorTheme} scrollOverride={0} autoColor={autoColor} />
        <CustomParticles count={particleCount} speed={particleSpeed} colorTheme={colorTheme} autoColor={autoColor} />
      </Canvas>
    </div>
  );
}
