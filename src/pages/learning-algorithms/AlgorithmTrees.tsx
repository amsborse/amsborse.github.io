import { useCallback, useMemo, useState } from "react";
import { Seo } from "@/components/Seo";
import { LearningSandboxLayout, StatPill } from "@/components/learning/LearningSandboxLayout";

type TreeNode = {
  value: number;
  left: TreeNode | null;
  right: TreeNode | null;
};

type PlacedNode = { value: number; x: number; y: number };
type Edge = { x1: number; y1: number; x2: number; y2: number };

function insert(root: TreeNode | null, value: number): TreeNode {
  if (!root) return { value, left: null, right: null };
  if (value < root.value) return { ...root, left: insert(root.left, value) };
  if (value > root.value) return { ...root, right: insert(root.right, value) };
  return root;
}

function searchPath(root: TreeNode | null, target: number): number[] {
  const path: number[] = [];
  let cur = root;
  while (cur) {
    path.push(cur.value);
    if (target === cur.value) return path;
    cur = target < cur.value ? cur.left : cur.right;
  }
  return path;
}

function layoutInOrder(
  root: TreeNode | null,
  depth: number,
  xRef: { v: number },
  spread: number,
  nodes: PlacedNode[],
  edges: Edge[],
  parent?: PlacedNode
): void {
  if (!root) return;
  layoutInOrder(root.left, depth + 1, xRef, spread, nodes, edges);
  const y = depth * 72 + 20;
  const placed: PlacedNode = { value: root.value, x: xRef.v, y };
  if (parent) edges.push({ x1: parent.x, y1: parent.y + 18, x2: placed.x, y2: placed.y - 18 });
  nodes.push(placed);
  xRef.v += spread;
  layoutInOrder(root.right, depth + 1, xRef, spread, nodes, edges, placed);
}

const DEFAULT_VALUES = [50, 30, 70, 20, 40, 60, 80, 10, 35];

export default function AlgorithmTrees() {
  const [tree, setTree] = useState<TreeNode | null>(() =>
    DEFAULT_VALUES.reduce<TreeNode | null>((t, v) => insert(t, v), null)
  );
  const [input, setInput] = useState("");
  const [path, setPath] = useState<number[]>([]);
  const [mode, setMode] = useState<"insert" | "search">("insert");

  const { nodes, edges } = useMemo(() => {
    const n: PlacedNode[] = [];
    const e: Edge[] = [];
    layoutInOrder(tree, 0, { v: 0 }, 56, n, e);
    const minX = n.length ? Math.min(...n.map((p) => p.x)) : 0;
    const maxX = n.length ? Math.max(...n.map((p) => p.x)) : 0;
    const offset = (minX + maxX) / 2;
    return {
      nodes: n.map((p) => ({ ...p, x: p.x - offset })),
      edges: e.map((edge) => ({
        x1: edge.x1 - offset,
        y1: edge.y1,
        x2: edge.x2 - offset,
        y2: edge.y2,
      })),
    };
  }, [tree]);

  const reset = useCallback(() => {
    setTree(DEFAULT_VALUES.reduce<TreeNode | null>((t, v) => insert(t, v), null));
    setPath([]);
    setInput("");
  }, []);

  function handleAction() {
    const n = Number(input);
    if (!Number.isFinite(n)) return;
    if (mode === "insert") {
      setTree((t) => insert(t, n));
      setPath([n]);
    } else {
      setPath(searchPath(tree, n));
    }
  }

  const pathSet = new Set(path);

  return (
    <>
      <Seo title="Tree Structures — Learning Lab" path="/learning/algorithm/trees" />
      <LearningSandboxLayout
        title="Binary Search Tree"
        subtitle="Tree Structures"
        controls={
          <>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "insert" | "search")}
              className="bg-[#0b0c13] border border-white/10 rounded-lg px-3 py-2 text-sm"
            >
              <option value="insert">Insert</option>
              <option value="search">Search</option>
            </select>
            <input
              type="number"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Value"
              className="w-24 bg-[#0b0c13] border border-white/10 rounded-lg px-2 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleAction}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-mono uppercase"
            >
              {mode === "insert" ? "Insert" : "Search"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="px-4 py-2 rounded-lg border border-white/10 text-sm font-mono text-slate-400"
            >
              Reset
            </button>
          </>
        }
        stats={
          <>
            <StatPill label="Nodes" value={nodes.length} />
            <StatPill label="Mode" value={mode} />
            <StatPill label="Path length" value={path.length || "—"} />
            <StatPill label="Path" value={path.length ? path.join(" → ") : "—"} />
          </>
        }
      >
        <div className="relative h-[320px] w-full overflow-x-auto">
          <svg className="w-full h-full min-w-[400px]" viewBox="-280 0 560 300">
            {edges.map((e, i) => (
              <line
                key={i}
                x1={e.x1}
                y1={e.y1}
                x2={e.x2}
                y2={e.y2}
                stroke="rgba(167, 139, 250, 0.4)"
                strokeWidth="1.5"
              />
            ))}
            {nodes.map((n) => (
              <g key={n.value} transform={`translate(${n.x}, ${n.y})`}>
                <circle
                  r="18"
                  fill={pathSet.has(n.value) ? "rgba(167, 139, 250, 0.55)" : "#0d0e15"}
                  stroke={pathSet.has(n.value) ? "#c4b5fd" : "#a78bfa"}
                  strokeWidth="2"
                />
                <text textAnchor="middle" dy="5" fill="white" fontSize="11" fontFamily="monospace">
                  {n.value}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </LearningSandboxLayout>
    </>
  );
}
