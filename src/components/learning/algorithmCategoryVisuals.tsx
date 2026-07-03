/** SVG portal previews for algorithm category cards on the Learning Algorithm hub. */

export function SortingPortalVisual() {
  return (
    <svg className="w-full h-full p-4" viewBox="0 0 200 200" fill="none">
      <g transform="translate(10, 30)">
        <path
          d="M 0 100 L 90 55 L 180 100 L 90 145 Z"
          fill="rgba(99, 102, 241, 0.05)"
          stroke="rgba(99, 102, 241, 0.2)"
          strokeWidth="1"
        />
        {[
          [30, 70, 20],
          [60, 50, 45],
          [90, 60, 30],
          [120, 80, 10],
        ].map(([x, y, h], i) => (
          <g key={i} transform={`translate(${x}, ${y})`}>
            <path d="M 0 0 L 10 -5 L 20 0 L 10 5 Z" fill="#8b5cf6" />
            <path d={`M 0 0 L 10 5 L 10 ${5 + h} L 0 ${h}`} fill="rgba(139, 92, 246, 0.85)" />
            <path d={`M 10 5 L 20 0 L 20 ${h} L 10 ${5 + h}`} fill="rgba(139, 92, 246, 0.55)" />
          </g>
        ))}
      </g>
    </svg>
  );
}

export function SearchPortalVisual() {
  return (
    <svg className="w-full h-full p-4" viewBox="0 0 200 200" fill="none">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect
          key={i}
          x={30 + i * 22}
          y={i === 3 ? 70 : 90}
          width="16"
          height={i === 3 ? 50 : 30}
          rx="2"
          fill={i === 3 ? "#38bdf8" : "rgba(56, 189, 248, 0.25)"}
          stroke={i === 3 ? "#7dd3fc" : "rgba(56, 189, 248, 0.4)"}
          strokeWidth="1"
        />
      ))}
      <circle
        cx="155"
        cy="85"
        r="18"
        stroke="#38bdf8"
        strokeWidth="2"
        fill="rgba(56,189,248,0.1)"
      />
      <line
        x1="168"
        y1="98"
        x2="182"
        y2="112"
        stroke="#38bdf8"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function GraphPortalVisual() {
  return (
    <svg className="w-full h-full p-4" viewBox="0 0 200 200" fill="none">
      <path
        d="M 50 100 L 100 50 L 150 100 M 100 50 L 100 150 M 50 100 L 100 150 M 150 100 L 100 150"
        stroke="rgba(52, 211, 153, 0.35)"
        strokeWidth="1.5"
      />
      {[
        [50, 100],
        [100, 50],
        [150, 100],
        [100, 150],
      ].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="10" fill="#0d0e15" stroke="#34d399" strokeWidth="2" />
          {i === 0 && (
            <circle
              cx={cx}
              cy={cy}
              r="16"
              stroke="#34d399"
              strokeWidth="1"
              opacity="0.4"
              className="animate-ping"
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            />
          )}
        </g>
      ))}
    </svg>
  );
}

export function DPPortalVisual() {
  return (
    <svg className="w-full h-full p-4" viewBox="0 0 200 200" fill="none">
      {Array.from({ length: 25 }, (_, i) => {
        const col = i % 5;
        const row = Math.floor(i / 5);
        const hot = i === 12 || i === 17 || i === 18;
        return (
          <rect
            key={i}
            x={40 + col * 26}
            y={50 + row * 26}
            width="22"
            height="22"
            rx="3"
            fill={hot ? "rgba(251, 191, 36, 0.35)" : "rgba(251, 191, 36, 0.08)"}
            stroke={hot ? "#fbbf24" : "rgba(251, 191, 36, 0.2)"}
            strokeWidth="1"
          />
        );
      })}
      <path
        d="M 53 63 L 79 89 L 105 115 L 131 89"
        stroke="#fbbf24"
        strokeWidth="2"
        fill="none"
        strokeDasharray="4 3"
      />
    </svg>
  );
}

export function GreedyPortalVisual() {
  return (
    <svg className="w-full h-full p-4" viewBox="0 0 200 200" fill="none">
      {(
        [
          { cx: 60, cy: 120, r: 28, fill: "#f472b6" },
          { cx: 100, cy: 100, r: 36, fill: "#ec4899" },
          { cx: 140, cy: 115, r: 24, fill: "#db2777" },
        ] as const
      ).map(({ cx, cy, r, fill }, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={fill} opacity="0.85" />
      ))}
      <text x="92" y="108" fill="white" fontSize="14" fontFamily="monospace">
        ¢
      </text>
    </svg>
  );
}

export function TreePortalVisual() {
  return (
    <svg className="w-full h-full p-4" viewBox="0 0 200 200" fill="none">
      <line x1="100" y1="55" x2="65" y2="95" stroke="rgba(167, 139, 250, 0.5)" strokeWidth="2" />
      <line x1="100" y1="55" x2="135" y2="95" stroke="rgba(167, 139, 250, 0.5)" strokeWidth="2" />
      <line x1="65" y1="95" x2="45" y2="135" stroke="rgba(167, 139, 250, 0.4)" strokeWidth="1.5" />
      <line x1="65" y1="95" x2="85" y2="135" stroke="rgba(167, 139, 250, 0.4)" strokeWidth="1.5" />
      <line
        x1="135"
        y1="95"
        x2="115"
        y2="135"
        stroke="rgba(167, 139, 250, 0.4)"
        strokeWidth="1.5"
      />
      <line
        x1="135"
        y1="95"
        x2="155"
        y2="135"
        stroke="rgba(167, 139, 250, 0.4)"
        strokeWidth="1.5"
      />
      {[
        [100, 55],
        [65, 95],
        [135, 95],
        [45, 135],
        [85, 135],
        [115, 135],
        [155, 135],
      ].map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={i === 0 ? 12 : 9}
          fill="#0d0e15"
          stroke="#a78bfa"
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}
