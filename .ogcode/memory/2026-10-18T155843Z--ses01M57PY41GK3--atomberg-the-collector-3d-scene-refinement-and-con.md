---
title: "Atomberg \"The Collector\" 3D scene refinement and controller enclosure"
session_id: "ses_01M57PY41GK3YHYKRPK3E4WV15"
session_type: "build"
project_id: "/Users/billasur/Projects/atomberg"
created_at: 2026-10-18T15:58:43Z
---

# Atomberg "The Collector" 3D scene refinement and controller enclosure

Topics: three.js scene, controller enclosure, label layout, pressure ladder, camera fit, materials palette

## Request

The developer asked to keep the page layout, typography and copy **exactly** as they are, and fix only the 3D scene and the numbers, with these numbered requirements (kept in their own words):

1. **Keep the current model direction and geometry. Do not follow any reference render.** Improve only the colour and material quality: a restrained palette of warm off-white casing, three clearly distinct cartridges (cool white sediment, charcoal carbon, one deep blue membrane), a single accent colour for water (clean mid blue, slightly translucent) and a single accent for faults (amber for warning, red for removed/bypassed). Replace the flat grey look with soft studio lighting, subtle reflections on the cartridge glass, a soft contact shadow and a clean light background tone that matches the page. Hoses and cables: smooth, consistent thickness, matte black cables and blue water tubes. "Keep points 2 to 6 and the controller box note as written."
2. **Fill the canvas:** model should take about 80 percent of the viewport height, centered, camera slightly 3/4, no big empty space.
3. **Labels:** no overlaps. Anchor each readout to its sensor with a short leader line and push them outward from the model so they never sit on top of cartridges or each other. Solid readable background, same opacity always (the FLOW label is faded).
4. **Pressure ladder must make physical sense:** P1 > P2 > P3 > P4 and P4 is the lowest. Example: P1 300, P2 281, P3 271, P4 37 kPa (membrane takes the big drop). No downstream pressure above upstream.
5. **Water flow must be visible:** animated particles or a moving gradient inside the tubes and through the cartridges, speed proportional to flow. Removed state: empty housing and flow bypasses. Clogged: cartridge tints and flow slows.
6. Keep the **Simulated values / concept** label visible.

Verification requirement, verbatim: "Verify in a real browser at desktop and mobile widths with screenshots before saying done."

Addendum to the same feedback: "the controller is just a flat black slab on the floor. Make it a proper small enclosure mounted on the back wall of the casing: rounded-edge matte black box with a visible bevel, a small lit display on the front showing the status text (ALL OK / CART 2 MISSING), one status LED that changes green/amber/red with state, cable glands at the bottom with the sensor cables routed neatly into it."

## What was done

### Simulation numbers — `src/physics.js` (changed)
- `FEED_KPA` changed from `660` to `300`, giving the absolute ladder 300 / 281.1 / 271.2 / 37.2 kPa at 0.45 L/min (`FLOW_REF = 0.45` L/min retained).
- `clogged` state `flowFactor` changed from `1` to `0.72` so clogged flow slows (`multipliers: [3.4, 1, 1]` unchanged).
- Described in the agent's own notes as "DONE (unchanged)" in later passes — these two edits were the whole change to this file.

### Controller enclosure — `makeController` in `src/scene/model.js` (changed)
- Moved off the floor: old placement `controller.group.position.set(0.02, 0.012, 0.085)` replaced by wall mounting at `(0, CONTROLLER_Y, -D / 2 + T + 0.016)`, with new constant `CONTROLLER_Y = 0.373` next to `RAIL_Y = 0.335`, `RAIL_Z = 0.012` — glands land on the same line as the sensor rail so the harness climbs the back wall and enters from below.
- Rebuilt as a proper enclosure: `WIDTH = 0.096`, `HEIGHT = 0.05`, `DEPTH = 0.03`, rounded body `roundedBox(WIDTH, HEIGHT, DEPTH, 0.005, materials.black)` with cast/receive shadow; a proud face plate `roundedBox(WIDTH - 0.007, HEIGHT - 0.007, 0.005, 0.0015, materials.blackFace)`; a recessed bezel `roundedBox(0.074, 0.038, 0.004, 0.0012, materials.rubber)`; a rear mounting plate `roundedBox(WIDTH + 0.006, HEIGHT + 0.006, 0.004, 0.004, materials.rubber)` (shrunk from `+ 0.01` so it does not read oversized) at `z = -DEPTH/2 - 0.0015`; four corner screws (cylinders r `0.0021`, h `0.0025`) at `±(WIDTH/2 + 0.0012), ±(HEIGHT/2 + 0.0012), z = -0.0145`.
- Lit display: 384×192 `<canvas>` driving a `THREE.CanvasTexture` (`SRGBColorSpace`, `anisotropy = 4`) on a `MeshBasicMaterial({ map, toneMapped: false })` plane; default text lines `["FILTER HEALTH", "ALL OK", "0.45 L/MIN   412 > 38 PPM"]`; font stack `'Inter Variable', Inter, system-ui, sans-serif`.
- One status LED as a `MeshBasicMaterial({ color: 0x3fae5a, toneMapped: false })`, driven by state (green / amber / red).

### Cables routed into the glands — `src/scene/model.js` (changed)
- `cablePaths` replaced: both `CatmullRomCurve3` paths now climb the back wall and terminate near `[-0.026/0.026, 0.341, -0.104]` (the controller's underside), instead of dropping to the floor at `y ≈ 0.03–0.04`.
- Tube meshes: `TubeGeometry(curve, 64, 0.0016, 8, false)` with `materials.cable` — smooth, consistent thickness.

### Materials palette — `createMaterials()` in `src/scene/model.js` (changed)
- `shell`: color `0xf3f0e8`, roughness `0.46`, metalness `0`, clearcoat `0.3`, clearcoatRoughness `0.4`, `envMapIntensity: 0.8` (was `0xf4f3ee`, roughness `0.5`, clearcoat `0.35`).
- `board`: `0xe4e2da`, roughness `0.95` (was `0xdeddd6` / `0.92`).
- `black`: `0x141615`, roughness `0.46`, metalness `0.1`, `envMapIntensity: 0.7`; new `blackFace`: `0x1c1e1d`, roughness `0.32`, metalness `0.18`; `rubber`: `0x1d1e1c`, roughness `0.98`.
- `clear` (cartridge glass): `0xf2f4f3`, roughness `0.05`, `opacity: 0.2`, `side: DoubleSide`, `depthWrite: false`, `clearcoat: 1`, `clearcoatRoughness: 0.05`, `envMapIntensity: 1.6`.

### Per-cartridge tinting — `setFault` in `src/scene/model.js` (changed)
- Housing material is now cloned per cartridge (`housingMat`) so a fault tints one housing without the others.
- Signature changed from `setFault(isFault)` to `setFault(mode)`: `clogged` → `materials.warnColor` (amber), `removed` / `bypassed` → `materials.faultColor` (red), otherwise base colour; tint applies to `setMaterials` **plus** `housingMat`.
- Removed state now empties the housing for **any** cartridge: `inner.visible = mode !== "removed"` (an earlier version only did this for the carbon cartridge).
- Sediment ribs (`ribMat`, 6 torus ribs r `0.0268`/`0.0011`) and carbon granules (`granuleMat`) are cloned into `setMaterials` so they tint with the rest of the cartridge.

### Cartridge geometry / plumbing — `src/scene/model.js` (changed)
- `CART_Z` moved from `-0.045` to `0` so the cut-away reads as a unit packed with parts rather than a box with a cluster at the back.
- Each cartridge now has two top ports at `dz = ±0.014` (brass, r `0.0058`, h `0.016`) instead of one, so inlet/outlet plumbing stays on the rail.
- Carbon bed rebuilt as an `InstancedMesh` of `2000` `IcosahedronGeometry(0.0031, 0)` granules distributed over `y = 0.078 … 0.272`, radius ≤ `0.0205` (fine bed instead of coarse rubble).
- `tubePaths` rewritten as an ordered chain: inlet → flow sensor → TDS in → left riser → P1 → cartridge 1 → P2 → cartridge 2 → P3 → cartridge 3 → P4 → outlet TDS → out the open side; the cartridge-to-rail jumpers arc over the top caps at `y ≈ 0.331–0.339` so they never lie across the brass ports.

### Label layout — `src/main.js` (changed)
- `layoutLabels` refactored: `placeRow` (the four pressure/TDS callouts parked at the top margin) runs first, and its `rowBottom` plus `LAYOUT.rowFootGap` is passed into `placeSides` as a `minTop` argument, so side columns (flow, TDS in/out) start below the row and the two groups cannot collide.
- `placeSides(items, rect, silhouette, minTop)` replaces `minTop = silhouette.top` with the passed-in value; `maxBottom = rect.height - 64` unchanged.

### Label styling — `src/style.css` (changed)
- `.lbl-body` background changed from translucent `rgba(232, 232, 228, 0.84)` with `backdrop-filter: blur(3px)` to solid `var(--stage)` plus `box-shadow: 0 0 0 1px rgba(17, 18, 17, 0.05)`; `.lbl-body.is-right` now only sets `text-align: right` (the `translate(calc(var(--dx,0px) - 100%))` was dropped).
- Removed `.lbl.is-occluded { opacity: 0.42 }` — the always-same-opacity requirement.
- Added `--warn: #a9701a` (alongside existing `--fault: #b3382c`) and `.lbl.is-warn` rules for dot, leader (`rgba(169, 112, 26, 0.5)`) and value colour.

### Camera framing — `fitView` in `src/main.js` (changed)
- `fitView(direction, aspect, fill, box, zoom)` now iterates 4 passes: solve distance for the box corners, project them, measure the silhouette's mid X/Y, and nudge the target `target.addScaledVector(right, midX * distance * tanH)` / `(up, midY * distance * tanV)` to centre the perspective silhouette rather than the box centre; returns `{ position, target }`.
- `window.__stage` debug hook (exposing `THREE, scene, camera, controls, model, renderer, canvas, box, presetView, fitView, setPreset`) was added for headless inspection, then **removed** before the final build.
- `setPreset` now calls `model.setShellTop(name !== "top")`.

### Top preset — `setShellTop` in `src/scene/model.js` (changed)
- New model API method `setShellTop(visible)` setting `top.visible = visible`, exported alongside `setFault`/`setDisplay`/`setStatus`, so the "Top" preset lifts the solid lid and shows rail plumbing, controller, cable runs, pressure modules and jumper arcs.

### MEMORY.md (changed)
- The atomberg section of `/Users/billasur/Projects/MEMORY.md` was rewritten to record: ports 4174 = vite dev / 4173 = `vite preview` serving `dist/`; the cut-away shell deliberately has no front or right panel; the top-panel lift for the "Top" preset (`model.setShellTop(false)` via `setPreset`); `PRESETS` (`overview` / `cutaway` / `top` / `detail`) resolved by `fitView` keeping the model ~73–80% of stage height; `placeRow` / `placeSides` label placement; ΔP for stages 1–3 and **absolute** P4 being intentional and not to be "fixed"; raycast occlusion against `occluders`; the 300 / 281.1 / 271.2 / 37.2 kPa ladder with clogged flow ×0.72; per-cartridge material clones.

## Key files & symbols

- `/Users/billasur/Projects/atomberg/src/physics.js` — `FLOW_REF`, `FEED_KPA`, `STATES`, `createSim`, `clogged.flowFactor`.
- `/Users/billasur/Projects/atomberg/src/scene/model.js` — `createMaterials()`, `buildModel()`, `makeController()`, `roundedBox`, `setFault(mode)`, `setStatus`, `setDisplay`, `setShellTop`, `RAIL_Y`, `RAIL_Z`, `CONTROLLER_Y`, `CART_X = [-0.085, 0, 0.085]`, `CART_Z`, `tubePaths`, `cablePaths`, `occluders`, `setMaterials`.
- `/Users/billasur/Projects/atomberg/src/main.js` — `fitView`, `presetView`, `setPreset`, `PRESETS`, `layoutLabels`, `placeRow`, `placeSides`, `LAYOUT.rowFootGap`.
- `/Users/billasur/Projects/atomberg/src/style.css` — `.lbl-body`, `.lbl.is-right`, `.lbl.is-warn`, `.lbl.is-fault`, `--warn`, `--fault`, `--stage`.
- `/Users/billasur/Projects/atomberg/index.html` — untouched; holds the cartridges/table copy and the "Simulated values" disclaimer (~line 80).
- `/Users/billasur/Projects/MEMORY.md` — atomberg section rewritten.
- `/Users/billasur/Projects/.tools/shot.mjs` — CDP screenshot helper (`VW`, `VH`, `DPR`, `WAIT`, `STABILISE`, `CLIP`), attaching to headed Chrome on port 9333 and printing `eval: <result>`.

## Decisions & why

Preserved from the agent's final response:

- **Lift the top panel in the Top preset rather than change the preset's camera.** A solid lid blocks every downward angle; a lower angle would have just duplicated Overview. Hiding one panel for one preset keeps the model intact and makes the preset's purpose real.
- **`setShellTop` lives on the model, not as a raw mesh grab from `main.js`.** Keeps the shell's construction private to `model.js`, matching how `setFault`/`setDisplay` already work.
- **Removed the debug hook entirely** instead of trimming it to fewer fields — the preset and state buttons are enough to drive verification, and the production bundle had already been proven without it.
- One judgement call to be aware of: the Cartridges close-up intentionally lets the row labels float over the model's top edge (controller behind them). Rects measure 16px apart so there is no label-to-label overlap; if you want them clear of the model there too, that preset needs a taller stage or smaller labels, not a placement tweak.

## Outcome

Verified, per the final response, against the production bundle (`dist/` served on `:4173`):

- `npx vite build` clean after `node --check` on both `src/main.js` and `src/scene/model.js`.
- Overview, Top, and Top → Overview all render correctly in the built bundle: the top panel hides and restores, the display still reads `ALL OK`, LEDs and labels intact.
- Earlier in the turn, verified with screenshots: clogged state (amber cartridge including ribs, amber LED, `CART 1 CLOGGED`), removed (`CART 2 MISSING`, empty red-tinted housing), bypassed (`CART 2 BYPASSED`, tinted bed retained), overview / cut-away at 1454×907, Cartridges close-up (label rects measured 16px apart, no overlap), and mobile 390×844 (side labels hidden, row labels on one line, ~84% stage height).
- Pressure ladder landed at the requested physical ordering — 300 / 281.1 / 271.2 / 37.2 kPa at 0.45 L/min.
- Agent offered two URLs: `http://4174.preview.localhost:9603/` (dev server) and `http://4173.preview.localhost:9603/` (built bundle).

Open / flagged: the Cartridges close-up row labels overlapping the model's top edge (accepted, explained above). No git repository in the project, so nothing was committed.
