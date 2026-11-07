export type IconName =
  | "plan"
  | "act"
  | "observe"
  | "home"
  | "discover"
  | "memory"
  | "report"
  | "artha"
  | "sun"
  | "moon"
  | "arrow"
  | "pause"
  | "play";

/** Small local line icons: no font, image request or icon library. */
export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, string> = {
    plan: "M4 5h16v16H4Z M8 2v6 M16 2v6 M4 10h16 M8 14h3 M8 18h7",
    act: "m13 2-9 12h7l-1 8 10-13h-7Z",
    observe: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
    home: "m3 11 9-8 9 8 M5 10v11h5v-7h4v7h5V10",
    discover: "M20 12a8 8 0 1 1-8-8 6 6 0 1 1-6 6 4 4 0 1 1 4 4 2 2 0 1 1 2-2",
    memory: "M12 21V5 M12 7C8 2 3 4 3 4v14s5-1 9 3c4-4 9-3 9-3V4s-5-2-9 3",
    report: "M5 3h10l4 4v14H5Z M14 3v5h5 M8 12h8 M8 16h6",
    // Artha: a coin around a rising market line.
    artha: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M8 14.5l2.6-2.6 2 2L16 9.5 M8 6.5h2 M14 6.5h2",
    sun: "M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5 19 19 M5 19l1.5-1.5 M17.5 6.5 19 5 M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0",
    moon: "M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11",
    arrow: "M4 12h16 M14 6l6 6-6 6",
    pause: "M8 5v14 M16 5v14",
    play: "m8 4 12 8-12 8Z",
  };
  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
