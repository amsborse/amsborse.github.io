import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';

export default function CompanionBird() {
  const groupRef = useRef<THREE.Group>(null);
  const leftWingRef = useRef<THREE.Mesh>(null);
  const rightWingRef = useRef<THREE.Mesh>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  
  const mouseVelocity = useStore((state) => state.mouseVelocity);
  
  const { viewport } = useThree();
  const [idleTime, setIdleTime] = useState(0);
  const [isLanded, setIsLanded] = useState(false);
  
  // Track actual mouse position in world space
  const mousePos = useRef(new THREE.Vector3());
  const targetPos = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    if (!groupRef.current || !leftWingRef.current || !rightWingRef.current) return;

    // Determine target position based on mouse (mapping normalized coordinates to viewport)
    // state.pointer is [-1, 1]
    const mx = (state.pointer.x * viewport.width) / 2;
    const my = (state.pointer.y * viewport.height) / 2;
    
    // Check if mouse is moving
    const speed = Math.sqrt(mouseVelocity.x ** 2 + mouseVelocity.y ** 2);
    
    if (speed > 0.001) {
      setIdleTime(0);
      setIsLanded(false);
    } else {
      setIdleTime((prev) => prev + delta);
      if (idleTime > 3) {
        setIsLanded(true);
      }
    }

    if (isLanded) {
      // Land directly on the cursor
      targetPos.current.set(mx, my, 2);
    } else {
      // Hover organically around the cursor
      targetPos.current.set(
        mx + Math.sin(state.clock.elapsedTime) * 2,
        my + Math.cos(state.clock.elapsedTime * 0.8) * 2,
        2 + Math.sin(state.clock.elapsedTime * 1.5) * 1
      );
    }

    // Move bird towards target with easing
    groupRef.current.position.lerp(targetPos.current, 0.05);

    // Orient the bird towards its movement direction
    const direction = targetPos.current.clone().sub(groupRef.current.position);
    if (direction.length() > 0.1 && !isLanded) {
      const targetRotation = Math.atan2(direction.x, direction.y);
      groupRef.current.rotation.z = THREE.MathUtils.damp(groupRef.current.rotation.z, -targetRotation, 2, delta);
      
      // Pitch based on vertical movement
      const pitch = Math.atan2(direction.z, direction.y);
      groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, pitch, 2, delta);
    } else if (isLanded) {
      // Settle rotation when landed
      groupRef.current.rotation.z = THREE.MathUtils.damp(groupRef.current.rotation.z, 0, 4, delta);
      groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, 0, 4, delta);
      groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, 0, 4, delta);
    }

    // Wing flapping animation
    const flapSpeed = isLanded ? 0 : 15 + speed * 100;
    if (!isLanded) {
      leftWingRef.current.rotation.y = Math.sin(state.clock.elapsedTime * flapSpeed) * 0.5;
      rightWingRef.current.rotation.y = -Math.sin(state.clock.elapsedTime * flapSpeed) * 0.5;
    } else {
      leftWingRef.current.rotation.y = THREE.MathUtils.damp(leftWingRef.current.rotation.y, 0.5, 4, delta);
      rightWingRef.current.rotation.y = THREE.MathUtils.damp(rightWingRef.current.rotation.y, -0.5, 4, delta);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Low poly paper bird geometry */}
      
      {/* Body */}
      <mesh ref={bodyRef} castShadow rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.1, 0.4, 4]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>

      {/* Left Wing */}
      <group position={[-0.05, 0, 0]}>
        <mesh ref={leftWingRef} position={[-0.2, 0, 0]} rotation={[0, 0, Math.PI / 8]} castShadow>
          <planeGeometry args={[0.4, 0.3]} />
          <meshStandardMaterial color="#f0f0f0" roughness={0.4} metalness={0.1} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Right Wing */}
      <group position={[0.05, 0, 0]}>
        <mesh ref={rightWingRef} position={[0.2, 0, 0]} rotation={[0, 0, -Math.PI / 8]} castShadow>
          <planeGeometry args={[0.4, 0.3]} />
          <meshStandardMaterial color="#f0f0f0" roughness={0.4} metalness={0.1} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}
