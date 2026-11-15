import { useEffect, useState, type ReactNode } from "react";
import { Seo } from "@/components/Seo";
import { DESIGNS } from "@/designs/registry";
import { MIN_VISITS_TO_REPORT } from "@/experiments/config";
import { EXPERIMENTS_ENDPOINT } from "@/experiments/endpoint";
import type { DesignResult, ResultsDoc } from "@/experiments/results";
import type { WeightLogEntry } from "@/experiments/bandit";
import "./experiments.css";

type State =
  | { kind: "off" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; doc: ResultsDoc };

const NOT_ENOUGH = "not enough data";

const labelOf = (id: string) => DESIGNS.find((d) => d.id === id)?.label ?? id;
const pct = (x: number, digits = 0) => `${(x * 100).toFixed(digits)}%`;
const dateOf = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

/** The Worker marks weights that have never moved with time zero (or no time at all). */
const neverChanged = (iso: string) => !(Date.parse(iso) > 0);

/** A term with a plain-language explanation on hover or keyboard focus. */
function Explain({ children, text }: { children: ReactNode; text: string }) {
  return (
    <span className="exp-explain" tabIndex={0}>
      {children}
      <span role="tooltip" className="exp-tip">
        {text}
      </span>
    </span>
  );
}

function useResults(): State {
  const [state, setState] = useState<State>(() =>
    EXPERIMENTS_ENDPOINT ? { kind: "loading" } : { kind: "off" }
  );
  useEffect(() => {
    if (!EXPERIMENTS_ENDPOINT) return;
    const controller = new AbortController();
    fetch(`${EXPERIMENTS_ENDPOINT}/results`, { signal: controller.signal, credentials: "omit" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`the results service answered HTTP ${res.status}`);
        setState({ kind: "ready", doc: (await res.json()) as ResultsDoc });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error("[experiments] results failed to load", error);
        setState({ kind: "error", message: (error as Error).message ?? String(error) });
      });
    return () => controller.abort();
  }, []);
  return state;
}

function SplitBar({ doc }: { doc: ResultsDoc }) {
  const ordered = [...doc.designs].sort((a, b) => b.weight - a.weight);
  const leader = ordered[0]?.design;
  const mode = doc.weights.mode;
  return (
    <section className="exp-panel" aria-labelledby="exp-split">
      <div className="exp-panel-head">
        <h2 id="exp-split" className="exp-h2">
          <Explain text="The share of first-time visitors who are shown each design right now. Returning visitors keep the design they were first given.">
            Traffic split today
          </Explain>
        </h2>
        <span className={`exp-mode exp-mode--${mode}`}>
          {mode === "auto" && "Automatic"}
          {mode === "frozen" && "Frozen by the kill switch"}
          {mode === "forced" && `Everyone sees ${labelOf(doc.weights.forced ?? "")}`}
        </span>
      </div>
      <div
        className="exp-split"
        role="img"
        aria-label={ordered.map((d) => `${labelOf(d.design)} ${pct(d.weight)}`).join(", ")}
      >
        {ordered.map((d) => (
          <div
            key={d.design}
            className={`exp-split-seg${d.design === leader ? " is-lead" : ""}`}
            style={{ flexGrow: Math.max(d.weight, 0.0001) }}
          >
            <span className="exp-split-name">{labelOf(d.design)}</span>
            <span className="exp-split-value">{pct(d.weight)}</span>
          </div>
        ))}
      </div>
      <p className="exp-note">
        Every design keeps at least {pct(doc.settings.floor)} of new visitors and none is ever
        removed. Weights move at most {pct(doc.settings.maxStep)} per day, and only after each
        design has {doc.settings.minEngagedPerDesign} engaged visits.{" "}
        {neverChanged(doc.weights.updatedAt)
          ? "Still at the starting split."
          : `Last changed ${dateOf(doc.weights.updatedAt)}.`}
      </p>
    </section>
  );
}

function scaleMax(designs: DesignResult[]): number {
  const top = Math.max(0.2, ...designs.map((d) => d.rate?.high ?? 0));
  return Math.min(1, Math.ceil((top * 1.1) / 0.1) * 0.1);
}

function RateBar({ d, max, baseline }: { d: DesignResult; max: number; baseline: number | null }) {
  if (!d.rate) {
    return (
      <div className="exp-rate exp-rate--empty">
        <span>
          Not enough data: {d.sessions} of {MIN_VISITS_TO_REPORT} visits needed to show a rate
        </span>
      </div>
    );
  }
  const at = (x: number) => `${(x / max) * 100}%`;
  return (
    <div className="exp-rate" aria-hidden="true">
      <div className="exp-rate-track" />
      {baseline !== null && <div className="exp-rate-base" style={{ left: at(baseline) }} />}
      <div
        className="exp-rate-range"
        style={{ left: at(d.rate.low), width: at(d.rate.high - d.rate.low) }}
      />
      <div className="exp-rate-dot" style={{ left: at(d.rate.mean) }} />
      <div className="exp-rate-ticks">
        {Array.from({ length: Math.round(max / 0.1) + 1 }, (_, i) => (
          <span key={i} style={{ left: at(i * 0.1) }}>
            {i * 10}%
          </span>
        ))}
      </div>
    </div>
  );
}

const VERDICT: Record<DesignResult["verdict"], { label: string; text: string }> = {
  ok: {
    label: "Healthy",
    text: "Load speed, layout stability and errors are no worse than Editorial's.",
  },
  regressed: {
    label: "Regressed",
    text: "Slower, jumpier or more error-prone than Editorial, so this design is held at the minimum share until it is fixed.",
  },
  unknown: {
    label: "Not enough data",
    text: "Too few measurements to compare with Editorial yet, so this design cannot rise above an equal share.",
  },
};

function Guardrail({ label, value, text }: { label: string; value: string | null; text: string }) {
  return (
    <div className="exp-guard">
      <dt>
        <Explain text={text}>{label}</Explain>
      </dt>
      <dd className={value === null ? "is-empty" : ""}>{value ?? NOT_ENOUGH}</dd>
    </div>
  );
}

function DesignCard({
  d,
  max,
  baseline,
  minEngaged,
}: {
  d: DesignResult;
  max: number;
  baseline: number | null;
  minEngaged: number;
}) {
  const g = d.guardrails;
  const verdict = VERDICT[d.verdict];
  const progress = Math.min(1, d.engaged / minEngaged);
  return (
    <article className="exp-card" data-design={d.design}>
      <header className="exp-card-head">
        <div>
          <h3 className="exp-h3">{labelOf(d.design)}</h3>
          <p className="exp-card-sub">
            <Explain text="Visits by people who were given this design automatically. Visits that chose a design with ?design= or the picker are not counted.">
              {d.sessions.toLocaleString()} visits
            </Explain>
            {" · "}
            <Explain text="Visits that stayed 30 seconds or more with the tab visible, read past half the page, or opened a project, article, contact link or outside link — without switching to another design.">
              {d.engaged.toLocaleString()} engaged
            </Explain>
          </p>
        </div>
        <div className="exp-weight">
          <Explain text="The share of new visitors this design is shown to right now.">
            <span className="exp-weight-value">{pct(d.weight)}</span>
          </Explain>
          <span className="exp-weight-label">of traffic</span>
        </div>
      </header>

      <div className="exp-score">
        <div className="exp-score-head">
          <Explain text="The share of visits that were engaged. The bar shows the range the true rate is 95% likely to sit in; it narrows as visits add up. The thin line is Editorial's rate.">
            Engaged rate
          </Explain>
          <span className={`exp-score-value${d.rate ? "" : " is-empty"}`}>
            {d.rate ? `${pct(d.rate.mean, 1)}` : NOT_ENOUGH}
            {d.rate && (
              <span className="exp-score-ci">
                {" "}
                ({pct(d.rate.low)} to {pct(d.rate.high)})
              </span>
            )}
          </span>
        </div>
        <RateBar d={d} max={max} baseline={d.design === "editorial" ? null : baseline} />
      </div>

      <div className="exp-ready">
        <Explain
          text={`Weights stay put until every design has ${minEngaged} engaged visits, so a lucky first week cannot shift traffic.`}
        >
          {d.readyToMove
            ? "Has enough engaged visits to move"
            : `${d.engaged} of ${minEngaged} engaged visits before it can move`}
        </Explain>
        <div className="exp-ready-track" aria-hidden="true">
          <div className="exp-ready-fill" style={{ transform: `scaleX(${progress})` }} />
        </div>
      </div>

      <dl className="exp-guards">
        <div className="exp-guard exp-guard--verdict">
          <dt>
            <Explain text="Checks that this design is not slower, jumpier or buggier than Editorial.">
              Guardrails
            </Explain>
          </dt>
          <dd>
            <Explain text={[verdict.text, ...d.verdictReasons].join(" ")}>
              <span className={`exp-verdict exp-verdict--${d.verdict}`}>{verdict.label}</span>
            </Explain>
          </dd>
        </div>
        <Guardrail
          label="Load (LCP p75)"
          value={g.lcpP75 === null ? null : `${(g.lcpP75 / 1000).toFixed(2)} s`}
          text={`How long until the main content appears, for the slowest quarter of page views (${g.lcpSamples} measured).`}
        />
        <Guardrail
          label="Layout shift (CLS p75)"
          value={g.clsP75 === null ? null : g.clsP75.toFixed(3)}
          text={`How much the page jumps around while loading; lower is better, under 0.1 is good (${g.clsSamples} measured).`}
        />
        <Guardrail
          label="Errors"
          value={g.errorRate === null ? null : `${pct(g.errorRate, 1)} of page views`}
          text={`Script errors seen per page view (${g.pageviews} page views).`}
        />
        <Guardrail
          label="Switched away"
          value={d.sessions < MIN_VISITS_TO_REPORT ? null : pct(d.switchedAway / d.sessions, 1)}
          text="Visits where the person picked a different design in the picker: a sign they did not like this one."
        />
      </dl>
    </article>
  );
}

function History({ entries }: { entries: WeightLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="exp-note">No updates have run yet. The first runs at the next daily update.</p>
    );
  }
  return (
    <ol className="exp-history">
      {entries.map((e) => (
        <li key={e.at} className={`exp-history-item${e.changed ? " is-changed" : ""}`}>
          <div className="exp-history-meta">
            <time dateTime={e.at}>{dateOf(e.at)}</time>
            <span className={`exp-history-tag${e.changed ? " is-changed" : ""}`}>
              {e.changed ? "Changed" : "Held"}
            </span>
          </div>
          <p className="exp-history-reason">{e.reason}</p>
          <div className="exp-history-weights">
            {Object.keys(e.to).map((d) => (
              <Explain
                key={d}
                text={`${labelOf(d)}: ${e.samples[d]?.engaged ?? 0} engaged of ${e.samples[d]?.sessions ?? 0} visits at the time${
                  e.probabilityBest
                    ? `, ${pct(e.probabilityBest[d] ?? 0)} chance of being best`
                    : ""
                }.`}
              >
                <span className="exp-history-weight">
                  {labelOf(d)}{" "}
                  {e.changed && Math.abs((e.from[d] ?? 0) - e.to[d]) >= 0.0005 ? (
                    <>
                      <s>{pct(e.from[d] ?? 0)}</s> → <strong>{pct(e.to[d])}</strong>
                    </>
                  ) : (
                    <strong>{pct(e.to[d])}</strong>
                  )}
                </span>
              </Explain>
            ))}
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function ExperimentsPage() {
  const state = useResults();
  return (
    <>
      <Seo
        title="Design experiments"
        description="How each design of this site is doing."
        noIndex
      />
      <div className="exp-page">
        <header className="exp-hero">
          <p className="exp-eyebrow">Design experiments</p>
          <h1 className="exp-h1">Which design serves readers best</h1>
          <p className="exp-lede">
            New visitors are shown one of the site's designs at random, weighted toward the one that
            keeps people reading. No cookies and nothing personal is collected.
          </p>
        </header>

        {state.kind === "off" && (
          <p className="exp-panel exp-message">
            Experiments are off on this build: no results service is configured.
          </p>
        )}
        {state.kind === "loading" && (
          <p className="exp-panel exp-message" aria-busy="true">
            Loading results…
          </p>
        )}
        {state.kind === "error" && (
          <p className="exp-panel exp-message exp-message--error" role="alert">
            Results could not be loaded: {state.message}.
          </p>
        )}
        {state.kind === "ready" && <Ready doc={state.doc} />}
      </div>
    </>
  );
}

function Ready({ doc }: { doc: ResultsDoc }) {
  const max = scaleMax(doc.designs);
  const baseline = doc.designs.find((d) => d.design === "editorial")?.rate?.mean ?? null;
  return (
    <>
      {doc.sample && (
        <p className="exp-sample" role="note">
          Sample numbers from the local dev server, not real visitors.
        </p>
      )}
      <SplitBar doc={doc} />
      <section aria-labelledby="exp-designs" className="exp-section">
        <h2 id="exp-designs" className="exp-h2">
          Designs
        </h2>
        <p className="exp-legend">
          <span>
            <i className="exp-verdict-dot exp-verdict--ok" /> Healthy
          </span>
          <span>
            <i className="exp-verdict-dot exp-verdict--unknown" /> Not enough data
          </span>
          <span>
            <i className="exp-verdict-dot exp-verdict--regressed" /> Regressed, held at the minimum
          </span>
        </p>
        <div className="exp-grid">
          {doc.designs.map((d) => (
            <DesignCard
              key={d.design}
              d={d}
              max={max}
              baseline={baseline}
              minEngaged={doc.settings.minEngagedPerDesign}
            />
          ))}
        </div>
      </section>
      <section aria-labelledby="exp-history" className="exp-section">
        <h2 id="exp-history" className="exp-h2">
          <Explain text="Every daily update, whether it moved the weights or not, with the reason and the numbers it used.">
            Change history
          </Explain>
        </h2>
        <History entries={doc.history} />
      </section>
      <p className="exp-foot">
        Covers the last {doc.windowDays} days. Updated {dateOf(doc.generatedAt)}. What is collected
        and why: docs/experiments.md in the site's repository.
      </p>
    </>
  );
}
