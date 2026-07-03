import { Seo } from "@/components/Seo";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

function LivePipelineChart() {
  const [points, setPoints] = useState<number[]>(Array(30).fill(40));
  const requestRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    const update = (time: number) => {
      if (time - lastUpdateRef.current > 150) {
        // Update every 150ms
        setPoints((prev) => {
          const next = [...prev.slice(1)];
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

  const pathD = points
    .map((val, index) => {
      const x = (index / (points.length - 1)) * 300;
      const y = 100 - val;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const fillD = `${pathD} L 300 100 L 0 100 Z`;

  const lastVal = points[points.length - 1];
  const lastX = 300;
  const lastY = 100 - lastVal;

  return (
    <div
      className="live-chart-container"
      style={{
        background: "rgba(99, 102, 241, 0.02)",
        border: "1px solid rgba(99, 102, 241, 0.08)",
        borderRadius: "12px",
        padding: "16px",
        marginTop: "20px",
        position: "relative",
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.02)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <span
          style={{
            fontSize: "0.85em",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "1px",
            color: "var(--accent)",
          }}
        >
          📡 Live Pipeline Telemetry (Real-Time TPS)
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "0.8em",
            color: "#10b981",
            fontWeight: "bold",
          }}
        >
          <span
            className="live-status-dot"
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#10b981",
              display: "inline-block",
            }}
          />
          {(10.8 + lastVal / 20).toFixed(2)} M/s
        </span>
      </div>

      <svg
        viewBox="0 0 300 100"
        style={{ width: "100%", height: "100px", display: "block", overflow: "visible" }}
      >
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

        <line x1="0" y1="25" x2="300" y2="25" stroke="rgba(255,255,255,0.06)" strokeDasharray="3" />
        <line x1="0" y1="50" x2="300" y2="50" stroke="rgba(255,255,255,0.06)" strokeDasharray="3" />
        <line x1="0" y1="75" x2="300" y2="75" stroke="rgba(255,255,255,0.06)" strokeDasharray="3" />

        <path d={fillD} fill="url(#areaGrad)" style={{ transition: "d 0.15s linear" }} />
        <path
          d={pathD}
          fill="none"
          stroke="url(#lineGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ transition: "d 0.15s linear" }}
        />
        <circle
          cx={lastX}
          cy={lastY}
          r="3.5"
          fill="var(--accent)"
          style={{ transition: "cy 0.15s linear" }}
        />
        <circle
          cx={lastX}
          cy={lastY}
          r="7"
          fill="var(--accent)"
          opacity="0.3"
          style={{ transition: "cy 0.15s linear" }}
          className="ping-head"
        />
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
    const duration = 1200;
    const startTime = performance.now();
    let animationFrameId: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
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

type BulletData = {
  index: string;
  boldText: string;
  plainText: string;
  impactText: string;
  extraText: string;
  detail: string;
  eli5?: string;
  qa?: { q: string; a: string }[];
};

export default function ResumePage() {
  const [morphed, setMorphed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Drawer panel state
  const [drawerBullet, setDrawerBullet] = useState<BulletData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeBulletIndex, setActiveBulletIndex] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<"deep-dive" | "eli5" | "interview">("deep-dive");

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
    if (drawerOpen) {
      document.body.classList.add("drawer-open");
    } else {
      document.body.classList.remove("drawer-open");
    }
  }, [drawerOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove("morphed", "dark", "drawer-open");
    };
  }, []);

  // Bullet click → open drawer
  const handleBulletClick = useCallback(
    (bullet: BulletData, e: React.MouseEvent) => {
      if (!morphed) return;
      e.stopPropagation();
      if (activeBulletIndex === bullet.index) {
        setDrawerOpen(false);
        setDrawerBullet(null);
        setActiveBulletIndex(null);
      } else {
        setDrawerBullet(bullet);
        setDrawerOpen(true);
        setActiveBulletIndex(bullet.index);
        setDrawerTab("deep-dive");
      }
    },
    [morphed, activeBulletIndex]
  );

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerBullet(null);
    setActiveBulletIndex(null);
  };

  return (
    <>
      <Seo
        title="Resume"
        description="Akshay Borse's resume — platform security and cloud-native architecture."
        path="/resume"
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `:root{
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
/* Drawer panel */
body.drawer-open {overflow:hidden}
.drawer-backdrop{position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(7,8,13,0.5);backdrop-filter:blur(4px);z-index:9998}
.drawer-panel{position:fixed;top:0;right:0;width:500px;max-width:100vw;height:100vh;background:#ffffff;box-shadow:-8px 0 32px rgba(0,0,0,0.15);z-index:9999;display:flex;flex-direction:column;color:#1e293b}
.drawer-close{position:absolute;top:16px;right:16px;background:none;border:none;font-size:1.5rem;cursor:pointer;color:#64748b;z-index:100}
.drawer-close:hover{color:#0f172a}
.drawer-header{padding:24px;border-bottom:1px solid #f1f5f9;background:#f8fafc}
.drawer-title{font-size:1.15rem;font-weight:800;color:#0f172a;margin-bottom:4px}
.drawer-subtitle{font-size:0.85rem;color:#64748b}
.drawer-tabs{display:flex;border-bottom:1px solid #e2e8f0;background:#f8fafc;padding:0 24px}
.drawer-tab{padding:12px 16px;font-size:0.9rem;font-weight:600;color:#64748b;background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;transition:all 0.2s}
.drawer-tab:hover{color:#0f172a}
.drawer-tab.active{color:#6366f1;border-bottom-color:#6366f1}
.drawer-body{flex:1;overflow-y:auto;padding:24px;line-height:1.6}
.drawer-active-bullet{background:rgba(99,102,241,0.08) !important;border-left:3px solid var(--accent);padding-left:8px !important}
.bullet-expand-hint{font-size:0.8em;color:var(--accent);margin-left:6px;transition:transform 0.2s}
/* Mode toggle bar */
.mode-toggle-container{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;border-bottom:1px solid rgba(0,0,0,0.05);padding-bottom:12px}
body.morphed .mode-toggle-container{border-bottom-color:rgba(255,255,255,0.05)}
.mode-toggle-pill{display:flex;background:var(--accent-soft);padding:4px;border-radius:100px;box-shadow:inset 0 2px 4px rgba(0,0,0,0.05)}
.toggle-option{display:flex;align-items:center;gap:6px;padding:8px 16px;border:none;background:none;border-radius:100px;font-size:9pt;font-weight:700;color:var(--text-light);cursor:pointer;transition:all 0.3s var(--spring)}
.toggle-option.active{background:var(--accent);color:white;box-shadow:0 4px 12px var(--btn-pulse-color)}
.theme-btn-pill{display:none;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;border:none;background:var(--accent-soft);color:var(--accent);cursor:pointer;transition:all 0.3s var(--spring)}
.theme-btn-pill:hover{transform:scale(1.1);background:var(--accent);color:white}
.theme-btn-pill.visible{display:flex}
/* Dark theme adjustments in morphed mode */
body.dark{--paper:#0f111a;--text:#e2e8f0;--text-light:#94a3b8;--clay:8px 8px 20px rgba(0,0,0,0.35),-4px -4px 12px rgba(255,255,255,0.02)}
body.dark .stats-bar .stat-card{background:#161925;box-shadow:none;border:1px solid rgba(255,255,255,0.04)}
body.dark .section{background:#161925;border-color:rgba(255,255,255,0.04)}
body.dark .job{background:rgba(99,102,241,0.04);border-color:rgba(99,102,241,0.12)}
body.dark .tech-tag{background:rgba(99,102,241,0.15);color:#a5b4fc}
/* Metrics grid styling */
.metrics-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:16px}
.metric-card{background:rgba(99,102,241,0.02);border:1px solid rgba(99,102,241,0.08);border-radius:10px;padding:12px 16px;transition:all 0.3s}
.metric-card:hover{border-color:rgba(99,102,241,0.2);transform:translateY(-2px)}
.metric-num{display:block;font-size:16pt;font-weight:800;color:var(--accent)}
.metric-label{display:block;font-size:8.5pt;font-weight:600;color:var(--text);margin:2px 0}
.metric-source{display:block;font-size:7pt;color:var(--text-light);font-style:italic}
body.dark .metric-card{background:rgba(255,255,255,0.01);border-color:rgba(255,255,255,0.05)}
/* Arch card styling */
.arch-card{background:rgba(15,17,26,0.95);color:#a5b4fc;font-family:Courier,monospace;font-size:8.5pt;padding:16px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);overflow-x:auto;margin-top:8px}
.arch-card .highlight{color:#818cf8;font-weight:700}
.arch-card .num{color:#34d399}
.arch-card .dim{color:#64748b}
/* Timeline styling */
.timeline{position:relative;padding-left:20px;border-left:2px solid rgba(99,102,241,0.15);margin-top:16px}
.timeline-item{position:relative;margin-bottom:20px}
.timeline-item::before{content:"";position:absolute;left:-27px;top:4px;width:12px;height:12px;border-radius:50%;background:var(--accent);border:2px solid var(--paper)}
.tl-date{font-size:8pt;font-weight:700;color:var(--accent);text-transform:uppercase}
.tl-title{font-size:9.5pt;font-weight:700;color:var(--text);margin:2px 0}
.tl-desc{font-size:8.5pt;color:var(--text-light);line-height:1.4}
.tl-tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.tl-tag{font-size:7pt;padding:2px 6px;border-radius:4px;background:rgba(99,102,241,0.08);color:var(--accent)}
/* Incident response card styling */
.incident-card{background:rgba(239,68,68,0.02);border:1px solid rgba(239,68,68,0.15);border-radius:12px;padding:16px;margin-top:12px}
.inc-sev{font-size:8pt;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:0.5px}
.inc-title{font-size:10pt;font-weight:700;color:var(--text);margin:2px 0 6px}
.inc-detail{font-size:8.5pt;color:var(--text-light);line-height:1.5}
.inc-outcome{font-size:8.5pt;color:#10b981;font-weight:600;margin-top:6px}
body.dark .incident-card{background:rgba(239,68,68,0.01)}
/* Collaboration grid styling */
.collab-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:16px}
.collab-card{background:rgba(99,102,241,0.02);border:1px solid rgba(99,102,241,0.08);border-radius:10px;padding:16px;transition:all 0.3s}
.collab-name{font-size:9.5pt;font-weight:700;color:var(--text);display:block;margin-bottom:6px}
.collab-ctx{font-size:8.5pt;color:var(--text-light);line-height:1.4}
/* Skills grid and bar styling */
.skills-grid{display:grid;grid-template-columns:120px 1fr;row-gap:8px;font-size:9pt;margin-bottom:20px}
.skills-grid dt{font-weight:700;color:var(--text)}
.skills-grid dd{color:var(--text-light);margin:0}
.skill-bars{margin-top:16px}
.skill-row{display:flex;align-items:center;gap:12px;margin-bottom:10px;font-size:8.5pt}
.skill-label{width:90px;font-weight:600;color:var(--text)}
.skill-bar-bg{flex:1;height:8px;border-radius:4px;background:rgba(0,0,0,0.05);overflow:hidden;position:relative}
body.dark .skill-bar-bg{background:rgba(255,255,255,0.05)}
.skill-bar-fill{height:100%;border-radius:4px;width:0;transition:width 1.2s ease-out-in}
.skill-bar-fill.purple{background:linear-gradient(90deg,var(--accent),var(--accent2))}
.skill-bar-fill.blue{background:linear-gradient(90deg,#3b82f6,#60a5fa)}
.skill-bar-fill.green{background:linear-gradient(90deg,#10b981,#34d399)}
.skill-bar-fill.orange{background:linear-gradient(90deg,#f59e0b,#fbbf24)}
.skill-bar-fill.pink{background:linear-gradient(90deg,var(--accent3),#f472b6)}
.skill-bar-fill.animate{width:var(--fill)}
.skill-items{width:220px;color:var(--text-light);font-size:7.5pt;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* Education line styling */
.edu-line{margin-bottom:8px;font-size:9pt;display:flex;justify-content:space-between;flex-wrap:wrap;line-height:1.4}
.edu-line .right{color:var(--text-light)}
/* Print view styling overrides */
@media print{
body{background:white !important;color:black !important}
.no-print{display:none !important}
.resume-container{box-shadow:none !important;margin:0 !important;padding:0 !important;width:100% !important;max-width:100% !important}
.pdf-view-content {font-family:"Times New Roman",Times,serif !important;color:#000000 !important}
}
`,
        }}
      />

      <div className="resume-content-view">
        <div className="resume-container" style={{ position: "relative" }}>
          {/* Mode & Theme Selection Bar */}
          <div className="no-print mode-toggle-container">
            <div className="mode-toggle-pill">
              <button
                className={`toggle-option ${!morphed ? "active" : ""}`}
                onClick={() => setMorphed(false)}
              >
                <span className="icon">📄</span>
                <span className="label">PDF View</span>
              </button>
              <button
                className={`toggle-option ${morphed ? "active" : ""}`}
                onClick={() => setMorphed(true)}
              >
                <span className="icon">✨</span>
                <span className="label">Interactive</span>
              </button>
            </div>

            <button
              className={`theme-btn-pill ${morphed ? "visible" : ""}`}
              onClick={() => setDarkMode(!darkMode)}
              title="Toggle Theme"
              aria-label="Toggle Theme"
            >
              {darkMode ? "☀️" : "🌙"}
            </button>
          </div>

          {!morphed ? (
            /* =========================================================
               EXACT PDF VIEW REPLICA (Matches Shared Image Word-for-Word)
               ========================================================= */
            <div
              className="pdf-view-content"
              style={{
                fontFamily: '"Times New Roman", Times, serif',
                color: "#000000",
                lineHeight: 1.25,
                padding: "10px 0",
              }}
            >
              <div style={{ textAlign: "center", marginBottom: "8px" }}>
                <h1
                  style={{
                    fontSize: "18pt",
                    fontWeight: "bold",
                    margin: "0 0 4px",
                    fontFamily: '"Times New Roman", Times, serif',
                    color: "#000000",
                  }}
                >
                  Akshay Borse
                </h1>
                <div style={{ fontSize: "9.5pt", color: "#000000", marginBottom: "4px" }}>
                  425-336-9852 |{" "}
                  <a
                    href="mailto:amsborse@gmail.com"
                    style={{ color: "#0000ee", textDecoration: "underline" }}
                  >
                    amsborse@gmail.com
                  </a>{" "}
                  |{" "}
                  <a
                    href="https://linkedin.com/in/akshayborse"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#0000ee", textDecoration: "underline" }}
                  >
                    LinkedIn
                  </a>{" "}
                  |{" "}
                  <a
                    href="https://github.com/amsborse"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#0000ee", textDecoration: "underline" }}
                  >
                    GitHub
                  </a>{" "}
                  |{" "}
                  <a
                    href="https://amsborse.github.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#0000ee", textDecoration: "underline" }}
                  >
                    Portfolio
                  </a>
                </div>
              </div>

              <div className="section" style={{ marginTop: "5px" }}>
                <div
                  className="section-title"
                  style={{
                    fontSize: "11pt",
                    fontWeight: "bold",
                    borderBottom: "1.5px solid #000000",
                    paddingBottom: "2px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  PROFESSIONAL SUMMARY
                </div>
                <p
                  style={{
                    fontSize: "9pt",
                    margin: "6px 0 0",
                    textAlign: "justify",
                    lineHeight: "1.35",
                  }}
                >
                  Senior Software Engineer with 7+ years of experience designing large-scale
                  distributed systems, AI-powered services, and security governance platforms across
                  Microsoft and Amazon. Delivered systems supporting 34K+ enterprise tenants, 25M+
                  actors, and 100K+ TPS workloads while driving $28M+ profit generation and
                  $250K/month cost savings.
                </p>
              </div>

              <div className="section" style={{ marginTop: "14px" }}>
                <div
                  className="section-title"
                  style={{
                    fontSize: "11pt",
                    fontWeight: "bold",
                    borderBottom: "1.5px solid #000000",
                    paddingBottom: "2px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  EXPERIENCE
                </div>

                {/* MICROSOFT */}
                <div className="job" style={{ marginTop: "8px", marginBottom: "10px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: "bold",
                      fontSize: "9.5pt",
                    }}
                  >
                    <span>
                      Senior Software Engineer | Microsoft | Redmond, WA | Sep-2025 to Present
                    </span>
                  </div>
                  <div style={{ color: "#8800cc", fontSize: "8.5pt", margin: "2px 0 4px" }}>
                    (C#, .NET, Azure Functions, Cosmos DB, ARM, Bicep, Agentic AI, Agentic Risk,
                    Microsoft Purview, Event Hub, Geneva, Kusto, Data Governance)
                  </div>
                  <ul style={{ paddingLeft: "14px", margin: "4px 0 0", listStyleType: "disc" }}>
                    <li style={{ fontSize: "8.5pt", margin: "0 0 3px", lineHeight: "1.3" }}>
                      Built Agent Adaptive Protection, enabling tenant-configurable risk scoring and
                      automated policy enforcement for <strong>237K+ AI agents</strong> across{" "}
                      <strong>13K+ enterprise tenants</strong>.
                    </li>
                    <li style={{ fontSize: "8.5pt", margin: "0 0 3px", lineHeight: "1.3" }}>
                      Built AI-agent historical enrichment infrastructure for Microsoft Purview
                      Insider Risk Management, automatically backfilling{" "}
                      <strong>90 days of audit history</strong> across{" "}
                      <strong>40+ global forests</strong> and <strong>3 sovereign clouds</strong>.
                    </li>
                    <li style={{ fontSize: "8.5pt", margin: "0 0 3px", lineHeight: "1.3" }}>
                      Directed phased rollout of AI-agent risk capabilities across{" "}
                      <strong>GCC, GCCH, and DoD sovereign clouds</strong>, establishing AI agents
                      as first-class risk actors for enterprise and government tenants.
                    </li>
                    <li style={{ fontSize: "8.5pt", margin: "0 0 3px", lineHeight: "1.3" }}>
                      Built an isolated AI-agent ingestion platform across{" "}
                      <strong>28 regions</strong>, processing{" "}
                      <strong>135K+ daily risk signals</strong> while preventing agent workloads
                      from impacting human-user processing.
                    </li>
                  </ul>
                </div>

                <div style={{ borderTop: "1px solid #dcdcdc", margin: "10px 0" }} />

                {/* AMAZON */}
                <div className="job" style={{ marginBottom: "10px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: "bold",
                      fontSize: "9.5pt",
                    }}
                  >
                    <span>Software Engineer 2 | Amazon | Seattle, WA | Aug 2019 – Aug 2025</span>
                  </div>
                  <div style={{ color: "#8800cc", fontSize: "8.5pt", margin: "2px 0 4px" }}>
                    (Java, Python, Rest, gRPC, Docker, ECS, Dynamo, S3, Lambda, Aurora, Step
                    Function, App Mesh, Redis, Kibana, OpenSearch, Kinesis, CloudWatch, SageMaker,
                    Bedrock, Anthropic's LLM, Prompt Engineering)
                  </div>
                  <ul style={{ paddingLeft: "14px", margin: "4px 0 0", listStyleType: "disc" }}>
                    <li style={{ fontSize: "8.5pt", margin: "0 0 3px", lineHeight: "1.3" }}>
                      Designed a microservice bootstrap library that standardized service creation
                      across teams—
                      <strong>cutting setup time from weeks to hours and saving 40–50 weeks</strong>
                      . Leveraged custom DSL and enabled plug-and-play support for AWS infra using
                      declarative config.
                    </li>
                    <li style={{ fontSize: "8.5pt", margin: "0 0 3px", lineHeight: "1.3" }}>
                      Enhanced the bootstrap library for Multi-Service Deployment in a single
                      pipeline, optimizing maintenance for a microservices architecture with 60+
                      services. <strong>Reduced the service count by 9</strong>, with plans in place
                      to further streamline and drive operational excellence.
                    </li>
                    <li style={{ fontSize: "8.5pt", margin: "0 0 3px", lineHeight: "1.3" }}>
                      Optimized Docker builds, cutting container image size by 83% and build time by
                      over 50%, accelerating CI/CD and saving 60GB+ of storage.
                    </li>
                    <li style={{ fontSize: "8.5pt", margin: "0 0 3px", lineHeight: "1.3" }}>
                      Established and led a logging/metrics optimization initiative and process
                      during AWS migration—standardized logs, removed redundant code, cutting noise,
                      improving debuggability, and{" "}
                      <strong>reducing CloudWatch costs by $250K+/month</strong>.
                    </li>
                    <li style={{ fontSize: "8.5pt", margin: "0 0 3px", lineHeight: "1.3" }}>
                      Built a Restock Alerting Service to notify customers when out-of-stock items
                      were restocked increasing sales by 13% for cancelled ASIN's.
                    </li>
                    <li style={{ fontSize: "8.5pt", margin: "0 0 3px", lineHeight: "1.3" }}>
                      Implemented the Just-In-Stock service on native AWS to track real-time
                      inventory changes and auto-optimize fulfillment, increasing early delivery
                      rates by 16% and improving supply chain responsiveness.
                    </li>
                    <li style={{ fontSize: "8.5pt", margin: "0 0 3px", lineHeight: "1.3" }}>
                      Designed a self-service UI and backend to modify delivery dates for
                      high-volume Amazon Business orders—
                      <strong>eliminating 2–3 hours of manual ops per request</strong> and reducing
                      dependency on external teams. Also mentored an intern during development.
                    </li>
                    <li style={{ fontSize: "8.5pt", margin: "0 0 3px", lineHeight: "1.3" }}>
                      Engineered a Replay Service using a lightweight wrapper over AWS Step
                      Functions to schedule event replays up to 1 year—eliminating cron-based
                      scheduling and reducing operational overhead with built-in visibility and
                      fault tolerance.
                    </li>
                    <li style={{ fontSize: "8.5pt", margin: "0 0 3px", lineHeight: "1.3" }}>
                      Configured a <strong>dynamic log-level API for production</strong>, enabling
                      real-time debugging without redeployments and cutting incident resolution time
                      by over an hour—especially valuable in complex, distributed services.
                    </li>
                    <li style={{ fontSize: "8.5pt", margin: "0 0 3px", lineHeight: "1.3" }}>
                      Led the design for a RAG-based service that leverages a model deployed on
                      Amazon SageMaker to integrate real-time inventory signals and vector search,
                      improving delivery predictions and driving a 7% increase in global sales.
                    </li>
                    <li style={{ fontSize: "8.5pt", margin: "0 0 3px", lineHeight: "1.3" }}>
                      Redesigned 37 email templates by integrating an LLM via Amazon Bedrock, using
                      a RAG-based approach with a curated corpus to constrain generation—ensuring
                      compliance, improving personalization, and reinforcing brand consistency.
                    </li>
                    <li style={{ fontSize: "8.5pt", margin: "0 0 3px", lineHeight: "1.3" }}>
                      Integrated a binary classification model (XGBoost) to predict potential order
                      delays before SLA breach, enabling early delay alerts to customers and
                      improving trust in delivery communication.
                    </li>
                    <li style={{ fontSize: "8.5pt", margin: "0 0 3px", lineHeight: "1.3" }}>
                      Architected and deployed backend integration infrastructure for SageMaker
                      hosted quantile regression model powering real-time delivery range
                      predictions, driving statistically significant annualized{" "}
                      <strong>~28MM profit gain</strong>.
                    </li>
                    <li style={{ fontSize: "8.5pt", margin: "0 0 3px", lineHeight: "1.3" }}>
                      Architected an event orchestration layer for AWS-based microservices, enabling
                      real-time coordination across 100K+ TPS and 16 services—balancing REST and
                      gRPC protocols to support 8 business-critical workflows.
                    </li>
                    <li style={{ fontSize: "8.5pt", margin: "0 0 3px", lineHeight: "1.3" }}>
                      Coordinated{" "}
                      <strong>end-to-end load testing for 60+ distributed services</strong> during
                      high-traffic events (Prime Day, Black Friday), aligning with upstream and
                      downstream service owners to proactively surface scaling issues and ensure
                      fault tolerance under peak load.
                    </li>
                    <li style={{ fontSize: "8.5pt", margin: "0 0 3px", lineHeight: "1.3" }}>
                      Developed a dry-run simulation tool for incoming orders, allowing
                      non-engineering stakeholders to visualize system behavior—
                      <strong>eliminating engineering dependencies</strong>, improving planning
                      agility, and reducing deep-dive turnaround time from hours to minutes.
                    </li>
                    <li style={{ fontSize: "8.5pt", margin: "0 0 3px", lineHeight: "1.3" }}>
                      Proactively led cultural and operational improvements by launching on-call
                      reduction reviews, post-launch knowledge sharing, and design discussion
                      sessions—reducing Sev2 alerts by 60%, improving team-wide system
                      understanding, and strengthening long-term design thinking.
                    </li>
                    <li style={{ fontSize: "8.5pt", margin: "0 0 3px", lineHeight: "1.3" }}>
                      Led TRA readiness for a Tier 1 service (CI/CD, multi-AZ, fault injection,
                      canary), while building reusable tools to improve dev efficiency—automated UML
                      sync to wiki, introduced reusable wiki headers, and reduced test setup
                      complexity via Lugia integration.
                    </li>
                  </ul>
                </div>

                <div style={{ borderTop: "1px solid #dcdcdc", margin: "10px 0" }} />

                {/* LIQUIRON */}
                <div className="job" style={{ marginBottom: "10px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: "bold",
                      fontSize: "9.5pt",
                    }}
                  >
                    <span>
                      Software Engineering Intern | Liquiron | San Jose, CA | Dec-2018 to Jan-2019
                    </span>
                  </div>
                  <div style={{ color: "#8800cc", fontSize: "8.5pt", margin: "2px 0 4px" }}>
                    (OAuth 2.0, Passport.js, Rest API, Vue.js, Google Firebase, Node.js, Mocha &amp;
                    Chai, Jest, Serverless Hosting, Stateless Backend)
                  </div>
                  <ul style={{ paddingLeft: "14px", margin: "4px 0 0", listStyleType: "disc" }}>
                    <li style={{ fontSize: "8.5pt", margin: "0 0 3px", lineHeight: "1.3" }}>
                      Re-architected authentication using OAuth 2.0 and Passport.js, improving
                      security, modularity, and maintainability.
                    </li>
                    <li style={{ fontSize: "8.5pt", margin: "0 0 3px", lineHeight: "1.3" }}>
                      Migrated backend services to Firebase serverless infra &amp; developed REST
                      APIs supporting SPA workflows, reducing server load by 36%.
                    </li>
                  </ul>
                </div>

                <div style={{ borderTop: "1px solid #dcdcdc", margin: "10px 0" }} />

                {/* PERSISTENT */}
                <div className="job" style={{ marginBottom: "10px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: "bold",
                      fontSize: "9.5pt",
                    }}
                  >
                    <span>
                      Software Engineer | Persistent Systems | Pune, India | Sept-2016 to Jul-2017
                    </span>
                  </div>
                  <div style={{ color: "#8800cc", fontSize: "8.5pt", margin: "2px 0 4px" }}>
                    (CNN, AWS EC2, REST, NodeJS, JavaScript, Python, Axios, Quasar)
                  </div>
                  <ul style={{ paddingLeft: "14px", margin: "4px 0 0", listStyleType: "disc" }}>
                    <li style={{ fontSize: "8.5pt", margin: "0 0 3px", lineHeight: "1.3" }}>
                      Developed a real-time CNN-based sentiment classification system achieving 87%
                      accuracy across seven sentiment categories.
                    </li>
                    <li style={{ fontSize: "8.5pt", margin: "0 0 3px", lineHeight: "1.3" }}>
                      Modernized legacy web applications into a single-page architecture, improving
                      response time by 25% and offline performance by 9%, while enhancing developer
                      productivity through a feedback system adopted by six engineering teams.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="section" style={{ marginTop: "14px" }}>
                <div
                  className="section-title"
                  style={{
                    fontSize: "11pt",
                    fontWeight: "bold",
                    borderBottom: "1.5px solid #000000",
                    paddingBottom: "2px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  EDUCATION
                </div>
                <ul style={{ paddingLeft: "14px", margin: "6px 0 0", listStyleType: "disc" }}>
                  <li style={{ fontSize: "8.5pt", margin: "0 0 4px", lineHeight: "1.3" }}>
                    Santa Clara University, Santa Clara, CA | Master's in Computer Science and
                    Engineering. | Sep - 2017 to Jun-2019 | GPA - 3.77
                  </li>
                  <li style={{ fontSize: "8.5pt", margin: "0 0 4px", lineHeight: "1.3" }}>
                    Pune Institute of Computer Technology (PICT), India | Bachelor's in Computer
                    Science and Engineering. | Jun - 2012 to Jun-2016 | GPA - 3.34
                  </li>
                </ul>
              </div>

              <div className="section" style={{ marginTop: "14px", marginBottom: "24px" }}>
                <div
                  className="section-title"
                  style={{
                    fontSize: "11pt",
                    fontWeight: "bold",
                    borderBottom: "1.5px solid #000000",
                    paddingBottom: "2px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  SELECTED ENGINEERING PROJECTS -{" "}
                  <a
                    href="https://github.com/amsborse"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#0044cc", textDecoration: "underline" }}
                  >
                    https://github.com/amsborse
                  </a>
                </div>
                <ul style={{ paddingLeft: "14px", margin: "6px 0 0", listStyleType: "disc" }}>
                  <li style={{ fontSize: "8.5pt", margin: "0 0 4.5px", lineHeight: "1.3" }}>
                    Developed LeetDesign, a distributed systems simulator that transforms
                    architecture diagrams into executable models for evaluating scalability,
                    resilience, and failure trade-offs.
                  </li>
                  <li style={{ fontSize: "8.5pt", margin: "0 0 4.5px", lineHeight: "1.3" }}>
                    Designed Finance OS, a cloud-native financial intelligence platform that
                    combines deterministic rule engines and LLM-powered analysis to convert raw
                    financial data into actionable insights.{" "}
                    <a
                      href="https://finance-os-lilac.vercel.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#0044cc", textDecoration: "underline" }}
                    >
                      https://finance-os-lilac.vercel.app/
                    </a>
                  </li>
                  <li style={{ fontSize: "8.5pt", margin: "0 0 4.5px", lineHeight: "1.3" }}>
                    Built Invisible Loops, an interactive learning platform that helps users
                    recognize and resolve recurring cognitive and emotional patterns through
                    narrative-driven exploration and immersive visualization.{" "}
                    <a
                      href="https://invisible-loops-two.vercel.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#0044cc", textDecoration: "underline" }}
                    >
                      https://invisible-loops-two.vercel.app/
                    </a>
                  </li>
                </ul>
              </div>

              {/* PDF FOOTER LINKS */}
              <div
                style={{
                  textAlign: "center",
                  fontSize: "9.5pt",
                  borderTop: "1px solid #ddd",
                  paddingTop: "12px",
                  marginTop: "20px",
                  fontFamily: '"Times New Roman", Times, serif',
                  color: "#000000",
                }}
              >
                <a
                  href="https://hackerrank.com/amsborse"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#0000ee", textDecoration: "underline", margin: "0 6px" }}
                >
                  HackerRank
                </a>
                |
                <a
                  href="https://medium.com/@amsborse"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#0000ee", textDecoration: "underline", margin: "0 6px" }}
                >
                  Medium
                </a>
                |
                <a
                  href="https://substack.com/@amsborse"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#0000ee", textDecoration: "underline", margin: "0 6px" }}
                >
                  Substack
                </a>
                |
                <a
                  href="https://x.com/amsborse"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#0000ee", textDecoration: "underline", margin: "0 6px" }}
                >
                  X
                </a>
                |
                <a
                  href="https://pub.dev/publishers/amsborse"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#0000ee", textDecoration: "underline", margin: "0 6px" }}
                >
                  Publication
                </a>
              </div>
            </div>
          ) : (
            /* =========================================================
               PREMIUM INTERACTIVE VIEW (Original Animations & Side Drawer)
               ========================================================= */
            <>
              <div className="header">
                <h1>Akshay Borse</h1>
                <div className="contact-row">
                  425–336–9852<span className="sep">|</span>
                  <a href="mailto:amsborse@gmail.com">amsborse@gmail.com</a>
                  <span className="sep">|</span>
                  <a
                    href="https://linkedin.com/in/akshayborse"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    LinkedIn
                  </a>
                  <span className="sep">|</span>
                  <a href="https://github.com/amsborse" target="_blank" rel="noopener noreferrer">
                    GitHub
                  </a>
                  <span className="sep">|</span>
                  <a href="https://medium.com/@amsborse" target="_blank" rel="noopener noreferrer">
                    Medium
                  </a>
                  <span className="sep">|</span>
                  <a
                    href="https://substack.com/@amsborse"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Substack
                  </a>
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
                  Platform engineer who builds the systems that protect organizations from threats
                  they haven't imagined yet. Currently architecting Microsoft's agentic AI
                  risk-scoring infrastructure — a pipeline processing 12.9M triggers/day across
                  34,000+ enterprise tenants that decides in real time whether an AI agent is too
                  dangerous to keep running, and automatically enforces protection through Entra ID
                  and Conditional Access. Previously spent 6 years at Amazon building ML-integrated
                  fulfillment systems that drove $28MM+ annual profit and reduced operational costs
                  by $3M+/year. I design for sovereign-cloud compliance, billions-of-signals-per-day
                  scale, and zero-downtime deployments — then ship it across 5 production cloud
                  environments without waking anyone up.
                </p>
              </div>

              {/* Experience Section */}
              <div className="section">
                <div className="section-title">Experience</div>

                {/* MICROSOFT JOB */}
                <div className="job" id="job-msft">
                  <div className="job-header">
                    <span className="job-title-text">
                      Senior Software Engineer — Microsoft Purview (Insider Risk Management)
                    </span>
                    <span className="job-date">Sep 2025 – Present</span>
                  </div>
                  <div className="job-sub">
                    Redmond, WA • Agentic AI Risk Scoring, Adaptive Protection, Progressive
                    Insights, Sovereign Cloud
                  </div>
                  <div className="job-tech">
                    C#, .NET 8, Azure Functions, Cosmos DB, Event Hubs, Scala/Spark, Entra ID, Graph
                    API, Geneva/Kusto, EV2, Key Vault
                  </div>
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
                        extraText:
                          " (23.9M peak) across 34,000+ tenants; concept to sovereign-cloud GA in 9 months.",
                        detail:
                          "Built a parallel 4-stage system: Activity Ingestion (Event Hub capture) → Trigger Evaluation (12.9M dispatches/day, 23.9M peak) → Insight Generation (366,700 insights/day, 475,500 peak) → Enforcement (Entra/Graph risk signal + DLP/Conditional Access). Scores AI agent behavior across M365 surfaces. Went from zero infrastructure to sovereign-cloud GA across Commercial + GCC/GCCH/DOD in 9 months. 100+ PRs, 849 commits, 13,500+ file changes.",
                        eli5: "I built a 4-step scanner that watches AI agents at Microsoft. If an agent tries to steal or break something, the system blocks them immediately so they don't break the government or business clouds.",
                        qa: [
                          {
                            q: "How fast does this block agents?",
                            a: "Almost instantly. As soon as the risk insight is computed, it propagates to Microsoft Entra to lock down permissions.",
                          },
                          {
                            q: "What sovereign clouds does this run in?",
                            a: "GCC, GCCH, and DoD sovereign clouds for government compliance.",
                          },
                        ],
                      },
                      {
                        index: "ms-2",
                        boldText: "Built Progressive Insights pipeline",
                        plainText:
                          " — Spark streaming → Event Hub → Cosmos DB → Azure Functions scoring; ",
                        impactText: "~39M user events/day",
                        extraText: ", ~200K agent events/day, P95 latency 48s.",
                        detail:
                          "Two-phase Progressive Insights pipeline: Phase 1 (Tyrol/Spark) runs IrmHourlyCumulativeFullAggregator and IrmProgressiveInsightGenerationJob, outputting changed insights to Event Hub and full snapshots to ADLS. Phase 2 (.NET 8 Functions) captures via InsightsCapturer into Cosmos DB, runs BackupInsightsProcessorClient every ~5 min for safety, deduplicates by ConstantInsightId, scores via UserInsightsProcessor, and feeds into Adaptive Protection. Handles ~39M user events/day + ~200K agent events/day.",
                        eli5: "Imagine cringing at the stream of billions of events, filtering out the garbage, and only saving what is important. This is a pipeline that processes 39M daily events and updates risk profiles within 48 seconds.",
                        qa: [
                          {
                            q: "Why use Spark and Azure Functions together?",
                            a: "Spark aggregates huge batches of telemetry, while Azure Functions handles lightweight, real-time event-driven scoring.",
                          },
                        ],
                      },
                      {
                        index: "ms-3",
                        boldText: "Integrated Purview with Entra ID for agent risk enforcement",
                        plainText:
                          " — Graph API endpoints, risk signal propagation, IRM deep links; ",
                        impactText: "same-cycle CA enforcement",
                        extraText: " with no human intervention.",
                        detail:
                          "Integrated Purview IRM with Microsoft Entra ID for AI agent risk signals. Built new Graph API endpoints for agent risk signal propagation, riskyUserId/actorType flow, HttpClient certificate authentication, default policy auto-setup, and IRM deep links. SOC analysts navigate directly from Entra alert to Purview investigation. Enforcement loop: IRM detects risky agent → scores risk → pushes signal to Entra → triggers DLP/Conditional Access policy automatically.",
                        eli5: "Connected the brain (Purview Risk) to the bouncer (Entra ID). If the brain flags an agent, it tells the bouncer to kick it out of the system without waiting for a human.",
                        qa: [
                          {
                            q: "How do security analysts track these events?",
                            a: "They can click deep links from Entra alerts directly into Purview IRM for forensic investigation.",
                          },
                        ],
                      },
                      {
                        index: "ms-4",
                        boldText: "Optimized Adaptive Protection scoring latency by 40–60%",
                        plainText: " — parallelized Cosmos + EOP writes; scoring ",
                        impactText: "119,800 insights/day",
                        extraText: " (958K per 8-day window).",
                        detail:
                          "Parallelized independent Cosmos DB and EOP writes in the AP scoring path, refactored UserRiskProfileProcessorBase for agent/user separation, and optimized the scoring pipeline end-to-end. Scoring processes 958,800 insights per 8-day window (119,800/day). Pipeline now handles 366,700 new insights/day with peak of 475,500/day.",
                        eli5: "Made the system do multiple things at once instead of one-after-another. This cut the time to update risk scores in half.",
                        qa: [
                          {
                            q: "What was the main bottleneck before optimization?",
                            a: "Sequential network calls to Cosmos DB and external security services.",
                          },
                        ],
                      },
                      {
                        index: "ms-5",
                        boldText: "Built isolated agent compute infrastructure",
                        plainText: " — 28 dedicated Function Apps; ",
                        impactText: "33% lower P95 latency",
                        extraText: " (48s vs 72s), 100% API success rate over 30 days.",
                        detail:
                          "Built 14 dedicated AgentDataClient Function Apps + 14 DataClient apps with fully isolated App Service Plans and storage accounts. Agent pipeline achieves P95 capture latency of 48s vs 72s for the shared user pipeline (33% improvement). Agent burst at 3x load never touches user SLAs. 100% API success rate across all DataClient operations over 30 days.",
                        eli5: "Gave AI agents their own highway so they don't block the highway used by human users. Now both run fast without traffic jams.",
                        qa: [
                          {
                            q: "Does this save money?",
                            a: "It optimizes resource allocation, avoiding scaling out the human-user pipeline during agent-driven telemetry bursts.",
                          },
                        ],
                      },
                      {
                        index: "ms-6",
                        boldText: "Led sovereign cloud rollout (GCC, GCCH, DOD)",
                        plainText: " — DR across 4 forests, ",
                        impactText: "53 resource groups",
                        extraText: ", 51 agent deployments, staged ring-by-ring delivery.",
                        detail:
                          "Authored DR parameter files across GCC01, GCC02, USG01, USG02. Built EV2 service model and rollout specs spanning 53 resource groups and 51 agent DataClient deployments. Staged rollout: GCC-first, then GCCH/DOD. Geneva/Kusto onboarding for Gov telemetry (3 environments × 7 steps × 16 Geneva queries). Embedded ASP steps, fixed rollout-spec bugs, and added ServiceModel_DR updates.",
                        eli5: "Shipped this highly secure software into government clouds. Set up backup databases and monitoring in ultra-secure zones used by the military.",
                        qa: [
                          {
                            q: "What special challenges do sovereign clouds present?",
                            a: "No direct internet access, strict data boundary restrictions, and rigorous EV2 security compliance checks.",
                          },
                        ],
                      },
                      {
                        index: "ms-7",
                        boldText: "Extended IRM to treat AI agents as first-class actors",
                        plainText:
                          " — DRP, historical search, risk scoring, policy lookup, onboarding; serving ",
                        impactText: "13,047 tenants",
                        extraText: ", 237,600+ agent actors.",
                        detail:
                          "Extended IRM platform to treat AI agents as first-class actors: Agent type in UpsertDRPCustomTag, actor support in HistoricalSearchProcess, AgentAdaptiveProtectionSettings, RiskProfileProcessorClient for agent scoring, MasterDRPSyncClient for agent DRP sync, ObjectId/mailbox identity for Agentic User, AgentActorComparer for reusable comparison logic. Now serving 13,047 tenants with 237,600+ distinct agent actors.",
                        eli5: "Taught the security scanner that AI agents are distinct entities, not just regular humans, so we can track and score them individually.",
                        qa: [
                          {
                            q: "How many tenants use this today?",
                            a: "Over 13,000 tenants with hundreds of thousands of active AI agents.",
                          },
                        ],
                      },
                      {
                        index: "ms-8",
                        boldText: "Operated on CDP at billions-of-signals-per-day scale",
                        plainText:
                          " — multi-stage Spark → Event Hub → Kusto → Service Fabric pipeline; ",
                        impactText: "82 EV2 resource definitions",
                        extraText: ", horizontal storage sharding.",
                        detail:
                          "Operated on CDP (Common Data Platform) processing billions of signals/day through a multi-stage pipeline: Sources → S1 (Spark Structured Streaming) → S2 (parallel dispatch) → S3 (batch aggregation) → K1/K2 (Kusto ingestion) → Q (query). EV2 service model with 82 resource definitions. Horizontal storage sharding. 500K records in 8.3 min parallel vs 13.8h sequential.",
                        eli5: "Handled data systems that process billions of pieces of information daily. Split the database into smaller chunks so reading and writing is super fast.",
                        qa: [
                          {
                            q: "What is horizontal storage sharding?",
                            a: "Distributing database writes across multiple storage accounts to avoid reaching throughput limits.",
                          },
                        ],
                      },
                      {
                        index: "ms-9",
                        boldText: "Resolved critical Gov production incidents",
                        plainText: " — Event Hub deletion (",
                        impactText: "~90% capture drop",
                        extraText:
                          " recovered), Cosmos conflict bugs; established team-wide recovery SOPs.",
                        detail:
                          "Resolved Event Hub deletion in GCC02 causing ~90% insight capture drop. Fixed Cosmos conflict bug affecting 3 Gov tenants. Managed multiple Sev 2/3/4 ICM days during Gov rollout. Recovery procedures became team-wide standards.",
                        eli5: "Fixed an emergency where a critical government pipeline was deleted. Rebuilt the system and recovered 90% of lost data while creating a guide to stop it from happening again.",
                        qa: [
                          {
                            q: "What did the recovery guide establish?",
                            a: "An automated checklist to verify all consumer groups, keys, and RBACs are restored during forest migrations.",
                          },
                        ],
                      },
                      {
                        index: "ms-10",
                        boldText: "Managed complex flight and release operations",
                        plainText: " — 10+ cloud rings, cherry-pick/backport coordination, ",
                        impactText: "100-file config cleanup",
                        extraText: ", staged Gov scoping.",
                        detail:
                          "Managed feature flights across 10+ cloud regions/rings. Executed cherry-pick/backport waves across release branches. 100-file config cleanup in single PR. Scoped risky Gov rollout from all-Gov to GCC-only, then expanded after validation. ActorId to AgentId migration + backfill.",
                        eli5: "Coordinated releasing updates safely across 10 global zones, cleaning up old settings, and ensuring new code didn't break government environments.",
                        qa: [
                          {
                            q: "Why do you use flighting?",
                            a: "To enable features for a tiny percentage of users first, verify stability, and then gradually scale up.",
                          },
                        ],
                      },
                      {
                        index: "ms-11",
                        boldText: "Scaled trigger pipeline to 400M dispatches/month",
                        plainText: " — ",
                        impactText: "25.8M distinct actors",
                        extraText:
                          ", intelligent throttling (48.3%) and noise filtering (6%) for signal quality.",
                        detail:
                          "Trigger pipeline processes 399.7M dispatches in 30 days across 34,071 tenants and 25.8M distinct actors. Disposition: 45.7% Allowed (181.7M), 48.3% Throttled (191.8M), 6% DroppedNoisy (23.7M). Covers the full IRM signal surface across all M365 workloads.",
                        eli5: "Created a filter that handles 400 million alerts a month, dropping noisy or duplicate alerts so the security dashboard only shows the real, important threats.",
                        qa: [
                          {
                            q: "What is throttled vs dropped noisy?",
                            a: "Throttled restricts event rates per tenant, while dropped noisy filters out known safe repetitions.",
                          },
                        ],
                      },
                    ].map((bullet) => (
                      <li
                        key={bullet.index}
                        className={
                          (activeBulletIndex === bullet.index ? "drawer-active-bullet " : "") +
                          (morphed ? "morphed-li" : "")
                        }
                        onClick={(e) => handleBulletClick(bullet as BulletData, e)}
                      >
                        <strong>{bullet.boldText}</strong>
                        {bullet.plainText}
                        <span className="impact">{bullet.impactText}</span>
                        {bullet.extraText}
                        {morphed && (
                          <span className="bullet-expand-hint">
                            {activeBulletIndex === bullet.index ? "▸" : "▹"}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* AMAZON JOB */}
                <div className="job" id="job-amzn">
                  <div className="job-header">
                    <span className="job-title-text">
                      Software Engineer II — Amazon (Order Fulfillment &amp; Delivery Experience)
                    </span>
                    <span className="job-date">Aug 2019 – Aug 2025</span>
                  </div>
                  <div className="job-sub">
                    Seattle, WA • Supply Chain Optimization, Delivery Predictions, Infrastructure
                  </div>
                  <div className="job-tech">
                    Java, Python, gRPC, Docker, ECS, DynamoDB, S3, Lambda, SageMaker, Bedrock,
                    Kinesis
                  </div>
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
                        detail:
                          "Built the full backend: real-time feature pipeline, model serving infrastructure, A/B test framework, and rollback safety nets. SageMaker-hosted quantile regression model powers delivery date predictions across all of Amazon logistics.",
                        eli5: "Built the brain that decides exactly when your package will arrive on Amazon. This math model made deliveries more accurate, making Amazon an extra $28 million.",
                        qa: [
                          {
                            q: "What is quantile regression?",
                            a: "It's a type of regression that predicts specific percentiles (like P90 delivery speed) instead of just the average.",
                          },
                        ],
                      },
                      {
                        index: "amz-2",
                        boldText: "Led logging optimization",
                        plainText: " — ",
                        impactText: "$3M+/year savings",
                        extraText: " across 60+ services.",
                        detail:
                          "Audited 60+ services during AWS migration. Identified redundant CloudWatch metrics, optimized log levels, implemented sampling strategies. Reduced costs by $250K+/month sustained.",
                        eli5: "Found out that our systems were writing too much useless diagnostic diaries. Cleaned up the logs, saving Amazon $250,000 every single month.",
                        qa: [
                          {
                            q: "How did you scale this?",
                            a: "By building a shared dynamic logging library that let teams adjust log levels in production without redeploying.",
                          },
                        ],
                      },
                      {
                        index: "amz-3",
                        boldText: "Microservice bootstrap library",
                        plainText: " — saving ",
                        impactText: "40–50 engineer-weeks.",
                        extraText: "",
                        detail:
                          "Custom DSL for service configuration: dependency injection, middleware chains, health checks, deployment pipelines — all generated from a single config file. Reduced new service setup from 2–3 weeks to hours.",
                        eli5: "Built a starter-kit that lets programmers create a brand new Amazon service with all the databases and security pre-configured in minutes instead of weeks.",
                        qa: [
                          {
                            q: "What technologies did this use?",
                            a: "Java, AWS CloudFormation/CDK templates, and a custom YAML configuration parser.",
                          },
                        ],
                      },
                      {
                        index: "amz-4",
                        boldText: "Event orchestration",
                        plainText: " — ",
                        impactText: "100K+ TPS",
                        extraText: ", 16 services.",
                        detail:
                          "Unified event bus connecting 16 services via REST + gRPC. Handles order state transitions, inventory updates, delivery scheduling, and customer notifications. Sustained 100K+ TPS during peak events.",
                        eli5: "Built a massive post office inside Amazon's backend that route 100,000 messages a second between 16 different departments during Prime Day without dropping any mail.",
                        qa: [
                          {
                            q: "How did you ensure reliability?",
                            a: "Used Amazon Kinesis with partitioned shards and Redis caching for deduplication.",
                          },
                        ],
                      },
                      {
                        index: "amz-5",
                        boldText: "RAG delivery prediction",
                        plainText: " — ",
                        impactText: "7% global sales increase.",
                        extraText: "",
                        detail:
                          "Retrieval-augmented generation using SageMaker embeddings + OpenSearch vector index. Predicts delivery windows by retrieving similar historical deliveries and adjusting for current conditions.",
                        eli5: "Used AI to search through historical packages to find similar routes. Adjusted delivery estimates using real-time traffic updates, which made customers buy 7% more.",
                        qa: [
                          {
                            q: "What vector database was used?",
                            a: "Amazon OpenSearch Service with k-NN search enabled.",
                          },
                        ],
                      },
                      {
                        index: "amz-6",
                        boldText: "Just-In-Stock",
                        plainText: " — ",
                        impactText: "16% early delivery increase.",
                        extraText: "",
                        detail:
                          "Real-time inventory optimization that routes packages to the closest fulfillment center with available stock, reducing transit time and increasing early-delivery rates by 16%.",
                        eli5: "Designed a smart router that ships items from the warehouse closest to you, making packages arrive early 16% more often.",
                        qa: [
                          {
                            q: "How did you track real-time inventory?",
                            a: "Connected to a DynamoDB stream that published inventory changes instantly.",
                          },
                        ],
                      },
                      {
                        index: "amz-7",
                        boldText: "LLM email redesign",
                        plainText: " — 37 templates via Bedrock.",
                        impactText: "",
                        extraText: "",
                        detail:
                          "Used Amazon Bedrock (Claude/Titan) with RAG constraints to ensure brand compliance, legal requirements, and personalization. Automated generation of 37 transactional email templates.",
                        eli5: "Used artificial intelligence to rewrite and customize emails sent to shoppers, making sure they look perfect and follow brand rules.",
                        qa: [
                          {
                            q: "How did you constrain the LLM?",
                            a: "Used structured XML parsing and strict system prompts verified by automated unit test suites.",
                          },
                        ],
                      },
                      {
                        index: "amz-8",
                        boldText: "Load testing 60+ services",
                        plainText: " for Prime Day.",
                        impactText: "",
                        extraText: "",
                        detail:
                          "Built load testing infrastructure for Prime Day and Black Friday. Validated auto-scaling policies, identified bottlenecks, ensured zero degradation during 10x traffic spikes.",
                        eli5: "Simulated 10 times our normal shopping traffic to make sure Amazon didn't crash during Prime Day sales.",
                        qa: [
                          {
                            q: "What tools were used?",
                            a: "Distributed load generation tools using AWS ECS Fargate containers.",
                          },
                        ],
                      },
                      {
                        index: "amz-9",
                        boldText: "Sev-2 reduced 60%",
                        plainText: " via on-call reviews.",
                        impactText: "",
                        extraText: "",
                        detail:
                          "Conducted systematic on-call reduction reviews across 8 teams. Identified recurring alerts, built runbooks, automated common resolutions. Sev-2 page frequency dropped 60%.",
                        eli5: "Stopped pagers from waking engineers up at night by teaching the systems how to fix minor errors by themselves.",
                        qa: [
                          {
                            q: "What was the most common automated fix?",
                            a: "Restarting stale container tasks and flushing expired Redis cache keys.",
                          },
                        ],
                      },
                      {
                        index: "amz-10",
                        boldText: "TRA readiness",
                        plainText: " — CI/CD, fault injection, canary.",
                        impactText: "",
                        extraText: "",
                        detail:
                          "Full TRA (Threat & Risk Assessment) for Tier-1 service: CI/CD hardening, multi-AZ failover, chaos engineering via fault injection, canary deployments, and reusable developer tools.",
                        eli5: "Tested our systems by intentionally breaking servers and injecting errors to make sure the site stays up even in a disaster.",
                        qa: [
                          {
                            q: "What is chaos engineering here?",
                            a: "We simulated losing an entire AWS availability zone (AZ) during peak traffic.",
                          },
                        ],
                      },
                    ].map((bullet) => (
                      <li
                        key={bullet.index}
                        className={
                          (activeBulletIndex === bullet.index ? "drawer-active-bullet " : "") +
                          (morphed ? "morphed-li" : "")
                        }
                        onClick={(e) => handleBulletClick(bullet as BulletData, e)}
                      >
                        <strong>{bullet.boldText}</strong>
                        {bullet.plainText}
                        <span className="impact">{bullet.impactText}</span>
                        {bullet.extraText}
                        {morphed && (
                          <span className="bullet-expand-hint">
                            {activeBulletIndex === bullet.index ? "▸" : "▹"}
                          </span>
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
                  <div className="metric-card">
                    <span className="metric-num">12.9M/day</span>
                    <span className="metric-label">Trigger Dispatches (avg)</span>
                    <span className="metric-source">Kusto: TriggerDispatcher 30d</span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-num">23.9M/day</span>
                    <span className="metric-label">Trigger Dispatches (peak)</span>
                    <span className="metric-source">Kusto: TriggerDispatcher 30d peak</span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-num">399.7M</span>
                    <span className="metric-label">Dispatches / 30 days</span>
                    <span className="metric-source">Kusto: SparkApplicationEvent</span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-num">34,071</span>
                    <span className="metric-label">Active Tenants (30d)</span>
                    <span className="metric-source">Kusto: TriggerDispatcher</span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-num">25.8M</span>
                    <span className="metric-label">Distinct Actors (7d)</span>
                    <span className="metric-source">Kusto: Distinct ActorIDs</span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-num">39M/day</span>
                    <span className="metric-label">User Pipeline Events</span>
                    <span className="metric-source">EventHub Capture RCA</span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-num">200K/day</span>
                    <span className="metric-label">Agent Pipeline Events</span>
                    <span className="metric-source">EventHub Capture RCA</span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-num">366.7K/day</span>
                    <span className="metric-label">New Insights Created</span>
                    <span className="metric-source">Kusto: IrmAppMetric 8d avg</span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-num">475.5K/day</span>
                    <span className="metric-label">Insights (peak day)</span>
                    <span className="metric-source">Kusto: IrmAppMetric peak</span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-num">119.8K/day</span>
                    <span className="metric-label">Insights Scored</span>
                    <span className="metric-source">Kusto: ScoredInsightsCount</span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-num">237.6K</span>
                    <span className="metric-label">Agent Actors (30d)</span>
                    <span className="metric-source">Kusto: Agent ActorIDs</span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-num">13,047</span>
                    <span className="metric-label">Agent Tenants</span>
                    <span className="metric-source">Kusto: Agent tenant count</span>
                  </div>
                </div>
              </div>

              {/* MORPHED SECTION: RELEASES TIMELINE */}
              <div className="section morphed-only">
                <div className="section-title">🚀 Rollout Timeline (Milestones)</div>
                <div className="timeline">
                  <div className="timeline-item">
                    <div className="tl-date">Oct – Nov 2025</div>
                    <div className="tl-title">
                      Architecture Design &amp; Base Infrastructure Setup
                    </div>
                    <div className="tl-desc">
                      Set up isolated agent compute infrastructure, Auth configuration, Bicep
                      resource definitions, parameters, and Event Hub captures. Handled initial data
                      model mapping and unit testing.
                    </div>
                    <div className="tl-tags">
                      <span className="tl-tag">Design</span>
                      <span className="tl-tag">Azure Functions</span>
                      <span className="tl-tag">Bicep</span>
                    </div>
                  </div>
                  <div className="timeline-item">
                    <div className="tl-date">Dec 2025 – Jan 2026</div>
                    <div className="tl-title">Rollout &amp; Release Infrastructure Hardening</div>
                    <div className="tl-desc">
                      Hardened deployment pipeline: agent/user flight enablement, storage account
                      naming fixes, staging stop slot for Agents Insights Worker, official rollout
                      config and infra specs. Peak month: Jan 2026 = 3,092 files changed.
                    </div>
                    <div className="tl-tags">
                      <span className="tl-tag">PR #4727770</span>
                      <span className="tl-tag">PR #4743728</span>
                      <span className="tl-tag">PR #4797749</span>
                      <span className="tl-tag">PR #4807829</span>
                      <span className="tl-tag">3,092 files</span>
                    </div>
                  </div>
                  <div className="timeline-item">
                    <div className="tl-date">Feb – Mar 2026</div>
                    <div className="tl-title">
                      Stabilization: Flight Management &amp; Critical Bug Fixes
                    </div>
                    <div className="tl-desc">
                      Stabilized agent + AP pipeline: Event Hub/insight capture flight fixes,
                      disabled unsafe actor/agent clients during rollout, fixed AP
                      null/deserialization bugs, agent data-client deployment fixes. Resolved
                      end-to-end pipeline failures blocking AP scoring.
                    </div>
                    <div className="tl-tags">
                      <span className="tl-tag">PR #4916091</span>
                      <span className="tl-tag">PR #4976230</span>
                      <span className="tl-tag">PR #5009041</span>
                      <span className="tl-tag">PR #5030182</span>
                      <span className="tl-tag">Stabilization</span>
                    </div>
                  </div>
                  <div className="timeline-item">
                    <div className="tl-date">Apr – May 2026</div>
                    <div className="tl-title">
                      Purview-Entra Integration for Agent Adaptive Protection
                    </div>
                    <div className="tl-desc">
                      Built the integration between Microsoft Purview IRM and Microsoft Entra ID:
                      Graph API endpoint for agent risk signals, riskyUserId/actorType propagation,
                      HttpClient/cert fixes, default policy setup, IRM deep link for alert
                      navigation, payload hardening.
                    </div>
                    <div className="tl-tags">
                      <span className="tl-tag">PR #5065373</span>
                      <span className="tl-tag">PR #5093293</span>
                      <span className="tl-tag">PR #5120893</span>
                      <span className="tl-tag">PR #5132234</span>
                      <span className="tl-tag">Entra</span>
                      <span className="tl-tag">Graph API</span>
                    </div>
                  </div>
                  <div className="timeline-item">
                    <div className="tl-date">May – Jun 2026</div>
                    <div className="tl-title">Agent AP End-to-End Ship + Gov Cloud Rollout</div>
                    <div className="tl-desc">
                      Shipped complete Agent AP to production: agent insights flows, AP scoring in
                      INT/SDF, ActorId→AgentId migration, Gov Progressive Insights rollout (flight
                      enablement, backup processor switchover, 100-file cleanup, DR hardening across
                      all Gov forests).
                    </div>
                    <div className="tl-tags">
                      <span className="tl-tag">PR #5208581</span>
                      <span className="tl-tag">PR #5253628</span>
                      <span className="tl-tag">PR #5254865</span>
                      <span className="tl-tag">100-file cleanup</span>
                      <span className="tl-tag">Gov GA</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* MORPHED SECTION: INCIDENT RESPONSE */}
              <div className="section morphed-only">
                <div className="section-title">🚨 Incident Response &amp; Root Cause Analysis</div>
                <div className="incident-card">
                  <div className="inc-sev">ICM 818917074 — Major Production Incident</div>
                  <div className="inc-title">
                    Event Hub Deletion in GCC02 — ~90% Insight Capture Drop
                  </div>
                  <div className="inc-detail">
                    <strong>Root cause:</strong> Sovereign Event Hub deleted during escort
                    operation; restore did not restore consumer groups, SAS policies, Key Vault
                    secrets, RBAC assignments, or checkpoints.
                    <br />
                    <strong>Impact:</strong> ~90% drop in captured insights for Gov cloud. Recovery
                    procedures became team-wide standards.
                  </div>
                  <div className="inc-outcome">
                    Outcome: Fully restored consumer groups, keys, and RBACs; defined automated
                    checklists for future Gov forest escort ops.
                  </div>
                </div>
              </div>

              {/* COLLABORATION & LEADERSHIP SECTION */}
              <div className="section morphed-only">
                <div className="section-title">👥 Collaboration & Leadership</div>
                <div className="collab-grid">
                  <div className="collab-card">
                    <span className="collab-name">Mentorship &amp; Guidance</span>
                    <div className="collab-ctx">
                      Mentored junior engineers and interns at Amazon and Microsoft; led on-call
                      reduction initiatives reducing Sev-2 alerts by 60%.
                    </div>
                  </div>
                  <div className="collab-card">
                    <span className="collab-name">Cross-Org Coordination</span>
                    <div className="collab-ctx">
                      Coordinated load testing with 60+ distributed service owners for Prime
                      Day/Black Friday peak events at Amazon.
                    </div>
                  </div>
                  <div className="collab-card">
                    <span className="collab-name">Knowledge Sharing</span>
                    <div className="collab-ctx">
                      Established post-mortem reviews and long-term design discussions to foster
                      engineering excellence across teams.
                    </div>
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
                  <dd>
                    Azure, AWS, Cosmos DB, DynamoDB, Event Hubs, Kusto, Spark, ADLS, Postgres, Redis
                  </dd>
                  <dt>Tools/Other</dt>
                  <dd>Docker, Kubernetes, Bicep, Git, CI/CD, gRPC, REST, Bedrock, SageMaker</dd>
                </dl>

                <div className="skill-bars">
                  <div className="skill-row">
                    <span className="skill-label">Backend</span>
                    <div className="skill-bar-bg">
                      <div
                        className="skill-bar-fill purple animate"
                        style={{ "--fill": "95%" } as React.CSSProperties}
                      ></div>
                    </div>
                    <span className="skill-items">C#, .NET 8, Java, gRPC, REST, Microservices</span>
                  </div>
                  <div className="skill-row">
                    <span className="skill-label">Cloud/Infra</span>
                    <div className="skill-bar-bg">
                      <div
                        className="skill-bar-fill blue animate"
                        style={{ "--fill": "90%" } as React.CSSProperties}
                      ></div>
                    </div>
                    <span className="skill-items">
                      Azure Functions, Cosmos DB, Event Hubs, Bicep, AWS, Lambda, ECS
                    </span>
                  </div>
                  <div className="skill-row">
                    <span className="skill-label">Data/ML</span>
                    <div className="skill-bar-bg">
                      <div
                        className="skill-bar-fill green animate"
                        style={{ "--fill": "85%" } as React.CSSProperties}
                      ></div>
                    </div>
                    <span className="skill-items">
                      Spark, Scala, Python, SageMaker, Bedrock, RAG, OpenSearch
                    </span>
                  </div>
                  <div className="skill-row">
                    <span className="skill-label">DevOps/Ops</span>
                    <div className="skill-bar-bg">
                      <div
                        className="skill-bar-fill orange animate"
                        style={{ "--fill": "85%" } as React.CSSProperties}
                      ></div>
                    </div>
                    <span className="skill-items">
                      CI/CD, Docker, Geneva, Kusto, EV2, Git, Threat Assessment (TRA)
                    </span>
                  </div>
                  <div className="skill-row">
                    <span className="skill-label">Frontend</span>
                    <div className="skill-bar-bg">
                      <div
                        className="skill-bar-fill pink animate"
                        style={{ "--fill": "75%" } as React.CSSProperties}
                      ></div>
                    </div>
                    <span className="skill-items">
                      React, TypeScript, CSS, HTML5, Responsive Design
                    </span>
                  </div>
                </div>
              </div>

              {/* EDUCATION SECTION */}
              <div className="section">
                <div className="section-title">Education</div>
                <div className="edu-line">
                  <strong>Santa Clara University, Santa Clara, CA</strong>
                  <span className="right">
                    Master’s in Computer Science and Engineering | GPA 3.77 | 2017 – 2019
                  </span>
                </div>
                <div className="edu-line">
                  <strong>Pune Institute of Computer Technology (PICT), India</strong>
                  <span className="right">
                    Bachelor’s in Computer Science and Engineering | GPA 3.34 | 2012 – 2016
                  </span>
                </div>
              </div>

              {/* ACHIEVEMENTS SECTION */}
              <div className="section">
                <div className="section-title">Recognition &amp; Achievements</div>
                <ul className="recognition" style={{ paddingLeft: "18px" }}>
                  <li>
                    Received <strong>Just Do It Award</strong> at Amazon for developing an Automated
                    Service Creation tool that deploys microservices on AWS within an hour.
                  </li>
                  <li>Won a prize for the most innovative project at the SCU Bronco Hackathon.</li>
                  <li>
                    Started a blog on improving creativity, growth, and human experience to help
                    navigate the AI age with depth.
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ===== SIDE PANEL DRAWER ===== */}
      <AnimatePresence>
        {drawerOpen && drawerBullet && (
          <>
            <motion.div
              className="drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={closeDrawer}
            />
            <motion.div
              className="drawer-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="drawer-close" onClick={closeDrawer} aria-label="Close drawer">
                ×
              </button>

              <div className="drawer-header">
                <h2 className="drawer-title">{drawerBullet.boldText}</h2>
                <p className="drawer-subtitle">
                  {drawerBullet.plainText}{" "}
                  <span style={{ color: "var(--accent)", fontWeight: "bold" }}>
                    {drawerBullet.impactText}
                  </span>{" "}
                  {drawerBullet.extraText}
                </p>
              </div>

              <div className="drawer-tabs">
                <button
                  className={`drawer-tab ${drawerTab === "deep-dive" ? "active" : ""}`}
                  onClick={() => setDrawerTab("deep-dive")}
                >
                  Deep Dive
                </button>
                <button
                  className={`drawer-tab ${drawerTab === "eli5" ? "active" : ""}`}
                  onClick={() => setDrawerTab("eli5")}
                >
                  ELI5
                </button>
                <button
                  className={`drawer-tab ${drawerTab === "interview" ? "active" : ""}`}
                  onClick={() => setDrawerTab("interview")}
                >
                  Q&A
                </button>
              </div>

              <div className="drawer-body">
                {drawerTab === "deep-dive" && (
                  <div>
                    <h3
                      style={{
                        fontSize: "1rem",
                        fontWeight: "bold",
                        marginBottom: "8px",
                        color: "#0f172a",
                      }}
                    >
                      Technical Implementation Details
                    </h3>
                    <p style={{ fontSize: "0.95rem", color: "#334155", lineHeight: "1.6" }}>
                      {drawerBullet.detail}
                    </p>
                  </div>
                )}

                {drawerTab === "eli5" && (
                  <div>
                    <h3
                      style={{
                        fontSize: "1rem",
                        fontWeight: "bold",
                        marginBottom: "8px",
                        color: "#0f172a",
                      }}
                    >
                      Explain Like I'm 5 (ELI5)
                    </h3>
                    <p style={{ fontSize: "0.95rem", color: "#334155", lineHeight: "1.6" }}>
                      {drawerBullet.eli5 ||
                        "I built a highly optimized component of the service to process signals efficiently, coordinate workflows, and ensure the platform doesn't slow down under heavy load."}
                    </p>
                  </div>
                )}

                {drawerTab === "interview" && (
                  <div>
                    <h3
                      style={{
                        fontSize: "1rem",
                        fontWeight: "bold",
                        marginBottom: "12px",
                        color: "#0f172a",
                      }}
                    >
                      Discussion &amp; Interview Notes
                    </h3>
                    {drawerBullet.qa && drawerBullet.qa.length > 0 ? (
                      drawerBullet.qa.map((item, i) => (
                        <div
                          key={i}
                          style={{
                            marginBottom: "16px",
                            borderBottom: "1px solid #f1f5f9",
                            paddingBottom: "12px",
                          }}
                        >
                          <p
                            style={{
                              fontWeight: "bold",
                              fontSize: "0.9rem",
                              color: "#1e293b",
                              marginBottom: "4px",
                            }}
                          >
                            Q: {item.q}
                          </p>
                          <p style={{ fontSize: "0.9rem", color: "#475569" }}>A: {item.a}</p>
                        </div>
                      ))
                    ) : (
                      <div>
                        <div
                          style={{
                            marginBottom: "16px",
                            borderBottom: "1px solid #f1f5f9",
                            paddingBottom: "12px",
                          }}
                        >
                          <p
                            style={{
                              fontWeight: "bold",
                              fontSize: "0.9rem",
                              color: "#1e293b",
                              marginBottom: "4px",
                            }}
                          >
                            Q: What were the key engineering trade-offs in this design?
                          </p>
                          <p style={{ fontSize: "0.9rem", color: "#475569" }}>
                            A: We prioritized horizontal scalability and strict compute isolation,
                            ensuring that sudden traffic bursts don't compromise system availability
                            or violate security bounds.
                          </p>
                        </div>
                        <div style={{ marginBottom: "16px" }}>
                          <p
                            style={{
                              fontWeight: "bold",
                              fontSize: "0.9rem",
                              color: "#1e293b",
                              marginBottom: "4px",
                            }}
                          >
                            Q: How did you measure success for this release?
                          </p>
                          <p style={{ fontSize: "0.9rem", color: "#475569" }}>
                            A: We tracked end-to-end telemetry (P95 latency, error rates, resource
                            usage) across all active regions and confirmed stable performance during
                            high-throughput verification windows.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
