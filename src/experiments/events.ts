import { BATCH } from "./config";
import type { DesignSource } from "./assignment";

/** Every event the site can send. docs/experiments.md lists what each one carries. */
export type EventType =
  | "pageview"
  | "engaged_time"
  | "scroll"
  | "click"
  | "return_visit"
  | "design_switch"
  | "bounce"
  | "lcp"
  | "cls"
  | "js_error"
  | "weights_error";

export type ExperimentEvent = {
  t: EventType;
  /** Wall-clock milliseconds when it happened. */
  ts: number;
  /** The design on screen when it happened. */
  design: string;
  /** Pathname only: never the query string or hash. */
  path?: string;
  /** A number: milliseconds, a percentage, a CLS score. */
  value?: number;
  /** A short label: a click kind, the design switched to, an error name. */
  label?: string;
};

/** One request body. Identifiers are random and carry nothing about the visitor. */
export type EventBatch = {
  v: 1;
  vid: string;
  sid: string;
  /** The design assigned automatically to this visitor, when there is one. */
  assigned: string | null;
  source: DesignSource;
  events: ExperimentEvent[];
};

/**
 * Strips anything in free text (an error message) that could identify a person or a page they
 * came from: URLs, email addresses, long numbers and long tokens. The site runs it before sending
 * and the Worker again before storing, so a modified client cannot skip it.
 */
export function scrubText(text: string, max: number): string {
  return text
    .replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, "<url>")
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "<email>")
    .replace(/\d{4,}/g, "#")
    .replace(/[A-Za-z0-9_-]{24,}/g, "<token>")
    .replace(/\p{Cc}/gu, " ")
    .slice(0, max);
}

export type Sender = (body: string) => boolean;

/**
 * Queues events and sends them in batches: when the queue is full, on a timer, or when `flush`
 * is called (the tracker calls it when the tab hides). Each body stays under the size limit;
 * a batch the sender refuses is kept and tried once more on the next flush, then dropped with
 * a console error so a broken endpoint never grows the queue without bound.
 */
export class EventQueue {
  private queue: ExperimentEvent[] = [];
  private retried = false;

  constructor(
    private readonly header: () => Omit<EventBatch, "events">,
    private readonly send: Sender,
    private readonly limits = BATCH
  ) {}

  get size(): number {
    return this.queue.length;
  }

  push(event: ExperimentEvent): void {
    this.queue.push(event);
    if (this.queue.length >= this.limits.maxEvents) this.flush();
  }

  /** Sends everything queued. Returns the number of events handed to the sender. */
  flush(): number {
    if (this.queue.length === 0) return 0;
    const header = this.header();
    let sent = 0;
    while (this.queue.length > 0) {
      const chunk = this.takeChunk(header);
      const body = JSON.stringify({ ...header, events: chunk } satisfies EventBatch);
      if (this.send(body)) {
        sent += chunk.length;
        this.retried = false;
        continue;
      }
      if (this.retried) {
        console.error(`[experiments] dropped ${chunk.length} events: the endpoint refused them`);
        this.retried = false;
        continue;
      }
      // Put the chunk back in front and try again on the next flush.
      this.queue.unshift(...chunk);
      this.retried = true;
      break;
    }
    return sent;
  }

  /** The longest prefix of the queue whose body fits the size limit (always at least one). */
  private takeChunk(header: Omit<EventBatch, "events">): ExperimentEvent[] {
    const base = JSON.stringify({ ...header, events: [] }).length;
    let bytes = base;
    let count = 0;
    while (count < this.queue.length) {
      const next = JSON.stringify(this.queue[count]).length + 1;
      if (count > 0 && bytes + next > this.limits.maxBodyBytes) break;
      bytes += next;
      count += 1;
    }
    return this.queue.splice(0, count);
  }
}

/** sendBeacon with a text/plain body, which needs no CORS preflight. */
export function beaconSender(url: string): Sender {
  return (body) => {
    try {
      if (typeof navigator.sendBeacon === "function") {
        return navigator.sendBeacon(url, new Blob([body], { type: "text/plain" }));
      }
      void fetch(url, { method: "POST", body, keepalive: true, mode: "no-cors" });
      return true;
    } catch (error) {
      console.error("[experiments] could not send events", error);
      return false;
    }
  };
}

/** What a click on this link means for the score, or null when it is not one we count. */
export function classifyLink(href: string, origin: string): string | null {
  let url: URL;
  try {
    url = new URL(href, origin);
  } catch {
    return null;
  }
  if (url.protocol === "mailto:" || url.protocol === "tel:") return "contact";
  if (/linkedin\.com$/i.test(url.hostname)) return "contact";
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.origin !== origin) return "outbound";
  const path = url.pathname.replace(/\/+$/, "");
  if (url.hash === "#contact" || path === "/contact") return "contact";
  if (path.startsWith("/arsenal/writing") || path.startsWith("/writing")) return "writing";
  if (path.startsWith("/projects") || path.startsWith("/arsenal/")) return "project";
  return null;
}
