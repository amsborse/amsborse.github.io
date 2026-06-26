import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface PhysicalTextProps {
  position: [number, number, number];
  text: string;
  size?: number;
  color?: string;
  mass?: number;
}

export default function PhysicalText({ position, text, size = 1, color = '#ffffff', mass = 1 }: PhysicalTextProps) {
  const textRef = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (textRef.current) {
      // Add subtle floating physics based on mass
      textRef.current.position.y += Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.002 * (1 / mass);
    }
  });

  return (
    <Text
      ref={textRef}
      position={position}
      fontSize={size}
      color={color}
      anchorX="center"
      anchorY="middle"
      castShadow
      receiveShadow
      // Standard material for physical lighting interaction
      material-type="MeshStandardMaterial"
      material-roughness={0.2}
      material-metalness={0.8}
      depthOffset={1}
    >
      {text}
    </Text>
  );
}
