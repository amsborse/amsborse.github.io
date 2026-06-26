import { Seo } from "@/components/Seo";
import { useState, useEffect, useRef } from "react";

function LivePipelineChart() {
  const [points, setPoints] = useState<number[]>(Array(30).fill(40));
  const requestRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    const update = (time: number) => {
      if (time - lastUpdateRef.current > 150) { // Update every 150ms
        setPoints((prev) => {
          const next = [...prev.slice(1)];
          // Generate a smooth random walk with sine base
          const base = 40 + Math.sin(time / 1000) * 15;
          const noise = (Math.random() - 0.5) * 8;
          const newVal = Math.max(15, Math.min(85, base + noise));
          next.push(newVal);
          return next;
        });
        lastUpdateRef.current = time;
      }
      requestRef.current = requestAnimationFrame(update);
    };

    requestRef.current = requestAnimationFrame(update);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Generate SVG path string (X spans 0 to 300, Y is 0 to 100)
  const pathD = points
    .map((val, index) => {
      const x = (index / (points.length - 1)) * 300;
      const y = 100 - val;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  // Fill path (goes down to bottom corners to create area chart)
  const fillD = `${pathD} L 300 100 L 0 100 Z`;

  const lastVal = points[points.length - 1];
  const lastX = 300;
  const lastY = 100 - lastVal;

  return (
    <div className="live-chart-container" style={{ 
      background: "rgba(99, 102, 241, 0.02)", 
      border: "1px solid rgba(99, 102, 241, 0.08)", 
      borderRadius: "12px", 
      padding: "16px", 
      marginTop: "20px", 
      position: "relative",
      boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.02)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <span style={{ fontSize: "0.85em", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--accent)" }}>
          📡 Live Pipeline Telemetry (Real-Time TPS)
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8em", color: "#10b981", fontWeight: "bold" }}>
          <span className="live-status-dot" style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
          {(10.8 + (lastVal / 20)).toFixed(2)} M/s
        </span>
      </div>

      <svg viewBox="0 0 300 100" style={{ width: "100%", height: "100px", display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--accent2)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        <line x1="0" y1="25" x2="300" y2="25" stroke="rgba(255,255,255,0.06)" strokeDasharray="3" />
        <line x1="0" y1="50" x2="300" y2="50" stroke="rgba(255,255,255,0.06)" strokeDasharray="3" />
        <line x1="0" y1="75" x2="300" y2="75" stroke="rgba(255,255,255,0.06)" strokeDasharray="3" />

        {/* Area fill */}
        <path d={fillD} fill="url(#areaGrad)" style={{ transition: "d 0.15s linear" }} />

        {/* Stroke line */}
        <path d={pathD} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" style={{ transition: "d 0.15s linear" }} />

        {/* Glowing Head Dot */}
        <circle cx={lastX} cy={lastY} r="3.5" fill="var(--accent)" style={{ transition: "cy 0.15s linear" }} />
        <circle cx={lastX} cy={lastY} r="7" fill="var(--accent)" opacity="0.3" style={{ transition: "cy 0.15s linear" }} className="ping-head" />
      </svg>
    </div>
  );
}

interface AnimatedNumberProps {
  target: number;
  prefix?: string;
  suffix?: string;
  active: boolean;
}

function AnimatedNumber({ target, prefix = "", suffix = "", active }: AnimatedNumberProps) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }

    const end = target;
    const duration = 1200; // 1.2s count up
    const startTime = performance.now();

    let animationFrameId: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out quad
      const easeProgress = progress * (2 - progress);
      const current = Math.floor(easeProgress * end);
      setValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setValue(end);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [active, target]);

  return (
    <span className="num">
      {prefix}
      {value}
      {suffix}
    </span>
  );
}

export default function ResumePage() {
  const [morphed, setMorphed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Popup detail states
  const [, setHoveredDetail] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<string | null>(null);
  const [lockedDetail, setLockedDetail] = useState<string | null>(null);
  const [lockedIndex, setLockedIndex] = useState<string | null>(null);

  // Sync body classes
  useEffect(() => {
    if (morphed) {
      document.body.classList.add("morphed");
      setDarkMode(false);
    } else {
      document.body.classList.remove("morphed");
      document.body.classList.remove("dark");
    }
  }, [morphed]);

  useEffect(() => {
    if (morphed && darkMode) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [darkMode, morphed]);

  useEffect(() => {
    if (lockedDetail) {
      document.body.classList.add("focus-mode");
    } else {
      document.body.classList.remove("focus-mode");
    }
  }, [lockedDetail]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove("morphed", "dark", "focus-mode");
    };
  }, []);

  // Popup interaction logic
  const handleItemMouseEnter = (detail: string, index: string) => {
    if (!morphed || lockedDetail) return;
    setHoveredDetail(detail);
    setHoveredIndex(index);
  };

  const handleItemMouseLeave = () => {
    if (lockedDetail) return;
    setHoveredDetail(null);
    setHoveredIndex(null);
  };

  const handleItemClick = (detail: string, index: string, e: React.MouseEvent) => {
    if (!morphed) return;
    e.stopPropagation();
    if (lockedIndex === index) {
      // Unlock
      setLockedDetail(null);
      setLockedIndex(null);
      setHoveredDetail(null);
      setHoveredIndex(null);
    } else {
      // Lock
      setLockedDetail(detail);
      setLockedIndex(index);
      setHoveredDetail(null);
      setHoveredIndex(null);
    }
  };

  const closeLocks = () => {
    setLockedDetail(null);
    setLockedIndex(null);
    setHoveredDetail(null);
    setHoveredIndex(null);
  };

  // Listen to clicks outside to dismiss lock
  useEffect(() => {
    const handleGlobalClick = () => {
      closeLocks();
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  return (
    <>
      <Seo title="Resume" description="Akshay Borse's resume — platform security and cloud-native architecture." path="/resume" />
      
      {/* Dynamic styles injected exactly as provided */}
      <style dangerouslySetInnerHTML={{ __html: `:root{
--paper:#ffffff;--bg:#07080d;--text:#1a1a2e;--text-light:#64748b;
--accent:#6366f1;--accent2:#8b5cf6;--accent3:#ec4899;--accent-soft:#eef2ff;
--clay:8px 8px 20px rgba(0,0,0,0.06),-4px -4px 12px rgba(255,255,255,0.9);
--clay-hover:12px 12px 28px rgba(0,0,0,0.09),-6px -6px 16px rgba(255,255,255,1);
--radius:16px;--spring:cubic-bezier(0.34,1.56,0.64,1);--smooth:cubic-bezier(0.4,0,0.2,1);
--btn-pulse-color:rgba(99,102,241,0.45);
}
.resume-container, .resume-container * {box-sizing:border-box}
body{background:var(--bg);overflow-x:hidden;min-height:100vh;transition:background 0.6s ease}
body.morphed{background:#07080d}
/* ===== RESUME (PDF MODE) ===== */
.resume-container{position:relative;z-index:1;max-width:8.5in;margin:40px auto;background:var(--paper);color:var(--text);padding:0.6in 0.7in;box-shadow:0 4px 24px rgba(0,0,0,0.06);border-radius:4px;transition:all 0.7s var(--smooth)}
body.morphed .resume-container{max-width:1200px;padding:40px 50px;border-radius:var(--radius);box-shadow:var(--clay)}
.header{text-align:center;margin-bottom:14px;transition:all 0.6s var(--smooth)}
body.morphed .header{margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid #e8ecf4}
.header h1{font-size:26pt;font-weight:800;color:var(--text);letter-spacing:-0.5px;transition:all 0.6s var(--smooth)}
body.morphed .header h1{font-size:30pt;background:linear-gradient(135deg,var(--accent),var(--accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.contact-row{font-size:9.5pt;color:var(--text-light);margin-top:4px;transition:all 0.5s}
.contact-row a{color:var(--accent);text-decoration:none}
.contact-row .sep{margin:0 6px;color:#ddd}
body.morphed .contact-row{font-size:10pt;margin-top:8px}
/* Stats bar */
.stats-bar{display:flex;justify-content:center;gap:20px;flex-wrap:wrap;max-height:0;opacity:0;overflow:hidden;transition:all 0.6s var(--smooth) 0.2s;margin:0}
body.morphed .stats-bar{max-height:120px;opacity:1;margin:0 0 24px 0;padding:16px 0}
.stat-card{background:var(--paper);border-radius:12px;padding:12px 20px;text-align:center;box-shadow:var(--clay);transition:transform 0.3s var(--spring)}
.stat-card:hover{transform:translateY(-3px)}
.stat-card .num{font-size:22pt;font-weight:800;color:var(--accent);display:block;line-height:1.2}
.stat-card .lbl{font-size:8pt;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-light);font-weight:600}
/* Sections */
.section{margin-top:16px;transition:all 0.5s var(--smooth)}
body.morphed .section{margin-top:24px;padding:20px 24px;background:var(--paper);border-radius:var(--radius);box-shadow:0 2px 12px rgba(0,0,0,0.04);border:1px solid rgba(0,0,0,0.04)}
.section-title{font-size:10.5pt;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:var(--text);border-bottom:1.5px solid #222;padding-bottom:3px;margin-bottom:10px;transition:all 0.5s}
body.morphed .section-title{font-size:12pt;color:var(--accent);border-bottom-color:var(--accent);border-bottom-width:2px;padding-bottom:8px;margin-bottom:16px;letter-spacing:1.5px}
/* Jobs */
.job{margin-bottom:12px;transition:all 0.5s var(--smooth);border-radius:12px;padding:0}
body.morphed .job{margin-bottom:20px;padding:20px;background:rgba(99,102,241,0.02);border-radius:12px;border:1px solid rgba(99,102,241,0.08)}
body.morphed .job:hover{border-color:rgba(99,102,241,0.18);box-shadow:0 4px 16px rgba(99,102,241,0.06)}
.job-header{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap}
.job-title-text{font-weight:700;font-size:10pt;transition:font-size 0.4s}
body.morphed .job-title-text{font-size:12pt}
.job-date{font-size:9pt;color:var(--text-light)}
.job-sub{font-size:9pt;color:var(--text-light);margin:1px 0 2px;transition:all 0.4s}
body.morphed .job-sub{font-size:9.5pt;margin:4px 0 8px}
.job-tech{font-size:8pt;color:var(--accent);margin:2px 0 4px;font-style:italic;transition:all 0.4s}
body.morphed .job-tech{font-size:0;margin:0;opacity:0;max-height:0;overflow:hidden}
.job ul{padding-left:18px;margin-top:4px}
.job li{font-size:9pt;line-height:1.45;margin-bottom:2px;transition:all 0.4s}
body.morphed .job li{font-size:10pt;line-height:1.6;margin-bottom:6px;cursor:pointer;padding:4px 6px;border-radius:6px;transition:background 0.2s}
body.morphed .job li:hover{background:rgba(99,102,241,0.06)}
/* Tech tags */
.tech-tags{display:none;flex-wrap:wrap;gap:6px;margin:8px 0 12px}
body.morphed .tech-tags{display:flex}
.tech-tag{font-size:8pt;padding:3px 10px;border-radius:20px;background:var(--accent-soft);color:var(--accent);font-weight:600;transition:all 0.3s var(--spring)}
.tech-tag:hover{transform:scale(1.05);background:var(--accent);color:white}
/* Hover popup */
.hover-popup{position:absolute;left:0;top:100%;z-index:50;width:100%;max-width:700px;padding:14px 18px;
 background:rgba(255,255,255,0.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
 border:1px solid rgba(99,102,241,0.12);border-radius:12px;
 box-shadow:0 8px 32px rgba(0,0,0,0.08);
 font-size:9.5pt;line-height:1.65;color:var(--text-light);
 opacity:0;transform:translateY(6px);pointer-events:none;
 transition:opacity 0.3s ease,transform 0.3s ease}
.hover-popup.visible{opacity:1;transform:translateY(4px);pointer-events:auto}
.hover-popup.locked{z-index:60;background:rgba(255,255,255,0.98);border-color:var(--accent);
 box-shadow:0 16px 64px rgba(99,102,241,0.2),0 4px 24px rgba(0,0,0,0.08);
 color:var(--text);transform:translateY(4px) scale(1.02);font-size:10pt;line-height:1.7}
body.focus-mode .resume-container::after{content:'';position:absolute;inset:0;background:rgba(245,247,250,0.4);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);z-index:45;pointer-events:none;animation:focus-fade 0.4s ease forwards;border-radius:inherit}
@keyframes focus-fade{from{opacity:0}to{opacity:1}}
body.focus-mode .section:has(.popup-parent){position:relative;z-index:50}
body.focus-mode li.popup-parent{position:relative;z-index:50;background:rgba(255,255,255,0.97);border-radius:8px;padding:6px 10px;box-shadow:0 8px 32px rgba(99,102,241,0.12)}
body.morphed .job li[data-detail]{position:relative}
body.morphed .job li[data-detail]::after{content:'';position:absolute;right:-8px;top:50%;width:4px;height:4px;border-radius:50%;background:var(--accent);opacity:0;transform:translateY(-50%);transition:opacity 0.3s}
body.morphed .job li[data-detail]:hover::after{opacity:0.6}
/* ===== MORPHED-ONLY EXPANDED SECTIONS ===== */
.morphed-only{display:none;margin-top:20px}
body.morphed .morphed-only{display:block;animation:section-reveal 0.5s var(--smooth) forwards}
.arch-card{background:linear-gradient(135deg,#1e1b4b,#312e81);color:#e0e7ff;border-radius:14px;padding:24px 28px;margin:16px 0;font-family:'Cascadia Code','Fira Code',monospace;font-size:9pt;line-height:1.7;overflow-x:auto;position:relative}
.arch-card::before{content:'ARCHITECTURE';position:absolute;top:10px;right:16px;font-size:7pt;letter-spacing:1.5px;color:#818cf8;font-weight:700}
.arch-card .highlight{color:#a5b4fc;font-weight:700}
.arch-card .dim{color:#6366f1}
.arch-card .num{color:#34d399;font-weight:700}
.metrics-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin:16px 0}
.metric-card{background:var(--paper);border:1px solid rgba(99,102,241,0.1);border-radius:12px;padding:16px;text-align:center;transition:transform 0.3s var(--spring)}
.metric-card:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(99,102,241,0.08)}
.metric-card .metric-num{font-size:1.6em;font-weight:800;color:var(--accent);display:block}
.metric-card .metric-label{font-size:0.75em;color:var(--text-light);text-transform:uppercase;letter-spacing:0.5px;margin-top:4px}
.metric-card .metric-source{font-size:0.65em;color:#a5b4fc;margin-top:6px;font-style:italic}
.timeline{position:relative;padding-left:28px;margin:16px 0}
.timeline::before{content:'';position:absolute;left:8px;top:0;bottom:0;width:2px;background:linear-gradient(180deg,var(--accent),var(--accent2),var(--accent3))}
.timeline-item{position:relative;margin-bottom:20px;padding:14px 18px;background:rgba(99,102,241,0.03);border:1px solid rgba(99,102,241,0.08);border-radius:12px}
.timeline-item::before{content:'';position:absolute;left:-24px;top:18px;width:12px;height:12px;border-radius:50%;background:var(--accent);border:3px solid var(--paper);box-shadow:0 0 0 2px var(--accent)}
.timeline-item .tl-date{font-size:0.75em;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:0.5px}
.timeline-item .tl-title{font-size:0.95em;font-weight:700;margin:4px 0}
.timeline-item .tl-desc{font-size:0.85em;color:var(--text-light);line-height:1.6}
.timeline-item .tl-tags{margin-top:8px;display:flex;flex-wrap:wrap;gap:4px}
.timeline-item .tl-tag{font-size:7pt;padding:2px 8px;border-radius:10px;background:var(--accent-soft);color:var(--accent);font-weight:600}
.incident-card{background:linear-gradient(to right,#fef2f2,var(--paper));border:1px solid #fca5a5;border-radius:12px;padding:16px 20px;margin:10px 0}
.incident-card .inc-sev{font-size:0.7em;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#dc2626}
.incident-card .inc-title{font-size:0.92em;font-weight:700;margin:4px 0}
.incident-card .inc-detail{font-size:0.82em;color:var(--text-light);line-height:1.6}
.incident-card .inc-outcome{font-size:0.82em;color:#059669;font-weight:600;margin-top:6px}
.collab-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin:12px 0}
.collab-card{padding:12px 16px;background:rgba(99,102,241,0.03);border:1px solid rgba(99,102,241,0.08);border-radius:10px;font-size:0.85em}
.collab-card .collab-name{font-weight:700;color:var(--accent)}
.collab-card .collab-ctx{color:var(--text-light);margin-top:2px}
/* Skills */
.skills-grid{display:grid;grid-template-columns:80px 1fr;gap:4px 12px;font-size:9pt;margin:0;padding:0;list-style:none}
.skills-grid dt{font-weight:700;color:var(--text)}
.skills-grid dd{color:var(--text-light);line-height:1.5}
body.morphed .skills-grid{grid-template-columns:1fr;gap:16px}
body.morphed .skills-grid dt{display:none}
body.morphed .skills-grid dd{display:none}
.skill-bars{display:none;gap:14px;flex-direction:column}
body.morphed .skill-bars{display:flex}
.skill-row{display:flex;align-items:center;gap:12px}
.skill-label{font-size:9pt;font-weight:600;min-width:90px;color:var(--text)}
.skill-bar-bg{flex:1;height:8px;background:#e8ecf4;border-radius:8px;overflow:hidden}
.skill-bar-fill{height:100%;border-radius:8px;width:0;transition:width 1.2s var(--spring)}
body.morphed .skill-bar-fill.animate{width:var(--fill)}
.skill-bar-fill.purple{background:linear-gradient(90deg,var(--accent),var(--accent2))}
.skill-bar-fill.blue{background:linear-gradient(90deg,#06b6d4,#3b82f6)}
.skill-bar-fill.green{background:linear-gradient(90deg,#10b981,#34d399)}
.skill-bar-fill.orange{background:linear-gradient(90deg,#f59e0b,#ef4444)}
.skill-bar-fill.pink{background:linear-gradient(90deg,#ec4899,#8b5cf6)}
.skill-items{font-size:8.5pt;color:var(--text-light);min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* Education & Recognition */
.edu-line{display:flex;justify-content:space-between;align-items:baseline;font-size:9.5pt;margin-bottom:6px;flex-wrap:wrap}
.edu-line .right{font-size:8.5pt;color:var(--text-light)}
body.morphed .edu-line{font-size:10.5pt;padding:12px 16px;background:rgba(99,102,241,0.03);border-radius:10px;margin-bottom:10px;border:1px solid rgba(99,102,241,0.06)}
.recognition{padding-left:18px}
.recognition li{font-size:9pt;margin-bottom:4px;line-height:1.45}
body.morphed .recognition li{font-size:10pt;margin-bottom:8px;line-height:1.6}
/* Summary */
.summary-text{font-size:9pt;line-height:1.5;color:var(--text);transition:all 0.4s}
body.morphed .summary-text{font-size:10.5pt;line-height:1.7;color:var(--text)}
/* Morph button styles replaced with premium toggle pill */
.mode-toggle-container{position:fixed;bottom:28px;right:28px;z-index:1000;display:flex;align-items:center;gap:10px;animation:toggle-fade-in 0.6s var(--spring) forwards}
@keyframes toggle-fade-in{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.mode-toggle-pill{display:flex;background:rgba(255,255,255,0.75);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(0,0,0,0.06);border-radius:9999px;padding:3px;box-shadow:0 4px 24px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.5);position:relative;transition:all 0.4s var(--smooth)}
body.morphed .mode-toggle-pill{background:rgba(13,17,28,0.5);border:1px solid rgba(255,255,255,0.08);box-shadow:0 8px 32px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.05)}
.toggle-option{background:transparent;border:none;cursor:pointer;padding:8px 16px;font-size:8.5pt;font-weight:600;color:var(--text-light);border-radius:9999px;display:flex;align-items:center;gap:6px;transition:all 0.3s var(--smooth);position:relative;z-index:1}
.toggle-option .icon{font-size:10pt;transition:transform 0.3s var(--spring)}
.toggle-option:hover .icon{transform:scale(1.15) rotate(5deg)}
.toggle-option.active{color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent2));box-shadow:0 2px 10px rgba(99,102,241,0.25)}
.toggle-option:not(.active):hover{color:var(--text);background:rgba(0,0,0,0.03)}
body.morphed .toggle-option:not(.active):hover{color:var(--text);background:rgba(255,255,255,0.05)}
.theme-btn-pill{width:38px;height:38px;border-radius:50%;border:1px solid rgba(0,0,0,0.06);cursor:pointer;background:rgba(255,255,255,0.75);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 4px 20px rgba(0,0,0,0.06);display:none;align-items:center;justify-content:center;font-size:14px;transition:all 0.3s var(--spring)}
.theme-btn-pill.visible{display:flex;animation:scale-up-theme 0.3s var(--spring) forwards}
@keyframes scale-up-theme{from{transform:scale(0)}to{transform:scale(1)}}
body.morphed .theme-btn-pill{background:rgba(13,17,28,0.5);border-color:rgba(255,255,255,0.08);box-shadow:0 8px 32px rgba(0,0,0,0.3);color:#fff}
.theme-btn-pill:hover{transform:scale(1.12) rotate(15deg);border-color:var(--accent);box-shadow:0 0 15px rgba(99,102,241,0.25)}
body.morphed .section{opacity:0;transform:translateY(16px);animation:section-reveal 0.5s var(--smooth) forwards}
body.morphed .section:nth-child(1){animation-delay:0.1s}
body.morphed .section:nth-child(2){animation-delay:0.2s}
body.morphed .section:nth-child(3){animation-delay:0.35s}
body.morphed .section:nth-child(4){animation-delay:0.45s}
body.morphed .section:nth-child(5){animation-delay:0.55s}
body.morphed .section:nth-child(6){animation-delay:0.65s}
body.morphed .section:nth-child(7){animation-delay:0.75s}
body.morphed .section:nth-child(8){animation-delay:0.85s}
@keyframes section-reveal{to{opacity:1;transform:translateY(0)}}
body.morphed .section{transition:transform 0.4s var(--smooth), box-shadow 0.4s var(--smooth), border-color 0.4s var(--smooth)}
body.morphed .section:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(0,0,0,0.06);border-color:rgba(99,102,241,0.15)}
body.morphed.dark .section:hover{box-shadow:0 16px 40px rgba(0,0,0,0.3);border-color:rgba(56,189,248,0.18)}
body.morphed .stat-card{transition:transform 0.4s var(--spring), box-shadow 0.4s var(--smooth)}
body.morphed .stat-card:hover{transform:translateY(-4px) scale(1.03);box-shadow:0 10px 24px rgba(99,102,241,0.1)}
body.morphed.dark .stat-card:hover{box-shadow:0 10px 24px rgba(56,189,248,0.15)}
.impact{position:relative;display:inline;background:linear-gradient(120deg,rgba(99,102,241,0) 0%,rgba(99,102,241,0) 100%);background-size:0 2px;background-position:0 100%;background-repeat:no-repeat;transition:background-size 0.6s ease}
body.morphed .impact{background-size:100% 2px}
@keyframes drift-1 {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(8vw, 6vh) scale(1.15); }
  100% { transform: translate(-3vw, -4vh) scale(0.9); }
}
@keyframes drift-2 {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-6vw, -8vh) scale(1.2); }
  100% { transform: translate(4vw, 3vh) scale(0.95); }
}
@keyframes ping-glow {
  0% { transform: scale(0.95); opacity: 0.55; }
  50% { transform: scale(1.15); opacity: 1; filter: drop-shadow(0 0 4px #10b981); }
  100% { transform: scale(0.95); opacity: 0.55; }
}
.live-status-dot {
  animation: ping-glow 1.8s infinite ease-in-out;
}
.ping-head {
  animation: dot-pulse 1.4s infinite cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes dot-pulse {
  0% { r: 4px; opacity: 0.8; }
  100% { r: 12px; opacity: 0; }
}
/* ============================================================
 DARK MODE (additive--only affects the interactive "morphed"
 view; paper/PDF default and print are untouched)
 ============================================================ */


/* re-map the palette: most elements reference these vars, so they recolor automatically */
body.morphed.dark{
--paper:rgba(13,17,28,0.55);--bg:#07080d;--text:#f8fafc;--text-light:#94a3b8;
--accent:#38bdf8;--accent2:#818cf8;--accent3:#f59e0b;--accent-soft:rgba(56, 189, 248, 0.12);
--clay:0 14px 38px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.06);
--clay-hover:0 22px 50px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.08);
--btn-pulse-color:rgba(56,189,248,0.45);
 background:#07080d;
}
/* soft static glow background (no blur / no animation = smooth) */
body.morphed.dark::before{content:'';position:fixed;inset:0;z-index:0;pointer-events:none;
 background:
 radial-gradient(46vw 46vw at 6% 2%,rgba(124,92,255,.20),transparent 60%),
 radial-gradient(44vw 44vw at 98% 100%,rgba(0,200,170,.16),transparent 60%);}
body.morphed.dark .resume-container{background:rgba(16,18,34,.55);border:1px solid rgba(255,255,255,.08);
 box-shadow:0 30px 80px rgba(0,0,0,.5);}
body.morphed.dark .header{border-bottom-color:rgba(255,255,255,.10)!important;}
body.morphed.dark .contact-row .sep{color:#444a6b;}
body.morphed.dark .section{background:var(--paper)!important;border:1px solid rgba(255,255,255,.08)!important;
 box-shadow:var(--clay)!important;}
body.morphed.dark .stat-card,body.morphed.dark .metric-card{background:var(--paper)!important;
 border:1px solid rgba(255,255,255,.09)!important;}
body.morphed.dark .skill-bar-bg{background:rgba(255,255,255,.09);}
body.morphed.dark .timeline-item .tl-desc,body.morphed.dark .metric-card .metric-source,
body.morphed.dark .collab-card .collab-ctx{color:var(--text-light);}
body.morphed.dark .incident-card{background:linear-gradient(to right,rgba(255,90,90,.12),var(--paper));
 border-color:rgba(255,120,120,.30);}
body.morphed.dark .incident-card .inc-sev{color:#ff8a8a;}
body.morphed.dark .incident-card .inc-outcome{color:#34e0b0;}
body.morphed.dark .hover-popup{background:rgba(21,24,44,.92)!important;border-color:rgba(139,123,255,.30);
 color:var(--text-light);}
body.morphed.dark .hover-popup.locked{background:rgba(27,30,54,.97)!important;color:var(--text);
 border-color:var(--accent);box-shadow:0 16px 64px rgba(139,123,255,.30);}
body.morphed.dark.focus-mode .resume-container::after{background:rgba(4,4,12,.5);}
body.morphed.dark.focus-mode li.popup-parent{background:rgba(27,30,54,.95);box-shadow:0 8px 32px rgba(139,123,255,.25);}
body.morphed.dark .theme-btn-pill{background:rgba(27,30,54,.92);color:#ffd770;border:1px solid rgba(255,255,255,.12);}
body.morphed.dark ::selection{background:rgba(139,123,255,.4);color:#fff;}
/* keep résumé content above the glow layer (container is z-index:1 by default; buttons stay at 1000) */
body.morphed.dark .resume-container{z-index:1;}
@media print{
.mode-toggle-container,.theme-btn-pill,.stats-bar,.tech-tags,.skill-bars,.hover-popup,.morphed-only{display:none!important}
body,.resume-container{background:#fff!important;box-shadow:none!important;border-radius:0!important;margin:0!important;max-width:100%!important;padding:0.5in!important}
}` }} />

      <div className="resume-page-wrapper" style={{ minHeight: "100vh", position: "relative", paddingTop: "5rem" }}>
        {morphed && (
          <div className="ambient-glow-wrapper no-print" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
            <div className="glow-blob glow-1" style={{
              position: "absolute",
              top: "-10%",
              left: "-10%",
              width: "50vw",
              height: "50vw",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)",
              filter: "blur(80px)",
              animation: "drift-1 25s infinite alternate ease-in-out"
            }} />
            <div className="glow-blob glow-2" style={{
              position: "absolute",
              bottom: "-10%",
              right: "-10%",
              width: "50vw",
              height: "50vw",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 70%)",
              filter: "blur(80px)",
              animation: "drift-2 20s infinite alternate ease-in-out"
            }} />
          </div>
        )}
        <div className="resume-content-view">
          <div className="resume-container" style={{ position: "relative" }}>
            {/* Mode & Theme Selection Bar */}
            <div className="no-print mode-toggle-container">
              <div className="mode-toggle-pill">
                <button
                  className={`toggle-option ${!morphed ? 'active' : ''}`}
                  onClick={() => setMorphed(false)}
                >
                  <span className="icon">📄</span>
                  <span className="label">PDF View</span>
                </button>
                <button
                  className={`toggle-option ${morphed ? 'active' : ''}`}
                  onClick={() => setMorphed(true)}
                >
                  <span className="icon">✨</span>
                  <span className="label">Interactive</span>
                </button>
              </div>

              <button 
                className={`theme-btn-pill ${morphed ? 'visible' : ''}`}
                onClick={() => setDarkMode(!darkMode)}
                title="Toggle Theme"
                aria-label="Toggle Theme"
              >
                {darkMode ? "☀️" : "🌙"}
              </button>
            </div>

              <div className="header">
                <h1>Akshay Borse</h1>
                <div className="contact-row">
                  425–336–9852<span className="sep">|</span>
                  <a href="mailto:amsborse@gmail.com">amsborse@gmail.com</a><span className="sep">|</span>
                  <a href="https://linkedin.com/in/akshayborse" target="_blank" rel="noopener noreferrer">LinkedIn</a><span className="sep">|</span>
                  <a href="https://github.com/amsborse" target="_blank" rel="noopener noreferrer">GitHub</a><span className="sep">|</span>
                  <a href="https://medium.com/@amsborse" target="_blank" rel="noopener noreferrer">Medium</a><span className="sep">|</span>
                  <a href="https://substack.com/@amsborse" target="_blank" rel="noopener noreferrer">Substack</a>
                </div>
              </div>

              {/* Stats bar with active animations */}
              <div className="stats-bar">
                <div className="stat-card">
                  <AnimatedNumber target={13} suffix="M/day" active={morphed} />
                  <span className="lbl">Triggers processed</span>
                </div>
                <div className="stat-card">
                  <AnimatedNumber target={34} suffix="K" active={morphed} />
                  <span className="lbl">Tenants served</span>
                </div>
                <div className="stat-card">
                  <AnimatedNumber target={28} prefix="$" suffix="MM" active={morphed} />
                  <span className="lbl">Profit impact</span>
                </div>
                <div className="stat-card">
                  <AnimatedNumber target={5} active={morphed} />
                  <span className="lbl">Cloud envs</span>
                </div>
                <div className="stat-card">
                  <AnimatedNumber target={100} suffix="K+" active={morphed} />
                  <span className="lbl">TPS scale</span>
                </div>
                <div className="stat-card">
                  <AnimatedNumber target={60} suffix="%" active={morphed} />
                  <span className="lbl">Latency reduced</span>
                </div>
              </div>

              {/* Summary Section */}
              <div className="section">
                <div className="section-title">Summary</div>
                <p className="summary-text">
                  Platform engineer who builds the systems that protect organizations from threats they haven't imagined yet. Currently architecting Microsoft's agentic AI risk-scoring infrastructure — a pipeline processing 12.9M triggers/day across 34,000+ enterprise tenants that decides in real time whether an AI agent is too dangerous to keep running, and automatically enforces protection through Entra ID and Conditional Access. Previously spent 6 years at Amazon building ML-integrated fulfillment systems that drove $28MM+ annual profit and reduced operational costs by $3M+/year. I design for sovereign-cloud compliance, billions-of-signals-per-day scale, and zero-downtime deployments — then ship it across 5 production cloud environments without waking anyone up.
                </p>
              </div>

              {/* Experience Section */}
              <div className="section">
                <div className="section-title">Experience</div>
                
                {/* MICROSOFT JOB */}
                <div className="job" id="job-msft">
                  <div className="job-header">
                    <span className="job-title-text">Senior Software Engineer — Microsoft Purview (Insider Risk Management)</span>
                    <span className="job-date">Sep 2025 – Present</span>
                  </div>
                  <div className="job-sub">Redmond, WA • Agentic AI Risk Scoring, Adaptive Protection, Progressive Insights, Sovereign Cloud</div>
                  <div className="job-tech">C#, .NET 8, Azure Functions, Cosmos DB, Event Hubs, Scala/Spark, Entra ID, Graph API, Geneva/Kusto, EV2, Key Vault</div>
                  <div className="tech-tags">
                    <span className="tech-tag">C#/.NET 8</span>
                    <span className="tech-tag">Azure Functions</span>
                    <span className="tech-tag">Cosmos DB</span>
                    <span className="tech-tag">Event Hubs</span>
                    <span className="tech-tag">Scala/Spark</span>
                    <span className="tech-tag">Entra ID</span>
                    <span className="tech-tag">Graph API</span>
                    <span className="tech-tag">Geneva/Kusto</span>
                    <span className="tech-tag">EV2</span>
                    <span className="tech-tag">Key Vault</span>
                    <span className="tech-tag">Service Fabric</span>
                    <span className="tech-tag">ADLS Gen2</span>
                    <span className="tech-tag">DLP</span>
                    <span className="tech-tag">Conditional Access</span>
                  </div>
                  <ul>
                    {[
                      {
                        index: "ms-1",
                        boldText: "Architected end-to-end AI-agent risk-scoring pipeline",
                        plainText: " — 4-stage system processing ",
                        impactText: "12.9M triggers/day",
                        extraText: " (23.9M peak) across 34,000+ tenants; concept to sovereign-cloud GA in 9 months.",
                        detail: "Built a parallel 4-stage system: Activity Ingestion (Event Hub capture) → Trigger Evaluation (12.9M dispatches/day, 23.9M peak) → Insight Generation (366,700 insights/day, 475,500 peak) → Enforcement (Entra/Graph risk signal + DLP/Conditional Access). Scores AI agent behavior across M365 surfaces. Went from zero infrastructure to sovereign-cloud GA across Commercial + GCC/GCCH/DOD in 9 months. 100+ PRs, 849 commits, 13,500+ file changes."
                      },
                      {
                        index: "ms-2",
                        boldText: "Built Progressive Insights pipeline",
                        plainText: " — Spark streaming → Event Hub → Cosmos DB → Azure Functions scoring; ",
                        impactText: "~39M user events/day",
                        extraText: ", ~200K agent events/day, P95 latency 48s.",
                        detail: "Two-phase Progressive Insights pipeline: Phase 1 (Tyrol/Spark) runs IrmHourlyCumulativeFullAggregator and IrmProgressiveInsightGenerationJob, outputting changed insights to Event Hub and full snapshots to ADLS. Phase 2 (.NET 8 Functions) captures via InsightsCapturer into Cosmos DB, runs BackupInsightsProcessorClient every ~5 min for safety, deduplicates by ConstantInsightId, scores via UserInsightsProcessor, and feeds into Adaptive Protection. Handles ~39M user events/day + ~200K agent events/day."
                      },
                      {
                        index: "ms-3",
                        boldText: "Integrated Purview with Entra ID for agent risk enforcement",
                        plainText: " — Graph API endpoints, risk signal propagation, IRM deep links; ",
                        impactText: "same-cycle CA enforcement",
                        extraText: " with no human intervention.",
                        detail: "Integrated Purview IRM with Microsoft Entra ID for AI agent risk signals. Built new Graph API endpoints for agent risk signal propagation, riskyUserId/actorType flow, HttpClient certificate authentication, default policy auto-setup, and IRM deep links. SOC analysts navigate directly from Entra alert to Purview investigation. Enforcement loop: IRM detects risky agent → scores risk → pushes signal to Entra → triggers DLP/Conditional Access policy automatically."
                      },
                      {
                        index: "ms-4",
                        boldText: "Optimized Adaptive Protection scoring latency by 40–60%",
                        plainText: " — parallelized Cosmos + EOP writes; scoring ",
                        impactText: "119,800 insights/day",
                        extraText: " (958K per 8-day window).",
                        detail: "Parallelized independent Cosmos DB and EOP writes in the AP scoring path, refactored UserRiskProfileProcessorBase for agent/user separation, and optimized the scoring pipeline end-to-end. Scoring processes 958,800 insights per 8-day window (119,800/day). Pipeline now handles 366,700 new insights/day with peak of 475,500/day."
                      },
                      {
                        index: "ms-5",
                        boldText: "Built isolated agent compute infrastructure",
                        plainText: " — 28 dedicated Function Apps; ",
                        impactText: "33% lower P95 latency",
                        extraText: " (48s vs 72s), 100% API success rate over 30 days.",
                        detail: "Built 14 dedicated AgentDataClient Function Apps + 14 DataClient apps with fully isolated App Service Plans and storage accounts. Agent pipeline achieves P95 capture latency of 48s vs 72s for the shared user pipeline (33% improvement). Agent burst at 3x load never touches user SLAs. 100% API success rate across all DataClient operations over 30 days."
                      },
                      {
                        index: "ms-6",
                        boldText: "Led sovereign cloud rollout (GCC, GCCH, DOD)",
                        plainText: " — DR across 4 forests, ",
                        impactText: "53 resource groups",
                        extraText: ", 51 agent deployments, staged ring-by-ring delivery.",
                        detail: "Authored DR parameter files across GCC01, GCC02, USG01, USG02. Built EV2 service model and rollout specs spanning 53 resource groups and 51 agent DataClient deployments. Staged rollout: GCC-first, then GCCH/DOD. Geneva/Kusto onboarding for Gov telemetry (3 environments × 7 steps × 16 Geneva queries). Embedded ASP steps, fixed rollout-spec bugs, and added ServiceModel_DR updates."
                      },
                      {
                        index: "ms-7",
                        boldText: "Extended IRM to treat AI agents as first-class actors",
                        plainText: " — DRP, historical search, risk scoring, policy lookup, onboarding; serving ",
                        impactText: "13,047 tenants",
                        extraText: ", 237,600+ agent actors.",
                        detail: "Extended IRM platform to treat AI agents as first-class actors: Agent type in UpsertDRPCustomTag, actor support in HistoricalSearchProcess, AgentAdaptiveProtectionSettings, RiskProfileProcessorClient for agent scoring, MasterDRPSyncClient for agent DRP sync, ObjectId/mailbox identity for Agentic User, AgentActorComparer for reusable comparison logic. Now serving 13,047 tenants with 237,600+ distinct agent actors."
                      },
                      {
                        index: "ms-8",
                        boldText: "Operated on CDP at billions-of-signals-per-day scale",
                        plainText: " — multi-stage Spark → Event Hub → Kusto → Service Fabric pipeline; ",
                        impactText: "82 EV2 resource definitions",
                        extraText: ", horizontal storage sharding.",
                        detail: "Operated on CDP (Common Data Platform) processing billions of signals/day through a multi-stage pipeline: Sources → S1 (Spark Structured Streaming) → S2 (parallel dispatch) → S3 (batch aggregation) → K1/K2 (Kusto ingestion) → Q (query). EV2 service model with 82 resource definitions. Horizontal storage sharding. 500K records in 8.3 min parallel vs 13.8h sequential."
                      },
                      {
                        index: "ms-9",
                        boldText: "Resolved critical Gov production incidents",
                        plainText: " — Event Hub deletion (",
                        impactText: "~90% capture drop",
                        extraText: " recovered), Cosmos conflict bugs; established team-wide recovery SOPs.",
                        detail: "Resolved Event Hub deletion in GCC02 causing ~90% insight capture drop. Fixed Cosmos conflict bug affecting 3 Gov tenants. Managed multiple Sev 2/3/4 ICM days during Gov rollout. Recovery procedures became team-wide standards."
                      },
                      {
                        index: "ms-10",
                        boldText: "Managed complex flight and release operations",
                        plainText: " — 10+ cloud rings, cherry-pick/backport coordination, ",
                        impactText: "100-file config cleanup",
                        extraText: ", staged Gov scoping.",
                        detail: "Managed feature flights across 10+ cloud regions/rings. Executed cherry-pick/backport waves across release branches. 100-file config cleanup in single PR. Scoped risky Gov rollout from all-Gov to GCC-only, then expanded after validation. ActorId to AgentId migration + backfill."
                      },
                      {
                        index: "ms-11",
                        boldText: "Scaled trigger pipeline to 400M dispatches/month",
                        plainText: " — ",
                        impactText: "25.8M distinct actors",
                        extraText: ", intelligent throttling (48.3%) and noise filtering (6%) for signal quality.",
                        detail: "Trigger pipeline processes 399.7M dispatches in 30 days across 34,071 tenants and 25.8M distinct actors. Disposition: 45.7% Allowed (181.7M), 48.3% Throttled (191.8M), 6% DroppedNoisy (23.7M). Covers the full IRM signal surface across all M365 workloads."
                      }
                    ].map((bullet) => (
                      <li
                        key={bullet.index}
                        className={
                          (lockedIndex === bullet.index ? "popup-parent " : "") +
                          (morphed ? "morphed-li" : "")
                        }
                        onMouseEnter={() => handleItemMouseEnter(bullet.detail, bullet.index)}
                        onMouseLeave={handleItemMouseLeave}
                        onClick={(e) => handleItemClick(bullet.detail, bullet.index, e)}
                      >
                        <strong>{bullet.boldText}</strong>
                        {bullet.plainText}
                        <span className="impact">{bullet.impactText}</span>
                        {bullet.extraText}

                        {/* Interactive Popup inside li */}
                        {morphed && (hoveredIndex === bullet.index || lockedIndex === bullet.index) && (
                          <div 
                            className={`hover-popup ${
                              hoveredIndex === bullet.index ? 'visible' : ''
                            } ${
                              lockedIndex === bullet.index ? 'visible locked' : ''
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {bullet.detail}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* AMAZON JOB */}
                <div className="job" id="job-amzn">
                  <div className="job-header">
                    <span className="job-title-text">Software Engineer II — Amazon (Order Fulfillment & Delivery Experience)</span>
                    <span className="job-date">Aug 2019 – Aug 2025</span>
                  </div>
                  <div className="job-sub">Seattle, WA • Supply Chain Optimization, Delivery Predictions, Infrastructure</div>
                  <div className="job-tech">Java, Python, gRPC, Docker, ECS, DynamoDB, S3, Lambda, SageMaker, Bedrock, Kinesis</div>
                  <div className="tech-tags">
                    <span className="tech-tag">Java</span>
                    <span className="tech-tag">Python</span>
                    <span className="tech-tag">gRPC</span>
                    <span className="tech-tag">Docker</span>
                    <span className="tech-tag">ECS</span>
                    <span className="tech-tag">DynamoDB</span>
                    <span className="tech-tag">S3</span>
                    <span className="tech-tag">Lambda</span>
                    <span className="tech-tag">Aurora</span>
                    <span className="tech-tag">Step Functions</span>
                    <span className="tech-tag">SageMaker</span>
                    <span className="tech-tag">Bedrock</span>
                    <span className="tech-tag">Kinesis</span>
                    <span className="tech-tag">Redis</span>
                  </div>
                  <ul>
                    {[
                      {
                        index: "amz-1",
                        boldText: "Architected backend for quantile regression model",
                        plainText: " — ",
                        impactText: "~$28MM profit gain.",
                        extraText: "",
                        detail: "Built the full backend: real-time feature pipeline, model serving infrastructure, A/B test framework, and rollback safety nets. SageMaker-hosted quantile regression model powers delivery date predictions across all of Amazon logistics."
                      },
                      {
                        index: "amz-2",
                        boldText: "Led logging optimization",
                        plainText: " — ",
                        impactText: "$3M+/year savings",
                        extraText: " across 60+ services.",
                        detail: "Audited 60+ services during AWS migration. Identified redundant CloudWatch metrics, optimized log levels, implemented sampling strategies. Reduced costs by $250K+/month sustained."
                      },
                      {
                        index: "amz-3",
                        boldText: "Microservice bootstrap library",
                        plainText: " — saving ",
                        impactText: "40–50 engineer-weeks.",
                        extraText: "",
                        detail: "Custom DSL for service configuration: dependency injection, middleware chains, health checks, deployment pipelines — all generated from a single config file. Reduced new service setup from 2–3 weeks to hours."
                      },
                      {
                        index: "amz-4",
                        boldText: "Event orchestration",
                        plainText: " — ",
                        impactText: "100K+ TPS",
                        extraText: ", 16 services.",
                        detail: "Unified event bus connecting 16 services via REST + gRPC. Handles order state transitions, inventory updates, delivery scheduling, and customer notifications. Sustained 100K+ TPS during peak events."
                      },
                      {
                        index: "amz-5",
                        boldText: "RAG delivery prediction",
                        plainText: " — ",
                        impactText: "7% global sales increase.",
                        extraText: "",
                        detail: "Retrieval-augmented generation using SageMaker embeddings + OpenSearch vector index. Predicts delivery windows by retrieving similar historical deliveries and adjusting for current conditions."
                      },
                      {
                        index: "amz-6",
                        boldText: "Just-In-Stock",
                        plainText: " — ",
                        impactText: "16% early delivery increase.",
                        extraText: "",
                        detail: "Real-time inventory optimization that routes packages to the closest fulfillment center with available stock, reducing transit time and increasing early-delivery rates by 16%."
                      },
                      {
                        index: "amz-7",
                        boldText: "LLM email redesign",
                        plainText: " — 37 templates via Bedrock.",
                        impactText: "",
                        extraText: "",
                        detail: "Used Amazon Bedrock (Claude/Titan) with RAG constraints to ensure brand compliance, legal requirements, and personalization. Automated generation of 37 transactional email templates."
                      },
                      {
                        index: "amz-8",
                        boldText: "Load testing 60+ services",
                        plainText: " for Prime Day.",
                        impactText: "",
                        extraText: "",
                        detail: "Built load testing infrastructure for Prime Day and Black Friday. Validated auto-scaling policies, identified bottlenecks, ensured zero degradation during 10x traffic spikes."
                      },
                      {
                        index: "amz-9",
                        boldText: "Sev-2 reduced 60%",
                        plainText: " via on-call reviews.",
                        impactText: "",
                        extraText: "",
                        detail: "Conducted systematic on-call reduction reviews across 8 teams. Identified recurring alerts, built runbooks, automated common resolutions. Sev-2 page frequency dropped 60%."
                      },
                      {
                        index: "amz-10",
                        boldText: "TRA readiness",
                        plainText: " — CI/CD, fault injection, canary.",
                        impactText: "",
                        extraText: "",
                        detail: "Full TRA (Threat & Risk Assessment) for Tier-1 service: CI/CD hardening, multi-AZ failover, chaos engineering via fault injection, canary deployments, and reusable developer tools."
                      }
                    ].map((bullet) => (
                      <li
                        key={bullet.index}
                        className={
                          (lockedIndex === bullet.index ? "popup-parent " : "") +
                          (morphed ? "morphed-li" : "")
                        }
                        onMouseEnter={() => handleItemMouseEnter(bullet.detail, bullet.index)}
                        onMouseLeave={handleItemMouseLeave}
                        onClick={(e) => handleItemClick(bullet.detail, bullet.index, e)}
                      >
                        <strong>{bullet.boldText}</strong>
                        {bullet.plainText}
                        <span className="impact">{bullet.impactText}</span>
                        {bullet.extraText}

                        {/* Interactive Popup inside li */}
                        {morphed && (hoveredIndex === bullet.index || lockedIndex === bullet.index) && (
                          <div 
                            className={`hover-popup ${
                              hoveredIndex === bullet.index ? 'visible' : ''
                            } ${
                              lockedIndex === bullet.index ? 'visible locked' : ''
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {bullet.detail}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

              {/* MORPHED SECTION: PRODUCTION SCALE METRICS */}
              <div className="section morphed-only">
                <div className="section-title">📊 Production Scale Metrics (Kusto-Verified)</div>
                <div className="metrics-grid">
                  <div className="metric-card"><span className="metric-num">12.9M/day</span><span className="metric-label">Trigger Dispatches (avg)</span><span className="metric-source">Kusto: TriggerDispatcher 30d</span></div>
                  <div className="metric-card"><span className="metric-num">23.9M/day</span><span className="metric-label">Trigger Dispatches (peak)</span><span className="metric-source">Kusto: TriggerDispatcher 30d peak</span></div>
                  <div className="metric-card"><span className="metric-num">399.7M</span><span className="metric-label">Dispatches / 30 days</span><span className="metric-source">Kusto: SparkApplicationEvent</span></div>
                  <div className="metric-card"><span className="metric-num">34,071</span><span className="metric-label">Active Tenants (30d)</span><span className="metric-source">Kusto: TriggerDispatcher</span></div>
                  <div className="metric-card"><span className="metric-num">25.8M</span><span className="metric-label">Distinct Actors (7d)</span><span className="metric-source">Kusto: Distinct ActorIDs</span></div>
                  <div className="metric-card"><span className="metric-num">39M/day</span><span className="metric-label">User Pipeline Events</span><span className="metric-source">EventHub Capture RCA</span></div>
                  <div className="metric-card"><span className="metric-num">200K/day</span><span className="metric-label">Agent Pipeline Events</span><span className="metric-source">EventHub Capture RCA</span></div>
                  <div className="metric-card"><span className="metric-num">366.7K/day</span><span className="metric-label">New Insights Created</span><span className="metric-source">Kusto: IrmAppMetric 8d avg</span></div>
                  <div className="metric-card"><span className="metric-num">475.5K/day</span><span className="metric-label">Insights (peak day)</span><span className="metric-source">Kusto: IrmAppMetric peak</span></div>
                  <div className="metric-card"><span className="metric-num">119.8K/day</span><span className="metric-label">Insights Scored</span><span className="metric-source">Kusto: ScoredInsightsCount</span></div>
                  <div className="metric-card"><span className="metric-num">237.6K</span><span className="metric-label">Agent Actors (30d)</span><span className="metric-source">Kusto: Agent ActorIDs</span></div>
                  <div className="metric-card"><span className="metric-num">13,047</span><span className="metric-label">Agent Tenants</span><span className="metric-source">Kusto: Agent tenant count</span></div>
                  <div className="metric-card"><span className="metric-num">48s</span><span className="metric-label">Agent P95 Latency</span><span className="metric-source">EventHub Capture RCA</span></div>
                  <div className="metric-card"><span className="metric-num">72s</span><span className="metric-label">User P95 Latency</span><span className="metric-source">EventHub Capture RCA</span></div>
                  <div className="metric-card"><span className="metric-num">100%</span><span className="metric-label">DataClient Success (30d)</span><span className="metric-source">Kusto: DataClient metrics</span></div>
                  <div className="metric-card"><span className="metric-num">28</span><span className="metric-label">Dedicated Function Apps</span><span className="metric-source">ServiceModel_prod.json</span></div>
                  <div className="metric-card"><span className="metric-num">53</span><span className="metric-label">Resource Groups</span><span className="metric-source">ServiceModel_prod.json</span></div>
                  <div className="metric-card"><span className="metric-num">82</span><span className="metric-label">EV2 Resource Defs</span><span className="metric-source">Tyrol ServiceModel</span></div>
                </div>
                <h3 style={{ fontSize: "0.9em", margin: "20px 0 8px", color: "var(--accent)" }}>Trigger Disposition Breakdown (30-day)</h3>
                <div style={{ display: "flex", gap: "4px", height: "28px", borderRadius: "8px", overflow: "hidden", marginBottom: "8px" }}>
                  <div style={{ flex: 45.7, background: "linear-gradient(90deg,#10b981,#34d399)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8pt", color: "white", fontWeight: 700 }}>Allowed 45.7%</div>
                  <div style={{ flex: 48.3, background: "linear-gradient(90deg,#f59e0b,#fbbf24)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8pt", color: "#1a1a2e", fontWeight: 700 }}>Throttled 48.3%</div>
                  <div style={{ flex: 6, background: "linear-gradient(90deg,#ef4444,#f87171)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "7pt", color: "white", fontWeight: 700 }}>6%</div>
                </div>
                <div style={{ fontSize: "0.8em", color: "var(--text-light)" }}>181.7M Allowed • 191.8M Throttled • 23.7M Dropped (noisy) — intelligent signal quality control</div>
                <LivePipelineChart />
              </div>

              {/* MORPHED SECTION: SYSTEM ARCHITECTURE */}
              <div className="section morphed-only">
                <div className="section-title">🛠️ System Architecture</div>
                <h3 style={{ fontSize: "0.95em", margin: "0 0 8px", color: "var(--text)" }}>Progressive Insights Pipeline (End-to-End)</h3>
                <div className="arch-card" style={{ whiteSpace: "pre" }}>
                  <span className="highlight">Phase 1: Cruncher (Tyrol / Apache Spark)</span>{"\n"}
                  ├─ IrmHourlyCumulativeFullAggregator{"\n"}
                  │  └── IrmProgressiveInsightGenerationJob{"\n"}
                  │  ├── <span className="num">Event Hub sink</span> (changed insights only, real-time){"\n"}
                  │  └── <span className="num">ADLS Storage sink</span> (full snapshots for DR/backfill){"\n"}
                  │{"\n"}
                  <span className="highlight">Phase 2: ComplianceSln (.NET 8 / Azure Functions)</span>{"\n"}
                  ├─ <span className="num">InsightsCapturer</span> (DataClientFnApp){"\n"}
                  │  └── Reads Event Hub → writes raw insights to Cosmos DB{"\n"}
                  │{"\n"}
                  ├─ <span className="num">BackupInsightsProcessorClient</span>{"\n"}
                  │  └── Timer-triggered scan every ~5 min (safety net){"\n"}
                  │  └── Picks up unprocessed V2 insight documents{"\n"}
                  │{"\n"}
                  ├─ <span className="num">UserInsightsProcessor</span>{"\n"}
                  │  ├── Deduplicates by ConstantInsightId{"\n"}
                  │  ├── Selects freshest by LatestSignalProcessingTime{"\n"}
                  │  ├── Computes policy/object/user score{"\n"}
                  │  └── Updates processed + raw insight records{"\n"}
                  │{"\n"}
                  └─ <span className="num">UserRiskProfileProcessorBase</span> → Adaptive Protection{"\n"}
                   ├── License check → Scenario/DRP config lookup{"\n"}
                   ├── Cosmos queries for profile scoring{"\n"}
                   ├── Severity assignment → Update profile{"\n"}
                   ├── Push risk signal to <span className="highlight">Entra/Graph API</span>{"\n"}
                   └── Create AP insight record + <span className="highlight">DLP/CA enforcement</span>
                </div>

                <h3 style={{ fontSize: "0.95em", margin: "20px 0 8px", color: "var(--text)" }}>Agent Adaptive Protection — Enforcement Loop</h3>
                <div className="arch-card" style={{ whiteSpace: "pre" }}>
                  <span className="highlight">Detection</span> → <span className="highlight">Scoring</span> → <span className="highlight">Enforcement</span>{"\n"}
                  Risky Agent Activity (M365 surfaces){"\n"}
                   └── Cruncher computes agent risk insights{"\n"}
                   └── Event Hub + Cosmos DB{"\n"}
                  <span className="highlight">Agent Pipeline (isolated infrastructure):</span>{"\n"}
                   ├─ AgentInsightsProcessorClient <span className="dim">(timer-driven backup)</span>{"\n"}
                   ├─ RiskProfileProcessorClient <span className="dim">(agent-specific scoring)</span>{"\n"}
                   ├─ MasterDRPSyncClient <span className="dim">(agent DRP synchronization)</span>{"\n"}
                   ├─ AgentAdaptiveProtectionSettings <span className="dim">(default AP config)</span>{"\n"}
                   ├─ AgentActorComparer <span className="dim">(reusable actor logic)</span>{"\n"}
                   └─ <span className="highlight">Entra/Graph Integration</span>{"\n"}
                   ├── Graph API endpoint → agent risk signals{"\n"}
                   ├── riskyUserId / actorType propagation{"\n"}
                   ├── IRM deep-link (Purview portal navigation){"\n"}
                   └── <span className="num">DLP + Conditional Access auto-enforcement</span>{"\n"}
                  <span className="dim">Infra: 14 AgentDataClient + 14 DataClient FnApps</span>{"\n"}
                  <span className="dim">Latency: P95 48s (agent) vs 72s (user) — 33% improvement</span>{"\n"}
                  <span className="dim">Reliability: 100% API success over 30 days</span>
                </div>

                <h3 style={{ fontSize: "0.95em", margin: "20px 0 8px", color: "var(--text)" }}>Common Data Platform (CDP) — Billions/Day Pipeline</h3>
                <div className="arch-card" style={{ whiteSpace: "pre" }}>
                  <span className="highlight">CDP Stage Pipeline:</span>{"\n"}
                  <span className="num">Sources</span> → <span className="num">S1</span> → <span className="num">S2</span> → <span className="num">S3</span> → <span className="num">K1/K2</span> → <span className="num">Q</span>{"\n"}
                  Sources: Raw Event Hub + ADLS/Cosmos/Kusto feeds{"\n"}
                  S1: Spark Structured Streaming enrichment{"\n"}
                  S2: Parallel dispatch lanes{"\n"}
                  S3: Batch aggregation / downloaders{"\n"}
                  K1: Kusto ingestion via <span className="highlight">Service Fabric</span> (parquet){"\n"}
                  K2: Direct <span className="highlight">Event Hub → Kusto</span> connection{"\n"}
                  Q: Query via Service Fabric + Azure Functions{"\n"}
                  <span className="highlight">Storage Architecture:</span>{"\n"}
                   └── Horizontal sharding across multiple storage accounts{"\n"}
                   └── Writes go only to container[0]; others are read-side{"\n"}
                   └── <span className="num">82 EV2 resource definitions</span>{"\n"}
                  <span className="highlight">Performance:</span>{"\n"}
                   └── 100K records: ~100s parallel vs ~2.7h sequential{"\n"}
                   └── 500K records: ~8.3 min parallel vs ~13.8h sequential{"\n"}
                   └── Micro-batch interval: 60s default{"\n"}
                   └── Up to 100 parallel partitions
                </div>

                <h3 style={{ fontSize: "0.95em", margin: "20px 0 8px", color: "var(--text)" }}>Sovereign Cloud Deployment Architecture</h3>
                <div className="arch-card" style={{ whiteSpace: "pre" }}>
                  <span className="highlight">Environments:</span> Commercial • GCC • GCCH • DOD{"\n"}
                  <span className="highlight">Deployment Footprint:</span>{"\n"}
                   ├─ <span className="num">53</span> resource groups (prod){"\n"}
                   ├─ <span className="num">51</span> agent DataClient function app entries{"\n"}
                   ├─ <span className="num">10</span> agent InsightsWorker deployments{"\n"}
                   ├─ DR parameter files: GCC01, GCC02, USG01, USG02{"\n"}
                   └─ EV2 rollout specs per forest + ring{"\n"}
                  <span className="highlight">Rollout Strategy:</span>{"\n"}
                   INT → SDF → NAM99 → WW → GCC → GCCH → DOD{"\n"}
                   Per-surface kill switches • Staging stop slots{"\n"}
                   Cherry-pick/backport across release branches{"\n"}
                  <span className="highlight">Telemetry (Geneva/Kusto):</span>{"\n"}
                   3 environments × 7 onboarding steps × 16 Geneva queries{"\n"}
                   DataClient: Managed Identity{"\n"}
                   Cruncher sender: SAS-based (gap identified in RCA)
                </div>
              </div>

              {/* MORPHED SECTION: PROJECT TIMELINE */}
              <div className="section morphed-only">
                <div className="section-title">📅 Project Timeline (Sep 2025 – Jun 2026)</div>
                <div className="timeline">
                  <div className="timeline-item">
                    <div className="tl-date">Sep – Nov 2025</div>
                    <div className="tl-title">Foundation: Agent as First-Class Actor in IRM</div>
                    <div className="tl-desc">Extended the entire IRM stack to recognize and process AI agents alongside human users. Built: Agent type in UpsertDRPCustomTag, actor support in HistoricalSearchProcess, AgentAdaptiveProtectionSettings, RiskProfileProcessorClient, MasterDRPSyncClient, ObjectId/mailbox identity for Agentic User.</div>
                    <div className="tl-tags"><span className="tl-tag">PR #4536953</span><span className="tl-tag">PR #4543259</span><span className="tl-tag">PR #4581555</span><span className="tl-tag">PR #4587787</span><span className="tl-tag">PR #4606355</span><span className="tl-tag">PR #4633000</span></div>
                  </div>
                  <div className="timeline-item">
                    <div className="tl-date">Oct – Dec 2025</div>
                    <div className="tl-title">New Agent Runtime — Dedicated Infrastructure</div>
                    <div className="tl-desc">Built dedicated Azure Function Apps for agent-specific workloads with full compute isolation. New Insights Worker FnApp, new Data Client FnApp, default AP settings, individual rollout specs. Agent burst at 3x load never touches user SLAs.</div>
                    <div className="tl-tags"><span className="tl-tag">PR #4640445</span><span className="tl-tag">PR #4646604</span><span className="tl-tag">PR #4659436</span><span className="tl-tag">PR #4707854</span><span className="tl-tag">Isolation</span><span className="tl-tag">P95: 48s</span></div>
                  </div>
                  <div className="timeline-item">
                    <div className="tl-date">Dec 2025 – Jan 2026</div>
                    <div className="tl-title">Rollout &amp; Release Infrastructure Hardening</div>
                    <div className="tl-desc">Hardened deployment pipeline: agent/user flight enablement, storage account naming fixes, staging stop slot for Agents Insights Worker, official rollout config and infra specs. Peak month: Jan 2026 = 3,092 files changed.</div>
                    <div className="tl-tags"><span className="tl-tag">PR #4727770</span><span className="tl-tag">PR #4743728</span><span className="tl-tag">PR #4797749</span><span className="tl-tag">PR #4807829</span><span className="tl-tag">3,092 files</span></div>
                  </div>
                  <div className="timeline-item">
                    <div className="tl-date">Feb – Mar 2026</div>
                    <div className="tl-title">Stabilization: Flight Management &amp; Critical Bug Fixes</div>
                    <div className="tl-desc">Stabilized agent + AP pipeline: Event Hub/insight capture flight fixes, disabled unsafe actor/agent clients during rollout, fixed AP null/deserialization bugs, agent data-client deployment fixes. Resolved end-to-end pipeline failures blocking AP scoring.</div>
                    <div className="tl-tags"><span className="tl-tag">PR #4916091</span><span className="tl-tag">PR #4976230</span><span className="tl-tag">PR #5009041</span><span className="tl-tag">PR #5030182</span><span className="tl-tag">Stabilization</span></div>
                  </div>
                  <div className="timeline-item">
                    <div className="tl-date">Apr – May 2026</div>
                    <div className="tl-title">Purview-Entra Integration for Agent Adaptive Protection</div>
                    <div className="tl-desc">Built the integration between Microsoft Purview IRM and Microsoft Entra ID: Graph API endpoint for agent risk signals, riskyUserId/actorType propagation, HttpClient/cert fixes, default policy setup, IRM deep link for alert navigation, payload hardening.</div>
                    <div className="tl-tags"><span className="tl-tag">PR #5065373</span><span className="tl-tag">PR #5093293</span><span className="tl-tag">PR #5120893</span><span className="tl-tag">PR #5132234</span><span className="tl-tag">Entra</span><span className="tl-tag">Graph API</span></div>
                  </div>
                  <div className="timeline-item">
                    <div className="tl-date">May – Jun 2026</div>
                    <div className="tl-title">Agent AP End-to-End Ship + Gov Cloud Rollout</div>
                    <div className="tl-desc">Shipped complete Agent AP to production: agent insights flows, AP scoring in INT/SDF, ActorId→AgentId migration, Gov Progressive Insights rollout (flight enablement, backup processor switchover, 100-file cleanup, DR hardening across all Gov forests).</div>
                    <div className="tl-tags"><span className="tl-tag">PR #5208581</span><span className="tl-tag">PR #5253628</span><span className="tl-tag">PR #5254865</span><span className="tl-tag">100-file cleanup</span><span className="tl-tag">Gov GA</span></div>
                  </div>
                </div>
              </div>

              {/* MORPHED SECTION: INCIDENT RESPONSE */}
              <div className="section morphed-only">
                <div className="section-title">🚨 Incident Response &amp; Root Cause Analysis</div>
                <div className="incident-card">
                  <div className="inc-sev">ICM 818917074 — Major Production Incident</div>
                  <div className="inc-title">Event Hub Deletion in GCC02 — ~90% Insight Capture Drop</div>
                  <div className="inc-detail">
                    <strong>Root cause:</strong> Sovereign Event Hub deleted during escort operation; restore did not restore consumer groups, SAS policies, Key Vault secrets, RBAC assignments, or checkpoints.<br />
                    <strong>Impact:</strong> ~90% drop in captured insights for Gov cloud. Recovery procedures became team-wide standards.
                  </div>
                  <div className="inc-outcome">
                    Outcome: Fully restored consumer groups, keys, and RBACs; defined automated checklists for future Gov forest escort ops.
                  </div>
                </div>
              </div>

              {/* COLLABORATION & LEADERSHIP SECTION */}
              <div className="section morphed-only">
                <div className="section-title">👥 Collaboration & Leadership</div>
                <div className="collab-grid">
                  <div className="collab-card">
                    <span className="collab-name">Mentorship &amp; Guidance</span>
                    <div className="collab-ctx">Mentored junior engineers and interns at Amazon and Microsoft; led on-call reduction initiatives reducing Sev-2 alerts by 60%.</div>
                  </div>
                  <div className="collab-card">
                    <span className="collab-name">Cross-Org Coordination</span>
                    <div className="collab-ctx">Coordinated load testing with 60+ distributed service owners for Prime Day/Black Friday peak events at Amazon.</div>
                  </div>
                  <div className="collab-card">
                    <span className="collab-name">Knowledge Sharing</span>
                    <div className="collab-ctx">Established post-mortem reviews and long-term design discussions to foster engineering excellence across teams.</div>
                  </div>
                </div>
              </div>

              {/* SKILLS SECTION */}
              <div className="section">
                <div className="section-title">Skills</div>
                <dl className="skills-grid">
                  <dt>Languages</dt>
                  <dd>C#, Java, Python, C++, SQL, Go, Scala, JavaScript, TypeScript</dd>
                  <dt>Cloud/Data</dt>
                  <dd>Azure, AWS, Cosmos DB, DynamoDB, Event Hubs, Kusto, Spark, ADLS, Postgres, Redis</dd>
                  <dt>Tools/Other</dt>
                  <dd>Docker, Kubernetes, Bicep, Git, CI/CD, gRPC, REST, Bedrock, SageMaker</dd>
                </dl>
                
                <div className="skill-bars">
                  <div className="skill-row">
                    <span className="skill-label">Backend</span>
                    <div className="skill-bar-bg">
                      <div className="skill-bar-fill purple animate" style={{ "--fill": "95%" } as React.CSSProperties}></div>
                    </div>
                    <span className="skill-items">C#, .NET 8, Java, gRPC, REST, Microservices</span>
                  </div>
                  <div className="skill-row">
                    <span className="skill-label">Cloud/Infra</span>
                    <div className="skill-bar-bg">
                      <div className="skill-bar-fill blue animate" style={{ "--fill": "90%" } as React.CSSProperties}></div>
                    </div>
                    <span className="skill-items">Azure Functions, Cosmos DB, Event Hubs, Bicep, AWS, Lambda, ECS</span>
                  </div>
                  <div className="skill-row">
                    <span className="skill-label">Data/ML</span>
                    <div className="skill-bar-bg">
                      <div className="skill-bar-fill green animate" style={{ "--fill": "85%" } as React.CSSProperties}></div>
                    </div>
                    <span className="skill-items">Spark, Scala, Python, SageMaker, Bedrock, RAG, OpenSearch</span>
                  </div>
                  <div className="skill-row">
                    <span className="skill-label">DevOps/Ops</span>
                    <div className="skill-bar-bg">
                      <div className="skill-bar-fill orange animate" style={{ "--fill": "85%" } as React.CSSProperties}></div>
                    </div>
                    <span className="skill-items">CI/CD, Docker, Geneva, Kusto, EV2, Git, Threat Assessment (TRA)</span>
                  </div>
                  <div className="skill-row">
                    <span className="skill-label">Frontend</span>
                    <div className="skill-bar-bg">
                      <div className="skill-bar-fill pink animate" style={{ "--fill": "75%" } as React.CSSProperties}></div>
                    </div>
                    <span className="skill-items">React, TypeScript, CSS, HTML5, Responsive Design</span>
                  </div>
                </div>
              </div>

              {/* EDUCATION SECTION */}
              <div className="section">
                <div className="section-title">Education</div>
                <div className="edu-line">
                  <strong>Santa Clara University, Santa Clara, CA</strong>
                  <span className="right">Master’s in Computer Science and Engineering | GPA 3.77 | 2017 – 2019</span>
                </div>
                <div className="edu-line">
                  <strong>Pune Institute of Computer Technology (PICT), India</strong>
                  <span className="right">Bachelor’s in Computer Science and Engineering | GPA 3.34 | 2012 – 2016</span>
                </div>
              </div>

              {/* ACHIEVEMENTS SECTION */}
              <div className="section">
                <div className="section-title">Recognition &amp; Achievements</div>
                <ul className="recognition" style={{ paddingLeft: "18px" }}>
                  <li>Received <strong>Just Do It Award</strong> at Amazon for developing an Automated Service Creation tool that deploys microservices on AWS within an hour.</li>
                  <li>Won a prize for the most innovative project at the SCU Bronco Hackathon.</li>
                  <li>Started a blog on improving creativity, growth, and human experience to help navigate the AI age with depth.</li>
                </ul>
              </div>

            </div>
          </div>
      </div>
    </>
  );
}
