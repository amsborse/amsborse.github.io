import {
  parseWeightsDoc,
  pickDesign,
  readAssignment,
  resolveDesign,
  type Assignment,
  type DesignSource,
  type WeightsDoc,
} from "./assignment";
import {
  ASSIGNMENT_STORAGE_KEY,
  BATCH,
  BOUNCE,
  LAST_VISIT_STORAGE_KEY,
  RETURN_WINDOW_MS,
  SESSION_IDLE_MS,
  SESSION_STORAGE_KEY,
  VISITOR_STORAGE_KEY,
  WEIGHTS_TIMEOUT_MS,
} from "./config";
import { EXPERIMENTS_ENDPOINT } from "./endpoint";
import { beaconSender, classifyLink, EventQueue, scrubText, type ExperimentEvent } from "./events";
import { browserSignals, mayMeasure } from "./privacy";
import { cryptoRng, type Rng } from "./random";

/** The picker's storage key, kept in step with theme/design.ts (which imports nothing from here). */
const PICKER_STORAGE_KEY = "portfolio-design";

export type ExperimentContext = {
  /** False for bots, Do Not Track, Global Privacy Control, or no endpoint: nothing is sent. */
  measuring: boolean;
  design: string;
  source: DesignSource;
  assigned: string | null;
};

type Deps = {
  endpoint: string;
  designs: readonly string[];
  fallback: string;
  rng: Rng;
  fetchImpl: typeof fetch;
  timeoutMs: number;
};

function storageGet(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}

function storageSet(storage: () => Storage, key: string, value: string): void {
  try {
    storage().setItem(key, value);
  } catch {
    /* storage blocked: the value lasts for this page only */
  }
}

const local = () => window.localStorage;
const session = () => window.sessionStorage;

/** Errors that happened before the tracker started; sent with its first batch. */
const pendingEvents: ExperimentEvent[] = [];

async function fetchWeights(deps: Deps): Promise<WeightsDoc> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs);
  try {
    const response = await deps.fetchImpl(`${deps.endpoint}/weights.json`, {
      signal: controller.signal,
      cache: "no-store",
      credentials: "omit",
    });
    if (!response.ok) throw new Error(`weights.json answered HTTP ${response.status}`);
    return parseWeightsDoc(await response.json(), deps.designs);
  } finally {
    clearTimeout(timer);
  }
}

function reportWeightsFailure(error: unknown, design: string) {
  const reason = error instanceof Error ? error.message : String(error);
  // Loud on purpose: the visitor silently gets the default design, the owner must not miss it.
  console.error(`[experiments] weights.json failed, showing the default design: ${reason}`);
  pendingEvents.push({
    t: "weights_error",
    ts: Date.now(),
    design,
    label: scrubText(reason, 120),
  });
}

/**
 * Decides the design before the first render. A first-time visitor (no ?design=, no picker
 * choice, no earlier assignment) waits for the weights, up to a short timeout, and gets a
 * weighted random pick that is saved and kept on return visits. Everyone else renders at once.
 */
export async function prepareExperiment(
  designs: readonly string[],
  fallback: string,
  overrides: Partial<Deps> = {}
): Promise<ExperimentContext> {
  const deps: Deps = {
    endpoint: EXPERIMENTS_ENDPOINT,
    designs,
    fallback,
    rng: cryptoRng(),
    fetchImpl: (...args) => fetch(...args),
    timeoutMs: WEIGHTS_TIMEOUT_MS,
    ...overrides,
  };
  const measuring = Boolean(deps.endpoint) && mayMeasure(browserSignals());
  let fromUrl: string | null = null;
  try {
    fromUrl = new URLSearchParams(window.location.search).get("design");
  } catch {
    fromUrl = null;
  }
  const fromPicker = storageGet(local, PICKER_STORAGE_KEY);
  let assignment = readAssignment(storageGet(local, ASSIGNMENT_STORAGE_KEY), designs);
  const resolved = resolveDesign({ designs, fallback, fromUrl, fromPicker, assignment });

  if (!measuring) {
    return { measuring, ...resolved, assigned: assignment?.design ?? null };
  }

  if (resolved.source === "default") {
    // First visit: the only path that waits for the network.
    try {
      const doc = await fetchWeights(deps);
      assignment = {
        design: pickDesign(doc, designs, deps.rng),
        at: Date.now(),
        version: doc.version,
      };
      storageSet(local, ASSIGNMENT_STORAGE_KEY, JSON.stringify(assignment));
      return { measuring, design: assignment.design, source: "auto", assigned: assignment.design };
    } catch (error) {
      reportWeightsFailure(error, fallback);
      return { measuring, design: fallback, source: "fallback", assigned: null };
    }
  }

  if (assignment) refreshForcedAssignment(deps, assignment, resolved.design);
  return { measuring, ...resolved, assigned: assignment?.design ?? null };
}

/**
 * Returning visitors render at once; the weights are checked in the background only so the
 * kill switch can move an automatic assignment to the forced design from the next visit on.
 */
function refreshForcedAssignment(deps: Deps, assignment: Assignment, shown: string) {
  fetchWeights(deps)
    .then((doc) => {
      if (doc.mode !== "forced" || !doc.forced || doc.forced === assignment.design) return;
      const next: Assignment = { design: doc.forced, at: Date.now(), version: doc.version };
      storageSet(local, ASSIGNMENT_STORAGE_KEY, JSON.stringify(next));
    })
    .catch((error: unknown) => reportWeightsFailure(error, shown));
}

/* ------------------------------------------------------------------------------------------ */
/* Tracker: started once after the first render, only when measuring.                          */
/* ------------------------------------------------------------------------------------------ */

type SessionState = {
  id: string;
  start: number;
  last: number;
  pages: number;
  visibleMs: number;
  maxScroll: number;
  clicks: number;
  bounced: boolean;
};

let tracker: Tracker | null = null;

function randomId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

class Tracker {
  private readonly queue: EventQueue;
  private readonly visitor: string;
  private state: SessionState;
  private visibleSince: number | null;
  private unsentVisibleMs = 0;
  private path = "";
  private scrollMarks = new Set<number>();
  private userScrolled = false;
  private errorsThisPage = 0;
  private lcp: number | null = null;
  private cls = 0;
  private vitalsSent = false;

  constructor(
    private ctx: ExperimentContext,
    endpoint: string
  ) {
    this.visitor = storageGet(local, VISITOR_STORAGE_KEY) ?? randomId();
    storageSet(local, VISITOR_STORAGE_KEY, this.visitor);
    this.state = this.loadSession();
    this.visibleSince = document.visibilityState === "visible" ? Date.now() : null;
    this.queue = new EventQueue(
      () => ({
        v: 1,
        vid: this.visitor,
        sid: this.state.id,
        assigned: this.ctx.assigned,
        source: this.ctx.source,
      }),
      beaconSender(`${endpoint}/events`)
    );
    for (const event of pendingEvents.splice(0)) this.queue.push(event);
    this.listen();
  }

  private loadSession(): SessionState {
    const now = Date.now();
    try {
      const stored = JSON.parse(storageGet(session, SESSION_STORAGE_KEY) ?? "null") as SessionState;
      if (stored && now - stored.last < SESSION_IDLE_MS) return stored;
    } catch {
      /* corrupt or blocked: start a new session */
    }
    const fresh: SessionState = {
      id: randomId(),
      start: now,
      last: now,
      pages: 0,
      visibleMs: 0,
      maxScroll: 0,
      clicks: 0,
      bounced: false,
    };
    const previous = Number(storageGet(local, LAST_VISIT_STORAGE_KEY));
    storageSet(local, LAST_VISIT_STORAGE_KEY, String(now));
    if (previous > 0 && now - previous <= RETURN_WINDOW_MS && now - previous >= SESSION_IDLE_MS) {
      pendingEvents.push({
        t: "return_visit",
        ts: now,
        design: this.ctx.design,
        value: Math.round((now - previous) / 3_600_000),
      });
    }
    return fresh;
  }

  private saveSession() {
    this.state.last = Date.now();
    storageSet(session, SESSION_STORAGE_KEY, JSON.stringify(this.state));
  }

  private push(event: Omit<ExperimentEvent, "ts" | "design">) {
    this.queue.push({ ts: Date.now(), design: this.ctx.design, ...event });
    this.saveSession();
  }

  pageview(path: string) {
    if (path === this.path) return;
    this.path = path;
    this.scrollMarks = new Set();
    this.userScrolled = false;
    this.errorsThisPage = 0;
    this.state.pages += 1;
    this.push({ t: "pageview", path });
  }

  designSwitched(to: string) {
    if (to === this.ctx.design) return;
    this.push({
      t: "design_switch",
      path: this.path,
      label: to,
      // 1 marks switching away from the automatic assignment: the negative signal.
      value: this.ctx.source === "auto" && this.ctx.assigned !== to ? 1 : 0,
    });
    this.ctx = { ...this.ctx, design: to, source: "picker" };
  }

  private takeVisible(now: number) {
    if (this.visibleSince !== null) {
      this.unsentVisibleMs += now - this.visibleSince;
      this.visibleSince = now;
    }
  }

  flush() {
    const now = Date.now();
    this.takeVisible(now);
    const ms = Math.round(this.unsentVisibleMs);
    if (ms >= 1000) {
      this.state.visibleMs += ms;
      this.unsentVisibleMs = 0;
      this.push({ t: "engaged_time", path: this.path, value: ms });
    }
    this.queue.flush();
  }

  private onScroll = () => {
    this.userScrolled = true;
    const doc = document.documentElement;
    const height = Math.max(doc.scrollHeight - window.innerHeight, 1);
    const percent = Math.min(100, Math.round((window.scrollY / height) * 100));
    this.state.maxScroll = Math.max(this.state.maxScroll, percent);
    for (const mark of [25, 50, 75, 100]) {
      if (percent >= mark && !this.scrollMarks.has(mark)) {
        this.scrollMarks.add(mark);
        this.push({ t: "scroll", path: this.path, value: mark });
      }
    }
  };

  private onClick = (event: MouseEvent) => {
    const anchor = (event.target as Element | null)?.closest?.("a[href]");
    if (!anchor) return;
    const kind = classifyLink(anchor.getAttribute("href") ?? "", window.location.origin);
    if (!kind) return;
    this.state.clicks += 1;
    this.push({ t: "click", path: this.path, label: kind });
    // Outbound and mail links leave the page: send now rather than hope for pagehide.
    if (kind === "outbound" || kind === "contact") this.flush();
  };

  private onError = (name: string, message: string) => {
    if (this.errorsThisPage >= 5) return;
    this.errorsThisPage += 1;
    this.push({ t: "js_error", path: this.path, label: scrubText(`${name}: ${message}`, 100) });
  };

  private sendVitals() {
    if (this.vitalsSent) return;
    this.vitalsSent = true;
    if (this.lcp !== null) this.push({ t: "lcp", path: this.path, value: Math.round(this.lcp) });
    this.push({ t: "cls", path: this.path, value: Math.round(this.cls * 1000) / 1000 });
  }

  private onHidden = () => {
    this.sendVitals();
    this.flush();
    this.visibleSince = null;
  };

  private onPageHide = () => {
    this.takeVisible(Date.now());
    const s = this.state;
    const visible = s.visibleMs + this.unsentVisibleMs;
    if (
      !s.bounced &&
      s.pages <= 1 &&
      visible < BOUNCE.visibleMs &&
      s.maxScroll < BOUNCE.maxScrollPercent &&
      s.clicks === 0
    ) {
      s.bounced = true;
      this.push({ t: "bounce", path: this.path, value: Math.round(visible) });
    }
    this.onHidden();
  };

  private listen() {
    let ticking = false;
    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          this.onScroll();
        });
      },
      { passive: true }
    );
    document.addEventListener("click", this.onClick, { capture: true });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") this.onHidden();
      else this.visibleSince = Date.now();
    });
    window.addEventListener("pagehide", this.onPageHide);
    window.addEventListener("error", (e) => this.onError(e.error?.name ?? "Error", e.message));
    window.addEventListener("unhandledrejection", (e) => {
      const reason = e.reason as { name?: string; message?: string } | undefined;
      this.onError(reason?.name ?? "UnhandledRejection", reason?.message ?? String(e.reason));
    });
    window.setInterval(() => this.flush(), BATCH.intervalMs);
    this.observeVitals();
  }

  private observeVitals() {
    if (typeof PerformanceObserver === "undefined") return;
    const supported = PerformanceObserver.supportedEntryTypes ?? [];
    if (supported.includes("largest-contentful-paint")) {
      new PerformanceObserver((list) => {
        const last = list.getEntries().at(-1);
        if (last) this.lcp = last.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    }
    if (supported.includes("layout-shift")) {
      // Cumulative Layout Shift as web-vitals defines it: the worst session window of shifts
      // without recent input, windows at most 5 s long with gaps under 1 s.
      let windowValue = 0;
      let windowStart = 0;
      let windowLast = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
        })[]) {
          if (entry.hadRecentInput) continue;
          const t = entry.startTime;
          if (windowValue > 0 && t - windowLast < 1000 && t - windowStart < 5000) {
            windowValue += entry.value;
          } else {
            windowValue = entry.value;
            windowStart = t;
          }
          windowLast = t;
          this.cls = Math.max(this.cls, windowValue);
        }
      }).observe({ type: "layout-shift", buffered: true });
    }
  }
}

/** Starts measuring for this page load. Does nothing when the context says not to measure. */
export function startTracking(ctx: ExperimentContext, endpoint = EXPERIMENTS_ENDPOINT): void {
  if (!ctx.measuring || tracker || !endpoint) return;
  tracker = new Tracker(ctx, endpoint);
  tracker.pageview(window.location.pathname);
}

/** Called on every route change. */
export function trackPageview(path: string): void {
  tracker?.pageview(path);
}

/** Called when a design is chosen in the picker. */
export function trackDesignSwitch(to: string): void {
  tracker?.designSwitched(to);
}
