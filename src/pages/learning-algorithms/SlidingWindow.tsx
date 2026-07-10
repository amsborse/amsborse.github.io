import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Seo } from "@/components/Seo";
import {
  SLIDING_WINDOW_PROBLEMS,
  type SlidingWindowProblem,
  type WindowValue,
  type WindowVisualStep,
} from "@/data/slidingWindowProblems";
import { SlidingWindowCatalog } from "@/components/learning/SlidingWindowCatalog";

const CELL_W = 46;
const CELL_GAP = 8;
const CELL_STEP = CELL_W + CELL_GAP;

function Panel({
  title,
  eyebrow,
  children,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-white/[0.08] bg-[#06101d]/72 shadow-[0_16px_42px_rgba(0,0,0,0.24)] backdrop-blur-md ${className}`}
    >
      <div className="flex min-h-10 items-center justify-between gap-3 border-b border-white/[0.06] px-3 py-2">
        <div>
          {eyebrow ? (
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-cyan-200/60">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-100">
            {title}
          </h2>
        </div>
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

function isMatrix(input: SlidingWindowProblem["input"]): input is WindowValue[][] {
  return Array.isArray(input[0]);
}

function flattenInput(problem: SlidingWindowProblem): WindowValue[] {
  return isMatrix(problem.input) ? problem.input.flat() : problem.input;
}

function ValueCell({
  value,
  index,
  step,
  inputKind,
}: {
  value: WindowValue;
  index: number;
  step: WindowVisualStep;
  inputKind: SlidingWindowProblem["inputKind"];
}) {
  const isActive = step.active.includes(index);
  const isEntering = step.entering === index;
  const isLeaving = step.leaving === index;

  const stateClass = isLeaving
    ? "border-rose-300/65 bg-rose-400/[0.14] text-rose-100"
    : isEntering
      ? "border-emerald-300/70 bg-emerald-400/[0.14] text-emerald-100"
      : isActive
        ? step.valid
          ? "border-cyan-300/65 bg-cyan-400/[0.12] text-white"
          : "border-amber-300/65 bg-amber-400/[0.12] text-amber-100"
        : "border-white/[0.08] bg-slate-900/72 text-slate-500";

  return (
    <motion.div
      layout
      className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-md border font-display text-lg font-black ${stateClass}`}
      animate={{
        y: isEntering ? -4 : isLeaving ? 5 : 0,
        scale: isActive ? 1.03 : 0.92,
        opacity: isActive || isEntering || isLeaving ? 1 : 0.58,
      }}
      transition={{ type: "tween", ease: "easeOut", duration: 0.28 }}
    >
      <span>{value}</span>
      <span className="absolute -bottom-4 left-0 right-0 text-center font-mono text-[8px] text-slate-500">
        {inputKind === "string" ? index : index}
      </span>
    </motion.div>
  );
}

function InputStrip({ problem, step }: { problem: SlidingWindowProblem; step: WindowVisualStep }) {
  const values = flattenInput(problem);
  const leftX = step.left * CELL_STEP + CELL_W / 2;
  const rightX = step.right * CELL_STEP + CELL_W / 2;
  const windowLeft = Math.min(...step.active, step.left) * CELL_STEP;
  const windowWidth = Math.max(1, step.active.length) * CELL_STEP - CELL_GAP;

  if (isMatrix(problem.input)) {
    const columns = problem.input[0]?.length ?? 1;
    return (
      <div className="relative mx-auto grid w-fit gap-2 py-7">
        {problem.input.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${columns}, 46px)` }}
          >
            {row.map((value, colIndex) => {
              const index = rowIndex * columns + colIndex;
              return (
                <ValueCell
                  key={index}
                  value={value}
                  index={index}
                  step={step}
                  inputKind={problem.inputKind}
                />
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative overflow-x-auto px-2 pb-8 pt-8">
      <div className="relative mx-auto h-24 min-w-max" style={{ width: values.length * CELL_STEP }}>
        <motion.div
          className={`absolute top-3 h-14 rounded-lg border ${
            step.valid
              ? "border-cyan-300/45 bg-cyan-400/[0.055]"
              : "border-amber-300/45 bg-amber-400/[0.055]"
          }`}
          animate={{ x: windowLeft, width: windowWidth }}
          transition={{ type: "tween", ease: "easeOut", duration: 0.32 }}
        />
        <div className="absolute left-0 top-4 flex gap-2">
          {values.map((value, index) => (
            <ValueCell
              key={`${problem.id}-${index}`}
              value={value}
              index={index}
              step={step}
              inputKind={problem.inputKind}
            />
          ))}
        </div>
        <motion.div
          className="absolute top-[78px] font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-cyan-200"
          animate={{ x: leftX - 12 }}
          transition={{ type: "tween", ease: "easeOut", duration: 0.32 }}
        >
          L
        </motion.div>
        <motion.div
          className="absolute top-[78px] font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-200"
          animate={{ x: rightX - 12 }}
          transition={{ type: "tween", ease: "easeOut", duration: 0.32 }}
        >
          R
        </motion.div>
      </div>
    </div>
  );
}

function StructurePanel({
  problem,
  step,
}: {
  problem: SlidingWindowProblem;
  step: WindowVisualStep;
}) {
  const entries = step.frequency ? Object.entries(step.frequency) : [];
  const linear =
    problem.structure === "deque"
      ? step.deque
      : problem.structure === "queue"
        ? step.queue
        : problem.structure === "stack"
          ? step.stack
          : undefined;

  if (problem.structure === "none" && !entries.length && !linear?.length) {
    return (
      <Panel title="State Structure" eyebrow="O(1)">
        <p className="text-sm leading-6 text-slate-300">
          This problem only needs scalar state. Watch the variable panel and the highlighted window.
        </p>
      </Panel>
    );
  }

  return (
    <Panel
      title="State Structure"
      eyebrow={problem.structureLabel ?? problem.structure}
      className="min-h-[190px]"
    >
      {entries.length ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {entries.map(([key, value]) => (
            <motion.div
              key={key}
              layout
              className="rounded-md border border-white/[0.08] bg-white/[0.035] px-2 py-2"
            >
              <p className="font-mono text-[9px] uppercase text-slate-400">{key}</p>
              <p className="mt-1 font-display text-lg font-black text-white">{value}</p>
            </motion.div>
          ))}
        </div>
      ) : null}

      {linear?.length ? (
        <div className="mt-1">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {linear.map((value, index) => (
              <motion.div
                key={`${value}-${index}`}
                layout
                className="relative grid h-10 min-w-12 place-items-center rounded-md border border-violet-300/30 bg-violet-400/[0.08] px-3 font-mono text-xs font-bold text-violet-100"
              >
                {value}
                {index === 0 ? (
                  <span className="absolute -bottom-4 left-0 right-0 text-center text-[8px] uppercase text-violet-200/75">
                    front
                  </span>
                ) : null}
              </motion.div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-400">
            {problem.structure === "deque"
              ? "Front is the value/index that answers the current window; tail is trimmed to preserve monotonic order."
              : "The front leaves first, so the visual matches first-in-first-out behavior."}
          </p>
        </div>
      ) : null}
    </Panel>
  );
}

function VariablesPanel({ step }: { step: WindowVisualStep }) {
  return (
    <Panel title="Variables" eyebrow={step.valid ? "valid window" : "adjusting"}>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(step.variables).map(([key, value]) => (
          <div key={key} className="rounded-md border border-white/[0.08] bg-black/20 px-2 py-2">
            <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-slate-400">{key}</p>
            <p className="mt-1 truncate font-mono text-sm font-bold text-slate-100">{value}</p>
          </div>
        ))}
      </div>
      {step.best !== undefined ? (
        <div className="mt-3 rounded-md border border-amber-300/20 bg-amber-400/[0.06] px-2 py-2">
          <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-amber-200">
            Best / Answer
          </p>
          <p className="mt-1 font-display text-xl font-black text-amber-200">{step.best}</p>
        </div>
      ) : null}
    </Panel>
  );
}

function CodePanel({ problem, activeLine }: { problem: SlidingWindowProblem; activeLine: number }) {
  return (
    <Panel title="Python Trace" eyebrow={`line ${activeLine}`}>
      <div className="overflow-hidden rounded-md border border-white/[0.08] bg-[#020712] font-mono text-[11px] leading-5">
        {problem.code.map((line, index) => {
          const lineNumber = index + 1;
          const isActive = lineNumber === activeLine;
          return (
            <motion.div
              key={`${problem.id}-line-${lineNumber}`}
              className={`grid grid-cols-[34px_1fr] gap-2 px-2 py-1 ${
                isActive ? "bg-cyan-300/[0.12] text-cyan-50" : "text-slate-400"
              }`}
              animate={{ opacity: isActive ? 1 : 0.78 }}
            >
              <span className={isActive ? "text-cyan-200" : "text-slate-600"}>{lineNumber}</span>
              <code className="whitespace-pre-wrap">{line}</code>
            </motion.div>
          );
        })}
      </div>
    </Panel>
  );
}

function ProblemList({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <Panel
      title="Interactive Lab"
      eyebrow={`${SLIDING_WINDOW_PROBLEMS.length} live visuals`}
      className="lg:sticky lg:top-24"
    >
      <div className="max-h-[520px] space-y-1.5 overflow-y-auto pr-1">
        {SLIDING_WINDOW_PROBLEMS.map((problem) => {
          const isSelected = selectedId === problem.id;
          return (
            <button
              key={problem.id}
              type="button"
              onClick={() => onSelect(problem.id)}
              className={`grid w-full grid-cols-[28px_1fr] gap-2 rounded-md border px-2 py-2 text-left transition ${
                isSelected
                  ? "border-cyan-300/45 bg-cyan-400/[0.1]"
                  : "border-white/[0.06] bg-white/[0.025] hover:border-white/[0.14] hover:bg-white/[0.045]"
              }`}
            >
              <span
                className={`grid h-6 w-6 place-items-center rounded-full font-mono text-[10px] font-bold ${
                  isSelected ? "bg-cyan-300 text-slate-950" : "bg-white/[0.07] text-slate-300"
                }`}
              >
                {problem.level}
              </span>
              <span>
                <span className="block text-xs font-semibold text-slate-100">{problem.title}</span>
                <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
                  {problem.pattern}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

export default function SlidingWindowPage() {
  const [selectedId, setSelectedId] = useState(SLIDING_WINDOW_PROBLEMS[0].id);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const logRef = useRef<HTMLDivElement>(null);

  const problem = useMemo(
    () =>
      SLIDING_WINDOW_PROBLEMS.find((item) => item.id === selectedId) ?? SLIDING_WINDOW_PROBLEMS[0],
    [selectedId]
  );
  const step = problem.steps[stepIndex] ?? problem.steps[0];
  const progressPct = (stepIndex / Math.max(problem.steps.length - 1, 1)) * 100;

  useEffect(() => {
    setStepIndex(0);
    setIsPlaying(false);
  }, [selectedId]);

  useEffect(() => {
    if (stepIndex >= problem.steps.length) {
      setStepIndex(Math.max(0, problem.steps.length - 1));
    }
  }, [problem.steps.length, stepIndex]);

  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => {
      setStepIndex((current) => {
        if (current >= problem.steps.length - 1) {
          setIsPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 2200 / speed);

    return () => window.clearInterval(id);
  }, [isPlaying, problem.steps.length, speed]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [stepIndex, selectedId]);

  const shownSteps = problem.steps.slice(0, stepIndex + 1);

  const selectProblem = (id: string) => {
    setSelectedId(id);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "smooth" }));
  };

  return (
    <>
      <Seo
        title="Sliding Window Lab"
        description="Visual execution guide and voteable roadmap for sliding window interview problems."
        path="/learning/coding-patterns/sliding-window"
      />

      <div className="relative min-h-screen overflow-x-hidden bg-transparent pb-24 pt-20 text-[#f1f3f7] selection:bg-cyan-400/20">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(3,7,18,0.14),rgba(3,7,18,0.94))]" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <Link
              to="/learning/coding-patterns"
              className="font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-200/60 transition hover:text-cyan-200"
            >
              ← Patterns
            </Link>
            <h1 className="font-display text-xl font-black tracking-normal text-white sm:text-2xl">
              Sliding Window Lab
            </h1>
            <span className="text-[10px] text-slate-400">
              {SLIDING_WINDOW_PROBLEMS.length} live visuals · vote on {">"}100 roadmap problems
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
            <ProblemList selectedId={selectedId} onSelect={selectProblem} />

            <main className="space-y-4">
              <section className="rounded-lg border border-white/[0.08] bg-[#030816]/66 p-3 shadow-[0_20px_70px_rgba(0,0,0,0.34)] backdrop-blur-md">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-cyan-200/60">
                      Level {problem.level} · {problem.pattern}
                    </p>
                    <h2 className="mt-1 font-display text-lg font-black text-white">
                      {problem.title}
                    </h2>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-300">
                      {problem.goal}
                    </p>
                  </div>
                  <div className="grid min-w-40 grid-cols-2 gap-2">
                    <div className="rounded-md border border-white/[0.08] bg-white/[0.035] px-2 py-2">
                      <p className="font-mono text-[8px] uppercase text-slate-500">
                        {problem.inputLabel}
                      </p>
                      <p className="font-mono text-xs font-bold text-slate-100">
                        {problem.inputKind}
                      </p>
                    </div>
                    <div className="rounded-md border border-white/[0.08] bg-white/[0.035] px-2 py-2">
                      <p className="font-mono text-[8px] uppercase text-slate-500">
                        {problem.targetLabel ?? "mode"}
                      </p>
                      <p className="font-mono text-xs font-bold text-slate-100">
                        {problem.targetValue ?? problem.structure}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-white/[0.08] bg-black/20">
                  <InputStrip problem={problem} step={step} />
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_260px]">
                  <div className="rounded-lg border border-white/[0.08] bg-[#020712]/70 px-3 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                          Step {stepIndex + 1}/{problem.steps.length}
                        </p>
                        <h3 className="mt-1 text-sm font-semibold text-white">{step.action}</h3>
                      </div>
                      <span
                        className={`rounded-full border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] ${
                          step.valid
                            ? "border-emerald-300/25 bg-emerald-400/[0.08] text-emerald-200"
                            : "border-amber-300/25 bg-amber-400/[0.08] text-amber-200"
                        }`}
                      >
                        {step.valid ? "valid" : "adjust"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{step.note}</p>
                  </div>

                  <div className="rounded-lg border border-white/[0.08] bg-black/25 px-3 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
                        disabled={stepIndex === 0}
                        className="h-8 rounded-md border border-white/[0.08] bg-white/[0.035] px-3 font-mono text-[10px] font-bold text-slate-100 transition hover:border-cyan-300/35 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPlaying((value) => !value)}
                        className={`h-8 min-w-16 rounded-md border px-3 font-mono text-[10px] font-bold transition ${
                          isPlaying
                            ? "border-rose-300/35 bg-rose-400/[0.1] text-rose-100"
                            : "border-cyan-300/45 bg-cyan-400/[0.12] text-cyan-100"
                        }`}
                      >
                        {isPlaying ? "Pause" : "Play"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setStepIndex((value) => Math.min(problem.steps.length - 1, value + 1))
                        }
                        disabled={stepIndex >= problem.steps.length - 1}
                        className="h-8 rounded-md border border-white/[0.08] bg-white/[0.035] px-3 font-mono text-[10px] font-bold text-slate-100 transition hover:border-cyan-300/35 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        Next
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-1.5">
                      {[0.5, 1, 2].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setSpeed(value)}
                          className={`h-7 rounded-md border font-mono text-[9px] transition ${
                            speed === value
                              ? "border-cyan-300/45 bg-cyan-400/[0.1] text-cyan-100"
                              : "border-white/[0.08] bg-white/[0.025] text-slate-400 hover:text-white"
                          }`}
                        >
                          {value}x
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 h-1.5 rounded-full border border-white/[0.08] bg-black/35 p-px">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300"
                        animate={{ width: `${progressPct}%` }}
                        transition={{ ease: "easeOut", duration: 0.25 }}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-1">
                  <VariablesPanel step={step} />
                  <StructurePanel problem={problem} step={step} />
                </div>
                <CodePanel problem={problem} activeLine={step.line} />
              </section>

              <Panel title="Execution Log" eyebrow="current run">
                <div
                  ref={logRef}
                  className="max-h-44 overflow-y-auto rounded-md border border-white/[0.06] bg-black/30 p-2 font-mono text-[10px] leading-5"
                  style={{ scrollBehavior: "smooth" }}
                >
                  <AnimatePresence initial={false}>
                    {shownSteps.map((item, index) => (
                      <motion.div
                        key={`${problem.id}-${index}-${item.action}`}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="grid gap-1 border-b border-white/[0.04] py-1 last:border-b-0"
                      >
                        <span className="text-cyan-200/70">
                          {index + 1}. line {item.line}: {item.action}
                        </span>
                        <span className="text-slate-400">{item.note}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </Panel>
            </main>
          </div>

          <SlidingWindowCatalog onOpenLive={selectProblem} />
        </div>
      </div>
    </>
  );
}
