import "./style.css";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

import { buildModel } from "./scene/model.js";
import { createSim, STAGES, STATES } from "./physics.js";
import { createTrace } from "./trace.js";

/**
 * Page entry.
 *
 * One simulation drives everything on the page: the scene's water speed and
 * cartridge fault state, the projected labels, the table, the verdict and the
 * strip-chart trace. Nothing is animated independently, so the numbers always
 * agree with the model.
 */

const stageEl = document.getElementById("stage");
const canvas = document.getElementById("scene");
const labelsEl = document.getElementById("labels");
const fallbackEl = document.getElementById("stage-fallback");
const traceCanvas = document.getElementById("trace");

const verdictEl = document.getElementById("verdict");
const verdictStateEl = document.getElementById("verdict-state");
const verdictDetailEl = document.getElementById("verdict-detail");

const sim = createSim();
const trace = createTrace(traceCanvas, { samples: 320 });

const LABEL_SAMPLES = 8; // 8 Hz matches the trace cadence
const TRACE_INTERVAL = 1 / LABEL_SAMPLES;
const VERDICT_INTERVAL = 1;

const reducedMotion =
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------- state */

const stateButtons = Array.from(document.querySelectorAll(".ctrl"));

for (const button of stateButtons) {
  button.addEventListener("click", () => applyState(button.dataset.state));
}

function applyState(state) {
  if (!STATES[state]) return;
  sim.setState(state);
  trace.mark(STATES[state].label);
  for (const button of stateButtons) {
    button.setAttribute(
      "aria-pressed",
      button.dataset.state === state ? "true" : "false"
    );
  }
}

applyState("new");

/* ------------------------------------------------------------------ labels */

/* A callout is never parked at a fixed offset from its tap: the four pressure
   taps sit shoulder to shoulder along the rail, so they share a row above the
   unit, while the flow and TDS probes sit low on the sides and get a column
   just outside the model's silhouette. Each body is placed against that
   silhouette every frame, so no callout can land on the cartridges, and the
   leader is aimed from the dot to the nearest edge of its body. */
const labels = [
  {
    anchor: "p1",
    name: "P1 · FEED",
    unit: "kPa",
    digits: 1,
    row: true,
    read: (r) => r.pressures[0],
    sub: () => "inlet pressure",
  },
  {
    anchor: "p2",
    name: "P2 · AFTER SEDIMENT",
    unit: "kPa",
    digits: 1,
    row: true,
    stage: 0,
    read: (r) => r.pressures[1],
    sub: (r) => `−${r.stages[0].dp.toFixed(1)} kPa sediment`,
  },
  {
    anchor: "p3",
    name: "P3 · AFTER CARBON",
    unit: "kPa",
    digits: 1,
    row: true,
    stage: 1,
    read: (r) => r.pressures[2],
    sub: (r) => `−${r.stages[1].dp.toFixed(1)} kPa carbon`,
  },
  {
    anchor: "p4",
    name: "P4 · OUTLET",
    unit: "kPa",
    digits: 1,
    row: true,
    stage: 2,
    read: (r) => r.pressures[3],
    sub: (r) => `−${r.stages[2].dp.toFixed(1)} kPa membrane`,
  },
  {
    anchor: "flow",
    name: "FLOW · Q",
    unit: "L/min",
    digits: 2,
    side: "left",
    read: (r) => r.flow,
  },
  {
    anchor: "tdsIn",
    name: "TDS IN",
    unit: "ppm",
    digits: 0,
    side: "left",
    read: (r) => r.tdsIn,
  },
  {
    anchor: "tdsOut",
    name: "TDS OUT",
    unit: "ppm",
    digits: 0,
    side: "right",
    read: (r) => r.tdsOut,
  },
];

for (const label of labels) {
  const el = document.createElement("div");
  el.className = "lbl is-hidden";
  el.dataset.anchor = label.anchor;
  // The support detail moves out of the way on a narrow stage; the four
  // pressure taps always stay.
  if (label.side) el.dataset.optional = "true";

  const dot = document.createElement("span");
  dot.className = "lbl-dot";

  // The leader is re-aimed from the dot whenever the body moves.
  const leader = document.createElement("span");
  leader.className = "lbl-leader";

  const body = document.createElement("span");
  body.className = "lbl-body";
  // A body to the left of its tap reads towards the model, not away from it.
  if (label.side === "left") body.classList.add("is-right");

  const nameEl = document.createElement("span");
  nameEl.className = "lbl-name";
  nameEl.textContent = label.name;

  const valEl = document.createElement("span");
  valEl.className = "lbl-val";
  const valueNode = document.createTextNode("—");
  const unitEl = document.createElement("span");
  unitEl.textContent = label.unit;
  valEl.append(valueNode, unitEl);

  // Second line: the drop that produced this reading, so the callout shows the
  // ladder as well as the absolute pressure.
  const subEl = document.createElement("span");
  subEl.className = "lbl-sub";
  if (label.sub) subEl.textContent = "—";

  body.append(nameEl, valEl);
  if (label.sub) body.append(subEl);
  el.append(dot, leader, body);
  labelsEl.append(el);

  label.el = el;
  label.body = body;
  label.leader = leader;
  label.valueNode = valueNode;
  label.subEl = label.sub ? subEl : null;
  label.shown = false;
  label.at = { x: 0, y: 0 };
  label.size = null;
}

/* ------------------------------------------------------------------- stage */

/* The stage is a fixed-height panel whose width moves with the viewport, so a
   preset is a viewing direction plus a fill, never a fixed position. The
   distance and the centring are solved from the model's bounding box on every
   resize: solving it from a single radius shrank the unit on portrait stages,
   where the width — not the height — is what limits the frame. */
const FOV_HALF = THREE.MathUtils.degToRad(32 / 2);
const WORLD_UP = new THREE.Vector3(0, 1, 0);

const PRESETS = {
  overview: {
    direction: new THREE.Vector3(0.55, 0.27, 0.86),
    fill: { x: 0.82, y: 0.9 },
    zoom: 1,
  },
  cutaway: {
    direction: new THREE.Vector3(0.72, 0.2, 0.7),
    fill: { x: 0.82, y: 0.9 },
    zoom: 0.98,
  },
  top: {
    direction: new THREE.Vector3(0.5, 0.9, 0.55),
    fill: { x: 0.9, y: 0.86 },
    zoom: 1,
  },
  detail: {
    direction: new THREE.Vector3(1, 0.12, 0.28),
    fill: { x: 0.88, y: 0.94 },
    zoom: 1,
    // The cartridge stack, not the whole cabinet, is the subject here.
    box: new THREE.Box3(
      new THREE.Vector3(-0.13, 0.04, -0.11),
      new THREE.Vector3(0.15, 0.33, 0.08)
    ),
  },
};

function viewBoxCorners(box, out) {
  out.length = 0;
  for (let i = 0; i < 8; i++) {
    out.push(
      new THREE.Vector3(
        i & 1 ? box.max.x : box.min.x,
        i & 2 ? box.max.y : box.min.y,
        i & 4 ? box.max.z : box.min.z
      )
    );
  }
  return out;
}

/* Camera position and target that fit `box` inside the frame at `aspect`,
   with `fill` of the frame used on each axis.

   The perspective projection does not put the bounding box's centre at the
   middle of the frame: the corner nearest the camera looms larger, so aiming
   at the centre pushes the silhouette off-axis and wastes the far margin. So
   the target is nudged until the projected silhouette is centred, and the
   distance is solved again for the moved target — a couple of passes settle
   it. */
function fitView(direction, aspect, fill, box, zoom) {
  const dir = direction.clone().normalize();
  const view = dir.clone().negate();
  const right = new THREE.Vector3().crossVectors(view, WORLD_UP).normalize();
  const up = new THREE.Vector3().crossVectors(right, view).normalize();
  const center = box.getCenter(new THREE.Vector3());
  const tanV = Math.tan(FOV_HALF);
  const tanH = tanV * aspect;
  const corners = viewBoxCorners(box, []).map((corner) => corner.sub(center));

  const target = new THREE.Vector3();
  let distance = 0;

  for (let pass = 0; pass < 4; pass++) {
    const locals = corners.map((corner) => corner.clone().sub(target));
    distance = 0;
    for (const local of locals) {
      const along = local.dot(dir);
      distance = Math.max(
        distance,
        Math.abs(local.dot(right)) / (tanH * fill.x) + along,
        Math.abs(local.dot(up)) / (tanV * fill.y) + along
      );
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const local of locals) {
      const depth = distance - local.dot(dir);
      if (depth <= 0) continue;
      const x = local.dot(right) / (tanH * depth);
      const y = local.dot(up) / (tanV * depth);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    if (Math.abs(midX) < 1e-4 && Math.abs(midY) < 1e-4) break;

    // Move the framing towards the silhouette's midpoint, which slides the
    // silhouette back towards the middle of the frame.
    target.addScaledVector(right, midX * distance * tanH);
    target.addScaledVector(up, midY * distance * tanV);
  }

  const aim = center.clone().add(target);
  return {
    position: dir.clone().multiplyScalar(distance * zoom).add(aim),
    target: aim,
  };
}

let modelBox = null;

function presetView(preset, aspect) {
  const portrait = aspect < 0.9;
  const fill = {
    // Portrait: the side callouts are gone, so the unit can use the width.
    x: preset.fill.x * (portrait ? 1.06 : 1),
    y: preset.fill.y * (portrait ? 0.9 : 1),
  };
  const box = preset.box ?? modelBox;
  if (!box) {
    return {
      position: new THREE.Vector3(0.62, 0.52, 1.0),
      target: new THREE.Vector3(0, 0.21, 0),
    };
  }
  return fitView(preset.direction, aspect, fill, box, preset.zoom);
}

const presetButtons = Array.from(document.querySelectorAll(".preset"));

let scene = null;
let camera = null;
let renderer = null;
let controls = null;
let model = null;

try {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe8e8e4);

  camera = new THREE.PerspectiveCamera(32, 1, 0.02, 6);
  camera.position.set(0.62, 0.52, 1.0);

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping =
    THREE.NeutralToneMapping ?? THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // A studio room rather than a flat ambient term: the clear housings, the
  // membrane wrap and the powder-coated shell all need something to reflect.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;
  pmrem.dispose();

  const ambient = new THREE.AmbientLight(0xffffff, 0.22);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0xf6f5f0, 0xa4a69d, 0.55);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xfffdf7, 2.0);
  key.position.set(0.6, 1.15, 0.9);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.2;
  key.shadow.camera.far = 4;
  key.shadow.camera.left = -0.4;
  key.shadow.camera.right = 0.4;
  key.shadow.camera.top = 0.5;
  key.shadow.camera.bottom = -0.3;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.004;
  key.shadow.radius = 4;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xf2f5ff, 0.5);
  fill.position.set(-0.9, 0.5, 0.6);
  scene.add(fill);

  // A cool rim from behind the unit separates the off-white casing from the
  // off-white stage without drawing a line.
  const rim = new THREE.DirectionalLight(0xe9f0f6, 0.7);
  rim.position.set(-0.35, 0.7, -0.85);
  scene.add(rim);

  // Shadow-only floor: the unit needs a contact shade to sit on the pale
  // stage rather than float in it. ShadowMaterial draws nothing but shadow.
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 1.2),
    new THREE.ShadowMaterial({ color: 0x111211, opacity: 0.13 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // The directional shadow alone reads hard on a matte plinth, so a soft
  // contact gradient pools under it as well.
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.5),
    new THREE.MeshBasicMaterial({
      map: contactShadowTexture(),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      toneMapped: false,
    })
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.set(0, 0.0015, -0.01);
  scene.add(contact);

  model = buildModel();
  // The model sits on its feet: the body bottom is local y = 0, feet reach below.
  model.group.position.y = 0.012;
  scene.add(model.group);
  modelBox = new THREE.Box3().setFromObject(model.group);

  controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.21, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.8;
  controls.minDistance = 0.26;
  controls.maxDistance = 1.8;
  controls.minPolarAngle = 0.16;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.addEventListener("start", () => {
    tween = null;
    userMoved = true;
  });
  controls.update();
} catch (error) {
  console.error(error);
  fallbackEl.hidden = false;
  stageEl.classList.add("scene-ready");
}

/* A radial alpha gradient: opaque under the unit, gone before the plane edge,
   so there is no rim to see. */
function contactShadowTexture() {
  const size = 256;
  const surface = document.createElement("canvas");
  surface.width = surface.height = size;
  const context = surface.getContext("2d");
  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  gradient.addColorStop(0, "rgba(24, 26, 24, 0.62)");
  gradient.addColorStop(0.42, "rgba(24, 26, 24, 0.3)");
  gradient.addColorStop(1, "rgba(24, 26, 24, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(surface);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Everything below needs a complete scene: a partial setup (renderer built,
// model failed) must not take the readout loop down with it.
const ready = Boolean(scene && camera && renderer && controls && model);

/* ---------------------------------------------------------------- presets */

let tween = null;
let activePreset = "overview";
let userMoved = false;

for (const button of presetButtons) {
  button.addEventListener("click", () => setPreset(button.dataset.preset));
}

function setPreset(name) {
  const preset = PRESETS[name];
  if (!preset || !camera || !controls) return;

  activePreset = name;
  userMoved = false;
  if (model && model.setShellTop) model.setShellTop(name !== "top");

  for (const button of presetButtons) {
    button.classList.toggle("is-active", button.dataset.preset === name);
  }

  const view = presetView(preset, camera.aspect);
  tween = {
    t: 0,
    duration: reducedMotion ? 0.001 : 0.85,
    fromPosition: camera.position.clone(),
    toPosition: view.position,
    fromTarget: controls.target.clone(),
    toTarget: view.target,
  };
  if (tween.duration <= 0.001) {
    camera.position.copy(tween.toPosition);
    controls.target.copy(tween.toTarget);
    tween = null;
  }
}

/* -------------------------------------------------------------------- loop */

const clock = new THREE.Clock();
const worldAnchor = new THREE.Vector3();
const boxCorner = new THREE.Vector3();
const ndc = new THREE.Vector3();

let traceAccum = 0;
let verdictAccum = VERDICT_INTERVAL;
let rendered = false;
let lastVerdictTitle = "";

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const reading = sim.tick(dt);

  if (model) model.update(dt, reading.flow);

  traceAccum += dt;
  if (traceAccum >= TRACE_INTERVAL) {
    traceAccum = 0;
    trace.push(reading.stages.map((s) => s.ratio));
    syncReadouts(reading);
  }

  verdictAccum += dt;
  if (verdictAccum >= VERDICT_INTERVAL || reading.verdict.title !== lastVerdictTitle) {
    verdictAccum = 0;
    syncVerdict(reading);
  }

  if (tween) {
    tween.t += dt / tween.duration;
    const p = Math.min(1, tween.t);
    const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    camera.position.lerpVectors(tween.fromPosition, tween.toPosition, e);
    controls.target.lerpVectors(tween.fromTarget, tween.toTarget, e);
    if (p >= 1) tween = null;
  }

  if (ready) {
    controls.update();
    renderer.render(scene, camera);
    camera.updateMatrixWorld();
    projectLabels();

    if (!rendered) {
      rendered = true;
      stageEl.classList.add("scene-ready");
    }
  }

  requestAnimationFrame(frame);
}

/* ----------------------------------------------------------------- readout */

const rows = new Map();
for (const tr of document.querySelectorAll("#stage-rows tr[data-stage]")) {
  rows.set(tr.dataset.stage, {
    tr,
    dp: tr.querySelector('[data-cell="dp"]'),
    ratio: tr.querySelector('[data-cell="ratio"]'),
    status: tr.querySelector('[data-cell="status"]'),
  });
}

const STATUS_TEXT = { low: "Low", normal: "Normal", high: "High" };

const ladderNote = document.getElementById("ladder-note");

function syncReadouts(reading) {
  for (let i = 0; i < STAGES.length; i++) {
    const stage = reading.stages[i];
    const row = rows.get(stage.id);
    if (!row) continue;
    setText(row.dp, stage.dp.toFixed(1));
    setText(row.ratio, `${stage.ratio.toFixed(2)}×`);
    setText(row.status, STATUS_TEXT[stage.status] ?? "Normal");
    row.tr.classList.toggle("is-fault", stage.status !== "normal");
  }

  // Four absolute pressures, each with the drop that produced it. Written from
  // the same reading object the table and the verdict use.
  for (const label of labels) {
    if (setText(label.valueNode, label.read(reading).toFixed(label.digits))) {
      label.size = null;
    }
    if (label.subEl && setText(label.subEl, label.sub(reading))) {
      label.size = null;
    }
    // A tap takes the colour of the stage that ends at it.
    if (label.stage !== undefined) {
      const stage = reading.stages[label.stage];
      label.el.classList.toggle("is-warn", stage.status === "high");
      label.el.classList.toggle("is-fault", stage.status === "low");
    }
  }

  if (ladderNote) {
    setText(ladderNote, `${ladderLine(reading)} kPa at ${reading.flow.toFixed(2)} L/min.`);
  }

  const mode = faultMode(reading);
  if (model) model.setFault(faultStage(reading), mode);
  if (model) model.setDisplay(displayLines(reading));
  if (model) {
    model.setStatus(
      reading.verdict.level === "settling"
        ? "ok"
        : reading.verdict.level !== "fault"
          ? "ok"
          : mode === "clogged"
            ? "warn"
            : "fault"
    );
  }
}

function ladderLine(reading) {
  return reading.pressures.map((p, i) => `P${i + 1} ${p.toFixed(1)}`).join(" → ");
}

/* What the scene should show for the simulated state: a clogged cartridge is
   tinted and still full, a missing one leaves an empty housing, a bypassed one
   is present but out of circuit. Derived from the state, not the verdict, so the
   unit never waits on the reading to change what is physically in it. */
function faultMode(reading) {
  if (reading.state === "clogged") return "clogged";
  if (reading.state === "removed") return "removed";
  if (reading.state === "bypassed") return "bypassed";
  return "ok";
}

function faultStage(reading) {
  if (reading.state === "clogged") return "sediment";
  if (reading.state === "removed") return "carbon";
  if (reading.state === "bypassed") return "membrane";
  return null;
}

function syncVerdict(reading) {
  lastVerdictTitle = reading.verdict.title;
  setText(verdictStateEl, reading.verdict.title);
  setText(verdictDetailEl, reading.verdict.detail);
  const fault = reading.verdict.level === "fault";
  verdictEl.classList.toggle("is-fault", fault);
}

/* The controller's own panel: the one line a person standing at the unit would
   read, in the words a filter monitor actually uses. */
function displayLines(reading) {
  const verdict = reading.verdict;
  const stage = reading.stages.find((s) => s.id === verdict.stageId);
  let status = "ALL OK";

  if (verdict.level === "settling") status = "SETTLING";
  else if (verdict.level === "fault" && stage) {
    if (reading.state === "removed") status = `CART ${stage.index} MISSING`;
    else if (reading.state === "bypassed") status = `CART ${stage.index} BYPASSED`;
    else status = `CART ${stage.index} CLOGGED`;
  }

  return [
    "SIMULATED MODEL",
    status,
    `${reading.flow.toFixed(2)} L/MIN   ${Math.round(
      reading.tdsIn
    )} > ${Math.round(reading.tdsOut)} PPM`,
  ];
}

/* Writes only when the value actually changed, and says whether it did — the
   callouts use that to know when their measured width is stale. */
function setText(node, value) {
  if (!node) return false;
  if (node.nodeValue !== null && node.nodeType === 3) {
    if (node.nodeValue === value) return false;
    node.nodeValue = value;
    return true;
  }
  if (node.textContent === value) return false;
  node.textContent = value;
  return true;
}

/* ---------------------------------------------------------------- projection */

const LAYOUT = {
  margin: 14,
  rowGap: 16,
  rowGapTight: 8,
  sideGap: 14,
  stackGap: 8,
  rowFootGap: 12,
  rowSilhouetteGap: 10,
};

function showLabel(label) {
  if (label.shown) return;
  label.el.classList.remove("is-hidden");
  label.shown = true;
}

function hideLabel(label) {
  if (!label.shown) return;
  label.el.classList.add("is-hidden");
  label.shown = false;
}

function labelSize(label) {
  if (!label.size) {
    label.size = { w: label.body.offsetWidth, h: label.body.offsetHeight };
  }
  return label.size;
}

/* The model's screen-space silhouette: callouts are placed outside it, so a
   reading never covers a cartridge. */
function projectSilhouette(rect) {
  const out = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
  if (!modelBox) return out;

  for (let i = 0; i < 8; i++) {
    boxCorner.set(
      i & 1 ? modelBox.max.x : modelBox.min.x,
      i & 2 ? modelBox.max.y : modelBox.min.y,
      i & 4 ? modelBox.max.z : modelBox.min.z
    );
    ndc.copy(boxCorner).project(camera);
    const x = (ndc.x * 0.5 + 0.5) * rect.width;
    const y = (-ndc.y * 0.5 + 0.5) * rect.height;
    out.left = Math.min(out.left, x);
    out.right = Math.max(out.right, x);
    out.top = Math.min(out.top, y);
    out.bottom = Math.max(out.bottom, y);
  }
  return out;
}

function projectLabels() {
  if (!model || !camera) return;

  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const anchors = [];

  for (const label of labels) {
    const anchor = model.anchors[label.anchor];
    if (!anchor) {
      hideLabel(label);
      continue;
    }

    worldAnchor.copy(anchor).applyMatrix4(model.group.matrixWorld);
    ndc.copy(worldAnchor).project(camera);

    const x = (ndc.x * 0.5 + 0.5) * rect.width;
    const y = (-ndc.y * 0.5 + 0.5) * rect.height;
    const inFrame =
      ndc.z < 1 && x > -80 && x < rect.width + 80 && y > -80 && y < rect.height + 80;

    if (!inFrame) {
      hideLabel(label);
      continue;
    }

    showLabel(label);

    if (Math.abs(label.at.x - x) > 0.4 || Math.abs(label.at.y - y) > 0.4) {
      label.at.x = x;
      label.at.y = y;
      label.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }

    anchors.push({ label, x, y });
  }

  layoutLabels(anchors, rect, projectSilhouette(rect));
}

/* Place a body, then point the leader at the nearest edge of it. The dot never
   moves, so every reading stays tied to its tap however far the body is
   pushed clear. */
function placeBody(label, left, top, size) {
  const dx = left - label.at.x;
  const dy = top - label.at.y;

  label.body.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(
    1
  )}px, 0)`;

  const nx = Math.min(Math.max(0, dx), dx + size.w);
  const ny = Math.min(Math.max(0, dy), dy + size.h);
  const length = Math.hypot(nx, ny);

  label.leader.style.width = `${Math.max(0, length - 3).toFixed(1)}px`;
  label.leader.style.transform = `rotate(${(
    (Math.atan2(ny, nx) * 180) /
    Math.PI
  ).toFixed(1)}deg)`;
}

/* The pressure taps are a row of neighbours, so their callouts are a row too:
   centred above the unit, wrapping onto a second line when the stage is
   narrow. The row is anchored to the unit's projected top edge rather than to
   the top of the stage, which keeps every leader a short hop from its tap
   instead of a diagonal across the cabinet. */
function placeRow(items, rect, silhouette) {
  const gap = rect.width < 480 ? LAYOUT.rowGapTight : LAYOUT.rowGap;
  const available = rect.width - LAYOUT.margin * 2;
  const lines = [];
  let line = [];
  let width = 0;

  for (const item of items) {
    const size = labelSize(item.label);
    if (!size.w) continue;
    const grown = line.length ? width + gap + size.w : size.w;
    if (line.length && grown > available) {
      lines.push({ items: line, width });
      line = [];
      width = 0;
    }
    width = line.length ? width + gap + size.w : size.w;
    line.push({ item, size });
  }
  if (line.length) lines.push({ items: line, width });

  const lineGap = Math.min(gap, 8);
  const total =
    lines.reduce((sum, row) => sum + Math.max(...row.items.map((e) => e.size.h)), 0) +
    lineGap * Math.max(0, lines.length - 1);

  // Bottom-anchored to the unit: as low as the model allows, never above the
  // stage padding.
  const limit = Number.isFinite(silhouette.top)
    ? silhouette.top - LAYOUT.rowSilhouetteGap
    : rect.height;
  let top = Math.max(LAYOUT.margin, limit - total);
  let bottom = top;

  for (const row of lines) {
    const height = Math.max(...row.items.map((entry) => entry.size.h));
    let left = (rect.width - row.width) / 2;

    for (const { item, size } of row.items) {
      placeBody(item.label, left, top, size);
      left += size.w + gap;
    }

    top += height;
    bottom = top;
    top += lineGap;
  }

  return bottom;
}

/* The probes sit at the bottom corners, so their callouts sit in the margin
   beside the unit — one column each side, de-overlapped top to bottom. */
function placeSides(items, rect, silhouette, minTop) {
  if (!Number.isFinite(silhouette.left) || !Number.isFinite(silhouette.right)) {
    return;
  }

  const maxBottom = rect.height - 64;

  for (const side of ["left", "right"]) {
    const column = items
      .filter((item) => item.label.side === side)
      .sort((a, b) => a.y - b.y);
    let cursor = minTop;

    for (const item of column) {
      const size = labelSize(item.label);
      if (!size.w) continue;

      const left =
        side === "left"
          ? silhouette.left - LAYOUT.sideGap - size.w
          : silhouette.right + LAYOUT.sideGap;
      const clampedLeft = Math.max(
        LAYOUT.margin,
        Math.min(left, rect.width - LAYOUT.margin - size.w)
      );

      let top = Math.max(item.y - size.h / 2, cursor);
      top = Math.min(top, maxBottom - size.h);
      top = Math.max(top, minTop);

      placeBody(item.label, clampedLeft, top, size);
      cursor = top + size.h + LAYOUT.stackGap;
    }
  }
}

function layoutLabels(anchors, rect, silhouette) {
  // The row is measured first: it sets how far down the side columns may start.
  const rowBottom = placeRow(
    anchors.filter((item) => item.label.row),
    rect,
    silhouette
  );
  placeSides(
    anchors.filter((item) => item.label.side),
    rect,
    silhouette,
    rowBottom + LAYOUT.rowFootGap
  );
}

/* -------------------------------------------------------------------- size */

function resize() {
  if (!renderer || !camera) return;
  const rect = stageEl.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(rect.width, rect.height, false);
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();

  // The panel width drives the type width, so remeasure the callouts.
  for (const label of labels) label.size = null;

  // Follow the panel while the view is still one of the presets; once the
  // visitor has orbited, their angle is theirs and only the projection updates.
  if (!ready || !modelBox || tween || userMoved) return;

  const view = presetView(PRESETS[activePreset], camera.aspect);
  camera.position.copy(view.position);
  controls.target.copy(view.target);
  controls.update();
}

if (typeof ResizeObserver === "function") {
  new ResizeObserver(resize).observe(stageEl);
} else {
  window.addEventListener("resize", resize);
}
resize();

// The callout widths are measured from the rendered type, so they must be
// taken again once the webfont has swapped in.
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    for (const label of labels) label.size = null;
  });
}

requestAnimationFrame(frame);
