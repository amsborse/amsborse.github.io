import { useCallback, useState } from "react";
import { Seo } from "@/components/Seo";
import { LearningSandboxLayout, StatPill } from "@/components/learning/LearningSandboxLayout";

const ROWS = 5;
const COLS = 7;
const START = [0, 0] as const;
const GOAL = [4, 6] as const;
const WALLS = new Set(["1,2", "2,2", "3,2", "3,3", "1,4", "2,4"]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Cell = { r: number; c: number; dist: number };

export default function AlgorithmGraph() {
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [frontier, setFrontier] = useState<Set<string>>(new Set());
  const [path, setPath] = useState<Set<string>>(new Set());
  const [steps, setSteps] = useState(0);
  const [running, setRunning] = useState(false);

  const reset = useCallback(() => {
    setVisited(new Set());
    setFrontier(new Set());
    setPath(new Set());
    setSteps(0);
    setRunning(false);
  }, []);

  async function runBfs() {
    if (running) return;
    reset();
    setRunning(true);

    const key = (r: number, c: number) => `${r},${c}`;
    const parent = new Map<string, string>();
    const queue: Cell[] = [{ r: START[0], c: START[1], dist: 0 }];
    const seen = new Set<string>([key(START[0], START[1])]);
    let step = 0;

    while (queue.length > 0) {
      const { r, c, dist } = queue.shift()!;
      step++;
      setSteps(step);

      const layer = new Set<string>();
      const currentKey = key(r, c);
      setVisited((prev) => new Set([...prev, currentKey]));
      setFrontier(new Set([currentKey]));
      await sleep(400);

      if (r === GOAL[0] && c === GOAL[1]) {
        const trail = new Set<string>();
        let cur: string | undefined = currentKey;
        while (cur) {
          trail.add(cur);
          cur = parent.get(cur);
        }
        setPath(trail);
        setFrontier(new Set());
        setRunning(false);
        return;
      }

      const dirs = [
        [0, 1],
        [1, 0],
        [0, -1],
        [-1, 0],
      ];
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        const nk = key(nr, nc);
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || WALLS.has(nk) || seen.has(nk)) continue;
        seen.add(nk);
        parent.set(nk, currentKey);
        queue.push({ r: nr, c: nc, dist: dist + 1 });
        layer.add(nk);
      }
      if (layer.size > 0) {
        setFrontier(layer);
        await sleep(300);
      }
    }
    setRunning(false);
  }

  function cellClass(r: number, c: number) {
    const k = `${r},${c}`;
    if (r === START[0] && c === START[1]) return "bg-emerald-500/50 border-emerald-400";
    if (r === GOAL[0] && c === GOAL[1]) return "bg-amber-500/50 border-amber-400";
    if (WALLS.has(k)) return "bg-slate-800 border-slate-700";
    if (path.has(k)) return "bg-emerald-400/30 border-emerald-300";
    if (frontier.has(k))
      return "bg-cyan-400/40 border-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.4)]";
    if (visited.has(k)) return "bg-emerald-500/15 border-emerald-500/30";
    return "bg-white/5 border-white/10";
  }

  return (
    <>
      <Seo title="Graph Traversal — Learning Lab" path="/learning/algorithm/graph" />
      <LearningSandboxLayout
        title="Breadth-First Search"
        subtitle="Graph Traversal"
        controls={
          <>
            <button
              type="button"
              onClick={runBfs}
              disabled={running}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-mono uppercase disabled:opacity-50"
            >
              Run BFS
            </button>
            <button
              type="button"
              onClick={reset}
              className="px-4 py-2 rounded-lg border border-white/10 text-sm font-mono text-slate-400"
            >
              Reset
            </button>
          </>
        }
        stats={
          <>
            <StatPill label="Steps" value={steps} />
            <StatPill label="Visited" value={visited.size} />
            <StatPill label="Path length" value={path.size || "—"} />
            <StatPill label="Grid" value={`${ROWS}×${COLS}`} />
          </>
        }
      >
        <div
          className="grid gap-1.5 mx-auto max-w-md"
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: ROWS * COLS }, (_, i) => {
            const r = Math.floor(i / COLS);
            const c = i % COLS;
            return (
              <div
                key={i}
                className={`aspect-square rounded-md border transition-all duration-300 ${cellClass(r, c)}`}
              />
            );
          })}
        </div>
      </LearningSandboxLayout>
    </>
  );
}
