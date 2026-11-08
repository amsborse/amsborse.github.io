# Hero visual QA

Compared against `references/hero-composition.png` and `references/component-sheet.png`, using the real captures in `shots/` (from `node scripts/hero-shots.mjs` against a production build) and manual captures at 1440×900, 834×1112 and 390×844 in both themes.

The default renderer is now the **art plate**: a generated, text-free illustration (`public/hero/plate-{dark,light}{,-960}.webp`), with live layers on top. These are a one-draw-call WebGL shader for water, falls, ring light, failure and recovery; SVG request routes; module hotspots; and HTML callouts. The earlier procedural 3D scene stays available at `?hero=3d`. The plate is an illustration: the module names are a reading aid, not a picture of any real or employer system.

| Component | Reference requirement | Current result | Defect | Fix |
| --- | --- | --- | --- | --- |
| Overall composition | Headline left; sculpture right ~40–92% of width; dark pool below | Matches: the sculpture fills the right half, and the left column stays empty for type (`desktop-idle.png`) | The bonsai crown reaches toward the end of the body copy at 1440 px | Open. Shift the focus rect right or crop the plate's left edge if it reads as crowded |
| Island | Broad stratified rock shelf, moss, pavilions | Photoreal strata, moss and two island pavilions from the plate | None | — |
| Bonsai | Windswept crown left of the core, rooted on the island | Present and rooted, with sharp detail | None | — |
| Waterfalls | Narrow cascades from the front lip, falling to the pool | 3 cascades in the plate; the shader adds downward flow streaks inside `PLATE_FALLS` | The reference shows 2 cascades | Accepted; the generated art has 3 |
| Lake | Reflective pool with ripples, fading to black | Plate reflection, plus shader ripples around `PLATE_RIPPLE` and below the horizon | None | — |
| Glass core sphere | Clear glass sphere with a gold node network | Plate glass with a gold network; the shader adds a gentle pulse | None | — |
| Orbit rings | 3 crossing glass bands | 2 bands read clearly; the shader runs light streaks along them | The topology has 3 orbits; only 2 are visible | Open. Needs a regenerated plate with a third, near-vertical band |
| Service modules (7) | 7 lantern modules on the rings and island | 5 ring lanterns plus 2 island pavilions, each with a hotspot button and an accessible name | None | — |
| Callouts | Thin gold leader lines with label and caption | 3 idle callouts (gateway, inference, observability); labels and leaders show and hide together (e2e regression test) | Hidden below 1100 px, by design | — |
| Idle | Calm motion, nothing flashing | Ring streaks, falls and ripples at low amplitude | None | — |
| Explore (hover / focus) | The module highlights and the info panel opens | The hotspot ring highlights; click or Enter opens the panel (e2e test) | None | — |
| Request | A visible packet travels the route | An SVG packet moves along `edgeCurve` paths driven by `routeSample` (`request-processing.png`) | None | — |
| Failure | The failed module turns red; routes reroute | Red shader tint at the failed module, the hotspot gets `is-failed`, the caption updates (`failure.png`) | The info panel covers the right side of the sculpture at 1440 px. This is existing panel behaviour | Open. Dock the panel lower or narrower in a later pass |
| Recovery | Green or gold recovery glow, then back to idle | Recovery glow, then idle (`recovery.png`) | None | — |
| Light theme | Designed, not inverted: warm paper and soft shadows | A separate light plate (`light-theme.png`). Ring streaks use a local-contrast gate, so no rectangle artifact | Ring streaks read as soft golden edging rather than light | Accepted |
| Tablet 834×1112 | The sculpture is visible below the copy | `fitPlate` keeps the whole focus rect visible (`tablet-834x1112.png`) | None | — |
| Mobile 390×844 | The sculpture is visible and not clipped | The focus rect fits; the plate shrinks below cover (`mobile-390x844.png`) | The sphere sits close to the header | Accepted; no overlap |
| Reduced motion | No animation, still readable | The shader draws one still frame; the plate stays visible (`reduced-motion.png`) | None | — |
| Static fallback | Art is still visible without WebGL | `?heroWebGL=off` (or a failed context) shows the plate `<img>`, `data-hero-renderer="static"` (`webgl-unavailable.png`, e2e test) | None | — |
| Above 1672 px | Crisp | The plate is upscaled slightly past its native 1672 px width | Slight softness on very wide screens | Open. A 2560 px plate export would fix it (about +150 KB) |
| Parallax | Subtle depth on pointer move | Dropped: a single flat plate cannot parallax convincingly | The plate path has no pointer parallax | Accepted |
