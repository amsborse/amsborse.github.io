import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface ProjectMonolithProps {
  position: [number, number, number];
  title: string;
  category: string;
  index: number;
}

export default function ProjectMonolith({ position, title, category, index }: ProjectMonolithProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Subtle hovering physics
      groupRef.current.position.y += Math.sin(state.clock.elapsedTime * 1.5 + index) * 0.001;
      
      // Keep monoliths oriented roughly towards the center but slightly angled
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5 + index) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* The solid, brutalist monolith body */}
      <mesh ref={meshRef} castShadow receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[4, 2.5, 0.5]} />
        <meshStandardMaterial 
          color="#0a0c10" 
          roughness={0.1} 
          metalness={0.9} 
        />
      </mesh>

      {/* Embedded solid typography on the monolith face */}
      <Text
        position={[0, 0.4, 0.26]}
        fontSize={0.3}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        material-type="MeshStandardMaterial"
        material-roughness={0.3}
        material-metalness={0.7}
      >
        {title.toUpperCase()}
      </Text>

      <Text
        position={[0, -0.4, 0.26]}
        fontSize={0.15}
        color="#88aaff"
        anchorX="center"
        anchorY="middle"
        material-type="MeshStandardMaterial"
        material-roughness={0.3}
        material-metalness={0.7}
      >
        [{category.toUpperCase()}]
      </Text>

      {/* Subtle edge highlight / glow */}
      <mesh position={[0, 0, -0.26]}>
        <boxGeometry args={[4.1, 2.6, 0.1]} />
        <meshBasicMaterial color="#0044ff" transparent opacity={0.1} />
      </mesh>
    </group>
  );
}
