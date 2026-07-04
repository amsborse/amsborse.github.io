import { useState, useMemo } from "react";
import { futureProjects, type FutureProject } from "@/data/futureProjects";
import { ContentInteractiveCard, HUB_CARD_GRID } from "@/components/InteractiveCard";

const METRIC_LABELS: Record<string, string> = {
  resume: "Resume",
  career: "Career",
  money: "Money",
  fun: "Fun",
  cool: "Cool",
  popularity: "Popularity",
  longevity: "Longevity",
  technicalDepth: "Tech Depth",
  learning: "Learning",
  leverage: "Leverage",
  startupPotential: "Startup",
};

export function FutureProjectsSection() {
  const [activeTab, setActiveTab] = useState<"top10" | "all" | "S" | "A+" | "A">("top10");
  const [sortBy, setSortBy] = useState<keyof FutureProject["scores"] | "ranking" | null>("ranking");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  // Toggle expand/collapse
  const toggleExpand = (id: string) => {
    setExpandedProjectId((prev) => (prev === id ? null : id));
  };

  // Filter projects based on activeTab
  const filteredProjects = useMemo(() => {
    let list = [...futureProjects];
    if (activeTab === "top10") {
      list = list.filter((p) => p.ranking !== undefined);
    } else if (activeTab !== "all") {
      list = list.filter((p) => p.tier === activeTab);
    }
    return list;
  }, [activeTab]);

  // Sort projects
  const sortedProjects = useMemo(() => {
    const list = [...filteredProjects];
    if (!sortBy) return list;

    list.sort((a, b) => {
      let valA: number = 0;
      let valB: number = 0;

      if (sortBy === "ranking") {
        valA = a.ranking ?? 999;
        valB = b.ranking ?? 999;
      } else {
        valA = a.scores[sortBy] ?? 0;
        valB = b.scores[sortBy] ?? 0;
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [filteredProjects, sortBy, sortOrder]);

  const handleSort = (metric: keyof FutureProject["scores"] | "ranking") => {
    if (sortBy === metric) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(metric);
      setSortOrder(metric === "ranking" ? "asc" : "desc");
    }
  };

  const scoringLegend = [
    {
      score: "10",
      meaning: "Exceptional",
      color: "text-[var(--color-gold)] border-[var(--color-gold)]/30 bg-[var(--color-gold-faint)]",
    },
    {
      score: "9",
      meaning: "Excellent",
      color:
        "text-[var(--color-accent)] border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)]",
    },
    {
      score: "8",
      meaning: "Strong",
      color: "text-purple-400 border-purple-500/20 bg-purple-500/5",
    },
    {
      score: "7",
      meaning: "Good",
      color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
    },
    { score: "6", meaning: "Average", color: "text-slate-300 border-slate-500/20 bg-slate-500/5" },
    { score: "<6", meaning: "Niche", color: "text-slate-500 border-slate-500/10 bg-slate-500/5" },
  ];

  return (
    <section className="mt-24 border-t border-[var(--color-border)] pt-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-[var(--color-accent)]">
            Roadmap
          </span>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--color-ink)] mt-2">
            Future Architecture & platforms
          </h2>
          <p className="mt-2 text-sm text-[var(--color-body)] max-w-2xl">
            A strategic evaluation of potential portfolio expansions designed for maximum technical
            depth, leverage, and longevity.
          </p>
        </div>

        {/* Legend Panel */}
        <div className="flex flex-wrap gap-2 p-3 bg-white/[0.02] border border-white/5 rounded-xl max-w-sm">
          {scoringLegend.map((item) => (
            <div
              key={item.score}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[0.6875rem] font-mono border ${item.color}`}
            >
              <span className="font-bold">{item.score}</span>
              <span className="opacity-80">{item.meaning}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--color-border)] mb-8">
        {[
          { id: "top10", label: "🏆 Overall Top 10" },
          { id: "all", label: "All Candidates" },
          { id: "S", label: "S Tier — Foundation" },
          { id: "A+", label: "A+ Tier — Enterprise" },
          { id: "A", label: "A Tier — Dev & Systems" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id as any);
              if (tab.id === "top10") {
                setSortBy("ranking");
                setSortOrder("asc");
              } else {
                setSortBy(null);
              }
            }}
            className={`px-4 py-3 font-mono text-xs uppercase tracking-[0.1em] border-b-2 transition-all ${
              activeTab === tab.id
                ? "border-[var(--color-accent)] text-[var(--color-ink)] bg-white/[0.02]"
                : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-body)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active View */}
      {activeTab === "top10" ? (
        <div className="space-y-6">
          <div className="p-4 bg-[var(--color-gold-faint)] border border-[var(--color-gold)]/20 rounded-xl text-sm text-[var(--color-body)] leading-relaxed mb-6">
            <span className="font-bold text-[var(--color-gold)] font-mono mr-2">Core Insight:</span>
            The highest-scoring projects are{" "}
            <strong className="text-[var(--color-ink)]">platforms</strong> rather than applications.
            Platforms compound engineering skills, scale across multiple domains, and demonstrate
            architectural thinking—capabilities that remain exceptionally valuable as AI transforms
            software development.
          </div>

          <div className={HUB_CARD_GRID}>
            {sortedProjects.map((project, index) => (
              <ContentInteractiveCard
                key={project.id}
                index={index}
                color={
                  project.ranking !== undefined && project.ranking <= 2
                    ? "from-amber-500 to-orange-600"
                    : "from-indigo-500 to-purple-600"
                }
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`flex items-center justify-center w-8 h-8 rounded-lg font-mono font-bold text-sm shrink-0 ${
                      project.ranking !== undefined && project.ranking <= 2
                        ? "text-amber-300 bg-amber-500/15 border border-amber-400/30"
                        : project.ranking !== undefined && project.ranking <= 5
                          ? "text-indigo-300 bg-indigo-500/15 border border-indigo-400/30"
                          : "text-slate-300 bg-white/5 border border-white/10"
                    }`}
                  >
                    #{project.ranking}
                  </span>
                  <div>
                    <h3 className="font-display font-semibold text-[13px] text-white leading-snug">
                      {project.title}
                    </h3>
                    <p className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mt-1">
                      {project.category} · Tier {project.tier}
                    </p>
                  </div>
                </div>

                {project.description ? (
                  <p className="mt-3 text-[10px] leading-relaxed text-slate-400">
                    {project.description}
                  </p>
                ) : null}

                <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap gap-1.5">
                  {Object.entries(project.scores).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/5 text-[9px]"
                    >
                      <span className="font-mono text-slate-500 uppercase">
                        {METRIC_LABELS[key] || key}:
                      </span>
                      <span
                        className={`font-mono font-semibold ${
                          val === 10
                            ? "text-amber-300"
                            : val === 9
                              ? "text-indigo-300"
                              : "text-slate-300"
                        }`}
                      >
                        {val}
                      </span>
                    </div>
                  ))}
                </div>
              </ContentInteractiveCard>
            ))}
          </div>
        </div>
      ) : (
        /* Detailed Table / Grid view for other tabs */
        <div className="overflow-x-auto border border-[var(--color-border)] rounded-xl bg-white/[0.01] backdrop-blur-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-white/[0.02] text-xs font-mono text-[var(--color-ink-muted)] uppercase tracking-wider">
                <th className="p-4 font-semibold min-w-[200px]">Project Name</th>
                <th className="p-4 font-semibold text-center w-20">Tier</th>
                <th className="p-4 font-semibold text-center w-24">Rank</th>
                <th
                  className="p-4 font-semibold text-center cursor-pointer hover:text-[var(--color-accent)] transition-colors w-24"
                  onClick={() => handleSort("resume")}
                >
                  Resume {sortBy === "resume" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                </th>
                <th
                  className="p-4 font-semibold text-center cursor-pointer hover:text-[var(--color-accent)] transition-colors w-24"
                  onClick={() => handleSort("career")}
                >
                  Career {sortBy === "career" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                </th>
                <th
                  className="p-4 font-semibold text-center cursor-pointer hover:text-[var(--color-accent)] transition-colors w-24"
                  onClick={() => handleSort("money")}
                >
                  Money {sortBy === "money" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                </th>
                <th
                  className="p-4 font-semibold text-center cursor-pointer hover:text-[var(--color-accent)] transition-colors w-24"
                  onClick={() => handleSort("fun")}
                >
                  Fun {sortBy === "fun" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                </th>
                <th
                  className="p-4 font-semibold text-center cursor-pointer hover:text-[var(--color-accent)] transition-colors w-24"
                  onClick={() => handleSort("longevity")}
                >
                  Longevity {sortBy === "longevity" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                </th>
                <th className="p-4 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] text-sm">
              {sortedProjects.map((project) => {
                const isExpanded = expandedProjectId === project.id;
                return (
                  <path key={project.id} className="contents">
                    <tr
                      className={`hover:bg-white/[0.02] transition-colors cursor-pointer ${
                        isExpanded ? "bg-white/[0.02]" : ""
                      }`}
                      onClick={() => toggleExpand(project.id)}
                    >
                      <td className="p-4 font-medium text-[var(--color-ink)]">
                        <div className="flex flex-col">
                          <span>{project.title}</span>
                          <span className="text-[10px] font-mono text-[var(--color-ink-muted)] uppercase tracking-wider mt-0.5">
                            {project.category}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                            project.tier === "S"
                              ? "bg-[var(--color-gold-soft)] text-[var(--color-gold)] border border-[var(--color-gold)]/20"
                              : project.tier === "A+"
                                ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)] border border-[var(--color-accent)]/20"
                                : "bg-white/5 text-[var(--color-ink-muted)] border border-white/5"
                          }`}
                        >
                          {project.tier}
                        </span>
                      </td>
                      <td className="p-4 text-center font-mono text-xs">
                        {project.ranking ? (
                          <span className="text-[var(--color-accent)] font-semibold">
                            #{project.ranking}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="p-4 text-center font-mono font-semibold">
                        {project.scores.resume}
                      </td>
                      <td className="p-4 text-center font-mono font-semibold">
                        {project.scores.career}
                      </td>
                      <td className="p-4 text-center font-mono font-semibold">
                        {project.scores.money}
                      </td>
                      <td className="p-4 text-center font-mono font-semibold">
                        {project.scores.fun}
                      </td>
                      <td className="p-4 text-center font-mono font-semibold">
                        {project.scores.longevity}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          className="font-mono text-xs text-[var(--color-accent)] hover:underline"
                        >
                          {isExpanded ? "Collapse" : "Expand"}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td
                          colSpan={9}
                          className="p-6 bg-white/[0.015] border-t border-[var(--color-border)]"
                        >
                          <div className="max-w-4xl space-y-4">
                            {project.description ? (
                              <div>
                                <h4 className="font-mono text-xs text-[var(--color-ink-muted)] uppercase tracking-wider mb-1.5">
                                  Concept Description
                                </h4>
                                <p className="text-sm leading-relaxed text-[var(--color-body)]">
                                  {project.description}
                                </p>
                              </div>
                            ) : (
                              <p className="text-xs text-[var(--color-ink-muted)] italic">
                                Detailed writeup coming soon.
                              </p>
                            )}

                            <div>
                              <h4 className="font-mono text-xs text-[var(--color-ink-muted)] uppercase tracking-wider mb-2">
                                Extended Evaluations
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(project.scores).map(([key, val]) => (
                                  <div
                                    key={key}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.03] border border-white/5 text-xs"
                                  >
                                    <span className="font-mono text-[var(--color-ink-muted)] text-[10px] uppercase">
                                      {METRIC_LABELS[key] || key}:
                                    </span>
                                    <span
                                      className={`font-mono font-semibold ${
                                        val === 10
                                          ? "text-[var(--color-gold)]"
                                          : val === 9
                                            ? "text-[var(--color-accent)]"
                                            : "text-[var(--color-ink)]"
                                      }`}
                                    >
                                      {val}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </path>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
