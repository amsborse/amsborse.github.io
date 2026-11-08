# Hero rendering architecture

Default: R3F on `WebGLRenderer`, procedural reusable meshes and small custom GLSL materials, drei low-resolution `MeshReflectorMaterial`, procedural `Environment` lightformers, and thresholded bloom. Existing three/R3F/Drei dependencies are sufficient; no npm dependency is added.

| Choice | Visual benefit | CPU / GPU, calls and passes | Compatibility / fallback | Complexity |
| --- | --- | --- | --- | --- |
| R3F + WebGLRenderer | Direct Three scene graph, React input boundary, mature shadows, physical materials and shader support | CPU cost scales with scene graph and event handlers; target <150 scene draws. Base render is one pass | Broad WebGL2 support; use supplied static image if context creation/loss fails | Low–medium; existing dependencies and team skill |
| WebGPURenderer / TSL | Modern compute and node-material path, potential future material portability | TSL can reduce custom GLSL maintenance; WebGPU setup and pipeline compilation add startup work | WebGPU support is uneven and backend integration with R3F is still less mature; would need WebGL fallback | High; no clear benefit for this fixed scene |
| three `EffectComposer` + `UnrealBloomPass` | Thresholded glow on amber emissive energy, rings and windows | Adds one composer render and bloom blur passes; roughly 2–4 full-screen GPU passes. Can be bandwidth-heavy at DPR >1.5 | Works on WebGL; skip on light theme, reduced motion and low tier | Medium; straightforward to tune threshold and resolution |
| `@react-three/postprocessing` | Convenient effect components and selective bloom layers | Similar full-screen costs; extra dependency and layer management | WebGL supported, but no reason to add package when examples passes are already in `three` | Low implementation cost, unnecessary package weight |
| Procedural meshes + GLSL | Deterministic island strata, ring bands, foliage, animated water and engraved core without asset downloads | CPU mesh generation once; shaders stay few and instanced. Shared materials and instancing keep target below 150 draw calls | Works on WebGL2; simple material variants remain available | Medium; geometry is measurable and tunable in TS |
| glTF + meshopt + KTX2 | Best authoring path for detailed sculpted assets and compressed PBR textures | Lower transfer and GPU memory; scene draws depend on asset authoring and instancing | Broad with loaders/transcoders, but requires authored assets and loading UX | High here: no Blender installation or approved asset pack is available |
| Custom GLSL | Flow streaks, moss mask, ripple rings, wind sway and restrained energy | Small vertex/fragment costs; avoid divergent branches and per-frame uniform allocations | WebGL2 GLSL; standard-material fallbacks for shader compile failure | Medium; keep shader files isolated and compile at scene initialization |
| Instancing | Repeated leaves, rocks and window details with stable silhouettes | Converts many draws to one per material / geometry; more instance buffer work during setup | All target WebGL renderers | Medium; transforms authored once and reused |
| Adaptive DPR / LOD | Keeps desktop crisp while protecting mobile frame time | DPR cap 1.75 desktop / 1.5 mobile; lower instance counts and reflection size at medium/low; adaptive downshift after sustained slow frames | Works in WebGL and static fallback ignores tiers | Medium; use a small tier table and R3F performance signal |

## Pass and budget plan

- Main scene: one shadowed render; shadows restricted to a small key light and the island.
- Pool: one 256–384 px reflector target with blur, Fresnel and only two impact-centered ripple sets. Disable reflection at low quality and in light theme; preserve a rough warm surface.
- Bloom: threshold 1.6, strength ≤0.55, half-resolution. Disable in light theme and reduced motion. No lens flare.
- Draw target: 80–130 including modules, ring bands, major island pieces, shared foliage batches, edge splines and one reflector surface. QA reports `renderer.info` totals at most once per second.
- LOD: high 100% leaves / 384 px reflection / half-resolution bloom; medium about 70% leaves / 256 px reflection / no bloom; low about 47% leaves / no reflection / no bloom. DPR is bounded separately by viewport class.
- Pause the render loop when the hero leaves the viewport or the document is hidden. Compile materials before readiness; no hover path creates a new shader variant.

The procedural route is intentional: no Blender executable or supplied glTF exists in this worktree, and the shape language in the reference is achievable with a few deterministic custom meshes. It avoids external downloads, keeps the asset graph inspectable, and allows all service positions and data paths to come from the existing topology.

## Round 2 draw-call budget estimate

The scene batches repeated geometry before it reaches the renderer: all service platforms/roofs share an instanced structure batch; service bodies, window details and status rings each use one instanced batch; network tubes merge into one geometry per edge kind; core nodes, telemetry packets, pool ripples and bonsai pads are instanced; the six bonsai branch tubes merge into one geometry. No downloaded models or textures were added.

| Component | Estimated scene draws |
| --- | ---: |
| Core (smoked shell, transmission shell, fresnel rim, topology edges, instanced nodes, center glow, energy column) | 7 |
| Orbit rings (three glass bands and three moving highlights) | 6 |
| Service modules (structure, bodies, windows/status details, focus/failure rings) | 4 |
| Data paths (four merged edge kinds, request packet, telemetry batch, request marker) | 7 |
| Island (top, strata, top pool, moss batch, rock batch) | 5 |
| Bonsai (merged branches, instanced canopy pads) | 2 |
| Waterfalls (two sheets, one instanced mist cluster) | 3 |
| Lower pool (reflective plane and instanced ripples) | 2 |
| Callouts (one merged leader geometry; labels are HTML) | 1 |
| **Scene subtotal** | **37** |

This is a design estimate, not a measured result. A frame with bloom is expected to render the main scene and a similar-size planar reflection, then add roughly a dozen post-processing draws; that places the estimate near 80–110 total draws. State visibility, shadow rendering, renderer behavior and the active quality tier can change the count. Claude should confirm data-hero-drawcalls from the desktop-high screenshot run before treating the under-150 budget as verified. The runtime hero fallback in public/hero is 294,341 bytes; this round adds no runtime assets.

The animation loops mutate existing refs, transforms, instance matrices, and shader uniforms. They do not update React state per frame or allocate vectors, colors, matrices, or geometry in `useFrame`. The request simulation continues on its existing timer and uses the shared topology and simulation semantics.
