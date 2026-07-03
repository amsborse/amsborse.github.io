import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CSSProperties, MouseEvent, ReactNode, useRef } from "react";

export type LearningCardTopic = {
  id: string;
  title: string;
  description: string;
  icon: string;
  path?: string;
  status: "active" | "coming-soon";
  tags: string[];
  color: string;
  renderPortalVisual: () => ReactNode;
};

export function LearningInteractiveCard({
  topic,
  index,
}: {
  topic: LearningCardTopic;
  index: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  }

  const cardContent = (
    <div className="h-full flex relative z-10 select-none items-center overflow-hidden">
      <div className="w-full shrink-0 group-hover:w-[60%] transition-all duration-500 ease-out flex flex-col justify-between h-full p-8 pr-4">
        <div>
          <div className="flex justify-between items-start mb-6">
            <motion.div
              className="text-4xl filter drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]"
              animate={{ y: [0, -6, 0], rotate: [0, -3, 3, 0] }}
              transition={{ duration: 4 + index, repeat: Infinity, ease: "easeInOut" }}
            >
              {topic.icon}
            </motion.div>
            {topic.status === "active" ? (
              <span className="text-[10px] uppercase font-mono tracking-wider px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                Active Sandbox
              </span>
            ) : (
              <span className="text-[10px] uppercase font-mono tracking-wider px-2.5 py-1 rounded bg-slate-500/10 border border-slate-500/20 text-slate-500">
                Coming Soon
              </span>
            )}
          </div>
          <h3 className="text-xl font-bold text-white mb-3 group-hover:text-indigo-400 transition-colors duration-300">
            {topic.title}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">{topic.description}</p>
        </div>
        <div>
          <div className="flex flex-wrap gap-2 mb-6">
            {topic.tags.map((tag) => (
              <span
                key={tag}
                className="text-[9px] font-mono text-slate-500 bg-white/5 border border-white/5 px-2 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
          {topic.status === "active" && topic.path ? (
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-indigo-400 group-hover:translate-x-1.5 transition-transform duration-300">
              Launch Sandbox <span className="text-sm">➔</span>
            </div>
          ) : (
            <div className="text-xs font-mono uppercase tracking-wider text-slate-600">
              Research Phase
            </div>
          )}
        </div>
      </div>
      <div className="w-0 group-hover:w-[40%] opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out h-full relative border-l border-white/5 flex items-center justify-center bg-black/35 overflow-hidden">
        <div className="w-full h-full transform scale-90 group-hover:scale-100 transition-transform duration-500 ease-out flex items-center justify-center">
          {topic.renderPortalVisual()}
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className="group relative rounded-2xl bg-[#0d0e15]/90 border border-white/10 hover:border-white/20 transition-all duration-300 overflow-hidden flex flex-col justify-between h-[320px]"
      style={
        {
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.02)",
          ["--mouse-x"]: "50%",
          ["--mouse-y"]: "50%",
        } as CSSProperties
      }
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          maskImage:
            "radial-gradient(circle 120px at var(--mouse-x) var(--mouse-y), black 20%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(circle 120px at var(--mouse-x) var(--mouse-y), black 20%, transparent 100%)",
        }}
      />
      <div
        className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r ${topic.color} opacity-70 group-hover:opacity-100 transition-opacity duration-300`}
      />
      {topic.status === "active" && topic.path ? (
        <Link to={topic.path} className="h-full block">
          {cardContent}
        </Link>
      ) : (
        <div className="h-full cursor-not-allowed">{cardContent}</div>
      )}
    </motion.div>
  );
}
