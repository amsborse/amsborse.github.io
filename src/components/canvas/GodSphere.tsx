import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useStore } from "@/store/useStore";

const vertexShader = `
  uniform float uTime;
  uniform float uScroll;
  varying vec2 vUv;
  varying vec3 vNormal;
  
  // Classic 3D noise function
  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
  float snoise(vec3 v){ 
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
    i = mod(i, 289.0 ); 
    vec4 p = permute( permute( permute( 
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 1.0/7.0;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                  dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
    vUv = uv;
    vNormal = normal;
    
    // Distort vertices based on noise and time
    float noise = snoise(position * 1.5 + uTime * 0.2);
    vec3 newPosition = position + normal * (noise * 0.4 * (1.0 + uScroll * 0.5));
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uScroll;
  uniform vec3 uCoreColor;
  uniform vec3 uScrollColor;
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    // Mix color based on scroll
    vec3 finalColor = mix(uCoreColor, uScrollColor, min(uScroll * 2.0, 1.0));
    
    // Rim lighting
    float intensity = pow(0.6 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
    
    // Pulsing effect
    float pulse = sin(uTime * 2.0) * 0.5 + 0.5;
    
    gl_FragColor = vec4(finalColor * intensity * (1.0 + pulse * 0.2), 1.0);
  }
`;

interface GodSphereProps {
  speed?: number;
  scale?: number;
  colorTheme?: "indigo" | "amber" | "emerald";
  scrollOverride?: number;
  autoColor?: boolean;
}

export default function GodSphere({
  speed = 1.0,
  scale = 1.0,
  colorTheme = "indigo",
  scrollOverride,
  autoColor = false,
}: GodSphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const scrollProgressStore = useStore((state) => state.scrollProgress);
  const scrollProgress = scrollOverride !== undefined ? scrollOverride : scrollProgressStore;
  const introScaleRef = useRef(0);

  const colors = useMemo(() => {
    switch (colorTheme) {
      case "amber":
        return {
          core: new THREE.Color("#d97706"),
          scroll: new THREE.Color("#ea580c"),
        };
      case "emerald":
        return {
          core: new THREE.Color("#059669"),
          scroll: new THREE.Color("#10b981"),
        };
      default: // indigo
        return {
          core: new THREE.Color("#06b6d4"), // electric blue
          scroll: new THREE.Color("#a855f7"), // purple/crimson
        };
    }
  }, [colorTheme]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uCoreColor: { value: colors.core.clone() },
      uScrollColor: { value: colors.scroll.clone() },
    }),
    []
  );

  useFrame((state, delta) => {
    // Smoothly scale up from 0 to 1 on load
    if (introScaleRef.current < 1.0) {
      introScaleRef.current = THREE.MathUtils.damp(introScaleRef.current, 1.0, 1.2, delta);
    }

    if (meshRef.current) {
      meshRef.current.scale.setScalar(introScaleRef.current * scale);
      meshRef.current.rotation.y += delta * 0.1 * speed;
      meshRef.current.rotation.z += delta * 0.05 * speed;
    }
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta * speed;
      if (autoColor) {
        const hue = (state.clock.getElapsedTime() * 0.08) % 1;
        const cycleColor = new THREE.Color().setHSL(hue, 0.85, 0.55);
        materialRef.current.uniforms.uCoreColor.value.copy(cycleColor);
        materialRef.current.uniforms.uScrollColor.value.copy(cycleColor);
      } else {
        materialRef.current.uniforms.uCoreColor.value.copy(colors.core);
        materialRef.current.uniforms.uScrollColor.value.copy(colors.scroll);
      }
      // Smoothly interpolate scroll uniform to avoid jumping
      materialRef.current.uniforms.uScroll.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uScroll.value,
        scrollProgress,
        0.1
      );
    }
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[2.5, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        wireframe={true}
        transparent={true}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
