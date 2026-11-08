import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
  type MutableRefObject,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import type { HeroUrlState } from "./heroUrlState";
import { CAMERA } from "./layout";
import type { HeroState, RouteSample } from "./simulation";
import type { ServiceId } from "./topology";
import { Bonsai } from "./scene/Bonsai";
import { Callouts } from "./scene/Callouts";
import { CoreSphere } from "./scene/CoreSphere";
import { DataPaths } from "./scene/DataPaths";
import { Effects } from "./scene/Effects";
import { Island } from "./scene/Island";
import { Lighting } from "./scene/Lighting";
import { OrbitRings } from "./scene/OrbitRings";
import { Pool } from "./scene/Pool";
import { ServiceModules } from "./scene/ServiceModules";
import { Waterfall } from "./scene/Waterfall";

interface HeroCanvasProps {
  urlState: HeroUrlState;
  state: HeroState;
  sampleRef: MutableRefObject<RouteSample | null>;
  lightMode: boolean;
  reducedMotion: boolean;
  onHover: (id: ServiceId | null) => void;
  onSelect: (id: ServiceId) => void;
  onReady: () => void;
  onFailure: () => void;
  onContextLost: () => void;
  onQualityChange: (low: boolean) => void;
  onStats: (calls: number, triangles: number) => void;
}

class CanvasBoundary extends Component<{
  fallback: ReactNode;
  onFailure: () => void;
  children: ReactNode;
}> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    this.props.onFailure();
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function Scene({
  urlState,
  state,
  sampleRef,
  lightMode,
  reducedMotion,
  onHover,
  onSelect,
  onReady,
  onContextLost,
  onStats,
  qualityLow,
}: HeroCanvasProps & { qualityLow: boolean }) {
  const { gl, scene, camera, size, pointer, performance } = useThree();
  const perspective = camera as THREE.PerspectiveCamera;
  const artRef = useRef<THREE.Group>(null);
  const lastStatsAt = useRef(0);
  const slowTime = useRef(0);
  const now = urlState.fixedTime ?? window.performance.now() / 1000;
  const quality = qualityLow
    ? "low"
    : size.width < 700
      ? "low"
      : size.width <= 1100
        ? "medium"
        : "high";
  const medium = quality === "medium";
  const cameraTarget = useMemo(() => new THREE.Vector3(), []);
  const regressed = useRef(false);

  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      onContextLost();
    };
    const restored = () => onReady();
    canvas.addEventListener("webglcontextlost", lost, false);
    canvas.addEventListener("webglcontextrestored", restored, false);
    scene.background = new THREE.Color(lightMode ? "#f5f0e6" : "#060809");
    gl.setClearColor(lightMode ? "#f5f0e6" : "#060809", 1);
    gl.compile(scene, camera);
    onReady();
    return () => {
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
    };
  }, [camera, gl, lightMode, onContextLost, onReady, scene]);

  useEffect(() => {
    if (size.width <= 600) {
      perspective.fov = 43;
      camera.position.set(0, 0.5, 10.9);
      cameraTarget.set(0, 0.35, 0);
    } else if (urlState.camera === "node") {
      perspective.fov = 30;
      camera.position.set(0.2, 2.2, 8.1);
      cameraTarget.set(0, 1.15, 0);
    } else if (urlState.camera === "profile") {
      perspective.fov = 39;
      camera.position.set(0.1, 1.5, 12.2);
      cameraTarget.set(0.6, 0, 0);
    } else {
      perspective.fov = CAMERA.fov;
      camera.position.set(...CAMERA.position);
      cameraTarget.set(...CAMERA.lookAt);
    }
    perspective.updateProjectionMatrix();
  }, [camera, cameraTarget, perspective, size.width, urlState.camera]);

  useFrame((frame, delta) => {
    const mobile = size.width <= 600;
    const tablet = size.width <= 900;
    if (artRef.current) {
      if (urlState.camera === "node" || urlState.camera === "profile") {
        artRef.current.position.set(0, 0, 0);
        artRef.current.scale.set(1, 1, 1);
      } else {
        artRef.current.position.set(
          mobile ? 0.55 : tablet ? 0.55 : medium ? 1.45 : 2.2,
          mobile || tablet ? -0.35 : -0.2,
          0
        );
        if (mobile) artRef.current.scale.set(0.83, 0.83, 0.83);
        else if (tablet) artRef.current.scale.set(0.78, 0.78, 0.78);
        else if (medium) artRef.current.scale.set(0.86, 0.76, 0.86);
        else artRef.current.scale.set(0.95, 0.82, 0.95);
      }
    }
    if (!reducedMotion && urlState.fixedTime === null) {
      slowTime.current =
        delta > 0.042 ? slowTime.current + delta : Math.max(0, slowTime.current - delta * 0.4);
      if (slowTime.current > 1.4 && !regressed.current) {
        performance.regress();
        regressed.current = true;
      } else if (slowTime.current < 0.2) regressed.current = false;
      const pointerX = pointer.x * 0.12;
      const pointerY = pointer.y * 0.08;
      const scroll = Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1) * 0.09;
      const cameraBaseX = mobile ? 0 : CAMERA.position[0] + 0.2;
      const cameraBaseY = mobile ? 0.5 : CAMERA.position[1];
      camera.position.x += (cameraBaseX + pointerX - camera.position.x) * Math.min(delta * 1.1, 1);
      camera.position.y +=
        (cameraBaseY + pointerY - (mobile ? 0 : scroll) - camera.position.y) *
        Math.min(delta * 1.1, 1);
      camera.lookAt(cameraTarget.x, cameraTarget.y, cameraTarget.z);
    }
    if (frame.clock.elapsedTime - lastStatsAt.current > 1) {
      lastStatsAt.current = frame.clock.elapsedTime;
      onStats(gl.info.render.calls, gl.info.render.triangles);
    }
  });

  return (
    <>
      <Lighting lightMode={lightMode} />
      <group ref={artRef}>
        <CoreSphere
          state={state}
          now={now}
          animate={!reducedMotion && urlState.fixedTime === null}
          reducedMotion={reducedMotion}
          lightMode={lightMode}
        />
        <OrbitRings
          now={now}
          state={state}
          animate={!reducedMotion && urlState.fixedTime === null}
          reducedMotion={reducedMotion}
          lightMode={lightMode}
        />
        <ServiceModules
          state={state}
          now={now}
          animate={!reducedMotion && urlState.fixedTime === null}
          lightMode={lightMode}
          onHover={onHover}
          onSelect={onSelect}
        />
        <DataPaths
          state={state}
          now={now}
          animate={!reducedMotion && urlState.fixedTime === null}
          lightMode={lightMode}
          sampleRef={sampleRef}
          reducedMotion={reducedMotion}
        />
        <Island quality={quality} lightMode={lightMode} />
        <Bonsai
          now={now}
          quality={quality}
          animate={!reducedMotion && urlState.fixedTime === null}
          reducedMotion={reducedMotion}
          lightMode={lightMode}
        />
        <Waterfall
          now={now}
          animate={!reducedMotion && urlState.fixedTime === null}
          lightMode={lightMode}
          reducedMotion={reducedMotion}
        />
        <Pool
          now={now}
          animate={!reducedMotion && urlState.fixedTime === null}
          lightMode={lightMode}
          quality={quality}
          reducedMotion={reducedMotion}
        />
        <Callouts lightMode={lightMode} />
      </group>
      <Effects enabled={!lightMode && !reducedMotion && quality === "high"} />
      <AdaptiveDpr pixelated />
    </>
  );
}

export function HeroCanvas(props: HeroCanvasProps) {
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [low, setLow] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= 600
  );
  const visible = inView && pageVisible;
  const { onContextLost, onReady } = props;
  const handleContextLost = useCallback(() => {
    setContextLost(true);
    onContextLost();
  }, [onContextLost]);
  const handleContextRestored = useCallback(() => {
    setContextLost(false);
    onReady();
  }, [onReady]);

  useEffect(() => {
    const updateViewport = () => setMobile(window.innerWidth <= 600);
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.02,
    });
    observer.observe(element);
    const visibility = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  const staticFallback = (
    <img
      className="hero-static-art"
      src="/hero/hero-fallback.png"
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      fetchPriority="low"
    />
  );

  return (
    <div ref={host} className="hero-canvas" aria-hidden="true">
      <CanvasBoundary fallback={staticFallback} onFailure={props.onFailure}>
        <Canvas
          frameloop={visible ? (props.reducedMotion ? "demand" : "always") : "never"}
          dpr={mobile ? [1, 1.5] : [1, 1.75]}
          camera={{ position: CAMERA.position, fov: CAMERA.fov, near: 0.1, far: 45 }}
          shadows
          gl={{
            alpha: true,
            antialias: !mobile,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1,
            outputColorSpace: THREE.SRGBColorSpace,
          }}
          performance={{ min: 0.7, max: 1, debounce: 900 }}
        >
          <PerformanceMonitor
            onDecline={() => {
              setLow(true);
              props.onQualityChange(true);
            }}
            onIncline={() => {
              setLow(false);
              props.onQualityChange(false);
            }}
            onFallback={() => {
              setLow(true);
              props.onQualityChange(true);
            }}
          >
            <Scene
              {...props}
              qualityLow={low}
              onContextLost={handleContextLost}
              onReady={handleContextRestored}
            />
          </PerformanceMonitor>
        </Canvas>
      </CanvasBoundary>
      {contextLost && (
        <img
          className="hero-context-fallback"
          src="/hero/hero-fallback.png"
          alt=""
          aria-hidden="true"
        />
      )}
      {low && (
        <span className="sr-only" data-hero-quality="low">
          Reduced 3D detail enabled
        </span>
      )}
    </div>
  );
}
