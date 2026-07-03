import type { LearningCardTopic } from "@/components/learning/LearningInteractiveCard";
import {
  DPPortalVisual,
  GraphPortalVisual,
  GreedyPortalVisual,
  SearchPortalVisual,
  SortingPortalVisual,
  TreePortalVisual,
} from "@/components/learning/algorithmCategoryVisuals";

export const ALGORITHM_CATEGORIES: LearningCardTopic[] = [
  {
    id: "sorting",
    title: "Sorting Algorithms",
    description:
      "Full interactive lab for bubble, quick, merge, heap, radix, and more — with themes, telemetry, and spatial bar visualizations.",
    icon: "📊",
    path: "/algorithm",
    status: "active",
    tags: ["Comparison Sort", "O(n log n)", "In-place"],
    color: "from-indigo-500 to-purple-600",
    renderPortalVisual: SortingPortalVisual,
  },
  {
    id: "search",
    title: "Search Algorithms",
    description:
      "Step through linear and binary search on sorted arrays. Watch the probe window narrow and comparisons accumulate in real time.",
    icon: "🔍",
    path: "/learning/algorithm/search",
    status: "active",
    tags: ["Binary Search", "Linear Scan", "Sorted Arrays"],
    color: "from-sky-500 to-cyan-600",
    renderPortalVisual: SearchPortalVisual,
  },
  {
    id: "graph",
    title: "Graph Traversal",
    description:
      "Animate breadth-first search across a weighted grid. Nodes light up layer by layer as the frontier expands.",
    icon: "🕸️",
    path: "/learning/algorithm/graph",
    status: "active",
    tags: ["BFS", "Shortest Path", "Adjacency"],
    color: "from-emerald-500 to-teal-600",
    renderPortalVisual: GraphPortalVisual,
  },
  {
    id: "dp",
    title: "Dynamic Programming",
    description:
      "Fill a memoization table for coin-change DP. Trace optimal substructure as cells warm up from the base case.",
    icon: "🧩",
    path: "/learning/algorithm/dp",
    status: "active",
    tags: ["Memoization", "Tabulation", "Optimal Substructure"],
    color: "from-amber-500 to-orange-600",
    renderPortalVisual: DPPortalVisual,
  },
  {
    id: "greedy",
    title: "Greedy Algorithms",
    description:
      "Simulate the canonical coin-change greedy strategy. See which denominations get picked and when greedy fails.",
    icon: "🪙",
    path: "/learning/algorithm/greedy",
    status: "active",
    tags: ["Coin Change", "Local Optimum", "Exchange Argument"],
    color: "from-pink-500 to-rose-600",
    renderPortalVisual: GreedyPortalVisual,
  },
  {
    id: "trees",
    title: "Tree Structures",
    description:
      "Insert values into a binary search tree and watch nodes attach. Highlight the search path from root to target.",
    icon: "🌳",
    path: "/learning/algorithm/trees",
    status: "active",
    tags: ["BST", "Insert", "Lookup Path"],
    color: "from-violet-500 to-purple-600",
    renderPortalVisual: TreePortalVisual,
  },
];
