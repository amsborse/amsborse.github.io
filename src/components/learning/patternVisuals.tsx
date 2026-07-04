const GRADIENT_IDS: Record<string, string> = {
  "sliding-window": "pwBlue",
  "two-pointers": "pwTeal",
  "fast-slow-pointers": "pwIndigo",
  "overlapping-intervals": "pwAmber",
  "cyclic-sort": "pwPink",
  "in-place-linkedlist-reversal": "pwPurple",
  "tree-bfs": "pwCyan",
  "tree-dfs": "pwEmerald",
  "two-heaps": "pwViolet",
  subsets: "pwOrange",
  "modified-binary-search": "pwBlueDeep",
  "top-k-elements": "pwGold",
  "k-way-merge": "pwRose",
  "topological-sort": "pwVioletDeep",
  "knapsack-dp": "pwGreen",
};

export function PatternPortalVisual({
  patternId,
  color: _color,
}: {
  patternId: string;
  color: string;
}) {
  const grad = GRADIENT_IDS[patternId] ?? "pwDefault";

  return (
    <svg className="w-full h-full p-4" viewBox="0 0 200 200" fill="none" aria-hidden>
      {patternId === "sliding-window" && (
        <g transform="translate(20, 70)">
          {[0, 1, 2, 3, 4].map((i) => (
            <rect
              key={i}
              x={i * 32}
              y={0}
              width={24}
              height={32}
              rx={4}
              fill={i >= 1 && i <= 3 ? `url(#${grad})` : "rgba(255,255,255,0.06)"}
              stroke={i >= 1 && i <= 3 ? "#38bdf8" : "rgba(255,255,255,0.1)"}
              strokeWidth={1}
            />
          ))}
          <rect
            x={32}
            y={-8}
            width={96}
            height={48}
            rx={6}
            stroke="#22d3ee"
            strokeWidth={1.5}
            fill="none"
            opacity={0.6}
          />
        </g>
      )}

      {patternId === "two-pointers" && (
        <g transform="translate(30, 85)">
          <line x1={0} y1={20} x2={140} y2={20} stroke="rgba(255,255,255,0.15)" strokeWidth={2} />
          {[20, 50, 80, 110, 140].map((x) => (
            <circle
              key={x}
              cx={x}
              cy={20}
              r={6}
              fill="rgba(255,255,255,0.08)"
              stroke="rgba(255,255,255,0.2)"
            />
          ))}
          <polygon points="20,8 28,20 20,32 12,20" fill="#34d399" />
          <polygon points="140,8 148,20 140,32 132,20" fill="#34d399" />
        </g>
      )}

      {patternId === "fast-slow-pointers" && (
        <g transform="translate(50, 60)">
          <ellipse
            cx={50}
            cy={40}
            rx={45}
            ry={30}
            stroke="rgba(167,139,250,0.35)"
            strokeWidth={1.5}
            fill="none"
          />
          <circle cx={95} cy={40} r={8} fill="#a78bfa" />
          <circle cx={55} cy={40} r={8} fill="#6366f1" />
          <text x={42} y={44} fill="white" fontSize={10} fontFamily="monospace">
            1x / 2x
          </text>
        </g>
      )}

      {patternId === "tree-bfs" && (
        <g transform="translate(70, 50)">
          <circle cx={30} cy={10} r={8} fill={`url(#${grad})`} />
          <circle cx={10} cy={50} r={7} fill="rgba(56,189,248,0.5)" />
          <circle cx={50} cy={50} r={7} fill="rgba(56,189,248,0.5)" />
          <circle cx={30} cy={90} r={6} fill="rgba(56,189,248,0.35)" />
          <line x1={30} y1={18} x2={10} y2={43} stroke="rgba(56,189,248,0.3)" />
          <line x1={30} y1={18} x2={50} y2={43} stroke="rgba(56,189,248,0.3)" />
          <line x1={10} y1={57} x2={30} y2={84} stroke="rgba(56,189,248,0.3)" />
        </g>
      )}

      {patternId === "topological-sort" && (
        <g transform="translate(40, 60)">
          {[
            [20, 0],
            [80, 0],
            [50, 50],
            [110, 50],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={10} fill={`url(#${grad})`} opacity={0.7 + i * 0.08} />
          ))}
          <path
            d="M 30 0 L 70 0 L 50 40"
            stroke="rgba(167,139,250,0.4)"
            strokeWidth={1.5}
            fill="none"
          />
          <path d="M 90 0 L 100 40" stroke="rgba(167,139,250,0.4)" strokeWidth={1.5} fill="none" />
        </g>
      )}

      {![
        "sliding-window",
        "two-pointers",
        "fast-slow-pointers",
        "tree-bfs",
        "topological-sort",
      ].includes(patternId) && (
        <g transform="translate(35, 55)">
          <rect
            x={0}
            y={0}
            width={130}
            height={90}
            rx={10}
            fill="#07080d"
            stroke="rgba(56,189,248,0.2)"
          />
          {[0, 1, 2, 3].map((row) => (
            <rect
              key={row}
              x={16}
              y={18 + row * 18}
              width={60 + row * 18}
              height={6}
              rx={3}
              fill={`url(#${grad})`}
              opacity={0.5 + row * 0.12}
            />
          ))}
        </g>
      )}

      <defs>
        <linearGradient id="pwBlue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="pwTeal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        <linearGradient id="pwIndigo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="pwAmber" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
        <linearGradient id="pwPink" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#fb7185" />
        </linearGradient>
        <linearGradient id="pwPurple" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="pwCyan" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="pwEmerald" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
        <linearGradient id="pwViolet" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id="pwOrange" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id="pwBlueDeep" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
        <linearGradient id="pwGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="pwRose" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
        <linearGradient id="pwVioletDeep" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="pwGreen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
        <linearGradient id="pwDefault" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>
    </svg>
  );
}
