import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SLIDING_WINDOW_CATALOG,
  SLIDING_WINDOW_CURATED_LISTS,
  countCatalogProblems,
  type CatalogProblem,
  type CatalogCategory,
} from "@/data/slidingWindowCatalog";
import { useSlidingWindowVotes } from "@/hooks/useSlidingWindowVotes";

const TIER_STYLES: Record<string, string> = {
  easy: "border-emerald-300/25 bg-emerald-400/[0.08] text-emerald-200",
  medium: "border-amber-300/25 bg-amber-400/[0.08] text-amber-200",
  classic: "border-cyan-300/25 bg-cyan-400/[0.08] text-cyan-200",
  advanced: "border-violet-300/25 bg-violet-400/[0.08] text-violet-200",
  curated: "border-rose-300/25 bg-rose-400/[0.08] text-rose-200",
};

function VoteButton({
  problemId,
  count,
  voted,
  onToggle,
}: {
  problemId: string;
  count: number;
  voted: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(problemId)}
      aria-pressed={voted}
      aria-label={voted ? "Remove vote" : "Vote to prioritize this problem"}
      className={`inline-flex h-7 min-w-[52px] items-center justify-center gap-1 rounded-md border px-2 font-mono text-[9px] font-bold transition ${
        voted
          ? "border-cyan-300/50 bg-cyan-400/[0.14] text-cyan-100"
          : "border-white/[0.1] bg-white/[0.03] text-slate-400 hover:border-cyan-300/35 hover:text-cyan-100"
      }`}
    >
      <span aria-hidden>{voted ? "▲" : "△"}</span>
      <span>{count}</span>
    </button>
  );
}

function ProblemRow({
  problem,
  voteCount,
  voted,
  onVote,
  onOpenLive,
}: {
  problem: CatalogProblem;
  voteCount: number;
  voted: boolean;
  onVote: (id: string) => void;
  onOpenLive?: (implementedId: string) => void;
}) {
  const isLive = Boolean(problem.implementedId);

  return (
    <div
      className={`flex items-center gap-2 rounded-md border px-2 py-2 ${
        isLive
          ? "border-emerald-300/20 bg-emerald-400/[0.04]"
          : "border-white/[0.06] bg-white/[0.02]"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {isLive ? (
            <button
              type="button"
              onClick={() => problem.implementedId && onOpenLive?.(problem.implementedId)}
              className="text-left text-xs font-semibold text-emerald-100 underline decoration-emerald-300/40 underline-offset-2 transition hover:text-white"
            >
              {problem.title}
            </button>
          ) : (
            <span className="text-xs font-medium text-slate-300">{problem.title}</span>
          )}
          {isLive ? (
            <span className="rounded-full border border-emerald-300/30 bg-emerald-400/[0.1] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-emerald-200">
              Live
            </span>
          ) : (
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-slate-500">
              Coming soon
            </span>
          )}
          {problem.tier ? (
            <span
              className={`rounded-full border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] ${TIER_STYLES[problem.tier] ?? TIER_STYLES.classic}`}
            >
              {problem.tier}
            </span>
          ) : null}
        </div>
      </div>
      <VoteButton problemId={problem.id} count={voteCount} voted={voted} onToggle={onVote} />
    </div>
  );
}

function CategoryAccordion({
  category,
  expanded,
  onToggle,
  getVoteCount,
  hasVoted,
  onVote,
  onOpenLive,
}: {
  category: CatalogCategory;
  expanded: boolean;
  onToggle: () => void;
  getVoteCount: (id: string) => number;
  hasVoted: (id: string) => boolean;
  onVote: (id: string) => void;
  onOpenLive?: (id: string) => void;
}) {
  const problemCount = category.subsections.reduce((sum, s) => sum + s.problems.length, 0);
  const liveCount = category.subsections.reduce(
    (sum, s) => sum + s.problems.filter((p) => p.implementedId).length,
    0
  );

  return (
    <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#030816]/50">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-white/[0.03]"
      >
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-cyan-200/55">
            Pattern {category.number}
          </p>
          <h3 className="mt-0.5 text-sm font-semibold text-white">{category.title}</h3>
          {category.description ? (
            <p className="mt-1 text-xs leading-5 text-slate-400">{category.description}</p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-[9px] text-slate-500">
            {liveCount}/{problemCount} live
          </p>
          <p className="mt-1 font-mono text-lg text-slate-300">{expanded ? "−" : "+"}</p>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-white/[0.06] px-3 py-3">
              {category.subsections.map((subsection) => (
                <div key={subsection.label}>
                  <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">
                    {subsection.label}
                  </p>
                  <div className="space-y-1">
                    {subsection.problems.map((problem) => (
                      <ProblemRow
                        key={`${category.id}-${problem.id}`}
                        problem={problem}
                        voteCount={getVoteCount(problem.id)}
                        voted={hasVoted(problem.id)}
                        onVote={onVote}
                        onOpenLive={onOpenLive}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function SlidingWindowCatalog({
  onOpenLive,
}: {
  onOpenLive?: (implementedId: string) => void;
}) {
  const { getVoteCount, hasVoted, toggleVote, topVotedIds, totalVotes } = useSlidingWindowVotes();
  const stats = countCatalogProblems();
  const [expandedId, setExpandedId] = useState<string | null>(
    SLIDING_WINDOW_CATALOG[0]?.id ?? null
  );
  const [filter, setFilter] = useState<"all" | "roadmap" | "live">("all");
  const [query, setQuery] = useState("");

  const topProblems = useMemo(() => {
    const ids = topVotedIds(8);
    const all = SLIDING_WINDOW_CATALOG.flatMap((c) => c.subsections.flatMap((s) => s.problems));
    return ids
      .map((id) => all.find((p) => p.id === id))
      .filter((p): p is CatalogProblem => Boolean(p));
  }, [topVotedIds]);

  const normalizedQuery = query.trim().toLowerCase();

  const matchesFilter = (problem: CatalogProblem) => {
    if (filter === "live" && !problem.implementedId) return false;
    if (filter === "roadmap" && problem.implementedId) return false;
    if (normalizedQuery && !problem.title.toLowerCase().includes(normalizedQuery)) return false;
    return true;
  };

  return (
    <section className="mt-8 space-y-4">
      <div className="rounded-lg border border-white/[0.08] bg-[#030816]/66 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.28)] backdrop-blur-md">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-cyan-200/60">
              Implementation roadmap
            </p>
            <h2 className="mt-1 font-display text-xl font-black text-white">
              Full Sliding Window Catalog
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Hundreds of interview problems organized by pattern. Vote for what to build next —
              votes are stored locally in your browser. Only{" "}
              <span className="text-emerald-200">{stats.live} live labs</span> are interactive
              today; the rest are coming soon.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2">
              <p className="font-mono text-[8px] uppercase text-slate-500">Total</p>
              <p className="font-display text-lg font-black text-white">{stats.total}</p>
            </div>
            <div className="rounded-md border border-emerald-300/20 bg-emerald-400/[0.06] px-3 py-2">
              <p className="font-mono text-[8px] uppercase text-emerald-200/70">Live</p>
              <p className="font-display text-lg font-black text-emerald-100">{stats.live}</p>
            </div>
            <div className="rounded-md border border-amber-300/20 bg-amber-400/[0.06] px-3 py-2">
              <p className="font-mono text-[8px] uppercase text-amber-200/70">Votes</p>
              <p className="font-display text-lg font-black text-amber-100">{totalVotes}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(["all", "live", "roadmap"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full border px-3 py-1 font-mono text-[9px] uppercase tracking-[0.1em] transition ${
                filter === value
                  ? "border-cyan-300/45 bg-cyan-400/[0.12] text-cyan-100"
                  : "border-white/[0.08] bg-white/[0.025] text-slate-400 hover:text-white"
              }`}
            >
              {value}
            </button>
          ))}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search problems…"
            className="ml-auto h-8 min-w-[180px] rounded-md border border-white/[0.08] bg-black/30 px-3 font-mono text-[11px] text-slate-200 placeholder:text-slate-600 focus:border-cyan-300/35 focus:outline-none"
          />
        </div>

        {topProblems.length > 0 ? (
          <div className="mt-4 rounded-md border border-cyan-300/15 bg-cyan-400/[0.04] px-3 py-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-cyan-200/70">
              Community priorities (local votes)
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {topProblems.map((problem) => (
                <span
                  key={problem.id}
                  className="rounded-full border border-white/[0.08] bg-black/25 px-2 py-1 text-[10px] text-slate-200"
                >
                  {problem.title}{" "}
                  <span className="font-mono text-cyan-200">{getVoteCount(problem.id)}</span>
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {SLIDING_WINDOW_CURATED_LISTS.map((list) => (
          <div
            key={list.id}
            className="rounded-lg border border-white/[0.08] bg-[#06101d]/72 p-3 backdrop-blur-md"
          >
            <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-200">
              {list.title}
            </h3>
            <div className="mt-2 space-y-1">
              {list.problems.filter(matchesFilter).map((problem) => (
                <ProblemRow
                  key={`${list.id}-${problem.id}`}
                  problem={problem}
                  voteCount={getVoteCount(problem.id)}
                  voted={hasVoted(problem.id)}
                  onVote={toggleVote}
                  onOpenLive={onOpenLive}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {SLIDING_WINDOW_CATALOG.map((category) => {
          const filteredSubsections = category.subsections
            .map((subsection) => ({
              ...subsection,
              problems: subsection.problems.filter(matchesFilter),
            }))
            .filter((subsection) => subsection.problems.length > 0);

          if (filteredSubsections.length === 0) return null;

          return (
            <CategoryAccordion
              key={category.id}
              category={{ ...category, subsections: filteredSubsections }}
              expanded={expandedId === category.id}
              onToggle={() =>
                setExpandedId((current) => (current === category.id ? null : category.id))
              }
              getVoteCount={getVoteCount}
              hasVoted={hasVoted}
              onVote={toggleVote}
              onOpenLive={onOpenLive}
            />
          );
        })}
      </div>
    </section>
  );
}
