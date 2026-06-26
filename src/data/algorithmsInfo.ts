export type AlgorithmInfo = {
  id: string;
  name: string;
  inventor: string;
  year: string;
  story: string;
  complexities: {
    best: string;
    average: string;
    worst: string;
    space: string;
  };
  useCases: string[];
};

export const algorithmsData: Record<string, AlgorithmInfo> = {
  bubble: {
    id: "bubble",
    name: "Bubble Sort",
    inventor: "Unknown / Folklore",
    year: "1956",
    story: "Bubble Sort's exact origins are lost to the mists of early computing folklore, but it was first analyzed in 1956. It gets its name from the way larger elements 'bubble' to the top of the list like carbonation in a soda. While it is famously inefficient, it remains one of the most widely taught algorithms because it introduces the fundamental concept of comparing and swapping adjacent elements in an intuitive, physical way.",
    complexities: {
      best: "O(n)",
      average: "O(n²)",
      worst: "O(n²)",
      space: "O(1)"
    },
    useCases: [
      "Educational introductions to algorithms",
      "Computer graphics (detecting almost-sorted arrays like polygon lists)",
      "Systems with severely limited memory"
    ]
  },
  selection: {
    id: "selection",
    name: "Selection Sort",
    inventor: "Oscar Barnes",
    year: "1950s",
    story: "Selection Sort is one of the most intuitive human ways to sort: look through all the items, find the absolute smallest one, and put it at the very beginning. Then repeat for the rest. While it makes an abysmal number of comparisons, it makes the absolute minimum possible number of swaps (n-1). This made it uniquely valuable in early electro-mechanical computers where 'writing' to memory (swapping) was mechanically expensive.",
    complexities: {
      best: "O(n²)",
      average: "O(n²)",
      worst: "O(n²)",
      space: "O(1)"
    },
    useCases: [
      "Situations where writing to memory is significantly more expensive than reading",
      "Flash memory optimization (reducing write cycles)",
      "Checking if an array is already sorted in minimal memory"
    ]
  },
  quick: {
    id: "quick",
    name: "Quick Sort",
    inventor: "Tony Hoare",
    year: "1959",
    story: "British computer scientist Tony Hoare invented Quicksort while a visiting student at Moscow State University. He was working on a machine translation project and needed to sort words in Russian sentences to look them up in a dictionary. He initially thought of Merge Sort but couldn't figure out how to do it without extra memory. In a stroke of genius, he conceived the 'Partition' logic, creating what would become one of the most dominant sorting algorithms of the next 60 years.",
    complexities: {
      best: "O(n log n)",
      average: "O(n log n)",
      worst: "O(n²)",
      space: "O(log n)"
    },
    useCases: [
      "Default sorting algorithm in many languages (e.g., C++ std::sort, Java Arrays.sort for primitives)",
      "Commercial computing and high-performance databases",
      "Information retrieval and search engines"
    ]
  },
  insertion: {
    id: "insertion",
    name: "Insertion Sort",
    inventor: "John Mauchly",
    year: "1946",
    story: "Insertion Sort is the algorithm almost every human naturally uses when sorting a hand of playing cards. John Mauchly, co-creator of the ENIAC (one of the first general-purpose electronic computers), formalized this logic in 1946. It elegantly maintains a 'sorted sub-list' and inserts new items into their correct physical place one by one.",
    complexities: {
      best: "O(n)",
      average: "O(n²)",
      worst: "O(n²)",
      space: "O(1)"
    },
    useCases: [
      "Sorting very small datasets efficiently",
      "Used as the base case for advanced hybrid algorithms like Timsort (used in Python) and Introsort",
      "Sorting data that is continuously streaming in live"
    ]
  },
  merge: {
    id: "merge",
    name: "Merge Sort",
    inventor: "John von Neumann",
    year: "1945",
    story: "Merge sort was invented by the legendary mathematician John von Neumann while working on the EDVAC, one of the earliest electronic computers. Von Neumann wrote a legendary 23-page sorting program in ink. Merge sort was revolutionary because it guaranteed a worst-case time of O(n log n) by mathematically dividing the problem into sub-problems, sorting them, and 'merging' them back together. It laid the foundation for the Divide and Conquer paradigm.",
    complexities: {
      best: "O(n log n)",
      average: "O(n log n)",
      worst: "O(n log n)",
      space: "O(n)"
    },
    useCases: [
      "Sorting linked lists (requires O(1) extra space for lists)",
      "External sorting (sorting massive files that don't fit in RAM)",
      "Highly parallel processing environments"
    ]
  },
  heap: {
    id: "heap",
    name: "Heap Sort",
    inventor: "J. W. J. Williams",
    year: "1964",
    story: "J.W.J. Williams invented Heap Sort as an improvement to Selection Sort, while simultaneously inventing the 'binary heap' data structure in the process! By organizing the unsorted region of the array into a mathematical tree structure (a heap) right inside the array itself, he figured out how to find the 'largest' element instantly without scanning the whole list. It was a masterpiece of in-place memory management.",
    complexities: {
      best: "O(n log n)",
      average: "O(n log n)",
      worst: "O(n log n)",
      space: "O(1)"
    },
    useCases: [
      "Systems with strict memory limits (embedded systems) requiring guaranteed O(n log n) performance",
      "Linux Kernel routing tables",
      "Priority Queues scheduling tasks in operating systems"
    ]
  },
  shell: {
    id: "shell",
    name: "Shell Sort",
    inventor: "Donald Shell",
    year: "1959",
    story: "Donald Shell was an American computer scientist who looked at Insertion Sort and saw a fatal flaw: elements could only move one space at a time. If a small item was at the end of the array, it took forever to move to the front. He modified the algorithm to compare elements separated by a large 'gap', swapping distant elements instantly. The gap slowly shrinks until it becomes 1 (standard insertion sort), resulting in a massive speedup.",
    complexities: {
      best: "O(n log n)",
      average: "O(n^1.5)",
      worst: "O(n²)",
      space: "O(1)"
    },
    useCases: [
      "Embedded C libraries (like uClibc) where code size is critical",
      "Older hardware where recursion (like Quick/Merge) caused stack overflows",
      "Situations where a hardware-efficient, non-recursive fast sort is needed"
    ]
  },
  cocktail: {
    id: "cocktail",
    name: "Cocktail Shaker Sort",
    inventor: "Knuth (Documented)",
    year: "1973",
    story: "Also known as bidirectional bubble sort, this algorithm was formally documented by Donald Knuth in 'The Art of Computer Programming'. It aims to fix the 'turtle' problem in Bubble Sort, where small numbers at the end of the array move extremely slowly to the beginning. By sorting forwards (bubbling the max) and then sorting backwards (bubbling the min), it acts like a bartender shaking a cocktail.",
    complexities: {
      best: "O(n)",
      average: "O(n²)",
      worst: "O(n²)",
      space: "O(1)"
    },
    useCases: [
      "Purely educational to demonstrate bidirectional traversal",
      "Visual demonstrations of symmetric sorting patterns",
      "Arrays that are known to be almost sorted with a few misplaced elements at both ends"
    ]
  },
  comb: {
    id: "comb",
    name: "Comb Sort",
    inventor: "Włodzimierz Dobosiewicz",
    year: "1980",
    story: "Comb Sort is to Bubble Sort what Shell Sort is to Insertion Sort. Invented in 1980 but popularized by Stephen Lacey and Richard Box in 1991, it attacks the 'turtle' problem directly. It uses a gap sequence (starting large and shrinking by a factor of 1.3) to 'comb' out the small values hiding at the end of the array before doing a final fine-toothed Bubble Sort pass.",
    complexities: {
      best: "O(n log n)",
      average: "O(n² / 2^p)",
      worst: "O(n²)",
      space: "O(1)"
    },
    useCases: [
      "Hardware implementations where branch prediction is difficult",
      "Simple, fast, non-recursive sorting for small microcontrollers",
      "Educational transition between Bubble Sort and complex gap-based sorts"
    ]
  },
  gnome: {
    id: "gnome",
    name: "Gnome Sort",
    inventor: "Hamid Sarbazi-Azad",
    year: "2000",
    story: "Originally called 'Stupid Sort', it was rebranded by Dick Grune based on a story of a Dutch garden gnome sorting flower pots. The gnome looks at the pot next to him; if they are in the right order, he steps forward. If they are in the wrong order, he swaps them and steps backward to check the previous pots. It is remarkably similar to Insertion Sort but uses no nested loops—just a single while loop moving back and forth.",
    complexities: {
      best: "O(n)",
      average: "O(n²)",
      worst: "O(n²)",
      space: "O(1)"
    },
    useCases: [
      "Esoteric programming and code golf (due to its tiny code footprint)",
      "Educational demonstration of loop mechanics",
      "Arrays that are known to be almost entirely sorted"
    ]
  },
  "odd-even": {
    id: "odd-even",
    name: "Odd-Even (Brick) Sort",
    inventor: "Habermann",
    year: "1972",
    story: "Odd-Even sort was developed specifically for parallel processing architectures. Instead of sweeping through the array one by one, it works in two distinct phases: it compares all odd-indexed pairs simultaneously, and then compares all even-indexed pairs simultaneously. It's designed to be run on massive multi-core systems where physical processing units handle distinct chunks of memory.",
    complexities: {
      best: "O(n)",
      average: "O(n²)",
      worst: "O(n²)",
      space: "O(1)"
    },
    useCases: [
      "Parallel processing environments and supercomputers",
      "GPU sorting algorithms",
      "Network routing hardware topologies"
    ]
  },
  radix: {
    id: "radix",
    name: "Radix Sort (LSD)",
    inventor: "Herman Hollerith",
    year: "1887",
    story: "Radix sort predates modern electronic computers by over 60 years! Herman Hollerith invented it to sort punch cards for the 1890 U.S. Census, leading him to found the company that would eventually become IBM. It is a non-comparative sort; it never compares two numbers against each other. Instead, it mechanically drops numbers into 10 'buckets' based on their 1s digit, then their 10s digit, then 100s, mechanically organizing them without logic.",
    complexities: {
      best: "O(nk)",
      average: "O(nk)",
      worst: "O(nk)",
      space: "O(n + k)"
    },
    useCases: [
      "Sorting massive arrays of uniform strings or IPs",
      "Suffix array construction in bioinformatics (DNA sequencing)",
      "High-performance integer sorting where n is huge but the maximum number length (k) is small"
    ]
  }
};
