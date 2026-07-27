import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";

type ArsenalSceneShellProps = {
  seo: { title: string; description: string; path: string };
  backLink: { to: string; label: string };
  eyebrow: string;
  title: string;
  subtitle: string;
  viewport: ReactNode;
  controls: ReactNode;
};

export function ArsenalSceneShell({
  seo,
  backLink,
  eyebrow,
  title,
  subtitle,
  viewport,
  controls,
}: ArsenalSceneShellProps) {
  return (
    <>
      <Seo title={seo.title} description={seo.description} path={seo.path} />
      <div className="relative min-h-screen overflow-hidden bg-[#050505] pb-20 pt-24 text-[#f1f3f7]">
        <div className="pointer-events-none absolute right-[-10%] top-[-10%] h-[50vw] w-[50vw] rounded-full bg-indigo-900/10 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-[-10%] left-[-10%] h-[50vw] w-[50vw] rounded-full bg-purple-900/10 blur-[120px]" />

        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
          <Link
            to={backLink.to}
            className="mb-8 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-slate-500 transition-colors hover:text-indigo-400"
          >
            {backLink.label}
          </Link>
          <header className="mb-10">
            <span className="mb-2 block font-mono text-[0.6875rem] uppercase tracking-[0.25em] text-indigo-400">
              {eyebrow}
            </span>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">
              {title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">{subtitle}</p>
          </header>

          <div className="grid items-start gap-8 lg:grid-cols-12">
            <div className="relative h-[450px] overflow-hidden rounded-2xl border border-white/15 bg-black/40 shadow-2xl sm:h-[550px] lg:col-span-8">
              {viewport}
            </div>
            <div className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl lg:col-span-4">
              {controls}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function AutoColorToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <div>
      <span className="mb-4 block font-mono text-[0.625rem] uppercase tracking-wider text-slate-500">
        Global Modifiers
      </span>
      <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.01] p-3">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-white/90">Spectrum Cycling</span>
          <span className="font-mono text-[9px] text-slate-500">Auto-shift hues</span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-300 focus:outline-none ${
            enabled
              ? "bg-gradient-to-r from-cyan-500 via-indigo-500 to-pink-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
              : "bg-white/10"
          }`}
          aria-label="Toggle Auto Color Shift"
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-300 ${
              enabled ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

export function ColorThemePicker<T extends string>({
  label,
  value,
  options,
  activeClass,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  activeClass: string;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <label className="mb-2 block font-mono text-xs text-slate-400">{label}</label>
      <div className="flex gap-2">
        {options.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`flex-1 rounded border py-1.5 font-mono text-[10px] uppercase transition-all ${
              value === color ? activeClass : "border-white/5 text-slate-400 hover:border-white/10"
            }`}
          >
            {color}
          </button>
        ))}
      </div>
    </div>
  );
}

export function RangeControl({
  label,
  value,
  display,
  min,
  max,
  step,
  accentClass,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  accentClass: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between font-mono text-xs text-slate-450">
        <span>{label}</span>
        <span>{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`w-full cursor-pointer ${accentClass}`}
      />
    </div>
  );
}
