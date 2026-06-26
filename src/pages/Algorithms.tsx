import { useState, useEffect, useRef } from "react";
import { Seo } from "@/components/Seo";
import { algorithmsData } from "@/data/algorithmsInfo";

// Sleep function for animation delay
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);

type VisualizationMode = "bars" | "liquid-fill" | "pulsing-orbs" | "particle-trails";
type SortAlgorithm = "bubble" | "selection" | "quick" | "insertion" | "merge" | "heap" | "shell" | "cocktail" | "comb" | "gnome" | "odd-even" | "radix";
type AppTheme = "glassmorphism" | "neo-brutalism" | "synthwave" | "swiss";

type Spill = { id: number; index: number; heightPct: number; };

const THEMES = {
  glassmorphism: {
    pageBg: "bg-[#0b0c13] text-[#f1f3f7] font-sans",
    heading: "text-transparent bg-clip-text bg-gradient-to-r from-white via-[#e2e8f0] to-[#94a3b8] font-display font-semibold drop-shadow-sm",
    subheading: "text-[0.6875rem] font-mono tracking-[0.25em] uppercase text-[var(--color-gold)]",
    panelBg: "premium-panel bg-white/5 border border-white/10 rounded-2xl",
    canvasBg: "bg-[#0b0c13]/55 border border-white/5 rounded-2xl",
    dossierBg: "premium-panel bg-white/5 border border-white/10 rounded-2xl",
    button: "bg-white/5 hover:bg-white/10 border border-white/10 rounded text-slate-300 font-mono transition-all",
    buttonActive: "bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 text-[var(--color-accent)] rounded font-mono",
    buttonDanger: "bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded font-mono transition-all",
    buttonStart: "bg-gradient-to-r from-[var(--color-accent)] to-[#4f46e5] hover:brightness-110 text-white rounded-lg shadow-[0_0_20px_rgba(56,189,248,0.25)] border border-white/10 font-mono uppercase tracking-wider",
    textMuted: "text-slate-400 font-mono",
    textBase: "text-slate-300 font-sans",
    inputSlider: "accent-[var(--color-accent)]",
    selectBg: "bg-[#0b0c13] border-white/10 text-white",
    directorBoard: "bg-black/60 backdrop-blur-md border-[var(--color-accent)]/40 rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.5)]",
    
    // Visualizer Logic
    getItemColor: (isSorted: boolean, isSwap: boolean, isActive: boolean) => {
      if (isSorted) return "var(--color-gold)";
      if (isSwap) return "#f87171"; // red-400
      if (isActive) return "var(--color-accent)";
      return "var(--color-ink-soft)";
    },
    getShadowColor: (isSorted: boolean, isSwap: boolean, isActive: boolean) => {
      if (isSorted) return "rgba(245,158,11,0.6)";
      if (isSwap) return "rgba(248,113,113,0.8)";
      if (isActive) return "rgba(56,189,248,0.8)";
      return "transparent";
    },
    getBarShadow: (color: string, shadowColor: string) => `0 0 8px ${shadowColor}`,
    spillColor: "#f87171",
    spillShadow: "0 0 8px rgba(248,113,113,0.8)"
  },
  
  "neo-brutalism": {
    pageBg: "bg-[#fffdf5] text-black font-sans",
    heading: "text-black font-black uppercase tracking-tighter drop-shadow-[4px_4px_0_rgba(0,0,0,1)]",
    subheading: "text-xs font-bold uppercase text-black border-2 border-black px-2 py-1 bg-[#ff90e8] inline-block shadow-[2px_2px_0_rgba(0,0,0,1)]",
    panelBg: "bg-white border-4 border-black rounded-none shadow-[8px_8px_0_rgba(0,0,0,1)]",
    canvasBg: "bg-[#e5e5e5] border-4 border-black rounded-none shadow-[8px_8px_0_rgba(0,0,0,1)]",
    dossierBg: "bg-[#ffeb3b] border-4 border-black rounded-none shadow-[8px_8px_0_rgba(0,0,0,1)]",
    button: "bg-white hover:bg-black hover:text-white border-2 border-black rounded-none text-black font-bold uppercase shadow-[4px_4px_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all",
    buttonActive: "bg-black text-white border-2 border-black rounded-none font-bold uppercase shadow-[4px_4px_0_rgba(0,0,0,1)]",
    buttonDanger: "bg-[#ff4949] hover:bg-black text-white hover:text-[#ff4949] border-2 border-black rounded-none font-bold uppercase shadow-[4px_4px_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all",
    buttonStart: "bg-[#ff90e8] hover:bg-black text-black hover:text-[#ff90e8] border-4 border-black rounded-none font-black uppercase text-lg shadow-[6px_6px_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all",
    textMuted: "text-black font-bold uppercase text-[10px]",
    textBase: "text-black font-medium text-lg",
    inputSlider: "accent-black",
    selectBg: "bg-white border-2 border-black text-black font-bold uppercase",
    directorBoard: "bg-[#ffeb3b] border-4 border-black rounded-none shadow-[8px_8px_0_rgba(0,0,0,1)]",

    // Visualizer Logic
    getItemColor: (isSorted: boolean, isSwap: boolean, isActive: boolean) => {
      if (isSorted) return "#10b981"; // green
      if (isSwap) return "#ef4444"; // red
      if (isActive) return "#3b82f6"; // blue
      return "#000000"; // solid black base
    },
    getShadowColor: (isSorted: boolean, isSwap: boolean, isActive: boolean) => "transparent", // No blur shadows in brutalism
    getBarShadow: (color: string, shadowColor: string) => `2px 2px 0 #000`, // Hard drop shadow
    spillColor: "#000000",
    spillShadow: "none"
  },

  synthwave: {
    pageBg: "bg-[#090014] text-[#fdf4ff] font-mono",
    heading: "text-transparent bg-clip-text bg-gradient-to-b from-[#22d3ee] to-[#d946ef] font-black tracking-widest drop-shadow-[0_0_15px_rgba(217,70,239,0.6)]",
    subheading: "text-[0.6rem] text-[#22d3ee] uppercase tracking-[0.4em] drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]",
    panelBg: "bg-[#1a0b2e]/80 border-2 border-[#d946ef]/50 rounded-none shadow-[0_0_20px_rgba(217,70,239,0.2),inset_0_0_10px_rgba(217,70,239,0.1)] backdrop-blur-sm",
    canvasBg: "bg-[#05000a]/90 border-2 border-[#22d3ee]/50 rounded-none shadow-[inset_0_0_30px_rgba(34,211,238,0.1)] relative",
    dossierBg: "bg-[#1a0b2e]/90 border border-[#22d3ee]/50 rounded-none shadow-[0_0_20px_rgba(34,211,238,0.2)]",
    button: "bg-[#2e1065]/40 hover:bg-[#d946ef]/30 border border-[#d946ef]/50 text-[#fdf4ff] rounded-none shadow-[0_0_10px_rgba(217,70,239,0.3)] transition-all",
    buttonActive: "bg-[#22d3ee]/20 border-2 border-[#22d3ee] text-[#22d3ee] rounded-none shadow-[0_0_15px_rgba(34,211,238,0.5)]",
    buttonDanger: "bg-[#be123c]/40 hover:bg-[#be123c]/80 border border-[#f43f5e] text-[#fecdd3] rounded-none shadow-[0_0_15px_rgba(244,63,94,0.5)] transition-all",
    buttonStart: "bg-gradient-to-r from-[#d946ef] to-[#22d3ee] hover:brightness-125 text-white rounded-none shadow-[0_0_25px_rgba(217,70,239,0.6)] border-2 border-[#fdf4ff] font-black uppercase tracking-widest transition-all",
    textMuted: "text-[#d946ef] opacity-80",
    textBase: "text-[#fdf4ff]",
    inputSlider: "accent-[#d946ef]",
    selectBg: "bg-[#1a0b2e] border-[#d946ef] text-[#22d3ee]",
    directorBoard: "bg-[#1a0b2e]/90 border-2 border-[#22d3ee] rounded-none shadow-[0_0_30px_rgba(34,211,238,0.4)]",

    // Visualizer Logic
    getItemColor: (isSorted: boolean, isSwap: boolean, isActive: boolean) => {
      if (isSorted) return "#eab308"; // yellow
      if (isSwap) return "#ec4899"; // pink
      if (isActive) return "#22d3ee"; // cyan
      return "#6b21a8"; // deep purple base
    },
    getShadowColor: (isSorted: boolean, isSwap: boolean, isActive: boolean) => {
      if (isSorted) return "rgba(234,179,8,0.8)";
      if (isSwap) return "rgba(236,72,153,0.8)";
      if (isActive) return "rgba(34,211,238,0.8)";
      return "rgba(107,33,168,0.5)";
    },
    getBarShadow: (color: string, shadowColor: string) => `0 0 15px ${shadowColor}`,
    spillColor: "#22d3ee",
    spillShadow: "0 0 15px rgba(34,211,238,0.8)"
  },

  swiss: {
    pageBg: "bg-white text-black font-sans",
    heading: "text-black font-bold tracking-tighter text-5xl md:text-6xl",
    subheading: "text-black font-bold uppercase text-[10px] tracking-widest mb-6",
    panelBg: "bg-white border border-gray-200 rounded-none",
    canvasBg: "bg-[#f8f9fa] border border-gray-200 rounded-none",
    dossierBg: "bg-white border-t-2 border-black rounded-none",
    button: "bg-transparent hover:bg-gray-100 border border-gray-300 text-black rounded-none transition-colors text-xs font-semibold uppercase tracking-wider",
    buttonActive: "bg-black text-white border border-black rounded-none text-xs font-semibold uppercase tracking-wider",
    buttonDanger: "bg-transparent hover:bg-red-600 hover:text-white hover:border-red-600 border border-gray-300 text-red-600 rounded-none transition-colors text-xs font-semibold uppercase tracking-wider",
    buttonStart: "bg-black hover:bg-gray-800 text-white border-none rounded-none text-sm font-bold uppercase tracking-widest transition-colors",
    textMuted: "text-gray-500 font-medium text-xs uppercase tracking-wider",
    textBase: "text-gray-800",
    inputSlider: "accent-black",
    selectBg: "bg-white border-gray-300 text-black rounded-none font-semibold text-xs uppercase",
    directorBoard: "bg-white border-2 border-black rounded-none shadow-2xl",

    // Visualizer Logic
    getItemColor: (isSorted: boolean, isSwap: boolean, isActive: boolean) => {
      if (isSorted) return "#cccccc"; // light gray
      if (isSwap) return "#dc2626"; // red
      if (isActive) return "#000000"; // pure black
      return "#e5e5e5"; // very light gray base
    },
    getShadowColor: (isSorted: boolean, isSwap: boolean, isActive: boolean) => "transparent",
    getBarShadow: (color: string, shadowColor: string) => "none",
    spillColor: "#000000",
    spillShadow: "none"
  }
};

export default function Algorithms() {
  const [appTheme, setAppTheme] = useState<AppTheme>("glassmorphism");
  const [arraySize, setArraySize] = useState(50);
  const [animationSpeed, setAnimationSpeed] = useState(20);
  const [array, setArray] = useState<number[]>([]);
  const [isSorting, setIsSorting] = useState(false);
  const [activeIndices, setActiveIndices] = useState<number[]>([]);
  const [sortedIndices, setSortedIndices] = useState<number[]>([]);
  const [swapIndices, setSwapIndices] = useState<number[]>([]);
  const [sortMethod, setSortMethod] = useState<SortAlgorithm>("bubble");
  const [visMode, setVisMode] = useState<VisualizationMode>("bars");
  const [spills, setSpills] = useState<Spill[]>([]);
  const spillIdCounter = useRef(0);

  const [isStepMode, setIsStepMode] = useState(false);
  const [explanationText, setExplanationText] = useState("");
  const [isWaitingForNext, setIsWaitingForNext] = useState(false);
  const resolveNextStepRef = useRef<(() => void) | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const theme = THEMES[appTheme];

  const generateArray = (size: number) => {
    if (isSorting) return;
    const newArray = [];
    for (let i = 0; i < size; i++) {
      newArray.push(randomInt(10, 400));
    }
    setArray(newArray);
    setSortedIndices([]);
    setActiveIndices([]);
    setSwapIndices([]);
    setSpills([]);
    setExplanationText("Array generated. Ready to sort.");
    if (resolveNextStepRef.current) {
      resolveNextStepRef.current();
      resolveNextStepRef.current = null;
    }
    setIsWaitingForNext(false);
  };

  useEffect(() => {
    generateArray(arraySize);
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arraySize]);

  const checkAborted = (signal: AbortSignal) => {
    if (signal.aborted) throw new Error("Sort aborted");
  };

  const handleGenerateArray = () => {
    if (isSorting && abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsSorting(false);
    }
    generateArray(arraySize);
  };

  const handleReset = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setIsSorting(false);
    setArray([]);
    setSortedIndices([]);
    setActiveIndices([]);
    setSwapIndices([]);
    setSpills([]);
    setExplanationText("");
    if (resolveNextStepRef.current) {
      resolveNextStepRef.current();
      resolveNextStepRef.current = null;
    }
    setIsWaitingForNext(false);
  };

  const createSpill = (index: number, val: number) => {
    const id = spillIdCounter.current++;
    const heightPct = (val / 400) * 100;
    setSpills(prev => [...prev, { id, index, heightPct }]);
    setTimeout(() => setSpills(prev => prev.filter(s => s.id !== id)), 600);
  };

  const executeFrame = async (msg: string, signal: AbortSignal) => {
    checkAborted(signal);
    setExplanationText(msg);
    if (isStepMode) {
      setIsWaitingForNext(true);
      await new Promise<void>((resolve) => {
        resolveNextStepRef.current = resolve;
        signal.addEventListener("abort", () => {
          if (resolveNextStepRef.current) {
            resolveNextStepRef.current();
            resolveNextStepRef.current = null;
          }
        });
      });
      setIsWaitingForNext(false);
      checkAborted(signal);
    } else {
      await sleep(animationSpeed);
    }
  };

  const handleNextStep = () => {
    if (resolveNextStepRef.current) {
      resolveNextStepRef.current();
      resolveNextStepRef.current = null;
    }
  };

  // -------------------------------------------------------------
  // Sorting Algorithms (Generic Example Logic)
  // -------------------------------------------------------------
  
  const bubbleSort = async (arr: number[], signal: AbortSignal) => {
    const n = arr.length;
    let tempArray = [...arr];
    let newSortedIndices: number[] = [];
    for (let i = 0; i < n - 1; i++) {
      let swapped = false;
      for (let j = 0; j < n - i - 1; j++) {
        setActiveIndices([j, j + 1]);
        await executeFrame(`Comparing index ${j} and ${j + 1}.`, signal);
        if (tempArray[j] > tempArray[j + 1]) {
          setSwapIndices([j, j + 1]);
          await executeFrame(`Swapping ${tempArray[j]} and ${tempArray[j+1]}.`, signal);
          if (visMode === "liquid-fill") { createSpill(j, tempArray[j]); createSpill(j + 1, tempArray[j + 1]); }
          let temp = tempArray[j]; tempArray[j] = tempArray[j + 1]; tempArray[j + 1] = temp;
          setArray([...tempArray]);
          swapped = true;
        }
      }
      newSortedIndices.push(n - i - 1);
      setSortedIndices([...newSortedIndices]);
      if (!swapped) break;
    }
  };

  // Simplified references for brevity. Full implementations remain the same logic-wise.
  const selectionSort = async (arr: number[], signal: AbortSignal) => { /* omitted for brevity, logic identical to previous */ 
     const n = arr.length; let tempArray = [...arr]; let newSortedIndices: number[] = [];
     for (let i = 0; i < n - 1; i++) {
       let minIdx = i;
       await executeFrame(`Finding minimum for position ${i}.`, signal);
       for (let j = i + 1; j < n; j++) {
         setActiveIndices([minIdx, j]);
         await executeFrame(`Comparing minimum ${tempArray[minIdx]} with ${tempArray[j]}.`, signal);
         if (tempArray[j] < tempArray[minIdx]) minIdx = j;
       }
       if (minIdx !== i) {
         setSwapIndices([i, minIdx]);
         await executeFrame(`Swapping new minimum ${tempArray[minIdx]} into position ${i}.`, signal);
         if (visMode === "liquid-fill") { createSpill(i, tempArray[i]); createSpill(minIdx, tempArray[minIdx]); }
         let temp = tempArray[minIdx]; tempArray[minIdx] = tempArray[i]; tempArray[i] = temp; setArray([...tempArray]);
       }
       newSortedIndices.push(i); setSortedIndices([...newSortedIndices]);
     }
  };

  const quickSort = async (arr: number[], signal: AbortSignal) => {
    let tempArray = [...arr]; let newSortedIndices: number[] = [];
    const partition = async (low: number, high: number): Promise<number> => {
      let pivot = tempArray[high];
      await executeFrame(`Partitioning array. Pivot is ${pivot}.`, signal);
      let i = low - 1;
      for (let j = low; j <= high - 1; j++) {
        setActiveIndices([j, high]);
        await executeFrame(`Comparing ${tempArray[j]} with pivot.`, signal);
        if (tempArray[j] < pivot) {
          i++; setSwapIndices([i, j]);
          await executeFrame(`Swapping lower element.`, signal);
          if (visMode === "liquid-fill") { createSpill(i, tempArray[i]); createSpill(j, tempArray[j]); }
          let temp = tempArray[i]; tempArray[i] = tempArray[j]; tempArray[j] = temp; setArray([...tempArray]);
        }
      }
      setSwapIndices([i + 1, high]);
      await executeFrame(`Locking pivot into correct position.`, signal);
      if (visMode === "liquid-fill") { createSpill(i + 1, tempArray[i + 1]); createSpill(high, tempArray[high]); }
      let temp = tempArray[i + 1]; tempArray[i + 1] = tempArray[high]; tempArray[high] = temp; setArray([...tempArray]);
      return i + 1;
    };
    const sort = async (low: number, high: number) => {
      if (low < high) {
        let pi = await partition(low, high);
        newSortedIndices.push(pi); setSortedIndices([...newSortedIndices]);
        await sort(low, pi - 1); await sort(pi + 1, high);
      } else if (low === high) {
        newSortedIndices.push(low); setSortedIndices([...newSortedIndices]);
      }
    };
    await sort(0, arr.length - 1);
  };

  const mergeSort = async (arr: number[], signal: AbortSignal) => {
    let tempArray = [...arr];
    const merge = async (l: number, m: number, r: number) => {
      await executeFrame(`Merging segments.`, signal);
      let n1 = m - l + 1; let n2 = r - m;
      let L = new Array(n1); let R = new Array(n2);
      for (let i = 0; i < n1; ++i) L[i] = tempArray[l + i];
      for (let j = 0; j < n2; ++j) R[j] = tempArray[m + 1 + j];
      let i = 0, j = 0, k = l;
      while (i < n1 && j < n2) {
        setActiveIndices([l + i, m + 1 + j]);
        await executeFrame(`Comparing sub-array elements.`, signal);
        if (L[i] <= R[j]) { tempArray[k] = L[i]; i++; } 
        else { tempArray[k] = R[j]; j++; }
        setSwapIndices([k]);
        if (visMode === "liquid-fill") createSpill(k, tempArray[k]);
        setArray([...tempArray]);
        k++;
      }
      while (i < n1) {
        setActiveIndices([l + i]); await executeFrame(`Copying remaining left elements.`, signal);
        tempArray[k] = L[i]; setSwapIndices([k]);
        if (visMode === "liquid-fill") createSpill(k, tempArray[k]);
        setArray([...tempArray]); i++; k++;
      }
      while (j < n2) {
        setActiveIndices([m + 1 + j]); await executeFrame(`Copying remaining right elements.`, signal);
        tempArray[k] = R[j]; setSwapIndices([k]);
        if (visMode === "liquid-fill") createSpill(k, tempArray[k]);
        setArray([...tempArray]); j++; k++;
      }
    };
    const sort = async (l: number, r: number) => {
      if (l >= r) return;
      let m = l + Math.floor((r - l) / 2);
      await executeFrame(`Dividing segment at index ${m}.`, signal);
      await sort(l, m); await sort(m + 1, r); await merge(l, m, r);
    };
    await sort(0, arr.length - 1);
  };

  const insertionSort = async (arr: number[], signal: AbortSignal) => {
    let tempArray = [...arr]; let newSortedIndices: number[] = [0];
    for (let i = 1; i < arr.length; i++) {
      let key = tempArray[i]; let j = i - 1;
      setActiveIndices([i]); await executeFrame(`Inserting ${key} into sorted portion.`, signal);
      while (j >= 0 && tempArray[j] > key) {
        setSwapIndices([j, j + 1]); await executeFrame(`Moving ${tempArray[j]} to the right.`, signal);
        if (visMode === "liquid-fill") createSpill(j + 1, tempArray[j]);
        tempArray[j + 1] = tempArray[j]; setArray([...tempArray]); j = j - 1;
      }
      tempArray[j + 1] = key; setArray([...tempArray]);
      newSortedIndices.push(i); setSortedIndices([...newSortedIndices]);
    }
  };

  const heapSort = async (arr: number[], signal: AbortSignal) => {
    let tempArray = [...arr]; let newSortedIndices: number[] = [];
    const heapify = async (n: number, i: number) => {
      let largest = i; let l = 2 * i + 1; let r = 2 * i + 2;
      if (l < n) { setActiveIndices([l, largest]); await executeFrame(`Heapify check left.`, signal); if (tempArray[l] > tempArray[largest]) largest = l; }
      if (r < n) { setActiveIndices([r, largest]); await executeFrame(`Heapify check right.`, signal); if (tempArray[r] > tempArray[largest]) largest = r; }
      if (largest !== i) {
        setSwapIndices([i, largest]); await executeFrame(`Heapify swap.`, signal);
        if (visMode === "liquid-fill") { createSpill(i, tempArray[i]); createSpill(largest, tempArray[largest]); }
        let swap = tempArray[i]; tempArray[i] = tempArray[largest]; tempArray[largest] = swap;
        setArray([...tempArray]); await heapify(n, largest);
      }
    };
    for (let i = Math.floor(tempArray.length / 2) - 1; i >= 0; i--) await heapify(tempArray.length, i);
    for (let i = tempArray.length - 1; i > 0; i--) {
      setSwapIndices([0, i]); await executeFrame(`Extract max element to end.`, signal);
      if (visMode === "liquid-fill") { createSpill(0, tempArray[0]); createSpill(i, tempArray[i]); }
      let temp = tempArray[0]; tempArray[0] = tempArray[i]; tempArray[i] = temp;
      setArray([...tempArray]); newSortedIndices.push(i); setSortedIndices([...newSortedIndices]);
      await heapify(i, 0);
    }
    newSortedIndices.push(0); setSortedIndices([...newSortedIndices]);
  };

  const shellSort = async (arr: number[], signal: AbortSignal) => {
    let tempArray = [...arr]; let n = tempArray.length;
    for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
      await executeFrame(`Shell Sort gap = ${gap}.`, signal);
      for (let i = gap; i < n; i += 1) {
        let temp = tempArray[i]; let j;
        setActiveIndices([i, i - gap]); await executeFrame(`Comparing gap elements.`, signal);
        for (j = i; j >= gap && tempArray[j - gap] > temp; j -= gap) {
          setSwapIndices([j, j - gap]); await executeFrame(`Swapping gap elements.`, signal);
          if (visMode === "liquid-fill") createSpill(j, tempArray[j - gap]);
          tempArray[j] = tempArray[j - gap]; setArray([...tempArray]);
        }
        tempArray[j] = temp; if (visMode === "liquid-fill") createSpill(j, temp); setArray([...tempArray]);
      }
    }
  };

  const cocktailSort = async (arr: number[], signal: AbortSignal) => {
    let tempArray = [...arr]; let swapped = true; let start = 0; let end = tempArray.length - 1;
    while (swapped) {
      swapped = false; await executeFrame(`Forward pass.`, signal);
      for (let i = start; i < end; ++i) {
        setActiveIndices([i, i + 1]); await executeFrame(`Comparing ${tempArray[i]} and ${tempArray[i+1]}.`, signal);
        if (tempArray[i] > tempArray[i + 1]) {
          setSwapIndices([i, i + 1]); await executeFrame(`Swapping.`, signal);
          if (visMode === "liquid-fill") { createSpill(i, tempArray[i]); createSpill(i + 1, tempArray[i + 1]); }
          let temp = tempArray[i]; tempArray[i] = tempArray[i + 1]; tempArray[i + 1] = temp; setArray([...tempArray]); swapped = true;
        }
      }
      if (!swapped) break;
      swapped = false; end = end - 1; await executeFrame(`Backward pass.`, signal);
      for (let i = end - 1; i >= start; --i) {
        setActiveIndices([i, i + 1]); await executeFrame(`Comparing ${tempArray[i]} and ${tempArray[i+1]}.`, signal);
        if (tempArray[i] > tempArray[i + 1]) {
          setSwapIndices([i, i + 1]); await executeFrame(`Swapping.`, signal);
          if (visMode === "liquid-fill") { createSpill(i, tempArray[i]); createSpill(i + 1, tempArray[i + 1]); }
          let temp = tempArray[i]; tempArray[i] = tempArray[i + 1]; tempArray[i + 1] = temp; setArray([...tempArray]); swapped = true;
        }
      }
      start = start + 1;
    }
  };

  const combSort = async (arr: number[], signal: AbortSignal) => {
    let tempArray = [...arr]; let n = tempArray.length; let gap = n; let swapped = true;
    while (gap !== 1 || swapped === true) {
      gap = Math.floor((gap * 10) / 13); if (gap < 1) gap = 1; swapped = false;
      await executeFrame(`Comb pass gap = ${gap}.`, signal);
      for (let i = 0; i < n - gap; i++) {
        setActiveIndices([i, i + gap]); await executeFrame(`Comparing gap elements.`, signal);
        if (tempArray[i] > tempArray[i + gap]) {
          setSwapIndices([i, i + gap]); await executeFrame(`Swapping to clear turtles.`, signal);
          if (visMode === "liquid-fill") { createSpill(i, tempArray[i]); createSpill(i + gap, tempArray[i + gap]); }
          let temp = tempArray[i]; tempArray[i] = tempArray[i + gap]; tempArray[i + gap] = temp; setArray([...tempArray]); swapped = true;
        }
      }
    }
  };

  const gnomeSort = async (arr: number[], signal: AbortSignal) => {
    let tempArray = [...arr]; let index = 0;
    await executeFrame(`Starting Gnome Sort.`, signal);
    while (index < tempArray.length) {
      if (index === 0) index++;
      setActiveIndices([index, index - 1]); await executeFrame(`Gnome checks pots.`, signal);
      if (tempArray[index] >= tempArray[index - 1]) {
        await executeFrame(`Pots okay. Gnome steps forward.`, signal); index++;
      } else {
        setSwapIndices([index, index - 1]); await executeFrame(`Swapping pots and stepping back.`, signal);
        if (visMode === "liquid-fill") { createSpill(index, tempArray[index]); createSpill(index - 1, tempArray[index - 1]); }
        let temp = tempArray[index]; tempArray[index] = tempArray[index - 1]; tempArray[index - 1] = temp; setArray([...tempArray]); index--;
      }
    }
  };

  const oddEvenSort = async (arr: number[], signal: AbortSignal) => {
    let tempArray = [...arr]; let isSorted = false;
    while (!isSorted) {
      isSorted = true; await executeFrame(`Odd-indexed pass.`, signal);
      for (let i = 1; i <= tempArray.length - 2; i = i + 2) {
        setActiveIndices([i, i + 1]); await executeFrame(`Comparing odd-even.`, signal);
        if (tempArray[i] > tempArray[i + 1]) {
          setSwapIndices([i, i + 1]); await executeFrame(`Swapping pair.`, signal);
          if (visMode === "liquid-fill") { createSpill(i, tempArray[i]); createSpill(i + 1, tempArray[i + 1]); }
          let temp = tempArray[i]; tempArray[i] = tempArray[i + 1]; tempArray[i + 1] = temp; setArray([...tempArray]); isSorted = false;
        }
      }
      await executeFrame(`Even-indexed pass.`, signal);
      for (let i = 0; i <= tempArray.length - 2; i = i + 2) {
        setActiveIndices([i, i + 1]); await executeFrame(`Comparing even-odd.`, signal);
        if (tempArray[i] > tempArray[i + 1]) {
          setSwapIndices([i, i + 1]); await executeFrame(`Swapping pair.`, signal);
          if (visMode === "liquid-fill") { createSpill(i, tempArray[i]); createSpill(i + 1, tempArray[i + 1]); }
          let temp = tempArray[i]; tempArray[i] = tempArray[i + 1]; tempArray[i + 1] = temp; setArray([...tempArray]); isSorted = false;
        }
      }
    }
  };

  const radixSort = async (arr: number[], signal: AbortSignal) => {
    let tempArray = [...arr]; let max = Math.max(...tempArray);
    for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
      await executeFrame(`Distributing by ${exp}s digit.`, signal);
      let output = new Array(tempArray.length).fill(0); let count = new Array(10).fill(0);
      for (let i = 0; i < tempArray.length; i++) {
        setActiveIndices([i]); await executeFrame(`Checking ${exp}s digit of ${tempArray[i]}.`, signal);
        count[Math.floor(tempArray[i] / exp) % 10]++;
      }
      for (let i = 1; i < 10; i++) count[i] += count[i - 1];
      for (let i = tempArray.length - 1; i >= 0; i--) {
        let digit = Math.floor(tempArray[i] / exp) % 10;
        output[count[digit] - 1] = tempArray[i]; count[digit]--;
      }
      await executeFrame(`Rebuilding array from buckets.`, signal);
      for (let i = 0; i < tempArray.length; i++) {
        setActiveIndices([i]); await executeFrame(`Placing ${output[i]}.`, signal);
        tempArray[i] = output[i]; setSwapIndices([i]);
        if (visMode === "liquid-fill") createSpill(i, tempArray[i]); setArray([...tempArray]);
      }
    }
  };

  const startSort = async () => {
    if (isSorting) return;
    setSortedIndices([]); setActiveIndices([]); setSwapIndices([]); setSpills([]); setIsSorting(true);
    setExplanationText("Algorithm initialized and sorting started...");
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    try {
      switch (sortMethod) {
        case "bubble": await bubbleSort(array, signal); break;
        case "selection": await selectionSort(array, signal); break;
        case "quick": await quickSort(array, signal); break;
        case "insertion": await insertionSort(array, signal); break;
        case "merge": await mergeSort(array, signal); break;
        case "heap": await heapSort(array, signal); break;
        case "shell": await shellSort(array, signal); break;
        case "cocktail": await cocktailSort(array, signal); break;
        case "comb": await combSort(array, signal); break;
        case "gnome": await gnomeSort(array, signal); break;
        case "odd-even": await oddEvenSort(array, signal); break;
        case "radix": await radixSort(array, signal); break;
      }
      setExplanationText("Sort completed successfully!");
    } catch (err: any) {
      if (err.message === "Sort aborted") setExplanationText("Sort aborted by user.");
      else console.error(err);
    } finally {
      setIsSorting(false); setActiveIndices([]); setSwapIndices([]); setIsWaitingForNext(false);
      if (!signal.aborted) setSortedIndices(Array.from({ length: array.length }, (_, i) => i));
    }
  };

  // -------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------

  const renderTooltip = (val: number) => (
    <div className={`absolute bottom-full mb-1 left-1/2 -translate-x-1/2 text-[10px] px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap font-mono ${theme.buttonActive}`}>
      {val}
    </div>
  );

  const renderVisualizer = () => {
    const maxVal = 400;

    if (visMode === "bars") {
      return (
        <div className="flex items-end justify-center w-full h-full gap-[1px] lg:gap-[2px] mt-12 pb-2">
          {array.map((val, i) => {
            const isSorted = sortedIndices.includes(i);
            const isSwap = swapIndices.includes(i);
            const isActive = activeIndices.includes(i);
            const color = theme.getItemColor(isSorted, isSwap, isActive);
            const shadow = theme.getShadowColor(isSorted, isSwap, isActive);
            return (
              <div
                key={i}
                style={{
                  height: `${(val / maxVal) * 100}%`,
                  backgroundColor: color,
                  boxShadow: theme.getBarShadow(color, shadow)
                }}
                className={`flex-1 transition-all duration-75 group relative cursor-crosshair hover:brightness-125 ${appTheme === 'neo-brutalism' || appTheme === 'swiss' ? 'rounded-none' : 'rounded-t-sm'}`}
              >
                {renderTooltip(val)}
              </div>
            );
          })}
        </div>
      );
    }

    if (visMode === "liquid-fill") {
      return (
        <div className="flex items-end justify-center w-full h-full gap-[4px] mt-12 pb-2 relative">
          {array.map((val, i) => {
             const hPct = (val / maxVal) * 100;
             const isSorted = sortedIndices.includes(i);
             const isSwap = swapIndices.includes(i);
             const isActive = activeIndices.includes(i);
             const color = theme.getItemColor(isSorted, isSwap, isActive);
             const shadowColor = theme.getShadowColor(isSorted, isSwap, isActive);
             
             // Base liquid styling adapts per theme
             let containerStyle = appTheme === 'glassmorphism' ? 'rounded-b-full border border-t-0 border-white/30 bg-white/5 shadow-[inset_0_0_8px_rgba(255,255,255,0.2)]' :
                                  appTheme === 'neo-brutalism' ? 'border-2 border-t-0 border-black bg-white rounded-none' :
                                  appTheme === 'synthwave' ? 'border border-t-0 border-cyan-500/50 bg-[#1a0b2e]/50 shadow-[inset_0_0_15px_rgba(34,211,238,0.2)] rounded-none' :
                                  'border border-t-0 border-gray-300 bg-white rounded-none';
             
             let liquidShadow = appTheme === 'glassmorphism' ? `inset 0 -10px 10px rgba(0,0,0,0.2), 0 0 15px ${shadowColor}` :
                                appTheme === 'synthwave' ? `0 0 20px ${shadowColor}, inset 0 0 10px ${color}` :
                                'none';

             return (
                <div key={i} className={`flex-1 h-full relative overflow-hidden flex items-end group cursor-crosshair transition-colors ${containerStyle}`}>
                   {appTheme === 'glassmorphism' && <div className="absolute top-2 bottom-4 left-[15%] w-[15%] bg-gradient-to-b from-white/40 to-transparent rounded-full z-20 pointer-events-none blur-[0.5px]"></div>}
                   <div 
                     style={{ height: `${hPct}%`, backgroundColor: color, boxShadow: liquidShadow }}
                     className="w-full relative transition-all duration-75"
                   >
                     {appTheme === 'glassmorphism' && <div className="absolute top-0 left-0 w-full h-[3px] bg-white/60 blur-[1px] rounded-[50%]"></div>}
                     {appTheme === 'neo-brutalism' && <div className="absolute top-0 left-0 w-full h-[2px] bg-black"></div>}
                     {appTheme === 'synthwave' && <div className="absolute top-0 left-0 w-full h-[2px] bg-white/80 shadow-[0_0_5px_#fff]"></div>}
                   </div>
                   {renderTooltip(val)}
                </div>
             )
          })}

          {spills.map((spill) => (
            <div
              key={spill.id}
              style={{
                left: `${(spill.index / array.length) * 100}%`,
                width: `${100 / array.length}%`,
                bottom: `${spill.heightPct}%`,
                "--start-h": `${spill.heightPct}%`
              } as React.CSSProperties}
              className="absolute flex justify-center pointer-events-none animate-[liquid-drop_0.6s_ease-in_forwards] z-20"
            >
              <div style={{ backgroundColor: theme.spillColor, boxShadow: theme.spillShadow }} className={`w-[4px] h-[8px] ${appTheme === 'neo-brutalism' || appTheme === 'swiss' ? 'rounded-none border border-black' : 'rounded-full blur-[0.5px]'}`} />
            </div>
          ))}
          <style>{`@keyframes liquid-drop { 0% { bottom: var(--start-h); opacity: 1; transform: scaleY(1); } 80% { opacity: 0.8; transform: scaleY(1.5); } 100% { bottom: 0%; opacity: 0; transform: scaleY(2); } }`}</style>
        </div>
      );
    }

    if (visMode === "pulsing-orbs") {
      return (
        <div className="relative w-full h-full mt-12 pb-8">
          {array.map((val, i) => {
            const isSorted = sortedIndices.includes(i); const isSwap = swapIndices.includes(i); const isActive = activeIndices.includes(i);
            const c = theme.getItemColor(isSorted, isSwap, isActive);
            const shadow = theme.getShadowColor(isSorted, isSwap, isActive);
            const isPulsing = activeIndices.includes(i) || swapIndices.includes(i);
            
            let bg = appTheme === 'glassmorphism' ? `radial-gradient(circle at 30% 30%, #fff, ${c})` : c;
            let orbShadow = appTheme === 'glassmorphism' ? (isPulsing ? `0 0 20px 4px ${shadow}` : `0 0 8px rgba(255,255,255,0.1)`) :
                            appTheme === 'neo-brutalism' ? '2px 2px 0 #000' :
                            appTheme === 'synthwave' ? `0 0 15px ${shadow}` : 'none';

            return (
              <div
                key={i}
                style={{ left: `${(i / array.length) * 100}%`, bottom: `${(val / maxVal) * 100}%`, background: bg, boxShadow: orbShadow }}
                className={`absolute w-3 h-3 md:w-4 md:h-4 transform -translate-x-1/2 transition-all duration-75 group cursor-crosshair hover:scale-150 z-20 
                  ${appTheme === 'neo-brutalism' || appTheme === 'swiss' ? 'rounded-none border border-black' : 'rounded-full'}
                  ${isPulsing && appTheme !== 'swiss' ? 'animate-[pulse_0.5s_ease-in-out_infinite]' : ''}
                `}
              >
                {renderTooltip(val)}
              </div>
            );
          })}
        </div>
      );
    }

    if (visMode === "particle-trails") {
      return (
        <div className="relative w-full h-full mt-12 pb-8">
          {array.map((val, i) => {
            const isSorted = sortedIndices.includes(i); const isSwap = swapIndices.includes(i); const isActive = activeIndices.includes(i);
            const c = theme.getItemColor(isSorted, isSwap, isActive);
            const isDefault = !isSorted && !isSwap && !isActive;
            
            return (
              <div
                key={i}
                style={{ left: `${(i / array.length) * 100}%`, bottom: `${(val / maxVal) * 100}%` }}
                className="absolute transform -translate-x-1/2 flex flex-col items-center transition-all duration-75 group cursor-crosshair hover:-translate-y-2"
              >
                <div style={{ backgroundColor: c, boxShadow: theme.getBarShadow(c, c)}} className={`w-2 h-2 z-10 hover:scale-150 transition-transform ${appTheme === 'neo-brutalism' || appTheme === 'swiss' ? 'rounded-none border border-black' : 'rounded-full'}`} />
                <div 
                  style={{ 
                    background: appTheme === 'neo-brutalism' || appTheme === 'swiss' ? c : `linear-gradient(to bottom, ${c}, transparent)`, 
                    height: isDefault ? '15px' : '50px', 
                    opacity: isDefault ? 0.3 : 0.9, 
                    filter: appTheme === 'neo-brutalism' || appTheme === 'swiss' ? 'none' : 'blur(1px)',
                    animationDelay: `${i * 0.1}s`
                  }} 
                  className={`w-[2px] transition-all duration-75 ${appTheme === 'neo-brutalism' || appTheme === 'swiss' ? '' : 'animate-[sway_2s_ease-in-out_infinite_alternate]'}`} 
                />
                {renderTooltip(val)}
              </div>
            );
          })}
          <style>{`@keyframes sway { 0% { transform: skewX(-5deg); } 100% { transform: skewX(5deg); } }`}</style>
        </div>
      );
    }

    return null;
  };

  const currentAlgoData = algorithmsData[sortMethod];

  // -------------------------------------------------------------
  // Main Render Layout
  // -------------------------------------------------------------

  return (
    <>
      <Seo
        title="Algorithms Visualizer — Akshay Borse"
        description="Interactive visualization of common sorting algorithms, bringing abstract concepts into the physical realm."
        path="/algorithms"
      />

      <div className={`min-h-screen relative overflow-x-hidden pb-32 pt-20 transition-colors duration-500 ${theme.pageBg}`}>
        
        {/* Global Theme Switcher */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <span className={`text-[10px] uppercase tracking-widest ${theme.textMuted}`}>Theme:</span>
          <select 
            value={appTheme}
            onChange={(e) => setAppTheme(e.target.value as AppTheme)}
            className={`px-3 py-1.5 text-xs focus:outline-none cursor-pointer transition-all ${theme.selectBg} ${theme.panelBg}`}
          >
            <option value="glassmorphism">Glassmorphism</option>
            <option value="neo-brutalism">Neo-Brutalism</option>
            <option value="synthwave">Synthwave</option>
            <option value="swiss">Swiss Minimalist</option>
          </select>
        </div>

        {appTheme === "glassmorphism" && (
          <>
            <div className="absolute inset-0 bg-[linear-gradient(rgba(24,58,111,0.04)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(24,58,111,0.04)_1.5px,transparent_1.5px)] bg-[size:40px_40px] pointer-events-none" />
            <div className="absolute top-[-10%] left-[-15%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-[var(--color-accent)]/10 to-transparent blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-15%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-bl from-[var(--color-gold)]/8 to-transparent blur-[100px] pointer-events-none" />
          </>
        )}
        
        {appTheme === "synthwave" && (
          <div className="absolute inset-0 bg-[linear-gradient(rgba(217,70,239,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.1)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none [transform:perspective(1000px)_rotateX(60deg)_translateY(-100px)_translateZ(-200px)] opacity-40" />
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <header className="text-center mb-8">
            <p className={theme.subheading}>Logic & Structure // Data Sorting</p>
            <h1 className={theme.heading}>Algorithm Visualizer</h1>
          </header>

          <div className="flex flex-col lg:flex-row gap-8 items-start mb-12">
            
            {/* Control Panel (Sidebar) */}
            <div className={`w-full lg:w-80 p-6 flex flex-col gap-6 shrink-0 z-20 ${theme.panelBg}`}>
              
              {/* Execution Mode Toggle */}
              <div>
                <span className={`block mb-4 flex justify-between items-center ${theme.textMuted}`}>
                  Execution Mode
                  {isStepMode && <span className="bg-red-500 text-white px-1.5 py-0.5 text-[10px] uppercase font-bold animate-pulse">EDU</span>}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setIsStepMode(false)} disabled={isSorting} className={`flex-1 py-2 ${!isStepMode ? theme.buttonActive : theme.button} disabled:opacity-50 disabled:cursor-not-allowed`}>Auto-Run</button>
                  <button onClick={() => setIsStepMode(true)} disabled={isSorting} className={`flex-1 py-2 ${isStepMode ? theme.buttonActive : theme.button} disabled:opacity-50 disabled:cursor-not-allowed`}>Step-by-Step</button>
                </div>
              </div>

              <div className="w-full h-px bg-current opacity-10 my-1"></div>

              <div>
                <span className={`block mb-4 ${theme.textMuted}`}>Matrix Configurations</span>
                <div className="flex gap-2">
                  <button onClick={handleGenerateArray} className={`flex-1 px-4 py-2.5 ${theme.button}`}>Generate</button>
                  <button onClick={handleReset} className={`px-4 py-2.5 ${theme.buttonDanger}`} title="Clear Everything">Reset</button>
                </div>
              </div>

              <div className="w-full h-px bg-current opacity-10 my-1"></div>

              {/* Visualization Mode Selection */}
              <div>
                <span className={`block mb-4 ${theme.textMuted}`}>Visualization Mode</span>
                <select
                  value={visMode}
                  onChange={(e) => setVisMode(e.target.value as VisualizationMode)}
                  className={`w-full px-3 py-2.5 focus:outline-none appearance-none cursor-pointer ${theme.selectBg} ${theme.panelBg}`}
                >
                  <option value="bars">Standard Bars</option>
                  <option value="liquid-fill">Liquid Fill</option>
                  <option value="pulsing-orbs">Pulsing Orbs</option>
                  <option value="particle-trails">Particle Trails</option>
                </select>
              </div>

              <div className="w-full h-px bg-current opacity-10 my-1"></div>

              {/* Sliders */}
              <div className={`flex flex-col gap-5 transition-opacity ${isStepMode ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className={theme.textMuted}>Array Size</label>
                    <span className={`text-xs font-bold ${appTheme === 'glassmorphism' ? 'text-[var(--color-accent)]' : 'text-current'}`}>{arraySize}</span>
                  </div>
                  <input type="range" min="5" max="150" value={arraySize} onChange={(e) => setArraySize(Number(e.target.value))} disabled={isSorting || isStepMode} className={`w-full opacity-80 hover:opacity-100 disabled:opacity-30 cursor-pointer ${theme.inputSlider}`} />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className={theme.textMuted}>Delay (ms)</label>
                    <span className={`text-xs font-bold ${appTheme === 'glassmorphism' ? 'text-[var(--color-accent)]' : 'text-current'}`}>{animationSpeed}</span>
                  </div>
                  <input type="range" min="1" max="500" value={animationSpeed} onChange={(e) => setAnimationSpeed(Number(e.target.value))} disabled={isSorting || isStepMode} className={`w-full opacity-80 hover:opacity-100 disabled:opacity-30 cursor-pointer ${theme.inputSlider}`} />
                </div>
              </div>

              <div className="w-full h-px bg-current opacity-10 my-1"></div>

              {/* Algorithm Selection */}
              <div>
                 <span className={`block mb-3 ${theme.textMuted}`}>Select Algorithm</span>
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {Object.values(algorithmsData).map((algo) => (
                    <button 
                      key={algo.id}
                      onClick={() => setSortMethod(algo.id as SortAlgorithm)}
                      disabled={isSorting}
                      className={`px-4 py-2 text-left disabled:opacity-50 disabled:cursor-not-allowed ${sortMethod === algo.id ? theme.buttonActive : theme.button}`}
                    >
                      {algo.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Button */}
              <button onClick={startSort} disabled={isSorting} className={`mt-2 px-6 py-4 disabled:opacity-50 disabled:pointer-events-none ${theme.buttonStart}`}>
                {isSorting ? "Sorting..." : "Execute Sort"}
              </button>
            </div>

            {/* Visualization Canvas */}
            <div className={`flex-1 w-full p-6 flex flex-col justify-end min-h-[500px] h-[60vh] lg:h-[75vh] relative overflow-hidden ${theme.canvasBg}`}>
               
               {/* Educational Mode Director's Board Overlay */}
               {isStepMode && explanationText && (
                  <div className={`absolute top-6 left-1/2 -translate-x-1/2 z-30 w-11/12 max-w-lg p-6 flex flex-col items-center gap-4 animate-fade-in ${theme.directorBoard}`}>
                    <p className={`text-sm text-center leading-relaxed ${theme.textBase}`}>
                      <strong className={`text-xs uppercase block mb-1 ${theme.textMuted}`}>Current Step</strong>
                      {explanationText}
                    </p>
                    {isWaitingForNext ? (
                      <button onClick={handleNextStep} className={`px-6 py-2 mt-2 animate-pulse hover:animate-none ${theme.buttonActive}`}>
                        Next Step 
                      </button>
                    ) : (
                      <div className="h-8 flex items-center justify-center mt-2">
                         <span className="flex gap-2">
                           <span className="w-2 h-2 bg-current opacity-50 rounded-full animate-bounce" style={{animationDelay: "0ms"}}></span>
                           <span className="w-2 h-2 bg-current opacity-50 rounded-full animate-bounce" style={{animationDelay: "150ms"}}></span>
                           <span className="w-2 h-2 bg-current opacity-50 rounded-full animate-bounce" style={{animationDelay: "300ms"}}></span>
                         </span>
                      </div>
                    )}
                  </div>
               )}

               {!isStepMode && (
                 <span className={`absolute top-6 left-6 z-10 opacity-70 ${theme.textMuted}`}>
                    Output // {visMode.toUpperCase().replace("-", " ")} // {sortMethod.toUpperCase()}
                  </span>
               )}
                
                {renderVisualizer()}
            </div>

          </div>

          {/* Algorithm Dossier Section */}
          <div className="w-full mb-24 animate-fade-in transition-opacity duration-500" key={sortMethod}>
            <div className={`w-full p-8 md:p-12 flex flex-col lg:flex-row gap-12 ${theme.dossierBg}`}>
              
              {/* Left Column: Story */}
              <div className="flex-1">
                <div className="mb-6">
                  <span className={theme.subheading}>Algorithm Dossier</span>
                  <h2 className={`text-3xl md:text-4xl mb-2 ${theme.heading}`}>{currentAlgoData.name}</h2>
                  <p className={theme.textMuted}>
                    Invented by: <span className={theme.textBase}>{currentAlgoData.inventor}</span> • {currentAlgoData.year}
                  </p>
                </div>
                <div className={`max-w-none leading-relaxed ${theme.textBase}`}>
                  <p>{currentAlgoData.story}</p>
                </div>
              </div>

              {/* Right Column: Stats & Use Cases */}
              <div className="flex-1 lg:max-w-md flex flex-col gap-6">
                
                {/* Complexities Grid */}
                <div className={`p-6 ${theme.panelBg} !shadow-none !border-current opacity-90`}>
                  <h3 className={`mb-4 ${theme.textMuted}`}>Complexity Matrix</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className={`block mb-1 ${theme.textMuted}`}>Best Time</span>
                      <span className={`text-lg font-bold ${appTheme === 'neo-brutalism' || appTheme === 'swiss' ? 'text-black' : 'text-[#10b981]'}`}>{currentAlgoData.complexities.best}</span>
                    </div>
                    <div>
                      <span className={`block mb-1 ${theme.textMuted}`}>Average Time</span>
                      <span className={`text-lg font-bold ${appTheme === 'neo-brutalism' || appTheme === 'swiss' ? 'text-black' : 'text-[#f59e0b]'}`}>{currentAlgoData.complexities.average}</span>
                    </div>
                    <div>
                      <span className={`block mb-1 ${theme.textMuted}`}>Worst Time</span>
                      <span className={`text-lg font-bold ${appTheme === 'neo-brutalism' || appTheme === 'swiss' ? 'text-black' : 'text-[#ef4444]'}`}>{currentAlgoData.complexities.worst}</span>
                    </div>
                    <div>
                      <span className={`block mb-1 ${theme.textMuted}`}>Space</span>
                      <span className={`text-lg font-bold ${appTheme === 'neo-brutalism' || appTheme === 'swiss' ? 'text-black' : 'text-[#3b82f6]'}`}>{currentAlgoData.complexities.space}</span>
                    </div>
                  </div>
                </div>

                {/* Use Cases */}
                <div className={`p-6 ${theme.panelBg} !shadow-none !border-current opacity-90`}>
                  <h3 className={`mb-4 ${theme.textMuted}`}>Real-World Applications</h3>
                  <ul className="flex flex-col gap-3">
                    {currentAlgoData.useCases.map((useCase, idx) => (
                      <li key={idx} className={`flex items-start gap-3 ${theme.textBase}`}>
                        <span className="text-current opacity-50 text-xs mt-1">✦</span>
                        <span className="leading-snug text-sm">{useCase}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

            </div>
          </div>

        </div>
        <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: currentColor; opacity: 0.2; border-radius: 4px; }
        `}</style>
      </div>
    </>
  );
}
