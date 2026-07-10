/**
 * Full sliding-window problem catalog organized by interview pattern.
 * Interactive visuals exist for entries with `implementedId` (see slidingWindowProblems.ts).
 */

export type CatalogTier = "easy" | "medium" | "classic" | "advanced" | "curated";

export interface CatalogProblem {
  id: string;
  title: string;
  tier?: CatalogTier;
  /** Links to SLIDING_WINDOW_PROBLEMS id when a visual lab exists */
  implementedId?: string;
}

export interface CatalogSubsection {
  label: string;
  problems: CatalogProblem[];
}

export interface CatalogCategory {
  id: string;
  number: number;
  title: string;
  description?: string;
  subsections: CatalogSubsection[];
}

export interface CuratedList {
  id: string;
  title: string;
  problems: CatalogProblem[];
}

export function catalogId(title: string): string {
  return title
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/≤/g, "lte")
    .replace(/≥/g, "gte")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function p(title: string, tier?: CatalogTier, implementedId?: string): CatalogProblem {
  return { id: catalogId(title), title, tier, implementedId };
}

/** Maps catalog titles to existing interactive lab problem ids */
const LIVE: Record<string, string> = {
  [catalogId("Maximum Sum Subarray of Size K")]: "max-sum-size-k",
  [catalogId("Maximum Average Subarray I")]: "max-average-subarray",
  [catalogId("Maximum Average Subarray")]: "max-average-subarray",
  [catalogId("Minimum Size Subarray Sum")]: "minimum-size-subarray-sum",
  [catalogId("Longest Substring Without Repeating Characters")]:
    "longest-substring-without-repeating",
  [catalogId("Longest Substring Without Repeat")]: "longest-substring-without-repeating",
  [catalogId("Fruit Into Baskets")]: "fruit-into-baskets",
  [catalogId("Max Consecutive Ones III")]: "max-consecutive-ones-iii",
  [catalogId("Longest Repeating Character Replacement")]: "longest-repeating-character-replacement",
  [catalogId("Find All Anagrams in a String")]: "find-all-anagrams",
  [catalogId("Find All Anagrams")]: "find-all-anagrams",
  [catalogId("Permutation in String")]: "permutation-in-string",
  [catalogId("Minimum Window Substring")]: "minimum-window-substring",
  [catalogId("Sliding Window Maximum")]: "sliding-window-maximum",
  [catalogId("Subarrays with K Different Integers")]: "subarrays-with-k-different-integers",
  [catalogId("Binary Subarrays With Sum")]: "binary-subarrays-with-sum",
  [catalogId("Count Number of Nice Subarrays")]: "nice-subarrays",
  [catalogId("Nice Subarrays")]: "nice-subarrays",
  [catalogId("Longest Continuous Subarray with Absolute Diff ≤ Limit")]:
    "longest-continuous-subarray-limit",
  [catalogId("Longest Continuous Subarray with Absolute Difference ≤ Limit")]:
    "longest-continuous-subarray-limit",
  [catalogId("Maximum Robots Within Budget")]: "maximum-robots-budget",
  [catalogId("Count Subarrays With Fixed Bounds")]: "count-subarrays-fixed-bounds",
  [catalogId("Frequency of the Most Frequent Element")]: "frequency-most-frequent-element",
  [catalogId("Take K of Each Character From Left and Right")]: "take-k-each-character",
  [catalogId("Count Complete Subarrays")]: "count-complete-subarrays",
};

function titles(tier: CatalogTier | undefined, ...names: string[]): CatalogProblem[] {
  return names.map((title) => p(title, tier, LIVE[catalogId(title)]));
}

export const SLIDING_WINDOW_CATALOG: CatalogCategory[] = [
  {
    id: "fixed-size",
    number: 0,
    title: "Fixed Size Sliding Window",
    description: "Window size k never changes.",
    subsections: [
      {
        label: "Easy",
        problems: titles(
          "easy",
          "Maximum Sum Subarray of Size K",
          "Average of Subarrays of Size K",
          "Find All Anagrams in a String",
          "Sliding Window Maximum",
          "Maximum Number of Vowels in a Substring of Given Length",
          "Defuse the Bomb",
          "K Radius Subarray Averages",
          "Grumpy Bookstore Owner",
          "Diet Plan Performance"
        ),
      },
      {
        label: "Medium",
        problems: titles(
          "medium",
          "Maximum Points You Can Obtain from Cards",
          "Maximum Erasure Value",
          "Maximum Average Subarray I",
          "Minimum Swaps to Group All 1's Together",
          "Number of Sub-arrays of Size K and Average ≥ Threshold",
          "Count Distinct Elements in Every Window",
          "First Negative Integer in Every Window",
          "Maximum Sum Circular Subarray (window variant)"
        ),
      },
    ],
  },
  {
    id: "variable-size",
    number: 1,
    title: "Variable Size Window",
    description: "Expand and shrink based on a condition.",
    subsections: [
      {
        label: "Classic",
        problems: titles(
          "classic",
          "Longest Substring Without Repeating Characters",
          "Longest Repeating Character Replacement",
          "Fruit Into Baskets",
          "Max Consecutive Ones III",
          "Minimum Size Subarray Sum",
          "Minimum Window Substring",
          "Permutation in String",
          "Find All Anagrams in a String",
          "Longest Substring with At Most K Distinct Characters",
          "Longest Substring with At Most Two Distinct Characters",
          "Longest Substring with Exactly K Distinct Characters",
          "Longest Nice Substring (variant)"
        ),
      },
    ],
  },
  {
    id: "at-most-k",
    number: 2,
    title: "At Most K Distinct",
    description: "A very common interview family.",
    subsections: [
      {
        label: "Problems",
        problems: titles(
          "classic",
          "Fruit Into Baskets",
          "Longest Substring with At Most K Distinct Characters",
          "Longest Substring with At Most Two Distinct Characters",
          "Subarrays with K Different Integers (AtMost(K)-AtMost(K−1))",
          "Count Complete Subarrays",
          "Count Nice Subarrays"
        ),
      },
    ],
  },
  {
    id: "exactly-k",
    number: 3,
    title: "Exactly K",
    description: "Usually solved by Exactly(K) = AtMost(K) − AtMost(K−1).",
    subsections: [
      {
        label: "Problems",
        problems: titles(
          "classic",
          "Subarrays with K Different Integers",
          "Nice Subarrays",
          "Binary Subarrays With Sum",
          "Count Number of Nice Subarrays",
          "Count Complete Subarrays",
          "Number of Substrings Containing All Three Characters"
        ),
      },
    ],
  },
  {
    id: "frequency-count",
    number: 4,
    title: "Frequency Count Window",
    description: "Maintain character frequencies.",
    subsections: [
      {
        label: "Problems",
        problems: titles(
          "classic",
          "Minimum Window Substring",
          "Find All Anagrams",
          "Permutation in String",
          "Longest Repeating Character Replacement",
          "Replace the Substring for Balanced String",
          "Smallest Window Containing All Characters",
          "Shortest Beautiful Substring",
          "Rearrange String K Distance Apart (window concept)"
        ),
      },
    ],
  },
  {
    id: "sum-based",
    number: 5,
    title: "Sum Based Window",
    description: "Maintain running sum.",
    subsections: [
      {
        label: "Problems",
        problems: titles(
          "classic",
          "Minimum Size Subarray Sum",
          "Maximum Sum Subarray",
          "Maximum Average Subarray",
          "Diet Plan Performance",
          "Grumpy Bookstore Owner",
          "K Radius Average",
          "Number of Subarrays With Product Less Than K",
          "Maximum Erasure Value"
        ),
      },
    ],
  },
  {
    id: "product-window",
    number: 6,
    title: "Product Window",
    description: "Product instead of sum.",
    subsections: [
      {
        label: "Problems",
        problems: titles(
          "medium",
          "Subarray Product Less Than K",
          "Maximum Product Subarray (not pure window but related)",
          "Continuous Subarray Product"
        ),
      },
    ],
  },
  {
    id: "count-valid",
    number: 7,
    title: "Count Valid Windows",
    description: "Count windows instead of finding longest.",
    subsections: [
      {
        label: "Problems",
        problems: titles(
          "medium",
          "Binary Subarrays With Sum",
          "Count Number of Nice Subarrays",
          "Subarrays with K Different Integers",
          "Count Complete Subarrays",
          "Number of Substrings Containing All Three Characters",
          "Count Vowel Substrings",
          "Count Subarrays Where Max Element Appears at Least K Times"
        ),
      },
    ],
  },
  {
    id: "longest-window",
    number: 8,
    title: "Longest Window",
    description: "Optimize maximum length.",
    subsections: [
      {
        label: "Problems",
        problems: titles(
          "classic",
          "Longest Substring Without Repeating Characters",
          "Longest Repeating Character Replacement",
          "Max Consecutive Ones III",
          "Fruit Into Baskets",
          "Longest Ones After Deleting One Element",
          "Longest Continuous Subarray with Absolute Diff ≤ Limit",
          "Longest Subarray of 1's After Deleting One Element"
        ),
      },
    ],
  },
  {
    id: "shortest-window",
    number: 9,
    title: "Shortest Window",
    description: "Minimize window length.",
    subsections: [
      {
        label: "Problems",
        problems: titles(
          "classic",
          "Minimum Window Substring",
          "Minimum Size Subarray Sum",
          "Shortest Subarray with Sum at Least K (deque optimization)",
          "Smallest Distinct Window",
          "Smallest Window Containing Pattern"
        ),
      },
    ],
  },
  {
    id: "monotonic-queue",
    number: 10,
    title: "Sliding Window + Monotonic Queue",
    description: "Maintain max/min efficiently.",
    subsections: [
      {
        label: "Problems",
        problems: titles(
          "medium",
          "Sliding Window Maximum",
          "Sliding Window Minimum",
          "Longest Continuous Subarray With Absolute Diff ≤ Limit",
          "Constrained Subsequence Sum",
          "Shortest Subarray with Sum at Least K",
          "Jump Game VI"
        ),
      },
    ],
  },
  {
    id: "hashmap-window",
    number: 11,
    title: "Window + HashMap",
    description: "Maintain frequencies in a map.",
    subsections: [
      {
        label: "Problems",
        problems: titles(
          "classic",
          "Longest Substring Without Repeating Characters",
          "Minimum Window Substring",
          "Find All Anagrams",
          "Permutation in String",
          "Fruit Into Baskets",
          "Longest Repeating Character Replacement",
          "Subarrays with K Different Integers"
        ),
      },
    ],
  },
  {
    id: "hashset-window",
    number: 12,
    title: "Window + HashSet",
    subsections: [
      {
        label: "Problems",
        problems: titles(
          "medium",
          "Longest Substring Without Repeating Characters",
          "Maximum Erasure Value",
          "Longest Nice Subarray",
          "Distinct Subarray"
        ),
      },
    ],
  },
  {
    id: "binary-array",
    number: 13,
    title: "Binary Array Windows",
    subsections: [
      {
        label: "Problems",
        problems: titles(
          "medium",
          "Max Consecutive Ones III",
          "Longest Ones After Delete One Element",
          "Binary Subarrays With Sum",
          "Minimum Swaps to Group All 1's Together",
          "Minimum Swaps II",
          "Count Number of Nice Subarrays"
        ),
      },
    ],
  },
  {
    id: "string-windows",
    number: 14,
    title: "String Windows",
    description: "Most common interview topic.",
    subsections: [
      {
        label: "Problems",
        problems: titles(
          "classic",
          "Minimum Window Substring",
          "Find All Anagrams",
          "Permutation in String",
          "Longest Substring Without Repeat",
          "Longest Repeating Character Replacement",
          "Longest Substring with K Distinct",
          "Longest Substring with Two Distinct",
          "Smallest Distinct Window",
          "Number of Substrings Containing All Three Characters",
          "Count Vowel Substrings",
          "Count Complete Substrings"
        ),
      },
    ],
  },
  {
    id: "array-windows",
    number: 15,
    title: "Array Windows",
    subsections: [
      {
        label: "Problems",
        problems: titles(
          "medium",
          "Maximum Sum Subarray",
          "Minimum Size Subarray Sum",
          "Fruit Into Baskets",
          "Maximum Erasure Value",
          "Sliding Window Maximum",
          "Grumpy Bookstore Owner",
          "Maximum Points From Cards",
          "Max Consecutive Ones III",
          "Longest Continuous Subarray",
          "Minimum Swaps Together",
          "Number of Nice Subarrays"
        ),
      },
    ],
  },
  {
    id: "circular",
    number: 16,
    title: "Circular Sliding Window",
    subsections: [
      {
        label: "Problems",
        problems: titles(
          "medium",
          "Defuse the Bomb",
          "Maximum Points from Cards",
          "Circular Subarray Maximum",
          "Minimum Swaps to Group All 1's II"
        ),
      },
    ],
  },
  {
    id: "deque-based",
    number: 17,
    title: "Deque-Based Window",
    subsections: [
      {
        label: "Problems",
        problems: titles(
          "medium",
          "Sliding Window Maximum",
          "Sliding Window Minimum",
          "Longest Continuous Subarray with Absolute Difference ≤ Limit",
          "Jump Game VI",
          "Shortest Subarray with Sum ≥ K"
        ),
      },
    ],
  },
  {
    id: "prefix-hybrid",
    number: 18,
    title: "Prefix Sum + Sliding Window Hybrid",
    subsections: [
      {
        label: "Problems",
        problems: titles(
          "advanced",
          "Binary Subarrays With Sum",
          "Count Nice Subarrays",
          "Continuous Subarray Sum",
          "Subarray Sum Equals K (not pure sliding window because negatives are allowed)",
          "Shortest Subarray with Sum At Least K"
        ),
      },
    ],
  },
  {
    id: "advanced",
    number: 19,
    title: "Advanced Variants",
    subsections: [
      {
        label: "Problems",
        problems: titles(
          "advanced",
          "Longest Turbulent Subarray",
          "Replace the Substring for Balanced String",
          "Shortest Beautiful Substring",
          "Number of Wonderful Substrings",
          "Longest Equal Subarray",
          "Count Complete Subarrays",
          "Maximum Robots Within Budget",
          "Frequency of the Most Frequent Element",
          "Take K of Each Character From Left and Right",
          "Count Subarrays Where Score < K",
          "Count Subarrays With Fixed Bounds",
          "Minimum Operations to Reduce X to Zero (complement window)"
        ),
      },
    ],
  },
];

export const SLIDING_WINDOW_CURATED_LISTS: CuratedList[] = [
  {
    id: "blind-75",
    title: "Blind 75 Sliding Window",
    problems: titles(
      "curated",
      "Best Time to Buy and Sell Stock",
      "Longest Substring Without Repeating Characters",
      "Longest Repeating Character Replacement",
      "Permutation in String",
      "Minimum Window Substring"
    ),
  },
  {
    id: "neetcode-150",
    title: "NeetCode 150",
    problems: titles(
      "curated",
      "Best Time to Buy/Sell Stock",
      "Longest Substring Without Repeating Characters",
      "Longest Repeating Character Replacement",
      "Permutation in String",
      "Minimum Window Substring",
      "Sliding Window Maximum"
    ),
  },
  {
    id: "leetcode-top",
    title: "LeetCode Top Interview",
    problems: titles(
      "curated",
      "Longest Substring Without Repeating Characters",
      "Minimum Window Substring",
      "Sliding Window Maximum",
      "Longest Repeating Character Replacement",
      "Permutation in String",
      "Find All Anagrams in a String",
      "Fruit Into Baskets",
      "Max Consecutive Ones III",
      "Minimum Size Subarray Sum",
      "Subarrays with K Different Integers",
      "Binary Subarrays With Sum",
      "Subarray Product Less Than K"
    ),
  },
  {
    id: "learning-order",
    title: "Recommended Learning Order",
    problems: [
      p("Maximum Sum Subarray of Size K", "easy", "max-sum-size-k"),
      p("Maximum Average Subarray", "easy", "max-average-subarray"),
      p("Minimum Size Subarray Sum", "classic", "minimum-size-subarray-sum"),
      p(
        "Longest Substring Without Repeating Characters",
        "classic",
        "longest-substring-without-repeating"
      ),
      p("Fruit Into Baskets", "classic", "fruit-into-baskets"),
      p("Max Consecutive Ones III", "classic", "max-consecutive-ones-iii"),
      p(
        "Longest Repeating Character Replacement",
        "classic",
        "longest-repeating-character-replacement"
      ),
      p("Find All Anagrams", "classic", "find-all-anagrams"),
      p("Permutation in String", "classic", "permutation-in-string"),
      p("Minimum Window Substring", "classic", "minimum-window-substring"),
      p("Sliding Window Maximum", "medium", "sliding-window-maximum"),
      p("Subarrays with K Different Integers", "medium", "subarrays-with-k-different-integers"),
      p("Binary Subarrays With Sum", "medium", "binary-subarrays-with-sum"),
      p("Count Number of Nice Subarrays", "medium", "nice-subarrays"),
      p(
        "Longest Continuous Subarray with Absolute Difference ≤ Limit",
        "advanced",
        "longest-continuous-subarray-limit"
      ),
      p("Maximum Robots Within Budget", "advanced", "maximum-robots-budget"),
      p("Count Subarrays With Fixed Bounds", "advanced", "count-subarrays-fixed-bounds"),
      p("Frequency of the Most Frequent Element", "advanced", "frequency-most-frequent-element"),
      p("Take K of Each Character From Left and Right", "advanced", "take-k-each-character"),
      p("Count Complete Subarrays", "advanced", "count-complete-subarrays"),
    ],
  },
];

/** Unique problems across all categories (for vote totals / search) */
export function getAllCatalogProblems(): CatalogProblem[] {
  const byId = new Map<string, CatalogProblem>();
  for (const category of SLIDING_WINDOW_CATALOG) {
    for (const subsection of category.subsections) {
      for (const problem of subsection.problems) {
        if (!byId.has(problem.id)) byId.set(problem.id, problem);
      }
    }
  }
  for (const list of SLIDING_WINDOW_CURATED_LISTS) {
    for (const problem of list.problems) {
      if (!byId.has(problem.id)) byId.set(problem.id, problem);
    }
  }
  return [...byId.values()].sort((a, b) => a.title.localeCompare(b.title));
}

export function countCatalogProblems(): { total: number; live: number; roadmap: number } {
  const all = getAllCatalogProblems();
  const live = all.filter((item) => item.implementedId).length;
  return { total: all.length, live, roadmap: all.length - live };
}
