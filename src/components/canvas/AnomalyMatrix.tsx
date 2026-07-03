import { Canvas } from '@react-three/fiber';
import { Environment, PerspectiveCamera } from '@react-three/drei';
import GodSphere from './GodSphere';

interface AnomalyMatrixProps {
  sphereSpeed: number;
  sphereScale: number;
  colorTheme: 'indigo' | 'amber' | 'emerald';
  autoColor?: boolean;
}

export default function AnomalyMatrix({
  sphereSpeed,
  sphereScale,
  colorTheme,
  autoColor = false,
}: AnomalyMatrixProps) {
  return (
    <div className="w-full h-full min-h-[400px] bg-black/90 rounded-2xl overflow-hidden border border-white/5 relative">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={45} />
        <ambientLight intensity={0.2} />
        <directionalLight position={[5, 5, 5]} intensity={1.5} />
        <Environment preset="city" />

        <GodSphere
          speed={sphereSpeed}
          scale={sphereScale}
          colorTheme={colorTheme}
          scrollOverride={0}
          autoColor={autoColor}
        />
      </Canvas>
    </div>
  );
}
