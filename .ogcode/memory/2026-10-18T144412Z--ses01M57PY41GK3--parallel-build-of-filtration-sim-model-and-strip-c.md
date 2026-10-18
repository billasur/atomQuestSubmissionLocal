---
title: "Parallel build of filtration sim model and strip-chart trace"
session_id: "ses_01M57PY41GK3YHYKRPK3E4WV15"
session_type: "build"
project_id: "/Users/billasur/Projects/atomberg"
created_at: 2026-10-18T14:44:12Z
---

# Parallel build of filtration sim model and strip-chart trace

Topics: parallel workers, scene/model.js, flow meshes, sim physics model, strip chart

## Request
The developer asked: "use 1-2 more workers and build in parallel". No further detail or scope was given in the digest.

## What was done
### Edits to `/Users/billasur/Projects/atomberg/src/scene/model.js`
Two edit calls were issued carrying the same set of four changes (the second call appears to be a re-application/retry, with only the quoting of the third edit's `old_string` differing):

- **Flow meshes added to the scene group.** Both `makeFlow(...)` call sites were changed from `flows.push(makeFlow(...))` to assign the result and add its object:
  - the tube loop: `const flow = makeFlow(curve, materials, 0.0155); group.add(flow.object); flows.push(flow);`
  - the per-cartridge annulus loop (curve points at `CART_Y1 - 0.008`, `0.24`, `0.12`, `CART_Y0 + 0.006` at `CART_Z + 0.028/0.029/0.03`): `const flow = makeFlow(curve, materials, 0.017, 0.0046); group.add(flow.object); flows.push(flow);`
- **Shadow traverse removed.** The block before `return {` was deleted:
  ```js
  group.traverse((o) => {
    if (o.isMesh) o.castShadow = o.castShadow || false;
  });
  ```
- **Canvas label lines hoisted to a variable** next to `canvas.width = 384`:
  ```js
  let lastLines = ["FILTER HEALTH", "ALL STAGES OK", "0.45 L/MIN   412 > 38 PPM"];
  ```
- **Redraw after fonts load**, replacing the single hard-coded `draw([...])` call:
  ```js
  draw(lastLines);
  const ready = document.fonts && document.fonts.ready;
  if (ready) ready.then(() => draw(lastLines));
  ```

### New file: simulated physics model (path not recorded in the digest)
Header comment describes it as "A deliberately small physics model, not instrumentation": each stage has a resistance in kPa per L/min, drop across a stage is `dP = k * Q * R`, and health is the ratio `R_effective / R_new` (equivalently `dP / (Q * R_new)`); a removed cartridge has almost no resistance, a loaded one has more.

Constants: `FLOW_REF = 0.45` (L/min), `FEED_KPA = 660`, `SENSOR_NOISE_KPA = 0.05`, `LOW_THRESHOLD = 0.35`, `HIGH_THRESHOLD = 1.8`, plus `BASE_TOTAL` computed as the sum of stage `base` values.

Exported `STAGES` (id, index, name, base) in order:
1. `{ id: "sediment", index: 1, name: "Sediment", base: 42 }`
2. `{ id: "carbon", index: 2, name: "Carbon", base: 22 }`
3. `{ id: "membrane", index: 3, name: "Membrane", base: 520 }`

Exported `STATES` (multipliers, flowFactor, label):
- `new`: `multipliers: [1, 1, 1]`, `flowFactor: 1`, `label: "New"`
- `clogged`: `multipliers: [3.4, 1, 1]`, `flowFactor: 1`, `label: "Clogged"`
- `removed`: `multipliers: [1, 0.012, 1]`, `flowFactor: 1`, `label: "Cartridge 2 removed"`
- `bypassed`: `multipliers: [1, 0.1, 1]`, `flowFactor: 1.06`, `label: "Bypassed"`

Exported `createSim()`: holds `state = "new"`; smoothed `mul` array copied from `STATES.new.multipliers` and `flowFactor` so transitions read "as water settling, not a jump cut"; a per-sensor `noise` object (`p: [0, 0, 0, 0]`, `flow`, `tdsIn`, `tdsOut`, random `phase`); `clock` and `cached`. `setState(next)` ignores unknown keys and sets `state`. `tick(dt)` advances the clock, smooths toward the target with `k = 1 - Math.exp(-dt / 0.18)`, and applies a random walk on each sensor relaxed back toward zero. (Body truncated in the digest after this point.)

### New file: strip-chart trace (path not recorded in the digest)
Header comment: "Monochrome strip chart: normalised pressure drop per stage over time. Ring buffers, 1px lines, no fills. Rendered at device pixel ratio."

- `SERIES_COLORS = ["#111211", "#74766f", "#a6a8a1"]`, `LOW = 0.35`, `HIGH = 1.8`, `MAX = 3.6`.
- Exported `createTrace(canvas, { samples = 320 } = {})`: three `Float32Array(samples)` buffers, `filled` counts and a `markers` list.
  - `resize()` reads `getBoundingClientRect()`, bails when width is 0, sets `dpr = Math.min(window.devicePixelRatio || 1, 2)`, sizes the backing canvas and redraws.
  - `push(values)` shifts each buffer with `copyWithin(1, 0, samples - 1)`, writes `values[s] ?? 1` at index 0, increments `filled`, advances/expires markers past `samples`, redraws.
  - `mark(label)` pushes `{ index: 0, label }`.
  - `draw()` uses padding `padLeft = 1`, `padRight = 27`, `padTop = 7`, `padBottom = 13`, `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`, a `yFor` mapping clamped to `MAX`, and `xFor` running right-to-left; draws a grid at `rgba(17,18,17,0.12)` at 1px. (Body truncated in the digest after the grid block.)

### Parallel workers
The digest records no worker/task-spawn tool calls — only direct edits and file writes — so whether additional workers were actually started is not evidenced.

## Key files & symbols
- `/Users/billasur/Projects/atomberg/src/scene/model.js` — `makeFlow`, `flows`, `cartridges`, `CART_Y1`, `CART_Y0`, `CART_Z`, the canvas label texture (`canvas.width = 384`, `draw`), `document.fonts.ready`.
- New sim module — `STAGES`, `STATES`, `BASE_TOTAL`, `LOW_THRESHOLD`, `HIGH_THRESHOLD`, `FLOW_REF`, `FEED_KPA`, `SENSOR_NOISE_KPA`, `createSim`, `setState`, `tick`.
- New trace module — `createTrace`, `SERIES_COLORS`, `LOW`, `HIGH`, `MAX`, `resize`, `push`, `mark`, `draw`.

## Outcome
- `src/scene/model.js` edits: applied via two edit calls, not verified or run; the response says nothing about testing. The duplicate second call may mean one application failed or was repeated — the digest does not say which.
- The sim physics module and the strip-chart trace module were written as new files; not verified, and their paths are not in the digest.
- No final text response was produced, so there is no stated build result, no confirmation that the parallel workers were used, and no summary of next steps. Everything above should be treated as changed-but-unchecked.
