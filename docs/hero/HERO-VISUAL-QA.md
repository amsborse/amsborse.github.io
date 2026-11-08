# Hero visual QA

Compared against `references/hero-composition.png` and `references/component-sheet.png`, using the real captures in `shots/` (from `node scripts/hero-shots.mjs` against a production build) and manual captures at 1440×900, 834×1112 and 390×844 in both themes.

The default renderer is now the **art plate**: a generated, text-free illustration (`public/hero/plate-{dark,light}{,-960}.webp`), with live layers on top. These are a one-draw-call WebGL shader for water, falls, ring light, failure and recovery; SVG request routes; module hotspots; and HTML callouts. The earlier procedural 3D scene stays available at `?hero=3d`. The plate is an illustration: the module names are a reading aid, not a picture of any real or employer system.

| Component | Reference requirement | Current result | Defect | Fix |
| --- | --- | --- | --- | --- |
| Overall composition | Headline left; sculpture right ~40–92% of width; dark pool below | Matches: on desktop the plate spans the full width with the lake at the bottom edge and a soft fade under the header (`fitPlate` bottom-aligns, unit-tested at 1440×900 and 1920×980) | None | — |
| Island | Broad stratified rock shelf, moss, pavilions | Photoreal strata, moss and two island pavilions from the plate | None | — |
| Bonsai | Windswept crown left of the core, rooted on the island | Present and rooted, with sharp detail | None | — |
| Waterfalls | Narrow cascades from the front lip, falling to the pool | 2 cascades in the plate (v2), matching the reference; the shader adds downward flow streaks inside `PLATE_FALLS` | None | — |
| Lake | Reflective pool with ripples, fading to black | Plate reflection, plus shader ripples around `PLATE_RIPPLE` and below the horizon | None | — |
| Glass core sphere | Clear glass sphere with a gold node network | A smaller sphere (v2 plate, about 184 plate px across) with a gold network; the shader adds a gentle pulse with smooth noise | None. A per-cell twinkle drew 16 px blocks; replaced (unit test) | — |
| Orbit rings | 3 crossing glass bands | 3 bands read clearly in the v2 plate, one near-vertical; the shader runs light streaks along them | None | — |
| Service modules (7) | 7 lantern modules on the rings and island | 5 ring lanterns plus 2 island pavilions, each with a hotspot button and an accessible name | None | — |
| Callouts | Thin gold leader lines with label and caption | 4 idle callouts (gateway, policy, inference, observability), each with a line icon, name, its engineering concept as caption, and an elbow leader. They stay inside the viewport at 1280, 1440 and 1920 px, captions are distinct, and they give way while the info panel is open (e2e regression tests) | Hidden below 1100 px, by design. A specificity slip had left them visible on tablet; fixed | — |
| Idle | Calm motion, nothing flashing | Ring streaks, falls and ripples at low amplitude | None | — |
| Explore (hover / focus) | The module highlights and the info panel opens | The hotspot ring highlights; click or Enter opens the panel (e2e test) | None | — |
| Request | A visible packet travels the route | An SVG packet moves along `edgeCurve` paths driven by `routeSample` (`request-processing.png`) | None | — |
| Failure | The failed module turns red; routes reroute | Red shader tint at the failed module, the hotspot gets `is-failed`, the caption updates (`failure.png`) | Was: the info panel covered the right side of the sculpture | Fixed (Milestone 1): the panel docks lower right, above the scroll cue; rings and the red failed module stay visible |
| Recovery | Green or gold recovery glow, then back to idle | Recovery glow, then idle (`recovery.png`) | None | — |
| Light theme | Designed, not inverted: warm paper and soft shadows | A separate light plate (`light-theme.png`). Ring streaks use a local-contrast gate, so no rectangle artifact | Ring streaks read as soft golden edging rather than light | Accepted |
| Tablet 834×1112 | The sculpture is visible below the copy | `fitPlate` keeps the whole focus rect visible (`tablet-834x1112.png`) | None | — |
| Mobile 390×844 | The sculpture is visible and not clipped | The focus rect fits; the plate shrinks below cover (`mobile-390x844.png`) | The sphere sits close to the header | Accepted; no overlap |
| Reduced motion | No animation, still readable | The shader draws one still frame; the plate stays visible (`reduced-motion.png`) | None | — |
| Static fallback | Art is still visible without WebGL | `?heroWebGL=off` (or a failed context) shows the plate `<img>`, `data-hero-renderer="static"` (`webgl-unavailable.png`, e2e test) | None | — |
| Above 1672 px | Crisp | The plate is upscaled slightly past its native 1672 px width | Slight softness on very wide screens | Open. A 2560 px plate export would fix it (about +150 KB) |
| Parallax | Subtle depth on pointer move | Dropped: a single flat plate cannot parallax convincingly | The plate path has no pointer parallax | Accepted |

## Milestone 1 defect log (1672×941, real captures in `shots/`)

| # | Defect | Status | Evidence |
| --- | --- | --- | --- |
| 1 | The headline wrapped to 3 lines | Fixed: two lines, "Clarity / under load." | `desktop-idle.png` |
| 2 | The nav was not aligned with the hero column | Fixed: the home header bar shares the hero gutter | `desktop-idle.png` |
| 3 | Developer-style controls under the CTA | Replaced by an "Explore the system" console with four numbered actions (Send a request, Inspect a service, Simulate failure, Observe recovery), each with a one-line explanation, a shared target picker and a live status line. Keyboard: focus moves into it on open, Escape closes and returns focus, and "Observe recovery" stays disabled until something has failed. Touch targets are at least 44 px on mobile | `console-open.png`, `console-open-light.png`, `console-open-mobile.png`, e2e |
| 4 | The open console ran past the viewport bottom and sat under the proof strip | Fixed: a compact 2×2 grid, with the hero copy layered above the proof strip | e2e regression "open console fits the desktop viewport…" (fails before the fix) |
| 5 | The info panel covered the sculpture | Fixed: docked lower right | `failure.png` |
| 6 | Hard seam between the hero and the next section | Fixed: a bottom fade into the page background, in both themes | manual seam captures |

Owner decisions (2026-11-08): (a) Keep the art plate plus live layers instead of real PBR and camera choreography. (b) Water and shader upgrades, which need the arsenal-scene source, are a follow-up task for Codex.
