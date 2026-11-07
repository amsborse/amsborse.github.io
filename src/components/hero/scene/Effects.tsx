import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import * as THREE from "three";

export function Effects({ enabled = true }: { enabled?: boolean }) {
  const composer = useRef<EffectComposer | null>(null);
  const { gl, scene, camera, size } = useThree();

  useEffect(() => {
    gl.info.autoReset = false;
    return () => {
      gl.info.autoReset = true;
    };
  }, [gl]);

  useEffect(() => {
    if (!enabled) return;
    const pipeline = new EffectComposer(gl);
    pipeline.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 0.48, 0.38, 1.6);
    pipeline.addPass(bloom);
    pipeline.setSize(size.width, size.height);
    composer.current = pipeline;
    return () => {
      composer.current = null;
      pipeline.dispose();
    };
  }, [camera, enabled, gl, scene, size.height, size.width]);

  // A priority > 0 frame callback takes over rendering from R3F, so this must
  // always draw: through the bloom composer when enabled, directly otherwise.
  // Render stats accumulate across every pass of the frame (autoReset is off).
  useFrame((_, delta) => {
    gl.info.reset();
    if (composer.current) composer.current.render(delta);
    else gl.render(scene, camera);
  }, 1);

  return null;
}
