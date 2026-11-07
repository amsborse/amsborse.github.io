import { Environment, Lightformer } from "@react-three/drei";

export function Lighting({ lightMode = false }: { lightMode?: boolean }) {
  return (
    <>
      <ambientLight intensity={lightMode ? 0.72 : 0.28} color={lightMode ? "#fff6e9" : "#b2bcc3"} />
      <hemisphereLight
        args={[
          lightMode ? "#fff4df" : "#b7c5cc",
          lightMode ? "#6d6255" : "#171816",
          lightMode ? 0.62 : 0.42,
        ]}
      />
      <directionalLight
        position={[-4.5, 6, 4]}
        color={lightMode ? "#fff0d7" : "#f3dfc2"}
        intensity={lightMode ? 2.4 : 1.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.1}
        shadow-camera-far={18}
        shadow-bias={-0.00015}
      />
      <pointLight
        position={[0, 1.3, 0]}
        color={lightMode ? "#e6bd7e" : "#ffc766"}
        intensity={lightMode ? 9 : 22}
        distance={7.2}
        decay={2}
      />
      <pointLight
        position={[-3.2, 1.8, -1.2]}
        color={lightMode ? "#d8e0d8" : "#9cb8c9"}
        intensity={lightMode ? 3 : 4.3}
        distance={8}
        decay={2}
      />
      <spotLight
        position={[2.2, 5, -4]}
        target-position={[0, -0.3, 0]}
        color={lightMode ? "#fff7e9" : "#e5edf0"}
        intensity={16}
        angle={0.62}
        penumbra={0.72}
        distance={14}
        decay={2}
      />
      <Environment resolution={128} background={false}>
        <Lightformer
          form="rect"
          intensity={lightMode ? 1.05 : 2.1}
          color={lightMode ? "#fff7e8" : "#f5dfbf"}
          scale={[5, 2, 1]}
          position={[-3, 3, 3]}
          rotation={[0, 0.4, 0]}
        />
        <Lightformer
          form="rect"
          intensity={lightMode ? 0.6 : 1.2}
          color={lightMode ? "#d8e2dc" : "#a7bdc7"}
          scale={[2, 5, 1]}
          position={[4, 1, -2]}
          rotation={[0, -0.55, 0]}
        />
        <Lightformer
          form="ring"
          intensity={lightMode ? 0.55 : 1.4}
          color="#ffc766"
          scale={2.4}
          position={[0, 4, 1]}
        />
      </Environment>
    </>
  );
}
