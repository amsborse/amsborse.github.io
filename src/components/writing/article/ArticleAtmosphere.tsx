import { useEffect, useState } from "react";

export function ArticleAtmosphere({ theme, focused }: { theme?: string; focused: boolean }) {
  const [visible, setVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return (
    <div
      className={`article-atmosphere${theme ? ` article-atmosphere--${theme}` : ""}`}
      data-live={visible && !focused}
      data-focused={focused}
      aria-hidden="true"
    >
      <svg viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice" fill="none">
        {theme === "consciousness" || theme === "growth" ? (
          <g className="article-atmosphere__drift" fill="currentColor">
            {[
              [92, 120],
              [280, 690],
              [1030, 240],
              [1080, 760],
              [180, 420],
              [920, 520],
              [720, 100],
              [450, 810],
            ].map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r={theme === "growth" ? 2.5 : 1.5} />
            ))}
          </g>
        ) : theme === "self-awareness" ? (
          <g className="article-atmosphere__drift">
            {[180, 250, 330, 420].map((r) => (
              <circle key={r} cx="960" cy="450" r={r} />
            ))}
          </g>
        ) : theme === "philosophy" ? (
          <ellipse className="article-atmosphere__orbit" cx="600" cy="450" rx="540" ry="280" />
        ) : theme === "invisible-patterns" ? (
          <path
            className="article-atmosphere__drift"
            d="M-50 680C250 60 980 110 1040 480S350 840 400 460 1120 160 1260 590"
          />
        ) : theme === "engineering" ? (
          <g>
            {Array.from({ length: 13 }, (_, i) => (
              <path key={i} d={`M${i * 100} 0V900M0 ${i * 100}H1200`} />
            ))}
          </g>
        ) : null}
      </svg>
      {theme === "emotions" ? <div className="article-atmosphere__tide" /> : null}
    </div>
  );
}
