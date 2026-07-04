export interface CodingPattern {
  id: string;
  title: string;
  description: string;
  timeComplexity: string;
  spaceComplexity: string;
  useCase: string;
  icon: string;
  tags: string[];
  color: string;
  path?: string;
}

export const CODING_PATTERNS: CodingPattern[] = [
  {
    id: "sliding-window",
    title: "Sliding Window",
    description:
      "Tracks a subset of elements in an array or string that expands or shrinks based on conditions. Avoids nested O(N²) scans.",
    timeComplexity: "O(N)",
    spaceComplexity: "O(1) / O(K)",
    useCase: "Subarrays, substrings, contiguous elements, target sums.",
    icon: "🪟",
    tags: ["Array", "String", "Two Pointer"],
    color: "from-blue-500 to-cyan-500",
    path: "/learning/coding-patterns/sliding-window",
  },
  {
    id: "two-pointers",
    title: "Two Pointers",
    description:
      "Two references move toward each other or in lockstep to solve search and comparison problems on sorted collections.",
    timeComplexity: "O(N)",
    spaceComplexity: "O(1)",
    useCase: "Sorted arrays, pairs, duplicates, reversing arrays.",
    icon: "👉👈",
    tags: ["Array", "Search", "Optimization"],
    color: "from-teal-500 to-emerald-500",
  },
  {
    id: "fast-slow-pointers",
    title: "Fast & Slow Pointers",
    description:
      "Pointers move at different speeds (1x and 2x) to find cycles, middle elements, or loop starts in linked structures.",
    timeComplexity: "O(N)",
    spaceComplexity: "O(1)",
    useCase: "Linked lists, cyclic structures, loop detection.",
    icon: "🐢🐇",
    tags: ["Linked List", "Floyd's Tortoise & Hare"],
    color: "from-indigo-500 to-violet-500",
  },
  {
    id: "overlapping-intervals",
    title: "Merge Intervals",
    description:
      "Handles overlapping segments by sorting on start time and merging or intersecting contiguous items.",
    timeComplexity: "O(N log N)",
    spaceComplexity: "O(N)",
    useCase: "Scheduling, calendar events, interval overlaps.",
    icon: "⏳",
    tags: ["Sorting", "Array", "Scheduling"],
    color: "from-amber-500 to-orange-500",
  },
  {
    id: "cyclic-sort",
    title: "Cyclic Sort",
    description:
      "Places numbers in correct index positions in-place. Efficient for arrays with values in a defined range [1, N].",
    timeComplexity: "O(N)",
    spaceComplexity: "O(1)",
    useCase: "Range arrays, duplicate detection, missing numbers.",
    icon: "🔄",
    tags: ["Array", "Sorting", "In-place"],
    color: "from-pink-500 to-rose-500",
  },
  {
    id: "in-place-linkedlist-reversal",
    title: "In-place Reversal of LinkedList",
    description: "Inverts pointer direction in-place without extra nodes or heap allocations.",
    timeComplexity: "O(N)",
    spaceComplexity: "O(1)",
    useCase: "Reversing nodes, group reversals, list manipulation.",
    icon: "🔗",
    tags: ["Linked List", "Pointer Manipulation"],
    color: "from-indigo-600 to-purple-600",
  },
  {
    id: "tree-bfs",
    title: "Tree Breadth First Search",
    description:
      "Explores nodes level-by-level with a queue. Finds shortest paths first in unweighted trees and graphs.",
    timeComplexity: "O(N)",
    spaceComplexity: "O(N)",
    useCase: "Level order traversals, shortest paths.",
    icon: "🌳",
    tags: ["Tree", "Queue", "BFS"],
    color: "from-cyan-500 to-blue-500",
  },
  {
    id: "tree-dfs",
    title: "Tree Depth First Search",
    description:
      "Explores root-to-leaf paths recursively before backtracking. Essential for deep tree path analysis.",
    timeComplexity: "O(N)",
    spaceComplexity: "O(N)",
    useCase: "Leaf paths, path validation, sum calculations.",
    icon: "🌲",
    tags: ["Tree", "Recursion", "DFS"],
    color: "from-emerald-500 to-teal-500",
  },
  {
    id: "two-heaps",
    title: "Two Heaps",
    description:
      "Min-heap and max-heap partitions track the median of a stream in O(1) after insertions.",
    timeComplexity: "O(log N)",
    spaceComplexity: "O(N)",
    useCase: "Real-time median, stream processing, priority scheduling.",
    icon: "⚖️",
    tags: ["Heap", "Priority Queue", "Stream"],
    color: "from-purple-500 to-pink-500",
  },
  {
    id: "subsets",
    title: "Subsets (Backtracking)",
    description:
      "Explores permutations and combinations by incrementally building the solution space.",
    timeComplexity: "O(2^N) / O(N!)",
    spaceComplexity: "O(2^N) / O(N!)",
    useCase: "Combinations, permutations, powersets.",
    icon: "🗂️",
    tags: ["Backtracking", "Recursion", "Combinatorics"],
    color: "from-amber-600 to-orange-600",
  },
  {
    id: "modified-binary-search",
    title: "Modified Binary Search",
    description: "Binary search variants on sorted, rotated, or boundary-heavy arrays.",
    timeComplexity: "O(log N)",
    spaceComplexity: "O(1)",
    useCase: "Sorted arrays, rotated arrays, boundary searches.",
    icon: "🔍",
    tags: ["Search", "Divide & Conquer"],
    color: "from-blue-600 to-indigo-600",
  },
  {
    id: "top-k-elements",
    title: "Top 'K' Elements",
    description: "Heap keeps the largest or smallest K items without sorting the entire array.",
    timeComplexity: "O(N log K)",
    spaceComplexity: "O(K)",
    useCase: "Largest, smallest, or most frequent K elements.",
    icon: "🏆",
    tags: ["Heap", "Priority Queue"],
    color: "from-yellow-500 to-amber-600",
  },
  {
    id: "k-way-merge",
    title: "K-way Merge",
    description:
      "Merges multiple sorted streams using a min-heap to track the smallest head among lists.",
    timeComplexity: "O(N log K)",
    spaceComplexity: "O(K)",
    useCase: "Merging sorted lists, sorted matrices.",
    icon: "🔀",
    tags: ["Heap", "Sorting", "Multi-pointer"],
    color: "from-orange-500 to-rose-500",
  },
  {
    id: "topological-sort",
    title: "Topological Sort (Graph)",
    description: "Linear ordering of a DAG respecting dependency flows via in-degree tracking.",
    timeComplexity: "O(V + E)",
    spaceComplexity: "O(V + E)",
    useCase: "Task scheduling, dependency resolution.",
    icon: "🕸️",
    tags: ["Graph", "BFS", "Degree Mapping"],
    color: "from-purple-600 to-violet-600",
  },
  {
    id: "knapsack-dp",
    title: "Knapsack (Dynamic Programming)",
    description:
      "Memoized tables solve capacity-bound optimization without exponential redundancy.",
    timeComplexity: "O(N * C)",
    spaceComplexity: "O(N * C) / O(C)",
    useCase: "Optimization, subset sums, capacity planning.",
    icon: "🎒",
    tags: ["Dynamic Programming", "Memoization"],
    color: "from-emerald-600 to-green-600",
  },
];
