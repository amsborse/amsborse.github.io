import { useCallback, useState } from "react";
import { Seo } from "@/components/Seo";
import { LearningSandboxLayout, StatPill } from "@/components/learning/LearningSandboxLayout";

const COINS = [1, 5, 10, 25];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function AlgorithmDP() {
  const [amount, setAmount] = useState(11);
  const [table, setTable] = useState<number[]>([]);
  const [highlight, setHighlight] = useState(-1);
  const [coinsUsed, setCoinsUsed] = useState<number[]>([]);
  const [running, setRunning] = useState(false);

  const reset = useCallback(() => {
    setTable([]);
    setHighlight(-1);
    setCoinsUsed([]);
    setRunning(false);
  }, []);

  async function runDp() {
    if (running) return;
    reset();
    setRunning(true);

    const dp = Array(amount + 1).fill(Infinity);
    dp[0] = 0;
    const used: number[][] = Array.from({ length: amount + 1 }, () => []);

    for (let i = 1; i <= amount; i++) {
      setHighlight(i);
      for (const coin of COINS) {
        if (coin <= i && dp[i - coin] + 1 < dp[i]) {
          dp[i] = dp[i - coin] + 1;
          used[i] = [...used[i - coin], coin];
        }
      }
      setTable([...dp]);
      await sleep(350);
    }

    setCoinsUsed(used[amount] ?? []);
    setRunning(false);
  }

  function cellColor(i: number) {
    if (highlight === i) return "bg-amber-400/40 border-amber-300";
    if (table[i] !== undefined && table[i] < Infinity) return "bg-amber-500/15 border-amber-500/25";
    return "bg-white/5 border-white/10";
  }

  return (
    <>
      <Seo title="Dynamic Programming — Learning Lab" path="/learning/algorithm/dp" />
      <LearningSandboxLayout
        title="Coin Change (DP)"
        subtitle="Dynamic Programming"
        controls={
          <>
            <label className="flex items-center gap-2 text-sm text-slate-400">
              Amount
              <input
                type="number"
                min={1}
                max={30}
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
              onClick={runDp}
              disabled={running}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-mono uppercase disabled:opacity-50"
            >
              Fill Table
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
            <StatPill
              label="Min coins"
              value={table[amount] === Infinity ? "—" : (table[amount] ?? "—")}
            />
            <StatPill label="Denominations" value={COINS.join(", ")} />
            <StatPill label="Solution" value={coinsUsed.length ? coinsUsed.join(" + ") : "—"} />
            <StatPill label="Cells" value={amount + 1} />
          </>
        }
      >
        <div className="flex flex-wrap gap-2 justify-center">
          {Array.from({ length: amount + 1 }, (_, i) => (
            <div
              key={i}
              className={`w-14 h-14 rounded-lg border flex flex-col items-center justify-center transition-all duration-300 ${cellColor(i)}`}
            >
              <span className="text-[9px] font-mono text-slate-500">${i}</span>
              <span className="text-sm font-semibold text-white">
                {table[i] === undefined ? "·" : table[i] === Infinity ? "∞" : table[i]}
              </span>
            </div>
          ))}
        </div>
      </LearningSandboxLayout>
    </>
  );
}
