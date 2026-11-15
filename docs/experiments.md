# Design experiments

The site has three designs (editorial, blueprint, broadsheet). New visitors are routed between
them automatically, and the share each design gets moves towards the one that serves readers
best. Editorial is the baseline and no design is ever removed.

Experiments are **off** until the `VITE_EXPERIMENTS_URL` repository variable points at the
Worker. While it is empty, nobody is randomised, nothing is sent and everyone sees editorial.

## Which design a visitor sees

In order of precedence:

1. `?design=<id>` in the URL, for that page load only. It does not replace the assignment.
2. A choice made in the design picker. This is a preference and is never overridden.
3. The visitor's automatic assignment, stored in `localStorage` (`portfolio-design-assignment`)
   so the same person keeps the same design on every visit.
4. Editorial.

A first-time visitor without 1 or 2 gets a weighted random pick from `weights.json`. If that file
is missing, malformed or slower than 1.5 s, the visitor silently gets editorial, nothing is
stored (so a later visit can still be assigned), and the failure is logged loudly: a
`console.error` and a `weights_error` event.

## What is collected

Nothing is collected when the browser sends Do Not Track or Global Privacy Control, when the
visitor looks like a bot (an automated browser, a prerender, a crawler user agent), or when
experiments are off. In those cases `weights.json` is not even fetched.

No cookies. No names, emails, IP addresses, user agents, query strings, hashes or referrers are
sent or stored. Each request body holds exactly:

| Field      | Meaning                                                                    |
| ---------- | -------------------------------------------------------------------------- |
| `v`        | Format version (1).                                                        |
| `vid`      | A random visitor id made in the browser, kept in `localStorage`.           |
| `sid`      | A random id for one tab session, kept in `sessionStorage`.                 |
| `assigned` | The design the visitor was automatically assigned, if any.                 |
| `source`   | Why the design on screen is shown: `auto`, `url`, `picker`, `fallback`, `default`. |
| `events`   | A list of the events below.                                                |

Every event has `t` (type), `ts` (browser time in ms), `design` (the design on screen) and,
where it applies, `path` (pathname only), `value` (a number) and `label` (a short string):

| Event           | When                                              | `value` / `label`                          |
| --------------- | ------------------------------------------------- | ------------------------------------------ |
| `pageview`      | Each page shown                                   |                                            |
| `engaged_time`  | When the tab hides or the page changes            | visible milliseconds                       |
| `scroll`        | First time 25, 50, 75 and 100% of a page is seen  | the percentage                             |
| `click`         | A click on a project, writing, contact or outbound link | the kind only, never the URL        |
| `return_visit`  | A new session within 7 days of the last one       | hours since the last session               |
| `design_switch` | The visitor picks another design                  | the design picked; `value` 1 if it left the assigned one |
| `bounce`        | A one-page session left under 10 s visible and under 25% scroll, with no click | visible milliseconds |
| `lcp`, `cls`    | When the page hides (performance guardrails)      | LCP in ms, CLS score                       |
| `js_error`      | An uncaught error or rejection                    | error type only (`TypeError`…, else `other`) |
| `weights_error` | `weights.json` failed                             | category: `timeout`, `http`, `network`, `parse`, `invalid`, `other` |

Events are batched and sent with `navigator.sendBeacon` when the tab hides, every 30 s, at 20
events, and straight away on outbound or contact clicks. The Worker keeps request logging off,
stores only the fields above plus the time it received them, and deletes rows after 90 days
(`RETENTION_DAYS`). Cloudflare necessarily sees the connecting IP to deliver the request; the
Worker never reads or stores it.

## What the Worker accepts

The Worker trusts nothing the browser sends; the site's own checks are a convenience, not the
defence. `POST /events` answers:

| Status | When |
| ------ | ---- |
| 204 | Stored (or already stored: a resent batch is counted once). |
| 400 | Not JSON, wrong version, a visitor or session id that is not 16–64 hex characters (dashes allowed), an unknown `source` or `assigned` design, no events, more than 50 events, or no valid event left. The body says which. |
| 403 | No `Origin` header from `ALLOWED_ORIGINS`. |
| 413 | Body over 16 KB, by `Content-Length` or while reading it (a missing header does not bypass it). |
| 415 | A content type other than `text/plain` or `application/json`. |
| 429 | The rate limiter refused it (with `Retry-After: 60`), or the session already stored 500 events. |

Each event is checked against its type: an unknown type, design or path, a time more than two
days from the server clock, a value of the wrong kind or out of range (scroll only at 25, 50, 75
or 100; LCP up to 120 s; CLS up to 10; return visits up to 7 days), a click label other than the
four kinds, or a value or label on an event that carries none drops that event. Error text is
scrubbed again on the server (URLs, emails, long numbers and tokens removed) before it is stored.
Other paths answer 404 and other methods 405 with an `Allow` header.

The `Origin` check and CORS only stop other websites' pages from posting through a visitor's
browser. They are **not authentication**: anyone can send any `Origin` from a script. What
actually bounds abuse is the validation above, the per-session cap, deduplication, and the rate
limiter.

**Rate limiting.** `worker/wrangler.toml` binds Cloudflare's Workers Rate Limiting API
(`EVENTS_LIMITER`, 60 requests per 60 s), which is free on every plan and needs no dashboard
setup: `wrangler deploy` (version 4.36 or later) creates it. The limit is counted per Cloudflare
location and is approximate. Its key is the fixed string `events`, never the IP or an id, so it
protects the database quota rather than singling anyone out. The trade-off: a flood can make the
Worker refuse real visitors' events for a minute (the site carries on; only measurement pauses),
and it cannot fully protect D1's free daily write allowance of 100,000 rows. On the free plan
running out returns errors until the next day; it never costs money. If abuse becomes real, add
a WAF rate-limiting rule on the Worker route in the dashboard (Security → WAF → Rate limiting
rules; one rule is free).

**Results.** `/results` is public and returns aggregates only: per-design totals, rates and the
weight log. It never returns rows, ids, times, paths or labels. Engaged and switched-away counts
are withheld (`null`) for a design under 30 visits, in the summary and in the weight log, and the
log's reason names designs that are short without their counts. If that is ever not enough, put
the `/results` path behind Cloudflare Access (Zero Trust → Access → Applications, free for up to
50 users) and point the results page at it.

## How the score and weights work

A session is **engaged** when, on its assigned design and without switching away in the picker,
it reaches any of: 30 s of visible time, 50% scroll, or a click on a project, writing, contact or
outbound link. Each design's engaged rate gets a Beta posterior (uniform prior).

Once a day (cron at 04:17 UTC, and never more often than every 20 hours) the Worker runs
Thompson sampling over those posteriors with 20,000 draws to estimate each design's chance of
being best, then:

- **Waits for data.** Weights stay where they are until every design has 100 engaged visits.
  With engaged rates around 30%, that is roughly 330 visits per design, enough to pin each rate
  to about ±5 percentage points (95% interval), which is the smallest difference worth acting on
  for a site of this size. Fewer, and one good afternoon could move traffic; many more, and a
  personal site would wait months for any movement.
- **Ignores noise.** A confidence gate: below an 80% chance that the leader is best, weights
  drift back to even; between 80% and 95% they follow the probabilities partly; above 95% fully.
  The simulation tests show equal designs stay near even while a clearly better one wins.
- **Moves slowly.** No design's weight changes by more than 15 points in one update.
- **Keeps a floor.** Every design always gets at least 10% of new visitors, so a design can
  recover and editorial is always measured.
- **Holds guardrails.** With 30+ samples on both sides, a design whose p75 LCP is more than 20%
  and 250 ms worse than editorial's, whose p75 CLS is more than 0.05 higher, or whose JS error
  rate per page view is more than 2 points higher, is capped at the floor.

Every update, whether it changes anything or not, is written to the weight log with its reason
and the sample counts behind it. The results page shows that history.

### Kill switch

Set `EXPERIMENT_MODE` in `worker/wrangler.toml` (or the Cloudflare dashboard) and redeploy the
Worker; it takes effect on the next `weights.json` request:

- `auto`: normal operation.
- `freeze`: keep the current weights; the daily update logs a hold.
- `force:<design>`: send every new visitor to one design (for example `force:editorial`).
  Automatically assigned visitors move to it from their next visit (returning visitors check
  the weights in the background, so this never delays a page). Picker choices and `?design=`
  still win.

## Results

`/experiments` (not indexed) shows, per design: visits, engaged visits, the engaged rate with
its 95% credible interval against editorial, the current weight, guardrail status, and the
weight history. Anything below 30 visits shows "not enough data", never 0. Every number explains
itself on hover or keyboard focus.

## Local development

`npm run dev` serves a stand-in for the Worker at `/__experiments`
(`scripts/vite-plugin-experiments-dev.ts`):

- `weights.json` forces editorial, so local work and the existing tests see the usual design.
  Run `EXPERIMENTS_DEV=auto npm run dev` to get an even split instead.
- `POST /events` keeps batches in memory; `GET /events` lists them.
- `/results` returns clearly labelled sample data.

Automated browsers count as bots, so specs that test the experiment present as a person
(`tests/e2e/experiments.spec.ts`).

## Setup (done by the owner)

The Worker and D1 database fit Cloudflare's free plan. Nothing secret is needed: the Worker has
no credentials, and `wrangler login` keeps its token on your machine, not in the repo.

1. Create a free Cloudflare account at <https://dash.cloudflare.com/sign-up>.
2. In `worker/`, sign in: `npx wrangler login` (opens the browser).
3. Create the database: `npx wrangler d1 create portfolio-experiments`, then copy the printed
   `database_id` into `worker/wrangler.toml`. The id is not a secret.
4. Create the tables: `npx wrangler d1 execute portfolio-experiments --remote --file schema.sql`.
5. Deploy the Worker: `npx wrangler deploy`. It prints a URL like
   `https://portfolio-experiments.<your-subdomain>.workers.dev`.
6. Check it: open `<that URL>/weights.json`; it should show an even split.
7. In GitHub: repository Settings → Secrets and variables → Actions → **Variables** → New
   repository variable `VITE_EXPERIMENTS_URL` = the Worker URL (no trailing slash). It is a
   plain variable, not a secret: the URL is public in the built site anyway.
8. The next deploy of the site turns experiments on. To turn them off, delete the variable and
   redeploy, or set `EXPERIMENT_MODE = "force:editorial"` on the Worker.
