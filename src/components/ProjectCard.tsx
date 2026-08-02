import { projectCategories, type Project } from "@/data";
import { HubInteractiveCard } from "@/components/InteractiveCard";

const CATEGORY_COLORS: Record<string, string> = {
  systems: "from-indigo-500 to-purple-600",
  product: "from-emerald-500 to-teal-600",
  ai: "from-amber-500 to-orange-600",
  tooling: "from-pink-500 to-rose-600",
};

function renderProjectVisual(id: string) {
  switch (id) {
    case "finance-spend-analyzer":
      return (
        <svg className="w-full h-full p-4" viewBox="0 0 200 200" fill="none" aria-hidden>
          <path
            d="M 20 150 Q 50 110, 80 130 T 140 70 T 180 50"
            stroke="rgba(16, 185, 129, 0.4)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M 20 150 Q 50 110, 80 130 T 140 70 T 180 50 L 180 170 L 20 170 Z"
            fill="url(#spendGrad)"
          />
          <circle cx="140" cy="70" r="5" fill="#10b981" />
          <defs>
            <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      );
    case "ai-experiments":
      return (
        <svg className="w-full h-full p-4" viewBox="0 0 200 200" fill="none" aria-hidden>
          <circle cx="50" cy="60" r="5" fill="#f59e0b" />
          <circle cx="50" cy="100" r="5" fill="#f59e0b" />
          <circle cx="50" cy="140" r="5" fill="#f59e0b" />
          <circle cx="100" cy="70" r="6" fill="#d97706" />
          <circle cx="100" cy="130" r="6" fill="#d97706" />
          <circle cx="150" cy="100" r="8" fill="#fbbf24" />
          <path
            d="M 55 60 L 95 70 M 55 100 L 95 70 M 55 100 L 95 130 M 55 140 L 95 130 M 106 70 L 142 100 M 106 130 L 142 100"
            stroke="rgba(245, 158, 11, 0.2)"
            strokeWidth="1.5"
          />
        </svg>
      );
    case "distributed-job-runner":
      return (
        <svg className="w-full h-full p-4" viewBox="0 0 200 200" fill="none" aria-hidden>
          <rect
            x="25"
            y="85"
            width="40"
            height="30"
            rx="4"
            stroke="rgba(99, 102, 241, 0.4)"
            strokeWidth="1.5"
            fill="rgba(99,102,241,0.05)"
          />
          <circle cx="145" cy="70" r="12" fill="#0d0e15" stroke="#6366f1" strokeWidth="2" />
          <circle cx="145" cy="130" r="12" fill="#0d0e15" stroke="#6366f1" strokeWidth="2" />
        </svg>
      );
    case "api-design-kit":
      return (
        <svg className="w-full h-full p-4" viewBox="0 0 200 200" fill="none" aria-hidden>
          <rect
            x="20"
            y="40"
            width="160"
            height="120"
            rx="6"
            fill="#07080d"
            stroke="rgba(244, 114, 182, 0.2)"
            strokeWidth="1.5"
          />
          <circle cx="35" cy="52" r="3" fill="#ef4444" />
          <circle cx="45" cy="52" r="3" fill="#eab308" />
          <circle cx="55" cy="52" r="3" fill="#22c55e" />
          <line
            x1="35"
            y1="85"
            x2="80"
            y2="85"
            stroke="#f472b6"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="35"
            y1="100"
            x2="140"
            y2="100"
            stroke="#f43f5e"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    default:
      return null;
  }
}

export function ProjectCard({ project, index = 0 }: { project: Project; index?: number }) {
  const categoryLabel =
    projectCategories.find((c) => c.id === project.category)?.label ?? project.category;

  const color = CATEGORY_COLORS[project.category] || "from-slate-500 to-slate-600";

  return (
    <HubInteractiveCard
      id={project.id}
      title={project.title}
      description={project.summary}
      color={color}
      status="default"
      statusLabel={project.featured ? "Featured" : categoryLabel}
      tags={project.stack}
      index={index}
      clamp={2}
      renderPortalVisual={() => renderProjectVisual(project.id)}
      footer={
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {project.links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-accent)] hover:text-[var(--color-accent-bright)] transition-colors"
            >
              {link.label} ➔
            </a>
          ))}
        </div>
      }
    />
  );
}
