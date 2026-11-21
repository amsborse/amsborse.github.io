import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseWeightsDoc,
  pickDesign,
  readAssignment,
  resolveDesign,
  type WeightsDoc,
} from "../../src/experiments/assignment";
import { prepareExperiment } from "../../src/experiments/client";
import { ASSIGNMENT_STORAGE_KEY } from "../../src/experiments/config";
import {
  EventQueue,
  classifyLink,
  errorType,
  weightsFailureKind,
  type ExperimentEvent,
} from "../../src/experiments/events";
import { isBot, mayMeasure, optedOut } from "../../src/experiments/privacy";
import { seededRng } from "../../src/experiments/random";
import { isEngaged } from "../../src/experiments/score";

const DESIGNS = ["editorial", "blueprint", "broadsheet"] as const;
const HUMAN_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

const doc = (weights: Record<string, number>, extra: Partial<WeightsDoc> = {}): WeightsDoc => ({
  version: "v1",
  updatedAt: "",
  mode: "auto",
  weights,
  ...extra,
});

describe("weighted assignment", () => {
  it("follows the weights over many visitors", () => {
    const rng = seededRng(7);
    const counts: Record<string, number> = { editorial: 0, blueprint: 0, broadsheet: 0 };
    const weights = doc({ editorial: 0.6, blueprint: 0.3, broadsheet: 0.1 });
    for (let i = 0; i < 20_000; i++) counts[pickDesign(weights, DESIGNS, rng)] += 1;
    expect(counts.editorial / 20_000).toBeCloseTo(0.6, 1);
    expect(counts.blueprint / 20_000).toBeCloseTo(0.3, 1);
    expect(counts.broadsheet / 20_000).toBeCloseTo(0.1, 1);
  });

  it("never picks a zero-weight design and always picks the forced one", () => {
    const rng = seededRng(3);
    const weights = doc({ editorial: 1, blueprint: 0, broadsheet: 0 });
    for (let i = 0; i < 500; i++) expect(pickDesign(weights, DESIGNS, rng)).toBe("editorial");
    const forced = doc(
      { editorial: 1, blueprint: 0, broadsheet: 0 },
      { mode: "forced", forced: "broadsheet" }
    );
    expect(pickDesign(forced, DESIGNS, rng)).toBe("broadsheet");
    // The top of the range still lands on a real design.
    expect(pickDesign(weights, DESIGNS, () => 0.9999999999999999)).toBe("editorial");
  });

  it("rejects a malformed weights file loudly instead of guessing", () => {
    expect(() => parseWeightsDoc(null, DESIGNS)).toThrow(/not an object/);
    expect(() =>
      parseWeightsDoc({ version: "x", mode: "auto", weights: { editorial: 1 } }, DESIGNS)
    ).toThrow(/blueprint/);
    expect(() =>
      parseWeightsDoc(
        {
          version: "x",
          mode: "forced",
          forced: "nope",
          weights: { editorial: 1, blueprint: 1, broadsheet: 1 },
        },
        DESIGNS
      )
    ).toThrow(/not registered/);
    expect(() =>
      parseWeightsDoc(
        { version: "x", mode: "auto", weights: { editorial: 0, blueprint: 0, broadsheet: 0 } },
        DESIGNS
      )
    ).toThrow(/zero/);
  });

  it("ignores a stored assignment for a design that is no longer registered", () => {
    expect(
      readAssignment(JSON.stringify({ design: "gone", at: 1, version: "v" }), DESIGNS)
    ).toBeNull();
    expect(readAssignment("{not json", DESIGNS)).toBeNull();
    expect(
      readAssignment(JSON.stringify({ design: "blueprint", at: 5, version: "v" }), DESIGNS)?.design
    ).toBe("blueprint");
  });
});

describe("precedence", () => {
  const assignment = { design: "broadsheet", at: 1, version: "v" };
  const base = { designs: DESIGNS, fallback: "editorial" };

  it("puts ?design= first, then the picker, then the assignment, then the default", () => {
    expect(
      resolveDesign({ ...base, fromUrl: "blueprint", fromPicker: "editorial", assignment })
    ).toEqual({
      design: "blueprint",
      source: "url",
    });
    expect(resolveDesign({ ...base, fromUrl: null, fromPicker: "editorial", assignment })).toEqual({
      design: "editorial",
      source: "picker",
    });
    expect(resolveDesign({ ...base, fromUrl: null, fromPicker: null, assignment })).toEqual({
      design: "broadsheet",
      source: "auto",
    });
    expect(resolveDesign({ ...base, fromUrl: null, fromPicker: null, assignment: null })).toEqual({
      design: "editorial",
      source: "default",
    });
  });

  it("skips unknown values instead of showing nothing", () => {
    expect(
      resolveDesign({ ...base, fromUrl: "nope", fromPicker: "also-nope", assignment }).design
    ).toBe("broadsheet");
  });
});

describe("privacy", () => {
  it("treats Do Not Track and Global Privacy Control as opting out", () => {
    expect(optedOut({ doNotTrack: "1" })).toBe(true);
    expect(optedOut({ doNotTrack: "yes" })).toBe(true);
    expect(optedOut({ windowDoNotTrack: "1" })).toBe(true);
    expect(optedOut({ globalPrivacyControl: true })).toBe(true);
    expect(optedOut({ doNotTrack: "0", globalPrivacyControl: false })).toBe(false);
  });

  it("filters crawlers, previews and automated browsers", () => {
    expect(isBot({ userAgent: "Googlebot/2.1 (+http://www.google.com/bot.html)" })).toBe(true);
    expect(isBot({ userAgent: "Mozilla/5.0 HeadlessChrome/131.0" })).toBe(true);
    expect(isBot({ userAgent: HUMAN_UA, webdriver: true })).toBe(true);
    expect(isBot({ userAgent: HUMAN_UA, prerendering: true })).toBe(true);
    expect(isBot({ userAgent: "" })).toBe(true);
    expect(mayMeasure({ userAgent: HUMAN_UA })).toBe(true);
    expect(mayMeasure({ userAgent: HUMAN_UA, globalPrivacyControl: true })).toBe(false);
  });
});

/** jsdom has no doNotTrack or globalPrivacyControl, so define them per test. */
const setNav = (key: string, value: unknown) =>
  Object.defineProperty(navigator, key, { value, configurable: true });

describe("prepareExperiment", () => {
  const weightsResponse = (body: unknown, status = 200) =>
    vi.fn(async () => new Response(JSON.stringify(body), { status }));
  const evenDoc = {
    version: "w1",
    updatedAt: "",
    mode: "auto",
    weights: { editorial: 1, blueprint: 1, broadsheet: 1 },
  };

  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(HUMAN_UA);
    setNav("doNotTrack", null);
    window.history.replaceState(null, "", "/");
  });
  afterEach(() => {
    vi.restoreAllMocks();
    setNav("globalPrivacyControl", undefined);
  });

  it("assigns a first-time visitor once and keeps the pick on later visits", async () => {
    const fetchImpl = weightsResponse(evenDoc);
    const first = await prepareExperiment(DESIGNS, "editorial", {
      endpoint: "https://x.example",
      fetchImpl,
      rng: () => 0.5,
    });
    expect(first).toEqual({
      measuring: true,
      design: "blueprint",
      source: "auto",
      assigned: "blueprint",
    });
    expect(JSON.parse(localStorage.getItem(ASSIGNMENT_STORAGE_KEY)!).design).toBe("blueprint");

    // A different random draw on the next visit changes nothing: the assignment is sticky.
    const again = await prepareExperiment(DESIGNS, "editorial", {
      endpoint: "https://x.example",
      fetchImpl,
      rng: () => 0.99,
    });
    expect(again.design).toBe("blueprint");
    expect(again.source).toBe("auto");
  });

  it("never overrides a picker choice or ?design=, and keeps the assignment for scoring", async () => {
    localStorage.setItem(
      ASSIGNMENT_STORAGE_KEY,
      JSON.stringify({ design: "blueprint", at: 1, version: "w1" })
    );
    localStorage.setItem("portfolio-design", "broadsheet");
    const fetchImpl = weightsResponse(evenDoc);
    const picker = await prepareExperiment(DESIGNS, "editorial", {
      endpoint: "https://x.example",
      fetchImpl,
    });
    expect(picker).toMatchObject({ design: "broadsheet", source: "picker", assigned: "blueprint" });

    window.history.replaceState(null, "", "/?design=editorial");
    const url = await prepareExperiment(DESIGNS, "editorial", {
      endpoint: "https://x.example",
      fetchImpl,
    });
    expect(url).toMatchObject({ design: "editorial", source: "url" });
  });

  it("falls back to the default design and reports loudly when weights.json fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const missing = await prepareExperiment(DESIGNS, "editorial", {
      endpoint: "https://x.example",
      fetchImpl: weightsResponse({}, 404),
    });
    expect(missing).toEqual({
      measuring: true,
      design: "editorial",
      source: "fallback",
      assigned: null,
    });
    expect(error).toHaveBeenCalledWith(expect.stringMatching(/weights\.json failed.*HTTP 404/));
    expect(localStorage.getItem(ASSIGNMENT_STORAGE_KEY)).toBeNull();

    const broken = await prepareExperiment(DESIGNS, "editorial", {
      endpoint: "https://x.example",
      fetchImpl: weightsResponse({ version: "x", mode: "auto", weights: {} }),
    });
    expect(broken.source).toBe("fallback");
    expect(error).toHaveBeenCalledTimes(2);
  });

  it("sends nothing and fetches nothing under Do Not Track, GPC or without an endpoint", async () => {
    const fetchImpl = weightsResponse(evenDoc);
    setNav("doNotTrack", "1");
    const dnt = await prepareExperiment(DESIGNS, "editorial", {
      endpoint: "https://x.example",
      fetchImpl,
    });
    expect(dnt).toEqual({
      measuring: false,
      design: "editorial",
      source: "default",
      assigned: null,
    });

    setNav("doNotTrack", null);
    setNav("globalPrivacyControl", true);
    const gpc = await prepareExperiment(DESIGNS, "editorial", {
      endpoint: "https://x.example",
      fetchImpl,
    });
    expect(gpc.measuring).toBe(false);
    setNav("globalPrivacyControl", undefined);

    const off = await prepareExperiment(DESIGNS, "editorial", { endpoint: "", fetchImpl });
    expect(off.measuring).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(localStorage.getItem(ASSIGNMENT_STORAGE_KEY)).toBeNull();
  });
});

describe("EventQueue", () => {
  const header = () => ({
    v: 1 as const,
    vid: "a".repeat(32),
    sid: "b".repeat(32),
    assigned: "blueprint",
    source: "auto" as const,
  });
  const event = (i: number): ExperimentEvent => ({
    t: "scroll",
    ts: i,
    design: "blueprint",
    value: 25,
  });

  it("sends a batch when it fills up and on flush", () => {
    const bodies: string[] = [];
    const q = new EventQueue(header, (b) => (bodies.push(b), true), {
      maxEvents: 3,
      intervalMs: 0,
      maxBodyBytes: 16_000,
    });
    q.push(event(1));
    q.push(event(2));
    expect(bodies).toHaveLength(0);
    q.push(event(3));
    expect(bodies).toHaveLength(1);
    expect(JSON.parse(bodies[0]).events).toHaveLength(3);
    q.push(event(4));
    expect(q.flush()).toBe(1);
    expect(q.flush()).toBe(0);
    expect(JSON.parse(bodies[1])).toMatchObject({
      vid: "a".repeat(32),
      assigned: "blueprint",
      events: [{ ts: 4 }],
    });
  });

  it("keeps every body under the size limit", () => {
    const bodies: string[] = [];
    const q = new EventQueue(header, (b) => (bodies.push(b), true), {
      maxEvents: 1000,
      intervalMs: 0,
      maxBodyBytes: 600,
    });
    for (let i = 0; i < 40; i++) q.push(event(i));
    expect(q.flush()).toBe(40);
    expect(bodies.length).toBeGreaterThan(1);
    for (const b of bodies) expect(b.length).toBeLessThanOrEqual(600);
    expect(bodies.flatMap((b) => JSON.parse(b).events).map((e: ExperimentEvent) => e.ts)).toEqual(
      Array.from({ length: 40 }, (_, i) => i)
    );
  });

  it("retries a refused batch once, then drops it with a console error", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    let accept = false;
    const sent: string[] = [];
    const q = new EventQueue(header, (b) => (accept ? (sent.push(b), true) : false));
    q.push(event(1));
    expect(q.flush()).toBe(0);
    expect(q.size).toBe(1);
    expect(q.flush()).toBe(0);
    expect(q.size).toBe(0);
    expect(error).toHaveBeenCalledWith(expect.stringMatching(/dropped 1 events/));
    accept = true;
    q.push(event(2));
    expect(q.flush()).toBe(1);
    error.mockRestore();
  });

  it("keeps each event under the header it happened with", () => {
    let source: "auto" | "picker" = "auto";
    const bodies: string[] = [];
    const q = new EventQueue(
      () => ({ ...header(), source }),
      (b) => (bodies.push(b), true)
    );
    q.push(event(1));
    q.push(event(2));
    source = "picker";
    q.push(event(3));
    expect(q.flush()).toBe(3);
    expect(
      bodies
        .map((b) => JSON.parse(b))
        .map((b) => [b.source, b.events.map((e: ExperimentEvent) => e.ts)])
    ).toEqual([
      ["auto", [1, 2]],
      ["picker", [3]],
    ]);
  });
});

describe("error reports carry no free text", () => {
  it("sends only a known error type, else other", () => {
    expect(errorType("TypeError")).toBe("TypeError");
    expect(errorType("Jane Doe's error")).toBe("other");
    expect(errorType(undefined)).toBe("other");
    expect(errorType("TypeError: user at 192.168.1.42")).toBe("other");
  });

  it("maps a weights failure to a fixed category", () => {
    const abort = new Error("aborted");
    abort.name = "AbortError";
    expect(weightsFailureKind(abort)).toBe("timeout");
    expect(weightsFailureKind(new Error("weights.json answered HTTP 503"))).toBe("http");
    expect(weightsFailureKind(new Error("weights.json: weights sum to zero"))).toBe("invalid");
    expect(weightsFailureKind(new SyntaxError("Unexpected token < at me@example.com"))).toBe(
      "parse"
    );
    expect(weightsFailureKind(new TypeError("Failed to fetch"))).toBe("network");
    expect(weightsFailureKind("boom")).toBe("other");
  });
});

describe("what counts", () => {
  const origin = "https://amsborse.github.io";
  it("classifies key clicks", () => {
    expect(classifyLink("/projects/foo", origin)).toBe("project");
    expect(classifyLink("/writing/essay", origin)).toBe("writing");
    expect(classifyLink("mailto:someone@example.com", origin)).toBe("contact");
    expect(classifyLink("https://github.com/x", origin)).toBe("outbound");
    expect(classifyLink("/about", origin)).toBeNull();
  });

  it("scores an engaged visit by time, scroll or a key click, never after switching away", () => {
    const s = {
      design: "blueprint",
      visibleMs: 0,
      maxScroll: 0,
      keyClicks: 0,
      switchedAway: false,
    };
    expect(isEngaged(s)).toBe(false);
    expect(isEngaged({ ...s, visibleMs: 30_000 })).toBe(true);
    expect(isEngaged({ ...s, visibleMs: 29_999 })).toBe(false);
    expect(isEngaged({ ...s, maxScroll: 50 })).toBe(true);
    expect(isEngaged({ ...s, keyClicks: 1 })).toBe(true);
    expect(isEngaged({ ...s, visibleMs: 90_000, switchedAway: true })).toBe(false);
  });
});
