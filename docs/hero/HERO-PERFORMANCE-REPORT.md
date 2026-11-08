# Hero performance report

All numbers come from production builds (`vite build` plus `vite preview`) measured in local Playwright Chromium (ANGLE D3D11, GPU on, DPR 1) on 2026-11-07. Nothing here is estimated.

## Renderer cost (`docs/hero/shots/performance.json`)

| Renderer | Draw calls / frame | Triangles | FPS (desktop idle) |
| --- | --- | --- | --- |
| Art plate (default) | 1 | 1 | 60.5 |
| 3D scene (`?hero=3d`) | 118 | 119,779 | 60.1 |

Both renderers hold 60 fps at 1440×900, 834×1112 and 390×844, in both themes. The plate shader stops drawing when the hero is offscreen, when the tab is hidden, or under reduced motion. Reduced motion draws one still frame.

## Load

| Measure | Plate (`/`) | 3D (`/?hero=3d`) | Master baseline |
| --- | --- | --- | --- |
| LCP, desktop 1440×900, warm browser | 196–260 ms | 208–244 ms | — |
| LCP, desktop, first page in a cold browser | ~1.0 s | ~0.8 s | 624 ms |
| LCP, tablet / mobile | 200–312 ms | 268–344 ms | — |
| Plate image (v2) | 101 KB dark / 90 KB light (43 / 39 KB at 960 px) | — | — |
| JS downloaded, `/` (response bodies) | 1486 KB | 1517 KB | ~1280 KB |
| Build total | 2005.9 KiB (budget 2200) | | |

The LCP rows were measured with the first (v1) plate, which was 133 / 162 KB; they have not been re-measured with the smaller v2 plate.

On the desktop, LCP lands on a header link, not on the hero. The hero heading fades in, and the plate image sits under the shader canvas, so neither counts. The ~1 s desktop figure only shows up on the first page in a fresh browser: on a warm browser the same build measures about 200 ms. The 3D path shows the same cold-start pattern. The master baseline (624 ms) came from an earlier script run, so it is not directly comparable.

## Milestone 4 (2026-11-08): three.js off the default path, cheaper particle background

Measured on a `vite preview` build in headless Chromium (ANGLE D3D11). Mobile is 390x844 at 3x DPR with 4x CPU throttling.

**three.js on every page — fixed.** `manualChunks` let Rollup put Vite's `preload-helper` inside the `three` chunk, so the entry imported all of three.js on every route. `vite.config.ts` now gives the helper its own `vite-runtime` chunk. `scripts/verify-dist.mjs` fails the build if any statically loaded chunk is `three-*`; it failed before the fix. JS loaded on `/`: desktop 1486 KB → 277 KB, mobile 184 KB, reduced motion 226 KB. LCP: desktop 1272 ms, mobile 980 ms, reduced motion 324 ms. Hero plate at 60 fps (p95 frame 16.7 ms). No console errors. `three` loads only for `?hero=3d`. That route still loads about 1.3 MB of JS, with about 4.8 s of long tasks before LCP on desktop; this is listed as a follow-up.

**Site-wide particle canvas (`InteractiveParticles`).** Under reduced motion it now draws only when scroll, the pointer or the size changes, instead of every frame. Its pixel ratio is capped at 2, so a 3x phone draws 780x1688 instead of 1170x2532. Both are guarded by `tests/e2e/performance.spec.ts`, which failed before the fix.

| Profile (main-thread busy ms per second, top of page) | Before | After |
|---|---|---|
| Desktop | 77 | 63 |
| Mobile (4x CPU) | 304 | 289 |
| Reduced motion | 68 | 2 |

Mobile is still about 290 ms/s under 4x throttling, but it holds 60 fps. Further cuts, such as fewer particles or no `shadowBlur` on touch devices, would change how the background looks, so they are left for the design-system milestone.
