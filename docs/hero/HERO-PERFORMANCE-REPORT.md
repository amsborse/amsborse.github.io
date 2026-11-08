# Hero performance report

All numbers come from production builds (`vite build` plus `vite preview`) measured in local Playwright Chromium (ANGLE D3D11, GPU on, DPR 1) on 2026-11-07. Nothing here is estimated.

## Renderer cost (`docs/hero/shots/performance.json`)

| Renderer | Draw calls / frame | Triangles | FPS (desktop idle) |
| --- | --- | --- | --- |
| Art plate (default) | 1 | 1 | 60.3 |
| 3D scene (`?hero=3d`) | 118 | 119,779 | 60.2 |

Both renderers hold 60 fps at 1440×900, 834×1112 and 390×844, in both themes. The plate shader stops drawing when the hero is offscreen, when the tab is hidden, or under reduced motion. Reduced motion draws one still frame.

## Load

| Measure | Plate (`/`) | 3D (`/?hero=3d`) | Master baseline |
| --- | --- | --- | --- |
| LCP, desktop 1440×900, warm browser | 196–260 ms | 208–244 ms | — |
| LCP, desktop, first page in a cold browser | ~1.0 s | ~0.8 s | 624 ms |
| LCP, tablet / mobile | 200–312 ms | 268–344 ms | — |
| Plate image | 133 KB dark / 162 KB light (49 / 58 KB at 960 px) | — | — |
| JS downloaded, `/` (response bodies) | 1486 KB | 1517 KB | ~1280 KB |
| Build total | 2004.9 KiB (budget 2200) | | |

On the desktop, LCP lands on a header link, not on the hero. The hero heading fades in, and the plate image sits under the shader canvas, so neither counts. The ~1 s desktop figure only shows up on the first page in a fresh browser: on a warm browser the same build measures about 200 ms. The 3D path shows the same cold-start pattern. The master baseline (624 ms) came from an earlier script run, so it is not directly comparable.

## Known issue outside the hero's scope: three.js loads on every page

The home page downloads the 970 KB `three` chunk even in plate mode. The cause is in `vite.config.ts`: `manualChunks` lets Rollup put Vite's small `preload-helper` module inside the `three` chunk. The entry bundle needs that helper for every lazy `import()`, so it imports `three` statically on every route. Master has the same config, and its ~1280 KB baseline is consistent with it loading `three` too.

I checked this with a throwaway build that put `vite/preload-helper` in its own chunk. `/` then loaded **517 KB** of JS instead of 1486 KB, and `three` loaded only for `?hero=3d`. Warm LCP did not change. This touches the site-wide build config, so it is not part of this hero change. It is listed as a follow-up for approval.
