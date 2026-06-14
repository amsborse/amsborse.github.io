import { useEffect, useRef, useState } from "react";

interface SparkTrail {
  x: number;
  y: number;
  alpha: number;
}

interface Point3D {
  id: number;
  x: number;
  y: number;
  z: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  color: string;
  shapeType: "circle" | "square" | "triangle" | "star";
  swirlDirection: number;
  trail: SparkTrail[];
}

type ShapeType =
  | "sphere"
  | "torus"
  | "wave"
  | "cube"
  | "pyramid"
  | "galaxy"
  | "fermat"
  | "doubleHelix"
  | "saturn"
  | "mobius"
  | "infinity"
  | "vortex"
  | "hourglass"
  | "blackhole"
  | "supernova"
  | "conical";

export function MorphingSphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shape, setShape] = useState<ShapeType>("sphere");
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, isDragging: false });
  const pointsRef = useRef<Point3D[]>([]);
  const rotationRef = useRef({ x: 0, y: 0, vx: 0.003, vy: 0.005 });
  const morphStartRef = useRef<number>(0);

  // Generate baseline points once
  useEffect(() => {
    const points: Point3D[] = [];
    const count = 450;
    
    // Palette mapping to Cyan, Indigo, Violet, Gold from Home page
    const colors = [
      "#38bdf8", // Cyan
      "#818cf8", // Indigo
      "#a855f7", // Violet
      "#f59e0b", // Gold
    ];

    const shapes: ("circle" | "square" | "triangle" | "star")[] = ["circle", "square", "triangle", "star"];

    for (let i = 0; i < count; i++) {
      points.push({
        id: i,
        x: 0,
        y: 0,
        z: 0,
        targetX: 0,
        targetY: 0,
        targetZ: 0,
        color: colors[i % colors.length],
        shapeType: shapes[i % shapes.length],
        swirlDirection: Math.random() < 0.5 ? 1 : -1,
        trail: [],
      });
    }
    pointsRef.current = points;
    calculateTargets("sphere");
  }, []);

  const calculateTargets = (type: ShapeType) => {
    const points = pointsRef.current;
    if (points.length === 0) return;

    const count = points.length;
    const radius = 140;

    if (type === "sphere") {
      // Golden ratio sphere distribution
      const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle
      for (let i = 0; i < count; i++) {
        const y = 1 - (i / (count - 1)) * 2; // y goes from 1 to -1
        const rad = Math.sqrt(1 - y * y); // radius at y
        const theta = phi * i; // golden angle increment

        points[i].targetX = Math.cos(theta) * rad * radius;
        points[i].targetY = y * radius;
        points[i].targetZ = Math.sin(theta) * rad * radius;
      }
    } else if (type === "torus") {
      const R = 110; // ring radius
      const r = 45;  // tube radius
      const uCount = Math.floor(Math.sqrt(count));
      const vCount = Math.ceil(count / uCount);

      for (let i = 0; i < count; i++) {
        const uIdx = i % uCount;
        const vIdx = Math.floor(i / uCount);
        const u = (uIdx / uCount) * Math.PI * 2;
        const v = (vIdx / vCount) * Math.PI * 2;

        points[i].targetX = (R + r * Math.cos(v)) * Math.cos(u);
        points[i].targetY = (R + r * Math.cos(v)) * Math.sin(u);
        points[i].targetZ = r * Math.sin(v);
      }
    } else if (type === "wave") {
      const size = 260;
      const cols = Math.floor(Math.sqrt(count));
      const rows = Math.ceil(count / cols);

      for (let i = 0; i < count; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const u = (col / cols - 0.5) * Math.PI * 2;
        const v = (row / rows - 0.5) * Math.PI * 2;

        points[i].targetX = (col / cols - 0.5) * size;
        points[i].targetZ = (row / rows - 0.5) * size;
        points[i].targetY = Math.sin(u * 2.5) * Math.cos(v * 2.5) * 45;
      }
    } else if (type === "cube") {
      const side = Math.ceil(Math.pow(count, 1 / 3));
      let idx = 0;
      for (let x = 0; x < side; x++) {
        for (let y = 0; y < side; y++) {
          for (let z = 0; z < side; z++) {
            if (idx >= count) break;
            points[idx].targetX = (x / (side - 1) - 0.5) * 190;
            points[idx].targetY = (y / (side - 1) - 0.5) * 190;
            points[idx].targetZ = (z / (side - 1) - 0.5) * 190;
            idx++;
          }
        }
      }
    } else if (type === "pyramid") {
      let idx = 0;
      const height = 180;
      const baseWidth = 190;
      const layers = 10;
      for (let l = 0; l < layers; l++) {
        const hPct = l / (layers - 1);
        const currentY = (hPct - 0.4) * height;
        const currentWidth = (1 - hPct) * baseWidth;
        const pointsInLayer = Math.max(4, Math.floor(((1 - hPct) / (layers / 2)) * count));
        const sidePoints = Math.ceil(Math.sqrt(pointsInLayer));
        
        for (let r = 0; r < sidePoints; r++) {
          for (let c = 0; c < sidePoints; c++) {
            if (idx >= count) break;
            const xPct = sidePoints > 1 ? r / (sidePoints - 1) - 0.5 : 0;
            const zPct = sidePoints > 1 ? c / (sidePoints - 1) - 0.5 : 0;
            points[idx].targetX = xPct * currentWidth;
            points[idx].targetY = currentY;
            points[idx].targetZ = zPct * currentWidth;
            idx++;
          }
        }
      }
      while (idx < count) {
        points[idx].targetX = 0;
        points[idx].targetY = height * 0.6;
        points[idx].targetZ = 0;
        idx++;
      }
    } else if (type === "galaxy") {
      // 2-arm spiral galaxy with central core bulge
      const bulgeCount = Math.floor(count * 0.35); // 35% particles in core
      for (let i = 0; i < count; i++) {
        if (i < bulgeCount) {
          // Core bulge (dense spherical noise)
          const phi = Math.PI * (3 - Math.sqrt(5)) * i;
          const y = 1 - (i / (bulgeCount - 1)) * 2;
          const rad = Math.sqrt(1 - y * y) * (30 + Math.random() * 15);
          points[i].targetX = Math.cos(phi) * rad;
          points[i].targetY = y * (25 + Math.random() * 10);
          points[i].targetZ = Math.sin(phi) * rad;
        } else {
          // Spiral arms
          const armIdx = i % 2;
          const armPct = (i - bulgeCount) / (count - bulgeCount);
          const theta = armPct * 4 * Math.PI + armIdx * Math.PI;
          const dist = 35 + armPct * 135 + Math.random() * 12;
          points[i].targetX = Math.cos(theta) * dist;
          points[i].targetY = (Math.random() - 0.5) * 12; // thin galactic plane
          points[i].targetZ = Math.sin(theta) * dist;
        }
      }
    } else if (type === "fermat") {
      // Fermat's Spiral (Sunflower structure)
      for (let i = 0; i < count; i++) {
        const theta = i * 137.5 * (Math.PI / 180);
        const r = Math.sqrt(i) * 7.8;
        points[i].targetX = r * Math.cos(theta);
        points[i].targetY = Math.sin(i * 0.08) * 8; // slight undulating height
        points[i].targetZ = r * Math.sin(theta);
      }
    } else if (type === "doubleHelix") {
      // Double Helix structure
      for (let i = 0; i < count; i++) {
        const strand = i % 2;
        const pct = i / count;
        const theta = pct * 6 * Math.PI + strand * Math.PI;
        points[i].targetX = Math.cos(theta) * 60;
        points[i].targetY = (pct - 0.5) * 260;
        points[i].targetZ = Math.sin(theta) * 60;
      }
    } else if (type === "saturn") {
      // central sphere (Saturn) + flat rings
      const sphereCount = Math.floor(count * 0.4);
      for (let i = 0; i < count; i++) {
        if (i < sphereCount) {
          const phi = Math.PI * (3 - Math.sqrt(5)) * i;
          const y = 1 - (i / (sphereCount - 1)) * 2;
          const rad = Math.sqrt(1 - y * y) * 45;
          points[i].targetX = Math.cos(phi) * rad;
          points[i].targetY = y * 45;
          points[i].targetZ = Math.sin(phi) * rad;
        } else {
          const theta = (i / (count - sphereCount)) * Math.PI * 2;
          const ringRadius = 75 + ((i % 5) * 16) + Math.random() * 4;
          points[i].targetX = Math.cos(theta) * ringRadius;
          points[i].targetY = (Math.random() - 0.5) * 4;
          points[i].targetZ = Math.sin(theta) * ringRadius;
        }
      }
    } else if (type === "mobius") {
      // Mobius Strip
      for (let i = 0; i < count; i++) {
        const u = (i / count) * Math.PI * 2;
        const v = ((i % 12) / 11 - 0.5) * 40;
        points[i].targetX = (110 + v * Math.cos(u / 2)) * Math.cos(u);
        points[i].targetY = (110 + v * Math.cos(u / 2)) * Math.sin(u);
        points[i].targetZ = v * Math.sin(u / 2);
      }
    } else if (type === "infinity") {
      // Lemniscate loop (Infinity)
      for (let i = 0; i < count; i++) {
        const t = (i / count) * Math.PI * 2;
        const scale = 150 / (3 - Math.cos(2 * t));
        const baseX = scale * Math.cos(t);
        const baseY = scale * Math.sin(2 * t) / 2;
        const baseZ = Math.sin(t) * 40;
        
        // Add random scatter offset to create volumetric loop
        const scatterAngle = Math.random() * Math.PI * 2;
        const scatterRadius = Math.random() * 10;
        points[i].targetX = baseX + Math.cos(scatterAngle) * scatterRadius;
        points[i].targetY = baseY + Math.sin(scatterAngle) * scatterRadius;
        points[i].targetZ = baseZ;
      }
    } else if (type === "vortex") {
      // Gravity Vortex funnel
      for (let i = 0; i < count; i++) {
        const pct = i / count;
        const y = (pct - 0.5) * 240;
        const r = 15 + Math.pow(pct, 2) * 145;
        const theta = pct * 12 * Math.PI;
        points[i].targetX = Math.cos(theta) * r;
        points[i].targetY = y;
        points[i].targetZ = Math.sin(theta) * r;
      }
    } else if (type === "hourglass") {
      // Stellar hourglass nebula (twin cones)
      for (let i = 0; i < count; i++) {
        const pct = i / count;
        const y = (pct - 0.5) * 240;
        const r = 20 + Math.abs(y) * 0.75;
        const theta = pct * 10 * Math.PI;
        points[i].targetX = Math.cos(theta) * r;
        points[i].targetY = y;
        points[i].targetZ = Math.sin(theta) * r;
      }
    } else if (type === "blackhole") {
      // Black hole event horizon + gravitational lensing warped accretion disk
      const horizonCount = Math.floor(count * 0.25);
      for (let i = 0; i < count; i++) {
        if (i < horizonCount) {
          // Inner black sphere (event horizon outline)
          const phi = Math.PI * (3 - Math.sqrt(5)) * i;
          const y = 1 - (i / (horizonCount - 1)) * 2;
          const rad = Math.sqrt(1 - y * y) * 25;
          points[i].targetX = Math.cos(phi) * rad;
          points[i].targetY = y * 25;
          points[i].targetZ = Math.sin(phi) * rad;
        } else {
          // Accretion disk
          const diskPct = (i - horizonCount) / (count - horizonCount);
          const theta = diskPct * 8 * Math.PI;
          const r = 35 + diskPct * 135;
          points[i].targetX = Math.cos(theta) * r;
          // Warp Y based on proximity to center (simulating light bending)
          points[i].targetY = Math.sin(theta) * (600 / (r + 1));
          points[i].targetZ = Math.sin(theta) * r;
        }
      }
    } else if (type === "supernova") {
      // Dense core exploding into symmetric spikes
      const coreCount = Math.floor(count * 0.35);
      // Precompute 12 direction vectors
      const directions: {x: number, y: number, z: number}[] = [];
      for (let j = 0; j < 12; j++) {
        const y = 1 - (j / 11) * 2;
        const rad = Math.sqrt(1 - y * y);
        const theta = j * Math.PI * (3 - Math.sqrt(5));
        directions.push({
          x: Math.cos(theta) * rad,
          y: y,
          z: Math.sin(theta) * rad
        });
      }

      for (let i = 0; i < count; i++) {
        if (i < coreCount) {
          const phi = Math.PI * (3 - Math.sqrt(5)) * i;
          const y = 1 - (i / (coreCount - 1)) * 2;
          const rad = Math.sqrt(1 - y * y) * (15 + Math.random() * 10);
          points[i].targetX = Math.cos(phi) * rad;
          points[i].targetY = y * (15 + Math.random() * 10);
          points[i].targetZ = Math.sin(phi) * rad;
        } else {
          const dir = directions[i % directions.length];
          const dist = 30 + Math.random() * 140;
          points[i].targetX = dir.x * dist;
          points[i].targetY = dir.y * dist;
          points[i].targetZ = dir.z * dist;
        }
      }
    } else if (type === "conical") {
      // Conical Whirlpool Spiral
      for (let i = 0; i < count; i++) {
        const pct = i / count;
        const y = (pct - 0.5) * 220;
        const r = (pct * 140) + 15;
        const theta = pct * 14 * Math.PI;
        points[i].targetX = Math.cos(theta) * r;
        points[i].targetY = y;
        points[i].targetZ = Math.sin(theta) * r;
      }
    }
  };

  // Switch morphing state
  const handleMorph = (newShape: ShapeType) => {
    setShape(newShape);
    calculateTargets(newShape);
    morphStartRef.current = Date.now();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let animationFrameId = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    const draw = () => {
      // Fade out previous frame contents transparently to prevent grey box/imprint build-up
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";

      // Smoothly interpolate rotation to match mouse coordinates or auto-spin
      if (mouseRef.current.isDragging) {
        rotationRef.current.x += (mouseRef.current.targetX - rotationRef.current.x) * 0.08;
        rotationRef.current.y += (mouseRef.current.targetY - rotationRef.current.y) * 0.08;
      } else {
        // Natural drift spin
        rotationRef.current.x += rotationRef.current.vx;
        rotationRef.current.y += rotationRef.current.vy;
      }

      // Center coordinates
      const cx = width / 2;
      const cy = height / 2;
      const fov = 400; // perspective focus

      const cosX = Math.cos(rotationRef.current.x);
      const sinX = Math.sin(rotationRef.current.x);
      const cosY = Math.cos(rotationRef.current.y);
      const sinY = Math.sin(rotationRef.current.y);

      // Swirl physics variables during shape transitions (snappy 450ms transition)
      const now = Date.now();
      const morphTime = now - morphStartRef.current;
      const morphDuration = 450; 
      const isMorphing = morphTime < morphDuration;
      const progress = isMorphing ? morphTime / morphDuration : 1.0;
      const swirlFactor = isMorphing ? Math.sin(progress * Math.PI) * 0.35 : 0;

      // Interpolate points & project 3D to 2D
      const projected = pointsRef.current.map((p) => {
        let tx = p.targetX;
        let ty = p.targetY;
        let tz = p.targetZ;

        // Apply a brief, tight orbital swirl displacement when shape morphing is active
        if (swirlFactor > 0) {
          const angle = swirlFactor * Math.PI * 0.8 * p.swirlDirection;
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);
          // Swirl coordinates around Y axis
          tx = p.targetX * cosA - p.targetZ * sinA;
          tz = p.targetZ * cosA + p.targetX * sinA;
          // Add a minor vertical wave ripple
          ty = p.targetY + Math.sin(progress * Math.PI * 1.5 + p.id * 0.1) * 8;
        }

        // Target interpolation matched to Home page (0.065)
        p.x += (tx - p.x) * 0.065;
        p.y += (ty - p.y) * 0.065;
        p.z += (tz - p.z) * 0.065;

        // Apply 3D rotation (Y-axis, then X-axis)
        let x1 = p.x * cosY - p.z * sinY;
        let z1 = p.z * cosY + p.x * sinY;

        let y2 = p.y * cosX - z1 * sinX;
        let z2 = z1 * cosX + p.y * sinX;

        // Perspective scale factor
        const scale = fov / (fov + z2);
        const screenX = cx + x1 * scale;
        const screenY = cy + y2 * scale;
        
        // Add subtle breathing pulse to radius on the fly
        const pulse = Math.sin(now * 0.0025 + p.id * 0.15) * 0.2 + 0.95;
        const radius = Math.max(0.5, (z2 + 200) / 80) * scale * pulse;
        const alpha = Math.max(0.08, Math.min(0.85, (z2 + 180) / 360));

        return {
          sx: screenX,
          sy: screenY,
          depth: z2,
          radius,
          color: p.color,
          alpha,
        };
      });

      // Sort by depth (back to front) for painters algorithm
      projected.sort((a, b) => b.depth - a.depth);

      // Draw projected points as glowing circles
      projected.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        
        // Match Home page shadowBlur glow exactly
        if (p.depth < -20) {
          ctx.shadowBlur = 6;
          ctx.shadowColor = p.color;
        } else {
          ctx.shadowBlur = 0;
        }
        
        ctx.fill();
      });

      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;

      // Draw light structural rings/links between nearest elements for Torus/Sphere
      if (shape !== "wave") {
        ctx.lineWidth = 0.35;
        ctx.strokeStyle = "rgba(42, 80, 140, 0.09)";
        for (let i = 0; i < projected.length; i += 8) {
          const p1 = projected[i];
          for (let j = i + 1; j < projected.length; j += 8) {
            const p2 = projected[j];
            const dx = p1.sx - p2.sx;
            const dy = p1.sy - p2.sy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 40 && Math.abs(p1.depth - p2.depth) < 30) {
              ctx.beginPath();
              ctx.moveTo(p1.sx, p1.sy);
              ctx.lineTo(p2.sx, p2.sy);
              ctx.stroke();
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    // Event handlers for dragging / rotating
    let startX = 0;
    let startY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      mouseRef.current.isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseRef.current.isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      mouseRef.current.targetX = rotationRef.current.x + dy * 0.01;
      mouseRef.current.targetY = rotationRef.current.y + dx * 0.01;
    };

    const handleMouseUp = () => {
      mouseRef.current.isDragging = false;
    };

    window.addEventListener("resize", resize);
    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    resize();
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [shape]);

  return (
    <div className="flex flex-col items-center w-full gap-5">
      <div className="w-full h-[320px] sm:h-[380px] flex items-center justify-center relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-grab active:cursor-grabbing max-w-[500px]"
        />
      </div>
      
      {/* Morph Controls */}
      <div className="flex flex-wrap justify-center gap-1.5 z-20 bg-[var(--color-surface)]/60 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-[var(--color-border)] shadow-md max-w-[95%]">
        {(["sphere", "torus", "wave", "cube", "pyramid", "galaxy", "fermat", "doubleHelix", "saturn", "mobius", "infinity", "vortex", "hourglass", "blackhole", "supernova", "conical"] as ShapeType[]).map((type) => (
          <button
            key={type}
            onClick={() => handleMorph(type)}
            className={`px-2.5 py-1 rounded-md text-[0.65rem] font-mono tracking-wider uppercase transition-all duration-300 ${
              shape === type
                ? "bg-[var(--color-accent)] text-white shadow-sm font-semibold"
                : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-border)]/20"
            }`}
          >
            {type}
          </button>
        ))}
      </div>
    </div>
  );
}
