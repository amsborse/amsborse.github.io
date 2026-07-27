import type { LearningCardTopic } from "@/components/learning/LearningInteractiveCard";

export const FLASHCARD_DECK_TOPICS: LearningCardTopic[] = [
  {
    id: "coding-challenge",
    title: "Coding Challenge",
    description:
      "Algorithm and data-structure flashcards for quick revision — flip through prompts, trace solutions, and revisit concepts before interviews.",
    icon: "🃏",
    path: "/learning/flashcards/coding-challenge",
    status: "active",
    tags: ["Flashcards", "Algorithms", "Interview Prep"],
    color: "from-cyan-500 to-blue-600",
    ctaLabel: "Open Deck",
    renderPortalVisual: () => (
      <svg className="h-full w-full p-4" viewBox="0 0 200 200" fill="none">
        <defs>
          <linearGradient id="flashcardGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <filter id="flashcardBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        <ellipse
          cx="100"
          cy="108"
          rx="62"
          ry="18"
          fill="rgba(56, 189, 248, 0.12)"
          filter="url(#flashcardBlur)"
        />

        <g transform="translate(58, 44) rotate(-8)">
          <rect
            x="0"
            y="0"
            width="84"
            height="108"
            rx="10"
            fill="#111827"
            stroke="rgba(99, 102, 241, 0.35)"
            strokeWidth="1.5"
          />
          <rect x="10" y="14" width="36" height="4" rx="2" fill="rgba(148, 163, 184, 0.35)" />
          <rect x="10" y="24" width="58" height="3" rx="1.5" fill="rgba(148, 163, 184, 0.2)" />
          <rect x="10" y="32" width="48" height="3" rx="1.5" fill="rgba(148, 163, 184, 0.16)" />
        </g>

        <g transform="translate(72, 36) rotate(6)">
          <rect
            x="0"
            y="0"
            width="84"
            height="108"
            rx="10"
            fill="#0d111c"
            stroke="url(#flashcardGlow)"
            strokeWidth="2"
          />
          <rect
            x="0"
            y="0"
            width="84"
            height="3"
            rx="10"
            fill="url(#flashcardGlow)"
            opacity="0.9"
          />
          <text x="12" y="24" fill="#38bdf8" fontSize="7" fontFamily="monospace">
            QUESTION
          </text>
          <rect x="12" y="32" width="52" height="4" rx="2" fill="rgba(56, 189, 248, 0.55)" />
          <rect x="12" y="42" width="40" height="3" rx="1.5" fill="rgba(148, 163, 184, 0.25)" />
          <rect x="12" y="50" width="46" height="3" rx="1.5" fill="rgba(148, 163, 184, 0.18)" />
          <text x="12" y="88" fill="#fbbf24" fontSize="7" fontFamily="monospace">
            TAP TO FLIP
          </text>
          <path
            d="M 58 84 L 68 84 L 63 78 Z"
            fill="#fbbf24"
            opacity="0.85"
            transform="rotate(180 63 84)"
          />
        </g>
      </svg>
    ),
  },
  {
    id: "system-design",
    title: "System Design",
    description:
      "Flashcards for load balancing, caching, consistency, and architecture trade-offs — review system design patterns before interviews.",
    icon: "🏗️",
    path: "/learning/flashcards/system-design",
    status: "active",
    tags: ["Flashcards", "System Design", "Architecture"],
    color: "from-amber-500 to-orange-600",
    ctaLabel: "Open Deck",
    renderPortalVisual: () => (
      <svg className="h-full w-full p-4" viewBox="0 0 200 200" fill="none">
        <defs>
          <linearGradient id="sysDesignGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
        <ellipse cx="100" cy="118" rx="58" ry="16" fill="rgba(251, 191, 36, 0.1)" />
        <rect
          x="78"
          y="36"
          width="44"
          height="28"
          rx="6"
          fill="#111827"
          stroke="url(#sysDesignGlow)"
          strokeWidth="1.5"
        />
        <text x="100" y="54" fill="#fbbf24" fontSize="8" textAnchor="middle" fontFamily="monospace">
          API
        </text>
        <line
          x1="100"
          y1="64"
          x2="100"
          y2="78"
          stroke="rgba(251, 191, 36, 0.5)"
          strokeWidth="1.5"
        />
        <rect
          x="44"
          y="78"
          width="36"
          height="24"
          rx="5"
          fill="#0d111c"
          stroke="rgba(249, 115, 22, 0.45)"
        />
        <rect
          x="120"
          y="78"
          width="36"
          height="24"
          rx="5"
          fill="#0d111c"
          stroke="rgba(249, 115, 22, 0.45)"
        />
        <line
          x1="62"
          y1="102"
          x2="62"
          y2="118"
          stroke="rgba(251, 191, 36, 0.35)"
          strokeWidth="1.5"
        />
        <line
          x1="138"
          y1="102"
          x2="138"
          y2="118"
          stroke="rgba(251, 191, 36, 0.35)"
          strokeWidth="1.5"
        />
        <rect
          x="38"
          y="118"
          width="48"
          height="22"
          rx="5"
          fill="#111827"
          stroke="rgba(148, 163, 184, 0.25)"
        />
        <rect
          x="114"
          y="118"
          width="48"
          height="22"
          rx="5"
          fill="#111827"
          stroke="rgba(148, 163, 184, 0.25)"
        />
        <circle cx="62" cy="129" r="3" fill="#f97316" />
        <circle cx="138" cy="129" r="3" fill="#f97316" />
        <text
          x="100"
          y="162"
          fill="#94a3b8"
          fontSize="7"
          textAnchor="middle"
          fontFamily="monospace"
        >
          SCALE · CACHE · SHARD
        </text>
      </svg>
    ),
  },
  {
    id: "sanskrit",
    title: "Sanskrit",
    description:
      "Sanskrit vocabulary, grammar, and verse flashcards — flip through terms, meanings, and recitation prompts.",
    icon: "🕉️",
    path: "/learning/flashcards/sanskrit",
    status: "active",
    tags: ["Flashcards", "Sanskrit", "Language"],
    color: "from-violet-500 to-fuchsia-600",
    ctaLabel: "Open Deck",
    renderPortalVisual: () => (
      <svg className="h-full w-full p-4" viewBox="0 0 200 200" fill="none">
        <defs>
          <linearGradient id="sanskritGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#e879f9" />
          </linearGradient>
        </defs>
        <ellipse cx="100" cy="112" rx="56" ry="16" fill="rgba(167, 139, 250, 0.12)" />
        <g transform="translate(72, 38) rotate(4)">
          <rect
            x="0"
            y="0"
            width="84"
            height="108"
            rx="10"
            fill="#0d111c"
            stroke="url(#sanskritGlow)"
            strokeWidth="2"
          />
          <text x="42" y="52" fill="#c4b5fd" fontSize="22" textAnchor="middle" fontFamily="serif">
            ॐ
          </text>
          <text x="42" y="78" fill="#e879f9" fontSize="11" textAnchor="middle" fontFamily="serif">
            शब्द
          </text>
          <rect x="14" y="88" width="56" height="3" rx="1.5" fill="rgba(167, 139, 250, 0.35)" />
          <rect x="20" y="96" width="44" height="3" rx="1.5" fill="rgba(148, 163, 184, 0.2)" />
        </g>
        <text
          x="100"
          y="168"
          fill="#94a3b8"
          fontSize="7"
          textAnchor="middle"
          fontFamily="monospace"
        >
          VOCAB · GRAMMAR · VERSE
        </text>
      </svg>
    ),
  },
];

export function getFlashcardDeckTopic(id: string) {
  return FLASHCARD_DECK_TOPICS.find((topic) => topic.id === id);
}
