import { useCallback, useState } from "react";
import { Seo } from "@/components/Seo";
import { LearningSandboxLayout, StatPill } from "@/components/learning/LearningSandboxLayout";

const US_COINS = [25, 10, 5, 1];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function AlgorithmGreedy() {
  const [amount, setAmount] = useState(63);
  const [picked, setPicked] = useState<number[]>([]);
  const [highlightCoin, setHighlightCoin] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(amount);
  const [running, setRunning] = useState(false);

  const reset = useCallback(() => {
    setPicked([]);
    setHighlightCoin(null);
    setRemaining(amount);
    setRunning(false);
  }, [amount]);

  async function runGreedy() {
    if (running) return;
    reset();
    setRunning(true);
    let left = amount;
    const result: number[] = [];

    for (const coin of US_COINS) {
      setHighlightCoin(coin);
      await sleep(500);
      while (left >= coin) {
        result.push(coin);
        left -= coin;
        setPicked([...result]);
        setRemaining(left);
        await sleep(350);
      }
    }
    setHighlightCoin(null);
    setRunning(false);
  }

  return (
    <>
      <Seo title="Greedy Algorithms — Learning Lab" path="/learning/algorithm/greedy" />
      <LearningSandboxLayout
        title="Greedy Coin Change"
        subtitle="Greedy Algorithms"
        controls={
          <>
            <label className="flex items-center gap-2 text-sm text-slate-400">
              Amount (¢)
              <input
                type="number"
                min={1}
                max={99}
                value={amount}
                onChange={(e) => {
                  setAmount(Number(e.target.value));
                  reset();
                }}
                className="w-16 bg-[#0b0c13] border border-white/10 rounded-lg px-2 py-1 text-white"
              />
            </label>
            <button
              type="button"
              onClick={runGreedy}
              disabled={running}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-rose-600 text-white text-sm font-mono uppercase disabled:opacity-50"
            >
              Run Greedy
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
            <StatPill label="Coins used" value={picked.length || "—"} />
            <StatPill label="Remaining" value={remaining} />
            <StatPill label="Denominations" value={US_COINS.join(", ")} />
            <StatPill label="Solution" value={picked.length ? picked.join(" + ") : "—"} />
          </>
        }
      >
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {US_COINS.map((coin) => (
            <div
              key={coin}
              className={`w-16 h-16 rounded-full border-2 flex items-center justify-center font-mono text-white transition-all duration-300 ${
                highlightCoin === coin
                  ? "bg-pink-500/50 border-pink-300 scale-110 shadow-[0_0_16px_rgba(236,72,153,0.5)]"
                  : "bg-white/10 border-white/20"
              }`}
            >
              {coin}¢
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 justify-center min-h-[48px]">
          {picked.map((c, i) => (
            <span
              key={`${c}-${i}`}
              className="w-10 h-10 rounded-full bg-pink-500/30 border border-pink-400/50 flex items-center justify-center text-xs font-mono text-white"
            >
              {c}
            </span>
          ))}
        </div>
      </LearningSandboxLayout>
    </>
  );
}
