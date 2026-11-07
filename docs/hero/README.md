# Hero scene guide

The home hero is a lazy WebGL scene under ordinary HTML content. Its static fallback is `public/hero/hero-fallback.png`; regenerate it from the real idle render by running `node scripts/hero-shots.mjs` after a production build. The screenshot script writes ten review images to `docs/hero/shots/` and starts `vite preview` on port 4173 if it is not already running.

## Modify the sculpture

- **Add a service:** add its real service record and edges in `src/components/hero/topology.ts` (the topology owner does that integration). `ServiceModules`, the sphere graph, route sampling and callout dependencies read `SERVICES` / `EDGES` from that file. Add a distinct architectural silhouette branch in `scene/ServiceModules.tsx` for the new service.
- **Retune an orbit:** change `radius`, `tilt` or `periodSec` in `topology.ts`. `layout.ts` derives module positions from each service's orbit and angle; `OrbitRings` reads the same orbit fields.
- **Retune the island:** change dimensions and anchors in `layout.ts`; `Island.tsx` uses deterministic radial noise for its top surface and strata. `Bonsai.tsx` holds the fixed branch control points and foliage density.
- **Retune light and water:** key/fill values live in `scene/Lighting.tsx`; pool reflection resolution, blur and mix live in `scene/Pool.tsx`; waterfall flow and tint are the uniforms in `scene/Waterfall.tsx`; bloom threshold and strength are in `scene/Effects.tsx`.
- **Quality controls:** `HeroCanvas.tsx` sets desktop/mobile DPR caps, reduces LOD on sustained slow frames, pauses on offscreen / hidden state, compiles materials once, and publishes render stats once per second.

## QA parameters

- `?heroTime=12` freezes visual clocks at that exact second.
- `?heroState=idle|hover:inference|request:1.1|failure:inference|recover:inference` selects a deterministic simulation state. Hover/failure/recover service IDs must exist in topology.
- `?heroCamera=wide|node|profile` selects the camera framing.
- `?heroWebGL=off` forces the static fallback for screenshot and accessibility checks.

The pure parser is in `heroUrlState.ts`; keep it deterministic and update `tests/unit/hero-url-state.test.ts` for new parameters. Simulation timings and route outcomes remain owned by `simulation.ts`.
