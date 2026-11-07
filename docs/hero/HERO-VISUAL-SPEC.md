# Hero visual spec

Reference canvas: 1672 × 941 px. Coordinates below are normalized to the full viewport; values are measured from the approved composition and rounded to the nearest 1%.

## Composition bounds

| Element | Viewport box (x, y, w, h) | Measured intent |
| --- | --- | --- |
| Headline | (5%, 25%, 30%, 21%) | Left aligned; 3 lines; 70–76 px serif; line-height 0.91 |
| CTA | (5.5%, 60%, 14.5%, 6%) | 240 × 56 px amber outline; 16 px label |
| Proof strip | (3.8%, 85%, 47%, 10%) | Three groups; 16 px labels; 13 px descriptions |
| Core sphere | (62%, 27%, 13%, 21%) | Center (68.5%, 37.5%); diameter ≈ 0.55× mean ring radius |
| Orbital rings | (46%, 12%, 42%, 53%) | Three crossing ellipses; projected radii ≈ 20%, 17%, 18% viewport width |
| Island | (32%, 57%, 52%, 22%) | Broad, shallow rock shelf; top plane at y≈65% |
| Bonsai | (36%, 39%, 20%, 25%) | Trunk rooted on island; foliage crown to the left of the core |
| Waterfalls | (52%, 63%, 23%, 16%) | Two narrow cascades from the front lip; impacts near x=56%, 66% |
| Pool | (20%, 70%, 74%, 27%) | Dark reflective plane fades to near-black at viewport edges |

Ring band width is about 3.2% of its radius and its minor thickness about 1.9% (rounded rectangular / flattened oval band). The three topology tilts are [18°, -10°], [-13°, 24°], and [68°, 7°] around X/Z, so the persistence orbit is near-vertical. Use the orbit radii, periods and tilts in `topology.ts`; the sphere network has 7 service nodes and only topology-defined edges. The outer ring radius is about 1.8× the sphere diameter.

## Camera and scene scale

- Perspective camera: estimated 32–36° vertical FOV, eye 3.5–4.5 scene units above the pool plane, at 9.5–12 units from the core.
- Look-at point: core/island midpoint, about 0.1 units above the core center. Desktop visual group is shifted right by roughly 1.8 scene units so the copy retains a clear 3% gutter.
- Orthographic width equivalent: 14–16 scene units at 16:9. Mobile uses a closer portrait composition, core above the island and headline below.
- Main key: warm amber `#FFC766`, 2–3 scene-unit radius with inverse-square falloff; neutral warm key 1.0–1.4 radius; cool fill `#9CB8C9` at 0.25–0.4 intensity; soft rim `#F5F1EA` at 0.3–0.5. Background receives no bright key spill.

## Type, spacing, palette

- Hero serif: 68–76 px desktop (`clamp(3.5rem, 5vw, 4.75rem)`), 44–52 px mobile; line-height 0.91; tracking −0.04em. Body 17–18 px / 1.55; eyebrow 12 px uppercase with 0.18em tracking.
- Copy width: 440–500 px (26–30% viewport); headline-to-body gap 24 px; body-to-CTA gap 30 px; proof strip starts 5% above the bottom edge.
- Reference sheet 11 swatches: background `#060809`, surface `#1F1A18`, muted `#A4A29E`, accent `#FFC766`, success `#5BD68D`, error `#FF686B`. Metal / glass / water stay near those tones. The implementation also respects site tokens for text, paper and amber in light theme.
- Calls to action: 1 px amber outline, 28 px radius, 48–56 px height; hover glow stays within 8 px. Labels use 15–16 px sans serif.

Light mode keeps the same geometry with daylight key and paper `#F5F0E6`; remove bloom and replace emissive glow with soft shadows. AA text contrast is required for every HTML label and control.
