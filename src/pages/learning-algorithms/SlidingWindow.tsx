import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Seo } from "@/components/Seo";
import { generateSlidingWindowSteps } from "@/utils/slidingWindowSteps";

const CARD_W = 50;
const CARD_GAP = 12;
const STRIDE = CARD_W + CARD_GAP;
const CHAMBER_PAD = 18;
const OUTSIDE_GAP = 14;
const CHAMBER_H = 70;
const DEFAULT_ARRAY = [2, 1, 5, 1, 3, 2, 7, 1, 4];

function Panel({
  title,
  eyebrow,
  className = "",
  children,
}: {
  title: string;
  eyebrow?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/[0.09] bg-[#07111f]/70 shadow-[0_16px_48px_rgba(0,0,0,0.28)] backdrop-blur-md ${className}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2">
        <div>
          {eyebrow ? (
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-300/70">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-100">
            {title}
          </h2>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden p-3">{children}</div>
    </section>
  );
}

export default function SlidingWindowPage() {
  const [array, setArray] = useState(DEFAULT_ARRAY);
  const [K, setK] = useState(3);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  const steps = useMemo(() => generateSlidingWindowSteps(array, K), [array, K]);

  useEffect(() => {
    if (currentStep >= steps.length) {
      setCurrentStep(Math.max(0, steps.length - 1));
    }
  }, [currentStep, steps.length]);

  const step = steps[currentStep] ?? steps[0];
  const progressPct = (currentStep / Math.max(steps.length - 1, 1)) * 100;
  const activeWindowValues = step.elementsInWindow.map((idx) => array[idx]);
  const chamberW = K * STRIDE - CARD_GAP + CHAMBER_PAD * 2;

  const terminalLines = useMemo(() => {
    const lines: string[] = [];
    for (let i = 0; i <= currentStep && i < steps.length; i++) {
      lines.push(`step ${i + 1}`);
      lines.push(...steps[i].logs);
    }
    return lines;
  }, [currentStep, steps]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines]);

  useEffect(() => {
    if (!isPlaying) return;

    const id = window.setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 3000 / speed);

    return () => window.clearInterval(id);
  }, [isPlaying, speed, steps.length]);

  const baseOffset = -((K - 1) * STRIDE) / 2;
  const cardX = (idx: number) => {
    const base = baseOffset + (idx - step.left) * STRIDE;
    if (idx < step.left) return base - OUTSIDE_GAP;
    if (idx > step.right) return base + OUTSIDE_GAP;
    return base;
  };

  const explanation =
    step.formula.outgoing === null
      ? `Build the first window by adding arr[${step.incomingIdx}] to the running sum.`
      : `Slide once: remove arr[${step.outgoingIdx}], add arr[${step.incomingIdx}], then compare with the maximum.`;

  const reset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const randomize = () => {
    setArray(Array.from({ length: 9 }, () => Math.floor(Math.random() * 9) + 1));
    reset();
  };

  const buttonClass =
    "min-h-8 rounded-lg border border-white/[0.09] bg-white/[0.045] px-3 py-1.5 font-mono text-[10px] font-semibold text-slate-100 transition hover:border-cyan-300/35 hover:bg-cyan-400/[0.08] disabled:cursor-not-allowed disabled:opacity-35";

  return (
    <>
      <Seo
        title="Sliding Window Machine"
        description="Watch a futuristic machine physically execute the Sliding Window algorithm."
        path="/learning/coding-patterns/sliding-window"
      />

      <div className="pointer-events-none fixed inset-x-0 top-0 z-30 h-16 bg-[#030712]/88 backdrop-blur-md" />

      <main className="relative flex h-full flex-col overflow-hidden bg-transparent pt-16 text-[#f1f3f7] selection:bg-cyan-400/20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(217,70,239,0.1),transparent_28%),radial-gradient(circle_at_76%_18%,rgba(14,165,233,0.1),transparent_30%),linear-gradient(180deg,rgba(3,7,18,0.1),rgba(3,7,18,0.92))]" />

        <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-2 px-3 py-2 sm:px-4 lg:px-6">
          <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1">
            <Link
              to="/learning/coding-patterns"
              className="font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-200/60 transition hover:text-cyan-200"
            >
              ← Patterns
            </Link>
            <h1 className="font-display text-lg font-black tracking-normal text-white sm:text-xl">
              Sliding Window
            </h1>
            <span className="hidden text-[10px] text-slate-400 sm:inline">
              Max sum · O(n) · K = {K}
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <div className="rounded-lg border border-emerald-300/20 bg-emerald-400/[0.055] px-2 py-1">
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-emerald-200">
                  Window
                </span>
                <span className="ml-1.5 font-mono text-xs font-semibold text-white">
                  [{step.left}..{step.right}]
                </span>
                <span className="ml-1.5 hidden text-[10px] text-slate-400 sm:inline">
                  {activeWindowValues.join("+")}
                </span>
              </div>
            </div>
          </div>

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#030816]/62 p-2 shadow-[0_20px_80px_rgba(0,0,0,0.42)] backdrop-blur-md sm:p-3">
            <div className="grid shrink-0 gap-2 lg:grid-cols-[0.85fr_1.3fr_0.85fr] lg:items-center">
              <div className="flex items-center gap-2 rounded-lg border border-cyan-300/15 bg-cyan-400/[0.04] px-2.5 py-1.5">
                <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full">
                  <div className="absolute inset-0 rounded-full border border-dashed border-cyan-300/30 [animation:spin_28s_linear_infinite]" />
                  <motion.span
                    key={step.currentSum}
                    className="relative z-10 font-display text-lg font-black text-white"
                    initial={{ scale: 1.2, opacity: 0.45 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 14 }}
                  >
                    {step.currentSum}
                  </motion.span>
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-cyan-200">
                    Sum
                  </p>
                  <p className="text-[10px] text-slate-400">In chamber</p>
                </div>
              </div>

              <div className="rounded-lg border border-white/[0.08] bg-black/20 px-2.5 py-1.5 text-center">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-400">
                  Step {currentStep + 1}/{steps.length}
                </p>
                <p className="mx-auto mt-0.5 line-clamp-2 text-[10px] leading-4 text-slate-200">
                  {explanation}
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-amber-300/15 bg-amber-400/[0.045] px-2.5 py-1.5">
                <motion.div
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-amber-300/35 bg-amber-950/20"
                  animate={{
                    boxShadow: step.isNewMax
                      ? "0 0 24px rgba(245,158,11,0.32)"
                      : "0 0 8px rgba(245,158,11,0.08)",
                  }}
                >
                  <motion.span
                    key={step.maxSum}
                    className="font-display text-lg font-black text-amber-300"
                    initial={{ scale: step.isNewMax ? 1.2 : 1 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 250, damping: 13 }}
                  >
                    {step.maxSum}
                  </motion.span>
                </motion.div>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-amber-200">
                    Max
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {step.isNewMax ? "New record" : "Best so far"}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative mt-2 min-h-0 flex-1 overflow-hidden rounded-lg border border-cyan-300/12 bg-[#020713]/70">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(34,211,238,0.07)_1px,transparent_1px),linear-gradient(rgba(148,163,184,0.035)_1px,transparent_1px)] bg-[size:36px_36px] opacity-45" />
              <div className="relative h-full min-h-[7.5rem]">
                <div
                  className="absolute left-1/2 top-1/2 z-10 pointer-events-none"
                  style={{
                    width: chamberW,
                    height: CHAMBER_H,
                    marginLeft: -chamberW / 2,
                    marginTop: -CHAMBER_H / 2,
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-[14px] border border-cyan-300/45 bg-cyan-500/[0.055]"
                    style={{
                      boxShadow:
                        "0 0 28px rgba(34,211,238,0.18), inset 0 0 18px rgba(34,211,238,0.06)",
                    }}
                  />
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full border border-cyan-300/25 bg-[#04101f]/90 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.14em] text-cyan-100">
                    Chamber · K={K}
                  </div>
                  <div className="absolute -left-1 top-1/2 h-8 w-2 -translate-y-1/2 rounded-l border-y border-l border-cyan-300/70" />
                  <div className="absolute -right-1 top-1/2 h-8 w-2 -translate-y-1/2 rounded-r border-y border-r border-cyan-300/70" />
                  <motion.div
                    className="absolute left-3 right-3 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent"
                    animate={{ y: [6, CHAMBER_H - 6] }}
                    transition={{
                      repeat: Infinity,
                      repeatType: "reverse",
                      duration: 2.6,
                      ease: "linear",
                    }}
                  />
                  <div className="absolute -bottom-4 left-0 font-mono text-[8px] uppercase text-cyan-200/75">
                    L {step.left}
                  </div>
                  <div className="absolute -bottom-4 right-0 font-mono text-[8px] uppercase text-emerald-200/75">
                    R {step.right}
                  </div>
                </div>

                <div className="absolute inset-0 flex items-center justify-center">
                  {array.map((value, idx) => {
                    const isInside = step.elementsInWindow.includes(idx);
                    const isOutgoing = step.outgoingIdx === idx;
                    const isIncoming = step.incomingIdx === idx && isInside;
                    const isDeparted = idx < step.left;
                    const x = cardX(idx);

                    const stateClass = isOutgoing
                      ? "border-rose-400/65 bg-rose-500/16 text-rose-200"
                      : isIncoming
                        ? "border-emerald-300/70 bg-emerald-400/16 text-emerald-100"
                        : isInside
                          ? "border-cyan-300/70 bg-cyan-400/13 text-white"
                          : "border-white/[0.08] bg-slate-900/72 text-slate-500";

                    return (
                      <motion.button
                        key={idx}
                        type="button"
                        className={`absolute z-20 grid rounded-lg border text-center font-display text-xl font-black ${stateClass}`}
                        style={{ width: CARD_W, height: CARD_W }}
                        initial={false}
                        animate={{
                          x,
                          y: isOutgoing ? 8 : isIncoming ? -5 : 0,
                          opacity: isDeparted ? 0.48 : isInside ? 1 : 0.62,
                          scale: isInside ? 1.04 : 0.88,
                        }}
                        whileHover={{ y: isInside ? -8 : -4, scale: isInside ? 1.06 : 0.92 }}
                        transition={{ type: "tween", ease: "easeOut", duration: 0.42 }}
                        onMouseEnter={() => setHoveredCard(idx)}
                        onMouseLeave={() => setHoveredCard(null)}
                        aria-label={`Array index ${idx}, value ${value}`}
                      >
                        <span className="m-auto">{value}</span>
                        <span
                          className={`absolute -bottom-4 left-0 right-0 font-mono text-[8px] font-semibold ${
                            isOutgoing
                              ? "text-rose-300"
                              : isInside
                                ? "text-cyan-100"
                                : "text-slate-500"
                          }`}
                        >
                          {idx}
                        </span>
                        <AnimatePresence>
                          {hoveredCard === idx ? (
                            <motion.span
                              className="absolute -top-6 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded border border-white/[0.1] bg-slate-950 px-1.5 py-0.5 font-mono text-[8px] text-slate-200"
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 4 }}
                            >
                              arr[{idx}]={value}
                            </motion.span>
                          ) : null}
                        </AnimatePresence>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-2 shrink-0 rounded-lg border border-white/[0.08] bg-black/25 px-3 py-1.5">
              <div className="grid gap-0.5 text-center font-mono sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
                <div>
                  <p className="text-[8px] uppercase text-cyan-200">Prev</p>
                  <p className="text-base font-bold text-cyan-100">{step.formula.prevSum}</p>
                </div>
                <span className="hidden text-base text-slate-500 sm:block">-</span>
                <div>
                  <p className="text-[8px] uppercase text-rose-200">Out</p>
                  <p className="text-base font-bold text-rose-300">{step.formula.outgoing ?? 0}</p>
                </div>
                <span className="hidden text-base text-slate-500 sm:block">+</span>
                <div>
                  <p className="text-[8px] uppercase text-emerald-200">In</p>
                  <p className="text-base font-bold text-emerald-300">{step.formula.incoming}</p>
                </div>
              </div>
              <p className="text-center font-mono text-[9px] text-slate-400">
                = {step.formula.newSum}
              </p>
            </div>
          </section>

          <section className="grid min-h-0 shrink-0 gap-2 lg:grid-cols-[1fr_1.1fr_0.85fr] lg:max-h-[10rem]">
            <Panel title="Event log" className="min-h-0">
              <div
                ref={terminalRef}
                className="h-full max-h-[6.5rem] overflow-y-auto rounded-lg bg-black/35 p-2 font-mono text-[9px] leading-3.5"
                style={{ scrollBehavior: "smooth" }}
              >
                {terminalLines.map((line, i) => {
                  const isHeading = line.startsWith("step");
                  const isMax = line.includes("MAX");
                  const isMove = line.startsWith("IN") || line.startsWith("OUT");
                  return (
                    <div
                      key={`${line}-${i}`}
                      className={
                        isHeading
                          ? "mt-1 text-cyan-200/55"
                          : isMax
                            ? "text-amber-300"
                            : isMove
                              ? "text-emerald-300"
                              : "text-slate-400"
                      }
                    >
                      <span className="text-cyan-400/70">&gt;</span> {line}
                    </div>
                  );
                })}
                <span className="text-emerald-400 animate-pulse">_</span>
              </div>
            </Panel>

            <Panel title="Controls" className="min-h-0">
              <div className="grid gap-1.5">
                <div className="grid grid-cols-4 gap-1">
                  <button
                    type="button"
                    onClick={() => currentStep > 0 && setCurrentStep((s) => s - 1)}
                    disabled={currentStep === 0}
                    className={buttonClass}
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPlaying((value) => !value)}
                    className={`min-h-8 rounded-lg border px-2 py-1 font-mono text-[10px] font-bold transition ${
                      isPlaying
                        ? "border-rose-300/35 bg-rose-400/[0.1] text-rose-100"
                        : "border-cyan-300/45 bg-cyan-400/[0.12] text-cyan-100"
                    }`}
                  >
                    {isPlaying ? "Pause" : "Play"}
                  </button>
                  <button
                    type="button"
                    onClick={() => currentStep < steps.length - 1 && setCurrentStep((s) => s + 1)}
                    disabled={currentStep >= steps.length - 1}
                    className={buttonClass}
                  >
                    Next
                  </button>
                  <button type="button" onClick={reset} className={buttonClass}>
                    Reset
                  </button>
                </div>

                <div className="grid grid-cols-[1fr_auto] items-center gap-1.5">
                  <div className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-2 py-1">
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor="window-size"
                        className="font-mono text-[8px] uppercase tracking-[0.12em] text-slate-300"
                      >
                        Window K
                      </label>
                      <span className="font-mono text-xs font-bold text-white">{K}</span>
                    </div>
                    <input
                      id="window-size"
                      type="range"
                      min={2}
                      max={Math.min(5, array.length)}
                      value={K}
                      onChange={(event) => {
                        setK(Number(event.target.value));
                        reset();
                      }}
                      className="mt-1 h-1 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-cyan-300"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-1">
                      {[0.5, 1, 2].map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setSpeed(item)}
                          className={`h-6 min-w-9 rounded-lg border font-mono text-[9px] transition ${
                            speed === item
                              ? "border-cyan-300/45 bg-cyan-400/[0.1] text-cyan-100"
                              : "border-white/[0.08] bg-white/[0.025] text-slate-400 hover:text-white"
                          }`}
                        >
                          {item}x
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={randomize} className={buttonClass}>
                      Randomize
                    </button>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel
              title="Progress"
              eyebrow={`${currentStep + 1}/${steps.length}`}
              className="min-h-0"
            >
              <div className="flex flex-wrap gap-1">
                {steps.map((_, idx) => {
                  const isCurrent = currentStep === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setCurrentStep(idx);
                        setIsPlaying(false);
                      }}
                      className={`grid h-6 w-6 place-items-center rounded-full border font-mono text-[9px] transition ${
                        isCurrent
                          ? "border-cyan-200 bg-cyan-400/25 text-white"
                          : idx < currentStep
                            ? "border-cyan-300/35 bg-cyan-400/[0.08] text-cyan-100"
                            : "border-white/[0.1] bg-white/[0.025] text-slate-400"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
              <div className="mt-1.5 h-1.5 rounded-full border border-white/[0.08] bg-black/35 p-px">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300"
                  animate={{ width: `${progressPct}%` }}
                  transition={{ ease: "easeOut", duration: 0.35 }}
                />
              </div>
            </Panel>
          </section>
        </div>
      </main>
    </>
  );
}
