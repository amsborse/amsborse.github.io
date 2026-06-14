import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Seo } from "@/components/Seo";
import { projects, projectCategories, profile, site } from "@/data";

// 3D Particles Node Type
interface OSNode {
  x: number;
  y: number;
  z: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  color: string;
  depth: number;
  pulseSpeed: number;
  pulsePhase: number;
}

type OSSection = "home" | "skills" | "projects" | "timeline" | "console";

export default function Home() {
  // Navigation & State
  const [activeSection, setActiveSection] = useState<OSSection>("home");
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Gamified RPG Stats
  const [charLevel, setCharLevel] = useState(42);
  const [xp, setXp] = useState(8200);
  const maxXp = 10000;
  const [credits, setCredits] = useState(350);
  const [activePerks, setActivePerks] = useState<string[]>(["Synaptic Core"]);
  const [skills, setSkills] = useState([
    { name: "Systems Logic", level: 18, xpValue: 400, desc: "Distributed gRPC, caching nodes, Redis cluster bounds", key: "systems" },
    { name: "Product Weaver", level: 15, xpValue: 300, desc: "React hooks, Framer layout transitions, responsive design", key: "product" },
    { name: "AI/ML Forecasting", level: 12, xpValue: 500, desc: "Vector stores, FastAPI, autonomous LLM agent chains", key: "ai" },
    { name: "Core Architecture", level: 16, xpValue: 350, desc: "TypeScript compilers, OpenAPI, versioning matrices", key: "tooling" },
  ]);
  const [rpgNotification, setRpgNotification] = useState<string | null>(null);

  // Projects focus context
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Timeline Depth model (0: Present, 1: Recent, 2: Past, 3: Origin)
  const [timelineDepth, setTimelineDepth] = useState(0);

  // CLI Terminal state
  const [cliInput, setCliInput] = useState("");
  const [cliLogs, setCliLogs] = useState<string[]>([
    "LIVING-MIND PORTFOLIO OS v4.2.1 ON CORRESPONDENCE CHANNEL 8",
    "Enter 'help' to review directory of cognitive parameters.",
  ]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<OSNode[]>([]);
  const rotationRef = useRef({ x: 0.15, y: 0.25 });
  const activeSectionRef = useRef<OSSection>("home");

  // Keep ref sync to avoid triggering canvas recreation on render
  useEffect(() => {
    activeSectionRef.current = activeSection;
    calculateTargets();
  }, [activeSection, timelineDepth]);

  // Scroll terminal automatically
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [cliLogs]);

  // INITIALIZE 3D NODE CANVAS EMITTER
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrame = 0;
    const count = 480;

    // Palette mapping to Cyan, Violet, Gold, Indigo
    const nodeColors = [
      "#38bdf8", // Cyan
      "#818cf8", // Indigo
      "#a855f7", // Violet
      "#f59e0b", // Gold
    ];

    // Generate nodes
    const nodes: OSNode[] = [];
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: (Math.random() - 0.5) * 400,
        y: (Math.random() - 0.5) * 400,
        z: (Math.random() - 0.5) * 400,
        targetX: 0,
        targetY: 0,
        targetZ: 0,
        color: nodeColors[i % nodeColors.length],
        depth: Math.random() * 0.8 + 0.5,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }
    pointsRef.current = nodes;
    calculateTargets();

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    };

    const draw = () => {
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);

      // Memory Echo System (draw transparent trailing clearing field to leave faint particle paths)
      ctx.fillStyle = "rgba(7, 8, 13, 0.16)";
      ctx.fillRect(0, 0, w, h);

      // Spin rotation
      rotationRef.current.x += 0.003;
      rotationRef.current.y += 0.005;

      const cosX = Math.cos(rotationRef.current.x);
      const sinX = Math.sin(rotationRef.current.x);
      const cosY = Math.cos(rotationRef.current.y);
      const sinY = Math.sin(rotationRef.current.y);

      const cx = w / 2;
      const cy = h / 2;
      const fov = 350;

      // Project points
      const projected = pointsRef.current.map((p) => {
        // Soft physics target interpolation
        p.x += (p.targetX - p.x) * 0.065;
        p.y += (p.targetY - p.y) * 0.065;
        p.z += (p.targetZ - p.z) * 0.065;

        // 3D rotation
        let x1 = p.x * cosY - p.z * sinY;
        let z1 = p.z * cosY + p.x * sinY;
        let y2 = p.y * cosX - z1 * sinX;
        let z2 = z1 * cosX + p.y * sinX;

        const scale = fov / (fov + z2);
        
        // Add subtle breathing pulse to radius
        p.pulsePhase += p.pulseSpeed;
        const pulse = Math.sin(p.pulsePhase) * 0.4 + 1;

        return {
          sx: cx + x1 * scale,
          sy: cy + y2 * scale,
          sz: z2,
          radius: Math.max(0.5, (z2 + 200) / 80) * scale * pulse * p.depth,
          color: p.color,
        };
      });

      // Painter's algorithm
      projected.sort((a, b) => b.sz - a.sz);

      // Render projected points
      projected.forEach((p) => {
        const alpha = Math.max(0.06, Math.min(0.9, (p.sz + 200) / 400));
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        if (p.sz < -20) {
          ctx.shadowBlur = 6;
          ctx.shadowColor = p.color;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;

      animFrame = requestAnimationFrame(draw);
    };

    window.addEventListener("resize", resize);
    resize();
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animFrame);
    };
  }, []);

  // MORPH GEOMETRY TARGET CALCULATION
  const calculateTargets = () => {
    const pts = pointsRef.current;
    if (pts.length === 0) return;
    const count = pts.length;
    const section = activeSectionRef.current;

    if (section === "home") {
      // 1. Home mode -> Breathing golden-ratio Sphere
      const phi = Math.PI * (3 - Math.sqrt(5));
      const r = 115;
      for (let i = 0; i < count; i++) {
        const y = 1 - (i / (count - 1)) * 2;
        const rad = Math.sqrt(1 - y * y);
        const theta = phi * i;
        pts[i].targetX = Math.cos(theta) * rad * r;
        pts[i].targetY = y * r;
        pts[i].targetZ = Math.sin(theta) * rad * r;
      }
    } else if (section === "skills") {
      // 2. Skills mode -> Neural Torus (interlocked rings)
      const R = 90;
      const r = 32;
      const uCount = Math.floor(Math.sqrt(count));
      const vCount = Math.ceil(count / uCount);
      for (let i = 0; i < count; i++) {
        const u = ((i % uCount) / uCount) * Math.PI * 2;
        const v = (Math.floor(i / uCount) / vCount) * Math.PI * 2;
        pts[i].targetX = (R + r * Math.cos(v)) * Math.cos(u);
        pts[i].targetY = (R + r * Math.cos(v)) * Math.sin(u);
        pts[i].targetZ = r * Math.sin(v);
      }
    } else if (section === "projects") {
      // 3. Projects mode -> Double Helix strand
      for (let i = 0; i < count; i++) {
        const side = i % 2 === 0 ? 1 : -1;
        const theta = (i / count) * Math.PI * 10;
        const rad = 55;
        pts[i].targetX = Math.cos(theta) * rad * side;
        pts[i].targetY = (i / count - 0.5) * 230;
        pts[i].targetZ = Math.sin(theta) * rad * side;
      }
    } else if (section === "timeline") {
      // 4. Timeline mode -> Depth concentric orbit rings based on active depth
      for (let i = 0; i < count; i++) {
        const ringIndex = i % 4; // 4 concentric rings
        const radius = 45 + ringIndex * 35;
        const theta = (i / count) * Math.PI * 8;
        // Shift target heights based on active timeline depth layer
        const targetY = (ringIndex - timelineDepth) * 35;
        pts[i].targetX = Math.cos(theta) * radius;
        pts[i].targetY = targetY + Math.sin(theta * 3) * 10;
        pts[i].targetZ = Math.sin(theta) * radius;
      }
    } else if (section === "console") {
      // 5. Console mode -> Structured binary matrix Grid
      const rows = 20;
      const cols = Math.ceil(count / rows);
      for (let i = 0; i < count; i++) {
        const r = i % rows;
        const c = Math.floor(i / rows);
        pts[i].targetX = (c / cols - 0.5) * 220;
        pts[i].targetY = (r / rows - 0.5) * 220;
        pts[i].targetZ = Math.sin(c * 0.5) * Math.cos(r * 0.5) * 20;
      }
    }
  };

  // GAMIFIED RPG LEVEL UP
  const triggerUpgrade = (index: number) => {
    if (credits < 50) {
      setRpgNotification("INSUFFICIENT SYSTEM CREDITS (Requires 50)");
      setTimeout(() => setRpgNotification(null), 2000);
      return;
    }

    const updated = [...skills];
    updated[index].level += 1;
    setSkills(updated);
    setCredits((c) => c - 50);

    const xpGain = skills[index].xpValue;
    const newXp = xp + xpGain;

    if (newXp >= maxXp) {
      setCharLevel((l) => l + 1);
      setXp(newXp - maxXp);
      setRpgNotification(`🛡️ SYSTEM UPGRADED! Reached Character Level ${charLevel + 1}!`);
      // Unlock new system perk
      const perks = ["Damping Matrix", "Aether Synthesizer", "Parallax Grid", "Quantum Cache", "Echo Emitter"];
      const missing = perks.filter(p => !activePerks.includes(p));
      if (missing.length > 0) {
        const unlocked = missing[Math.floor(Math.random() * missing.length)];
        setActivePerks((prev) => [...prev, unlocked]);
      }
    } else {
      setXp(newXp);
      setRpgNotification(`+${xpGain} XP secured from upgrading ${skills[index].name}!`);
    }

    setTimeout(() => setRpgNotification(null), 2500);
  };

  // COMMAND LINE CLI HANDLER
  const runCLI = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = cliInput.trim().toLowerCase();
    if (!cmd) return;

    const addedLogs = [...cliLogs, `akshay@cosmic-os ~ $ ${cliInput}`];
    let reply = "";

    switch (cmd) {
      case "help":
        reply = "Available commands:\n  - home       [Activate central core orb]\n  - skills     [Expand gamified RPG matrices]\n  - projects   [Lists active mission details]\n  - timeline   [Inspect cognitive memory layers]\n  - clear      [Reset console outputs]\n  - rituals    [Queries neural alignment frequency]";
        break;
      case "home":
        setActiveSection("home");
        reply = "Home state loaded. Geometry morphed to sphere.";
        break;
      case "skills":
        setActiveSection("skills");
        reply = "RPG skill matrices mapped. Geometry morphed to torus.";
        break;
      case "projects":
        setActiveSection("projects");
        reply = "milestone categories:\n  " + projects.map((p, idx) => `${idx + 1}. ${p.title} (${p.category})`).join("\n  ");
        break;
      case "timeline":
        setActiveSection("timeline");
        reply = "Memory depth timeline initialized. Layers: 0 (Present), 1 (Recent), 2 (Past), 3 (Origin). Use timeline <num> to zoom.";
        break;
      case "clear":
        setCliLogs([]);
        setCliInput("");
        return;
      case "rituals":
        reply = "Diagnostics: Breath mandala aligned. Ohm frequency set to 136.1Hz.";
        break;
      default:
        if (cmd.startsWith("timeline ")) {
          const depth = parseInt(cmd.split(" ")[1], 10);
          if (depth >= 0 && depth <= 3) {
            setActiveSection("timeline");
            setTimelineDepth(depth);
            reply = `Zooming to memory depth level ${depth}...`;
          } else {
            reply = "Invalid depth. Choose between 0 and 3.";
          }
        } else {
          reply = `Syntax error: command '${cmd}' not recognized. Enter 'help' to review directory.`;
        }
        break;
    }

    setCliLogs([...addedLogs, reply]);
    setCliInput("");
  };

  // ATTENTION FIELD MODEL: Highlight related skills when hovering a project
  const handleProjectHover = (category: string | null) => {
    setHoveredNode(category);
  };

  return (
    <>
      <Seo title={site.title} description={site.description} path="/" />

      <div className="min-h-screen bg-gradient-to-br from-[#030408] via-[#070b19] to-[#0c122b] text-slate-300 relative overflow-hidden flex flex-col pt-16">
        
        {/* Glowing visual backdrop patches */}
        <div className="absolute top-[10%] left-[20%] w-[35vw] h-[35vw] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.08)_0%,transparent_75%)] pointer-events-none" />
        <div className="absolute bottom-[10%] right-[15%] w-[45vw] h-[45vw] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.06)_0%,transparent_75%)] pointer-events-none" />
        <div className="absolute top-[35%] right-[25%] w-[30vw] h-[30vw] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.05)_0%,transparent_75%)] pointer-events-none" />

        {/* Global OS Header status bar */}
        <header className="fixed top-0 left-0 right-0 h-14 bg-[#07080d]/65 backdrop-blur-md border-b border-white/5 px-6 flex items-center justify-between z-50">
          <div className="flex items-center gap-4">
            <span className="text-sm font-display font-semibold text-white tracking-tight">Akshay OS</span>
            <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />
            <span className="text-[0.625rem] font-mono text-slate-500 uppercase tracking-widest hidden sm:block">Identity System // Active</span>
          </div>

          {/* Clickable Mode Navigation Tabs */}
          <nav className="flex gap-2">
            {(["home", "skills", "projects", "timeline", "console"] as OSSection[]).map((sect) => (
              <button
                key={sect}
                onClick={() => setActiveSection(sect)}
                className={`px-3 py-1.5 rounded-md text-[0.65rem] font-mono uppercase tracking-wider transition-all duration-300 border ${
                  activeSection === sect
                    ? "bg-[var(--color-accent-soft)] border-[var(--color-accent)]/30 text-[var(--color-accent)]"
                    : "border-transparent text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {sect}
              </button>
            ))}
          </nav>
        </header>

        {/* Main split-pane workspace dashboard */}
        <div className="flex-1 grid lg:grid-cols-12 gap-8 p-6 lg:p-8 relative z-10 max-w-7xl mx-auto w-full items-stretch mt-4">
          
          {/* Left panel: Cognitive content viewports (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between bg-[#0b0c13]/45 backdrop-blur-xl border border-white/5 rounded-2xl p-6 sm:p-8 shadow-2xl relative min-h-[500px]">
            
            {/* Ambient status border light */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-accent)]/20 to-transparent" />

            <div className="flex-1 flex flex-col justify-center">
              <AnimatePresence mode="wait">
                {/* 1. HOME VIEWPORT */}
                {activeSection === "home" && (
                  <motion.div
                    key="home"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div>
                      <span className="text-[0.625rem] font-mono text-[var(--color-gold)] uppercase tracking-widest">Cognitive Core Initialization</span>
                      <h1 className="text-3xl sm:text-4xl font-display font-semibold text-white tracking-tight mt-2 leading-none">
                        {profile.headline}
                      </h1>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed font-sans">
                      Software Engineer specialized in distributed infrastructure routing grids, agentic memory networks, and high-performance layout projections. Bridging logic with cosmic abstractions.
                    </p>
                    
                    <div className="pt-4 flex flex-wrap gap-3">
                      <button
                        onClick={() => setActiveSection("skills")}
                        className="px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-bright)] text-[#07080d] rounded-md text-xs font-mono font-bold uppercase tracking-wider shadow-lg transition-colors active:scale-95"
                      >
                        Enter Skill Sheet
                      </button>
                      <button
                        onClick={() => setActiveSection("projects")}
                        className="px-5 py-2.5 border border-white/10 hover:border-white/20 bg-white/5 text-white rounded-md text-xs font-mono uppercase tracking-wider transition-colors active:scale-95"
                      >
                        Active Missions
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* 2. SKILLS VIEWPORT (Gamified RPG) */}
                {activeSection === "skills" && (
                  <motion.div
                    key="skills"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div className="flex justify-between items-end border-b border-white/5 pb-3">
                      <div>
                        <span className="text-[0.625rem] font-mono text-[var(--color-gold)] uppercase tracking-widest block">System Diagnostics</span>
                        <h2 className="text-xl font-display font-semibold text-white mt-1">Cosmic Architect Attributes</h2>
                      </div>
                      <div className="text-right">
                        <span className="text-[0.6rem] font-mono text-slate-500 block">System Credits</span>
                        <span className="text-sm font-mono text-[var(--color-gold)] font-bold">{credits} Cr</span>
                      </div>
                    </div>

                    {/* Level HUD */}
                    <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-2">
                      <div className="flex justify-between text-xs font-mono text-slate-400">
                        <span>XP: {xp} / {maxXp}</span>
                        <span>Level {charLevel}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 border border-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-gold)]"
                          animate={{ width: `${(xp / maxXp) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Skill upgrade lines */}
                    <div className="space-y-3">
                      {skills.map((s, idx) => {
                        const isHighlighted = hoveredNode === s.key;
                        return (
                          <div
                            key={s.name}
                            className={`flex justify-between items-center p-3 rounded-lg border transition-all duration-300 ${
                              isHighlighted
                                ? "bg-[var(--color-accent-soft)] border-[var(--color-accent)]/30 scale-[1.01]"
                                : "bg-white/[0.01] border-white/5"
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-slate-200">{s.name}</span>
                                <span className="text-[0.65rem] font-mono text-[var(--color-gold)]">Lv. {s.level}</span>
                              </div>
                              <p className="text-[0.6875rem] text-slate-400 leading-normal mt-0.5">{s.desc}</p>
                            </div>
                            <button
                              onClick={() => triggerUpgrade(idx)}
                              className="px-2.5 py-1.5 bg-white/5 hover:bg-[var(--color-accent)] border border-white/10 hover:border-transparent text-slate-300 hover:text-[#07080d] rounded text-[0.625rem] font-mono uppercase tracking-wider transition-colors active:scale-95"
                            >
                              Upgrade
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Perks info */}
                    <div className="bg-slate-950/45 border border-white/5 p-3.5 rounded-lg flex flex-wrap gap-2 items-center">
                      <span className="text-[0.6rem] font-mono text-slate-500 uppercase tracking-widest block mr-2">System Perks:</span>
                      {activePerks.map((p) => (
                        <span key={p} className="px-2 py-0.5 bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/10 text-[var(--color-accent)] rounded text-[0.6rem] font-mono">
                          ⚡ {p}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* 3. PROJECTS VIEWPORT */}
                {activeSection === "projects" && (
                  <motion.div
                    key="projects"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div>
                      <span className="text-[0.625rem] font-mono text-[var(--color-gold)] uppercase tracking-widest">Milestones & Quests</span>
                      <h2 className="text-xl font-display font-semibold text-white mt-1">Active Mission Nodes</h2>
                    </div>

                    <div className="grid gap-3.5">
                      {projects.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => setSelectedProjectId(p.id)}
                          onMouseEnter={() => handleProjectHover(p.category)}
                          onMouseLeave={() => handleProjectHover(null)}
                          className={`cursor-pointer p-4 rounded-xl border transition-all duration-300 relative ${
                            selectedProjectId === p.id
                              ? "bg-[#0c0e17]/85 border-white/15 shadow-xl scale-[1.01]"
                              : "bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.02]"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[0.625rem] font-mono text-[var(--color-gold)] uppercase tracking-wider block">
                              Category: {projectCategories.find((c) => c.id === p.category)?.label ?? p.category}
                            </span>
                            <span className="text-[0.6rem] font-mono text-slate-500">{p.stack.slice(0, 3).join(" · ")}</span>
                          </div>
                          <h4 className="text-xs font-semibold text-white">{p.title}</h4>
                          <p className="text-[0.7rem] text-slate-400 leading-relaxed mt-2">{p.summary}</p>
                        </div>
                      ))}
                    </div>

                    {/* Selected Project Expanded context overlay */}
                    <AnimatePresence>
                      {selectedProjectId && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          className="absolute inset-0 bg-[#07080d]/98 z-20 p-6 flex flex-col justify-between border border-white/5 rounded-2xl"
                        >
                          {(() => {
                            const p = projects.find((x) => x.id === selectedProjectId);
                            if (!p) return null;
                            return (
                              <>
                                <div>
                                  <div className="flex justify-between items-center border-b border-white/5 pb-2.5 mb-4">
                                    <span className="text-[0.625rem] font-mono text-[var(--color-gold)] uppercase tracking-widest">Mission Detail Log</span>
                                    <button
                                      onClick={() => setSelectedProjectId(null)}
                                      className="text-xs font-mono text-slate-500 hover:text-white"
                                    >
                                      [ Close ]
                                    </button>
                                  </div>

                                  <h3 className="text-lg font-display font-semibold text-white mb-3">{p.title}</h3>
                                  
                                  <div className="space-y-3 text-xs leading-relaxed text-slate-400">
                                    <div>
                                      <strong className="text-slate-200">The Problem:</strong> {p.problem}
                                    </div>
                                    <div>
                                      <strong className="text-slate-200">The Impact:</strong> {p.impact}
                                    </div>
                                    <div>
                                      <strong className="text-slate-200">Stack:</strong> {p.stack.join(" · ")}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex gap-3 mt-6">
                                  {p.links?.map((l) => (
                                    <a
                                      key={l.label}
                                      href={l.href}
                                      className="px-4 py-2 bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/20 text-[var(--color-accent)] hover:text-white hover:bg-[var(--color-accent)] rounded text-[0.65rem] font-mono uppercase tracking-wider transition-colors"
                                    >
                                      {l.label}
                                    </a>
                                  ))}
                                </div>
                              </>
                            );
                          })()}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* 4. TIMELINE VIEWPORT (Memory Depth) */}
                {activeSection === "timeline" && (
                  <motion.div
                    key="timeline"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div>
                      <span className="text-[0.625rem] font-mono text-[var(--color-gold)] uppercase tracking-widest">Cognitive Depth Index</span>
                      <h2 className="text-xl font-display font-semibold text-white mt-1">Memory Timeline Layers</h2>
                    </div>

                    <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4 flex justify-between items-center">
                      <div className="space-y-1">
                        <span className="text-[0.6rem] font-mono text-slate-500 uppercase tracking-wider block">Active Depth Layer</span>
                        <span className="text-sm font-mono text-white font-semibold">
                          {timelineDepth === 0 && "0: Present (Systems Architecture)"}
                          {timelineDepth === 1 && "1: Recent (Distributed Databases)"}
                          {timelineDepth === 2 && "2: Past (Foundations & APIs)"}
                          {timelineDepth === 3 && "3: Origin (Initial Coding Nodes)"}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          disabled={timelineDepth === 0}
                          onClick={() => setTimelineDepth((d) => d - 1)}
                          className="w-8 h-8 rounded-full border border-white/10 hover:border-white/20 disabled:opacity-20 flex items-center justify-center text-xs"
                        >
                          ↑
                        </button>
                        <button
                          disabled={timelineDepth === 3}
                          onClick={() => setTimelineDepth((d) => d + 1)}
                          className="w-8 h-8 rounded-full border border-white/10 hover:border-white/20 disabled:opacity-20 flex items-center justify-center text-xs"
                        >
                          ↓
                        </button>
                      </div>
                    </div>

                    {/* Depth layers display */}
                    <div className="relative h-[220px] bg-slate-950/45 border border-white/5 rounded-xl overflow-hidden p-5 flex flex-col justify-center">
                      <AnimatePresence mode="wait">
                        {timelineDepth === 0 && (
                          <motion.div
                            key="d0"
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.05, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <span className="text-[0.625rem] font-mono text-[var(--color-gold)] font-bold">DEPTH LAYER 0 // PRESENT</span>
                            <h4 className="text-sm font-semibold text-white mt-1">Cosmic Frontend & Distributed Infrastructure</h4>
                            <p className="text-[0.7rem] text-slate-400 leading-relaxed mt-2.5">
                              Present focus: Designing premium fluid interfaces that adapt layout shapes organically, integrated behind double-caching RPC endpoints and vector retrieval loops.
                            </p>
                          </motion.div>
                        )}
                        {timelineDepth === 1 && (
                          <motion.div
                            key="d1"
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.05, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <span className="text-[0.625rem] font-mono text-[var(--color-gold)] font-bold">DEPTH LAYER 1 // RECENT</span>
                            <h4 className="text-sm font-semibold text-white mt-1">Distributed Databases & Latency Reductions</h4>
                            <p className="text-[0.7rem] text-slate-400 leading-relaxed mt-2.5">
                              Middle depth focus: Engineered background retry job schedulers and distributed transaction databases handling large-scale traffic bursts cleanly.
                            </p>
                          </motion.div>
                        )}
                        {timelineDepth === 2 && (
                          <motion.div
                            key="d2"
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.05, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <span className="text-[0.625rem] font-mono text-[var(--color-gold)] font-bold">DEPTH LAYER 2 // PAST</span>
                            <h4 className="text-sm font-semibold text-white mt-1">API Schemas & Versioning Checklists</h4>
                            <p className="text-[0.7rem] text-slate-400 leading-relaxed mt-2.5">
                              Deep depth focus: Standardized REST/gRPC pagination mechanisms and structured OpenAPI schemas, saving developmental turnaround cycles.
                            </p>
                          </motion.div>
                        )}
                        {timelineDepth === 3 && (
                          <motion.div
                            key="d3"
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.05, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <span className="text-[0.625rem] font-mono text-[var(--color-gold)] font-bold">DEPTH LAYER 3 // ORIGIN</span>
                            <h4 className="text-sm font-semibold text-white mt-1">First Code Compilation Cues</h4>
                            <p className="text-[0.7rem] text-slate-400 leading-relaxed mt-2.5">
                              Origin: Began as a logical quest to build structured micro-modules, exploring local database models, compiler diagnostics, and math graphics.
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}

                {/* 5. CONSOLE VIEWPORT */}
                {activeSection === "console" && (
                  <motion.div
                    key="console"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4 flex-1 flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[0.625rem] font-mono text-[var(--color-gold)] uppercase tracking-widest">OS Terminal Prompt</span>
                      <h2 className="text-xl font-display font-semibold text-white mt-1">Hacker Console Command Log</h2>
                    </div>

                    <div className="flex-1 bg-black border border-white/5 rounded-xl font-mono text-[0.7rem] flex flex-col justify-between overflow-hidden shadow-inner h-[280px]">
                      {/* Logs View */}
                      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1.5 text-sky-400">
                        {cliLogs.map((l, idx) => (
                          <div key={idx} className="whitespace-pre-wrap leading-relaxed">
                            {l}
                          </div>
                        ))}
                        <div ref={terminalEndRef} />
                      </div>

                      {/* Input console */}
                      <form onSubmit={runCLI} className="bg-slate-950 border-t border-white/5 flex items-center px-4 py-2 z-10">
                        <span className="text-white mr-2">akshay@cosmic-os ~ $</span>
                        <input
                          type="text"
                          value={cliInput}
                          onChange={(e) => setCliInput(e.target.value)}
                          placeholder="type command (e.g. help)..."
                          className="flex-1 bg-transparent text-white border-none outline-none font-mono focus:ring-0 p-0 text-[0.7rem]"
                        />
                      </form>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Quick Command chip shortcuts at bottom */}
            <div className="mt-8 pt-4 border-t border-white/5 flex flex-wrap gap-2.5 items-center justify-between">
              <span className="text-[0.6rem] font-mono text-slate-500 uppercase tracking-wider">OS Shortcuts:</span>
              <div className="flex gap-2">
                {["help", "skills", "projects", "timeline", "rituals"].map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => {
                      setCliInput(cmd);
                      // Auto trigger submitting the command chip
                      setCliLogs((prev) => [...prev, `akshay@cosmic-os ~ $ ${cmd}`]);
                      let reply = "";
                      if (cmd === "help") {
                        reply = "Available commands:\n  - home       [Activate central core orb]\n  - skills     [Expand gamified RPG matrices]\n  - projects   [Lists active mission details]\n  - timeline   [Inspect cognitive memory layers]\n  - clear      [Reset console outputs]\n  - rituals    [Queries neural alignment frequency]";
                      } else if (cmd === "skills") {
                        setActiveSection("skills");
                        reply = "RPG skill matrices mapped. Geometry morphed to torus.";
                      } else if (cmd === "projects") {
                        setActiveSection("projects");
                        reply = "milestone categories:\n  " + projects.map((p, idx) => `${idx + 1}. ${p.title} (${p.category})`).join("\n  ");
                      } else if (cmd === "timeline") {
                        setActiveSection("timeline");
                        reply = "Memory depth timeline initialized. Layers: 0 (Present), 1 (Recent), 2 (Past), 3 (Origin). Use timeline <num> to zoom.";
                      } else if (cmd === "rituals") {
                        reply = "Diagnostics: Breath mandala aligned. Ohm frequency set to 136.1Hz.";
                      }
                      setCliLogs((prev) => [...prev, reply]);
                      setCliInput("");
                    }}
                    className="px-2.5 py-1 bg-white/[0.02] hover:bg-white/5 border border-white/5 hover:border-white/10 text-[0.625rem] font-mono text-slate-400 hover:text-white rounded transition-colors"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </div>

            {/* RPG Notification Popup */}
            <AnimatePresence>
              {rpgNotification && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute bottom-6 left-6 right-6 bg-emerald-950/95 border border-emerald-500/35 p-3 rounded-lg text-center text-xs font-mono text-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.15)] z-30"
                >
                  {rpgNotification}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right panel: Living Core orb (5 cols) */}
          <div className="lg:col-span-5 bg-[#0b0c13]/25 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-2xl relative flex flex-col items-center justify-center min-h-[400px]">
            <div className="absolute top-4 left-4 flex gap-1.5 items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
              <span className="text-[0.6rem] font-mono uppercase text-slate-500 tracking-wider">Core projection: {activeSection.toUpperCase()}</span>
            </div>

            <div className="w-full h-full flex flex-col items-center justify-center">
              <canvas ref={canvasRef} className="w-full aspect-square max-w-[380px]" />
              
              <div className="text-center mt-4 text-[0.6rem] font-mono text-slate-500">
                DRAG TO PIVOT CORE FORMULA // BREATH PULSE ACTIVE
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
