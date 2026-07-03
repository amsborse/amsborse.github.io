import { Canvas } from '@react-three/fiber';
import { Environment, PerspectiveCamera } from '@react-three/drei';
import GodSphere from './GodSphere';
import { useStore } from '@/store/useStore';

export default function Scene() {
  const showGodSphere = useStore((state) => state.showGodSphere);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={45} />
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <Environment preset="city" />

      {showGodSphere && <GodSphere />}
    </>
  );
}
