import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';

export default function DroneCamera() {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const scrollProgress = useStore((state) => state.scrollProgress);
  const systemEnergy = useStore((state) => state.systemEnergy);
  const mouseVelocity = useStore((state) => state.mouseVelocity);

  useFrame((state, delta) => {
    if (!cameraRef.current) return;

    // Map scroll progress (0 to 1) to a Z-axis flight path
    // Let's say the origin field is at Z=15, and the project universe ends around Z=-100
    const targetZ = THREE.MathUtils.lerp(15, -100, scrollProgress);
    
    // Add some cinematic inertia and drone drift
    cameraRef.current.position.z = THREE.MathUtils.damp(
      cameraRef.current.position.z,
      targetZ,
      2,
      delta
    );

    // Apply "Energy Shake" based on system energy (injected by scroll speed or interactions)
    const shake = Math.min(systemEnergy * 0.05, 0.5);
    if (shake > 0.001) {
      cameraRef.current.position.x = (Math.random() - 0.5) * shake;
      cameraRef.current.position.y = (Math.random() - 0.5) * shake;
    } else {
      // Return to center when calm
      cameraRef.current.position.x = THREE.MathUtils.damp(cameraRef.current.position.x, 0, 2, delta);
      cameraRef.current.position.y = THREE.MathUtils.damp(cameraRef.current.position.y, 0, 2, delta);
    }

    // Apply perspective shift based on mouse velocity
    const tiltX = THREE.MathUtils.lerp(0, mouseVelocity.y * 0.5, 0.1);
    const tiltY = THREE.MathUtils.lerp(0, -mouseVelocity.x * 0.5, 0.1);
    
    cameraRef.current.rotation.x = THREE.MathUtils.damp(cameraRef.current.rotation.x, tiltX, 2, delta);
    cameraRef.current.rotation.y = THREE.MathUtils.damp(cameraRef.current.rotation.y, tiltY, 2, delta);
  });

  return <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 0, 15]} fov={45} />;
}
