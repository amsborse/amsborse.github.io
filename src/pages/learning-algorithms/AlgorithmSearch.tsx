import { useCallback, useState } from "react";
import { Seo } from "@/components/Seo";
import { LearningSandboxLayout, StatPill } from "@/components/learning/LearningSandboxLayout";

const DEFAULT_ARRAY = [3, 7, 11, 14, 18, 21, 25, 29, 33, 37, 41];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Mode = "binary" | "linear";

export default function AlgorithmSearch() {
  const [values] = useState(DEFAULT_ARRAY);
  const [target, setTarget] = useState(25);
  const [mode, setMode] = useState<Mode>("binary");
  const [low, setLow] = useState(0);
  const [high, setHigh] = useState(values.length - 1);
  const [mid, setMid] = useState(-1);
  const [linearIdx, setLinearIdx] = useState(-1);
  const [found, setFound] = useState<number | null>(null);
  const [comparisons, setComparisons] = useState(0);
  const [running, setRunning] = useState(false);

  const reset = useCallback(() => {
    setLow(0);
    setHigh(values.length - 1);
    setMid(-1);
    setLinearIdx(-1);
    setFound(null);
    setComparisons(0);
    setRunning(false);
  }, [values.length]);

  async function runSearch() {
    if (running) return;
    reset();
    setRunning(true);
    let comps = 0;

    if (mode === "linear") {
      for (let i = 0; i < values.length; i++) {
        setLinearIdx(i);
        comps++;
        setComparisons(comps);
        await sleep(450);
        if (values[i] === target) {
          setFound(i);
          setRunning(false);
          return;
        }
      }
      setFound(-1);
      setRunning(false);
      return;
    }

    let l = 0;
    let h = values.length - 1;
    while (l <= h) {
      const m = Math.floor((l + h) / 2);
      setLow(l);
      setHigh(h);
      setMid(m);
      comps++;
      setComparisons(comps);
      await sleep(550);
      if (values[m] === target) {
        setFound(m);
        setRunning(false);
        return;
      }
      if (values[m] < target) l = m + 1;
      else h = m - 1;
    }
    setFound(-1);
    setRunning(false);
  }

  function cellState(i: number) {
    if (found !== null && found === i) return "found";
    if (mode === "linear") {
      if (i === linearIdx) return "active";
      if (linearIdx > -1 && i < linearIdx) return "done";
      return "idle";
    }
    if (i === mid) return "active";
    if (i >= low && i <= high) return "range";
    return "idle";
  }

  const colors: Record<string, string> = {
    idle: "bg-white/10 border-white/10",
    range: "bg-sky-500/15 border-sky-500/30",
    active: "bg-sky-400/40 border-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.5)]",
    done: "bg-white/5 border-white/5 opacity-50",
    found: "bg-emerald-500/40 border-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.6)]",
  };

  return (
    <>
      <Seo title="Search Algorithms — Learning Lab" path="/learning/algorithm/search" />
      <LearningSandboxLayout
        title="Search Algorithms"
        subtitle="Linear & Binary Search"
        controls={
          <>
            <select
              value={mode}
              onChange={(e) => {
                setMode(e.target.value as Mode);
                reset();
              }}
              className="bg-[#0b0c13] border border-white/10 rounded-lg px-3 py-2 text-sm"
            >
              <option value="binary">Binary Search</option>
              <option value="linear">Linear Search</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-400">
              Target
              <input
                type="number"
                value={target}
                onChange={(e) => {
                  setTarget(Number(e.target.value));
                  reset();
                }}
                className="w-20 bg-[#0b0c13] border border-white/10 rounded-lg px-2 py-1 text-white"
              />
            </label>
            <button
              type="button"
              onClick={runSearch}
              disabled={running}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-600 text-white text-sm font-mono uppercase disabled:opacity-50"
            >
              Run
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
            <StatPill label="Comparisons" value={comparisons} />
            <StatPill label="Mode" value={mode === "binary" ? "Binary" : "Linear"} />
            <StatPill
              label="Result"
              value={found === null ? "—" : found >= 0 ? `Index ${found}` : "Not found"}
            />
            <StatPill label="Array size" value={values.length} />
          </>
        }
      >
        <div className="flex items-end justify-center gap-2 h-48">
          {values.map((v, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div
                className={`w-10 rounded-t-md border-2 transition-all duration-300 flex items-end justify-center pb-1 text-xs font-mono text-white ${colors[cellState(i)]}`}
                style={{ height: `${40 + v}px` }}
              >
                {v}
              </div>
              <span className="text-[9px] font-mono text-slate-600">{i}</span>
            </div>
          ))}
        </div>
        {mode === "binary" && found === null && (
          <p className="text-center text-xs font-mono text-slate-500 mt-6">
            Window: low={low} mid={mid >= 0 ? mid : "—"} high={high}
          </p>
        )}
      </LearningSandboxLayout>
    </>
  );
}
