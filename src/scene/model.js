import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/**
 * Procedural model of the concept purifier.
 * Units are metres. Body bottom sits at local y = 0; the whole group is
 * lifted by the height of the feet when it is placed in the scene.
 */

const W = 0.3;
const H = 0.42;
const D = 0.26;
const T = 0.01;

const CART_X = [-0.085, 0, 0.085];
// Set forward of the cabinet's mid-depth: the cut-away should read as a unit
// packed with parts, not a box with a cluster parked at the back.
const CART_Z = 0;
const CART_Y0 = 0.05;
const CART_Y1 = 0.3;
const CART_R = 0.0335;

const RAIL_Y = 0.335;
const RAIL_Z = 0.012;
// Controller centre: its glands land on the same line as the rail, so the
// harness climbs the back wall and enters the enclosure from below.
const CONTROLLER_Y = 0.374;

export function buildModel() {
  const group = new THREE.Group();
  const occluders = [];
  const flows = [];
  const anchors = {};

  const materials = createMaterials();

  /* ---------------------------------------------------------------- shell */

  const shell = new THREE.Group();
  group.add(shell);

  const back = roundedBox(W, H, T, 0.003, materials.shell);
  back.position.set(0, H / 2, -D / 2 + T / 2);
  add(shell, back, true);

  const bottom = roundedBox(W, T, D, 0.003, materials.shell);
  bottom.position.set(0, T / 2, 0);
  add(shell, bottom, true);

  const top = roundedBox(W, T, D, 0.003, materials.shell);
  top.position.set(0, H - T / 2, 0);
  add(shell, top, true);

  const left = roundedBox(T, H - T * 2, D - T * 2, 0.003, materials.shell);
  left.position.set(-W / 2 + T / 2, H / 2, 0);
  add(shell, left, true);

  // The front and right-hand sides are left open: this is the cut-away, so
  // the cartridges and their simulated state are always in view.

  // Mounting board on the back wall, so the cartridges read against a plane. It
  // stops below the sensor rail: the controller is bolted to the wall above it,
  // so its plate reads as hardware instead of sinking into the board.
  const board = roundedBox(W - 0.04, H - 0.14, 0.006, 0.002, materials.board);
  board.position.set(0, H / 2 - 0.025, -D / 2 + T + 0.004);
  add(shell, board, true);

  // Feet.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const foot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0075, 0.0075, 0.012, 16),
        materials.rubber
      );
      foot.position.set(sx * (W / 2 - 0.03), -0.006, sz * (D / 2 - 0.035));
      foot.castShadow = true;
      group.add(foot);
    }
  }

  /* ----------------------------------------------------------- cartridges */

  const cartridges = [];

  const sediment = makeCartridge({
    x: CART_X[0],
    media: "sediment",
    materials,
    occluders,
  });
  const carbon = makeCartridge({
    x: CART_X[1],
    media: "carbon",
    materials,
    occluders,
  });
  const membrane = makeCartridge({
    x: CART_X[2],
    media: "membrane",
    materials,
    occluders,
  });

  for (const c of [sediment, carbon, membrane]) {
    group.add(c.group);
    cartridges.push(c);
  }

  /* -------------------------------------------------------------- sensors */

  const p1 = makePressureModule(materials);
  p1.position.set(CART_X[0], RAIL_Y, RAIL_Z);
  group.add(p1);
  anchors.p1 = new THREE.Vector3(CART_X[0], RAIL_Y, RAIL_Z);

  const p2 = makePressureModule(materials);
  p2.position.set(CART_X[1], RAIL_Y, RAIL_Z);
  group.add(p2);
  anchors.p2 = new THREE.Vector3(CART_X[1], RAIL_Y, RAIL_Z);

  const p3 = makePressureModule(materials);
  p3.position.set(CART_X[2], RAIL_Y, RAIL_Z);
  group.add(p3);
  anchors.p3 = new THREE.Vector3(CART_X[2], RAIL_Y, RAIL_Z);

  const p4 = makePressureModule(materials);
  p4.position.set(0.126, 0.3, 0.02);
  p4.rotation.y = Math.PI / 2;
  group.add(p4);
  anchors.p4 = new THREE.Vector3(0.126, 0.3, 0.02);

  // Flow sensor on the inlet.
  const flowSensor = makeFlowSensor(materials);
  flowSensor.position.set(-0.112, 0.085, -0.06);
  group.add(flowSensor);
  anchors.flow = new THREE.Vector3(-0.112, 0.085, -0.06);

  // Inlet TDS probe.
  const tdsIn = makeTdsProbe(materials);
  tdsIn.position.set(-0.072, 0.085, -0.06);
  group.add(tdsIn);
  anchors.tdsIn = new THREE.Vector3(-0.072, 0.085, -0.06);

  // Outlet TDS probe, after the last pressure module.
  const tdsOut = makeTdsProbe(materials);
  tdsOut.position.set(0.126, 0.3, 0.072);
  tdsOut.rotation.y = Math.PI / 2;
  group.add(tdsOut);
  anchors.tdsOut = new THREE.Vector3(0.126, 0.3, 0.072);

  // Grommet where the inlet crosses the side wall.
  const grommet = new THREE.Mesh(
    new THREE.TorusGeometry(0.009, 0.0025, 8, 20),
    materials.rubber
  );
  grommet.rotation.y = Math.PI / 2;
  grommet.position.set(-W / 2, 0.085, -0.06);
  group.add(grommet);

  /* -------------------------------------------------------- pump / board */

  const pump = new THREE.Group();
  const pumpBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.026, 0.05, 24),
    materials.black
  );
  pumpBody.rotation.z = Math.PI / 2;
  pumpBody.castShadow = true;
  pump.add(pumpBody);

  for (const sx of [-1, 1]) {
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.008, 24),
      materials.shell
    );
    cap.rotation.z = Math.PI / 2;
    cap.position.x = sx * 0.026;
    pump.add(cap);
  }

  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0265, 0.0265, 0.008, 24),
    materials.shell
  );
  band.rotation.z = Math.PI / 2;
  band.position.x = -0.008;
  pump.add(band);

  pump.position.set(-0.09, 0.075, -0.093);
  group.add(pump);
  occluders.push(pumpBody);

  const controller = makeController(materials);
  // Wall-mounted above the sensor rail, glands down: the harness drops straight
  // into the enclosure instead of the box lying on the floor.
  controller.group.position.set(0, CONTROLLER_Y, -D / 2 + T + 0.016);
  group.add(controller.group);

  /* --------------------------------------------------------------- tubing */

  const tubePaths = [
    // inlet: outside → flow sensor → TDS in → left riser → P1 left port
    [
      [-0.205, 0.085, -0.06],
      [-0.15, 0.085, -0.06],
      [-0.112, 0.085, -0.06],
      [-0.072, 0.085, -0.06],
      [-0.098, 0.088, -0.056],
      [-0.126, 0.1, -0.032],
      [-0.131, 0.2, -0.012],
      [-0.127, 0.298, 0.004],
      [-0.111, 0.335, RAIL_Z],
    ],
    // P1 right port → cartridge 1 inlet port
    [
      [-0.059, 0.335, RAIL_Z],
      [-0.064, 0.33, 0.016],
      [-0.075, 0.324, 0.017],
      [-0.085, 0.316, 0.015],
    ],
    // cartridge 1 outlet port → P2 left port; the jumper arcs over the
    // cartridge's top caps so it never lies across the brass ports.
    [
      [-0.085, 0.316, -0.015],
      [-0.085, 0.331, -0.017],
      [-0.074, 0.338, -0.012],
      [-0.05, 0.339, 0.002],
      [-0.026, 0.335, RAIL_Z],
    ],
    // P2 right port → cartridge 2 inlet port
    [
      [0.026, 0.335, RAIL_Z],
      [0.021, 0.33, 0.016],
      [0.01, 0.324, 0.017],
      [0, 0.316, 0.015],
    ],
    // cartridge 2 outlet port → P3 left port
    [
      [0, 0.316, -0.015],
      [0, 0.331, -0.017],
      [0.011, 0.338, -0.012],
      [0.035, 0.339, 0.002],
      [0.059, 0.335, RAIL_Z],
    ],
    // P3 right port → cartridge 3 inlet port
    [
      [0.111, 0.335, RAIL_Z],
      [0.106, 0.33, 0.016],
      [0.095, 0.324, 0.017],
      [0.085, 0.316, 0.015],
    ],
    // cartridge 3 outlet port → P4
    [
      [0.085, 0.316, -0.015],
      [0.087, 0.325, -0.014],
      [0.105, 0.318, -0.01],
      [0.126, 0.303, -0.004],
    ],
    // P4 → outlet TDS → out through the open side
    [
      [0.126, 0.3, 0.044],
      [0.126, 0.3, 0.058],
      [0.126, 0.3, 0.078],
      [0.145, 0.297, 0.092],
      [0.18, 0.285, 0.096],
      [0.212, 0.27, 0.085],
    ],
  ];

  // tubePaths 5 and 6 are cartridge 3's inlet and outlet legs; when the
  // membrane is valved out the bypass loop takes the flow, so their particles
  // stop. Captured here so the fault switch can find them.
  const tubeFlows = [];

  for (const points of tubePaths) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
      false,
      "catmullrom",
      0.4
    );
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, Math.max(28, points.length * 12), 0.0074, 12, false),
      materials.tube
    );
    tube.renderOrder = 1;
    group.add(tube);
    const flow = makeFlow(curve, materials, 0.0155, 0.006);
    group.add(flow.object);
    tubeFlows.push(flow);
    flows.push(flow);
  }

  const membraneInFlow = tubeFlows[5];
  const membraneOutFlow = tubeFlows[6];

  // Water inside each cartridge: down the annulus, in front of the media.
  for (const c of cartridges) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(c.x, CART_Y1 - 0.008, CART_Z + 0.029),
      new THREE.Vector3(c.x, 0.24, CART_Z + 0.03),
      new THREE.Vector3(c.x, 0.12, CART_Z + 0.03),
      new THREE.Vector3(c.x, CART_Y0 + 0.006, CART_Z + 0.028),
    ]);
    const flow = makeFlow(curve, materials, 0.017, 0.0048);
    group.add(flow.object);
    c.flow = flow;
    flows.push(flow);
  }

  /* ------------------------------------------------- cartridge 3 bypass */

  // A manual bypass loop around the membrane, the path a service valve opens
  // when the cartridge is taken out of circuit. It is plumbed all the time but
  // only shown — and only carries particles — while the simulation is bypassed.
  const bypassX = CART_X[2];
  const bypassCurve = new THREE.CatmullRomCurve3(
    [
      [bypassX, 0.312, 0.014],
      [bypassX, 0.298, 0.041],
      [bypassX, 0.24, 0.053],
      [bypassX, 0.13, 0.054],
      [bypassX, 0.065, 0.032],
      [bypassX, 0.05, 0],
      [bypassX, 0.065, -0.032],
      [bypassX, 0.13, -0.054],
      [bypassX, 0.24, -0.053],
      [bypassX, 0.298, -0.041],
      [bypassX, 0.312, -0.014],
    ].map((p) => new THREE.Vector3(...p)),
    false,
    "catmullrom",
    0.4
  );

  const bypass = new THREE.Group();
  bypass.visible = false;

  const bypassTube = new THREE.Mesh(
    new THREE.TubeGeometry(bypassCurve, 150, 0.0074, 12, false),
    materials.tube
  );
  bypassTube.renderOrder = 1;
  bypass.add(bypassTube);

  const bypassFlow = makeFlow(bypassCurve, materials, 0.0145, 0.006);
  bypass.add(bypassFlow.object);
  flows.push(bypassFlow);

  // Handwheel valve on the front run, at the height a hand reaches.
  const valveBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0105, 0.0105, 0.02, 20),
    materials.black
  );
  valveBody.position.set(bypassX, 0.155, 0.054);
  bypass.add(valveBody);

  const valveStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0028, 0.0028, 0.016, 12),
    materials.brass
  );
  valveStem.position.set(bypassX, 0.171, 0.054);
  bypass.add(valveStem);

  const valveWheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.0085, 0.0022, 8, 24),
    materials.brass
  );
  valveWheel.rotation.x = Math.PI / 2;
  valveWheel.position.set(bypassX, 0.179, 0.054);
  bypass.add(valveWheel);

  group.add(bypass);

  // Wiring harness and sensor cables, routed up the back wall into the
  // controller's glands.
  const cablePaths = [
    [
      [-0.085, 0.327, -0.004],
      [0, 0.327, -0.004],
      [0.062, 0.327, -0.012],
      [0.076, 0.322, -0.042],
      [0.058, 0.33, -0.074],
      [0.034, 0.342, -0.09],
      [0.026, 0.35, -0.095],
    ],
    [
      [-0.112, 0.072, -0.058],
      [-0.132, 0.1, -0.072],
      [-0.134, 0.2, -0.09],
      [-0.11, 0.3, -0.1],
      [-0.06, 0.338, -0.098],
      [-0.026, 0.35, -0.095],
    ],
  ];

  for (const points of cablePaths) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
      false,
      "catmullrom",
      0.5
    );
    const cable = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 64, 0.0016, 8, false),
      materials.cable
    );
    group.add(cable);
  }

  /* ---------------------------------------------------------------- fault */

  let faultStage = null;

  function setFault(stageId, mode = "ok") {
    faultStage = stageId;
    const stageIds = ["sediment", "carbon", "membrane"];
    cartridges.forEach((c, i) => {
      const active = stageIds[i] === stageId;
      c.setFault(active ? mode : "ok");
      // No water through a cartridge that is out of the loop: a removed housing
      // is empty and a bypassed membrane has the valve path instead.
      if (c.flow) {
        c.flow.object.visible = !(active && (mode === "removed" || mode === "bypassed"));
      }
    });

    const bypassing = stageId === "membrane" && mode === "bypassed";
    bypass.visible = bypassing;
    membraneInFlow.object.visible = !bypassing;
    membraneOutFlow.object.visible = !bypassing;
  }

  function setDisplay(reading) {
    controller.setLines(reading);
  }

  function setStatus(mode) {
    controller.setStatus(mode);
  }

  // The top panel is solid, so a plan view would only show a lid. The top
  // preset lifts it away to expose the rail plumbing.
  function setShellTop(visible) {
    top.visible = visible;
  }

  function update(dt, flow) {
    // Particle speed is proportional to flow: no flow, no motion.
    const speed = Math.max(0, flow) * 1.15;
    for (const f of flows) if (f.object.visible) f.update(dt, speed);
  }

  return {
    group,
    anchors,
    occluders,
    update,
    setFault,
    setDisplay,
    setStatus,
    setShellTop,
    getFault: () => faultStage,
  };
}

/* ------------------------------------------------------------- primitives */

function add(parent, mesh, shadow = false) {
  if (shadow) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }
  parent.add(mesh);
  return mesh;
}

function roundedBox(w, h, d, r, material) {
  return new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), material);
}

function makeCartridge({ x, media, materials, occluders }) {
  const group = new THREE.Group();
  const setMaterials = [];

  // Clear housing, open ended so the caps read as separate parts. The glass is
  // cloned per cartridge so a fault can tint one housing without the others.
  const housingMat = materials.clear.clone();
  const housing = new THREE.Mesh(
    new THREE.CylinderGeometry(CART_R, CART_R, CART_Y1 - CART_Y0 - 0.012, 48, 1, true),
    housingMat
  );
  housing.position.set(x, (CART_Y0 + CART_Y1) / 2, CART_Z);
  housing.renderOrder = 4;
  group.add(housing);

  for (const y of [CART_Y0 + 0.004, CART_Y1 - 0.006]) {
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(CART_R + 0.002, CART_R + 0.002, 0.016, 40),
      materials.shell
    );
    cap.position.set(x, y, CART_Z);
    cap.castShadow = true;
    group.add(cap);
    occluders.push(cap);
  }

  // Inlet and outlet ports on top: the flow enters one and leaves the other, so
  // the plumbing between cartridges stays on the rail instead of looping down
  // the front of the unit.
  for (const dz of [0.014, -0.014]) {
    const port = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0074, 0.0074, 0.016, 16),
      materials.brass
    );
    port.position.set(x, CART_Y1 + 0.012, CART_Z + dz);
    group.add(port);
  }

  const inner = new THREE.Group();
  group.add(inner);

  if (media === "sediment") {
    const bodyMat = materials.sediment.clone();
    setMaterials.push(bodyMat);
    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0265, 0.0265, 0.2, 40),
      bodyMat
    );
    core.position.set(x, 0.175, CART_Z);
    core.castShadow = true;
    inner.add(core);
    occluders.push(core);

    const ribMat = materials.sedimentRib.clone();
    setMaterials.push(ribMat);
    for (let i = 0; i < 6; i++) {
      const rib = new THREE.Mesh(
        new THREE.TorusGeometry(0.0268, 0.0011, 6, 40),
        ribMat
      );
      rib.rotation.x = Math.PI / 2;
      rib.position.set(x, 0.09 + i * 0.034, CART_Z);
      inner.add(rib);
    }
  }

  if (media === "carbon") {
    const granuleMat = materials.granule.clone();
    setMaterials.push(granuleMat);
    // A dense bed of small granules: coarse lumps read as rubble, a fine bed
    // reads as carbon inside a clear housing.
    const count = 2000;
    const granules = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.0031, 0),
      granuleMat,
      count
    );
    const dummy = new THREE.Object3D();
    const shade = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 0.0205;
      dummy.position.set(
        x + Math.cos(a) * r,
        0.078 + Math.random() * 0.194,
        CART_Z + Math.sin(a) * r
      );
      dummy.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      dummy.updateMatrix();
      granules.setMatrixAt(i, dummy.matrix);
      shade.setHSL(0.5, 0.03, 0.05 + Math.random() * 0.055);
      granules.setColorAt(i, shade);
    }
    granules.instanceMatrix.needsUpdate = true;
    if (granules.instanceColor) granules.instanceColor.needsUpdate = true;
    inner.add(granules);

    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.2, 16),
      materials.sedimentRib
    );
    core.position.set(x, 0.175, CART_Z);
    inner.add(core);
  }

  if (media === "membrane") {
    const coreMat = materials.membrane.clone();
    setMaterials.push(coreMat);
    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.023, 0.023, 0.196, 32),
      coreMat
    );
    core.position.set(x, 0.175, CART_Z);
    core.castShadow = true;
    inner.add(core);
    occluders.push(core);

    // Spiral wrap: the wound membrane leaf, eleven turns up the cartridge, so
    // the element reads as a spiral rather than a plain blue cylinder.
    const pts = [];
    for (let i = 0; i <= 220; i++) {
      const t = i / 220;
      const a = t * Math.PI * 2 * 11;
      pts.push(
        new THREE.Vector3(
          x + Math.cos(a) * 0.0248,
          0.08 + t * 0.19,
          CART_Z + Math.sin(a) * 0.0248
        )
      );
    }
    const wrap = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 340, 0.0024, 6, false),
      materials.membraneWrap
    );
    inner.add(wrap);

    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0055, 0.0055, 0.215, 16),
      materials.shell
    );
    tube.position.set(x, 0.175, CART_Z);
    inner.add(tube);

    for (const y of [0.078, 0.272]) {
      const end = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0235, 0.0235, 0.009, 32),
        materials.shell
      );
      end.position.set(x, y, CART_Z);
      inner.add(end);
    }
  }

  return {
    group,
    x,
    setFault(mode) {
      const tint =
        mode === "clogged"
          ? materials.warnColor
          : mode === "removed" || mode === "bypassed"
            ? materials.faultColor
            : null;

      for (const m of [...setMaterials, housingMat]) {
        if (!m.userData.baseColor) m.userData.baseColor = m.color.clone();
        m.color.copy(tint ?? m.userData.baseColor);
      }

      // A missing cartridge leaves an empty, open housing, whichever stage it is:
      // the water path is still there, the media is not.
      inner.visible = mode !== "removed";
    },
  };
}

function makePressureModule(materials) {
  const g = new THREE.Group();

  const body = roundedBox(0.026, 0.017, 0.015, 0.002, materials.black);
  body.castShadow = true;
  g.add(body);

  const ridge = roundedBox(0.018, 0.004, 0.012, 0.0015, materials.black);
  ridge.position.y = 0.0105;
  g.add(ridge);

  for (const sx of [-1, 1]) {
    const nut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0075, 0.0075, 0.005, 6),
      materials.brass
    );
    nut.rotation.z = Math.PI / 2;
    nut.position.x = sx * 0.0155;
    g.add(nut);

    const fitting = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0062, 0.0062, 0.014, 12),
      materials.brass
    );
    fitting.rotation.z = Math.PI / 2;
    fitting.position.x = sx * 0.0235;
    g.add(fitting);
  }

  const tag = roundedBox(0.008, 0.004, 0.006, 0.001, materials.shell);
  tag.position.set(0, -0.0105, 0);
  g.add(tag);

  return g;
}

function makeFlowSensor(materials) {
  const g = new THREE.Group();

  const body = roundedBox(0.028, 0.022, 0.02, 0.003, materials.shell);
  body.castShadow = true;
  g.add(body);

  const lid = roundedBox(0.018, 0.004, 0.016, 0.0015, materials.black);
  lid.position.y = 0.012;
  g.add(lid);

  const rotor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0085, 0.0085, 0.005, 24),
    materials.black
  );
  rotor.rotation.x = Math.PI / 2;
  rotor.position.z = 0.011;
  g.add(rotor);

  for (const sx of [-1, 1]) {
    const fitting = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0066, 0.0066, 0.012, 12),
      materials.brass
    );
    fitting.rotation.z = Math.PI / 2;
    fitting.position.x = sx * 0.019;
    g.add(fitting);
  }

  return g;
}

function makeTdsProbe(materials) {
  const g = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0085, 0.0085, 0.03, 20),
    materials.black
  );
  body.rotation.z = Math.PI / 2;
  body.castShadow = true;
  g.add(body);

  for (const sx of [-1, 1]) {
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0074, 0.0074, 0.01, 12),
      materials.brass
    );
    collar.rotation.z = Math.PI / 2;
    collar.position.x = sx * 0.019;
    g.add(collar);
  }

  return g;
}

function makeController(materials) {
  const group = new THREE.Group();
  const WIDTH = 0.116;
  const HEIGHT = 0.062;
  const DEPTH = 0.03;
  const FONT = "'Inter Variable', Inter, system-ui, sans-serif";

  // Mounting plate, so the enclosure reads as bolted to the back wall instead of
  // resting on the cabinet's top edge.
  const plate = roundedBox(WIDTH + 0.006, HEIGHT + 0.006, 0.004, 0.004, materials.rubber);
  plate.position.z = -DEPTH / 2 - 0.0015;
  group.add(plate);

  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const screw = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0021, 0.0021, 0.0025, 12),
        materials.blackFace
      );
      screw.rotation.x = Math.PI / 2;
      screw.position.set(sx * (WIDTH / 2 + 0.0012), sy * (HEIGHT / 2 + 0.0012), -0.0145);
      group.add(screw);
    }
  }

  // Rounded enclosure, with a slightly proud face plate so the edge catches
  // the key light and the box reads as a moulded part, not a slab.
  const body = roundedBox(WIDTH, HEIGHT, DEPTH, 0.005, materials.black);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const face = roundedBox(
    WIDTH - 0.007,
    HEIGHT - 0.007,
    0.005,
    0.0015,
    materials.blackFace
  );
  face.position.z = DEPTH / 2 + 0.001;
  group.add(face);

  // Recessed bezel around the display.
  const bezel = roundedBox(0.088, 0.048, 0.004, 0.0012, materials.rubber);
  bezel.position.set(-0.008, 0.001, DEPTH / 2 + 0.002);
  group.add(bezel);

  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 192;
  let lastLines = ["SIMULATED MODEL", "ALL OK", "0.45 L/MIN   412 > 38 PPM"];
  const ctx = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const screenMat = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.082, 0.041), screenMat);
  screen.position.set(-0.008, 0.001, DEPTH / 2 + 0.0046);
  group.add(screen);

  // One status LED, right of the display.
  const ledMat = new THREE.MeshBasicMaterial({
    color: 0x3fae5a,
    toneMapped: false,
  });
  const led = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0039, 0.0039, 0.0035, 20),
    ledMat
  );
  led.rotation.x = Math.PI / 2;
  led.position.set(0.048, -0.017, DEPTH / 2 + 0.0022);
  group.add(led);

  const ledRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.0052, 0.0012, 8, 24),
    materials.rubber
  );
  ledRing.position.copy(led.position);
  group.add(ledRing);

  // Cable glands on the underside, where the sensor harness enters.
  for (const gx of [-0.036, 0, 0.036]) {
    const gland = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0042, 0.0042, 0.009, 16),
      materials.rubber
    );
    gland.position.set(gx, -HEIGHT / 2 - 0.0035, 0);
    group.add(gland);
  }

  // Screen text is flat ink on an off-black panel: no glow. The status line is
  // the one a person standing at the unit reads, so it gets the space.
  function draw(lines) {
    ctx.fillStyle = "#0a0c0d";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#8e908a";
    ctx.textBaseline = "top";
    ctx.font = `500 19px ${FONT}`;
    ctx.fillText(lines[0], 18, 12);

    ctx.fillStyle = "#f0efe9";
    const maxWidth = canvas.width - 36;
    let size = 52;
    do {
      ctx.font = `650 ${size}px ${FONT}`;
      size -= 2;
    } while (ctx.measureText(lines[1]).width > maxWidth && size > 24);
    ctx.fillText(lines[1], 18, 36);

    ctx.fillStyle = "#b6b7af";
    ctx.font = `450 25px ${FONT}`;
    ctx.fillText(lines[2], 18, 126);

    texture.needsUpdate = true;
  }

  draw(lastLines);

  const ready = document.fonts && document.fonts.ready;
  if (ready) ready.then(() => draw(lastLines));

  const STATUS_COLORS = {
    ok: 0x3fae5a,
    warn: 0xd9971f,
    fault: 0xc23b2b,
  };

  return {
    group,
    setLines(lines) {
      const key = lines.join("|");
      if (key === lastLines.join("|")) return;
      lastLines = lines;
      draw(lines);
    },
    setStatus(mode) {
      ledMat.color.setHex(STATUS_COLORS[mode] ?? STATUS_COLORS.ok);
    },
  };
}

/* --------------------------------------------------------------- materials */

function createMaterials() {
  const shell = new THREE.MeshPhysicalMaterial({
    color: 0xf3f0e8,
    roughness: 0.46,
    metalness: 0,
    clearcoat: 0.3,
    clearcoatRoughness: 0.4,
    envMapIntensity: 0.8,
  });

  const board = new THREE.MeshStandardMaterial({
    color: 0xe4e2da,
    roughness: 0.95,
    metalness: 0,
  });

  // One speckle sheet serves as colour and relief on the sediment core: the
  // cartridge should read as loaded media, not a blank white cylinder.
  const sedimentMap = sedimentTexture();

  return {
    shell,
    board,
    black: new THREE.MeshStandardMaterial({
      color: 0x141615,
      roughness: 0.46,
      metalness: 0.1,
      envMapIntensity: 0.7,
    }),
    blackFace: new THREE.MeshStandardMaterial({
      color: 0x1c1e1d,
      roughness: 0.32,
      metalness: 0.18,
    }),
    rubber: new THREE.MeshStandardMaterial({
      color: 0x1d1e1c,
      roughness: 0.98,
    }),
    clear: new THREE.MeshPhysicalMaterial({
      color: 0xf2f4f3,
      roughness: 0.05,
      metalness: 0,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.6,
    }),
    brass: new THREE.MeshStandardMaterial({
      color: 0xb08a4e,
      metalness: 1,
      roughness: 0.3,
    }),
    sediment: new THREE.MeshStandardMaterial({
      color: 0xe2e9ec,
      roughness: 0.9,
      metalness: 0,
      map: sedimentMap,
      bumpMap: sedimentMap,
      bumpScale: 0.0016,
    }),
    sedimentRib: new THREE.MeshStandardMaterial({
      color: 0xdbe3e6,
      roughness: 0.85,
    }),
    granule: new THREE.MeshStandardMaterial({
      color: 0x191b1c,
      roughness: 0.86,
      metalness: 0.05,
      flatShading: true,
    }),
    membrane: new THREE.MeshStandardMaterial({
      color: 0x1d416b,
      roughness: 0.4,
      metalness: 0.08,
      envMapIntensity: 1,
    }),
    membraneWrap: new THREE.MeshStandardMaterial({
      color: 0x2a5d8d,
      roughness: 0.42,
    }),
    tube: new THREE.MeshPhysicalMaterial({
      color: 0x6ea8c8,
      roughness: 0.16,
      metalness: 0,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.2,
      side: THREE.FrontSide,
    }),
    cable: new THREE.MeshStandardMaterial({
      color: 0x181a19,
      roughness: 0.9,
    }),
    faultColor: new THREE.Color(0xb3382c),
    warnColor: new THREE.Color(0xc9862c),
    water: new THREE.PointsMaterial({
      color: 0x2f7fb8,
      size: 0.0058,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      map: dotTexture(),
      alphaTest: 0.3,
    }),
  };
}

function dotTexture() {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* Speckled sheet for the sediment element: pale media with trapped grit, fine
   enough to read as filtration depth at this scale. */
function sedimentTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#e8eef0";
  ctx.fillRect(0, 0, size, size);

  const greys = ["#cfd8db", "#c3cdd1", "#b6c1c5", "#a8b4b8"];
  for (let i = 0; i < 2600; i++) {
    const r = 0.4 + Math.random() * 1.5;
    ctx.fillStyle = greys[(Math.random() * greys.length) | 0];
    ctx.globalAlpha = 0.22 + Math.random() * 0.4;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // A few darker grains, the material the cartridge has already caught.
  ctx.fillStyle = "#7d888c";
  for (let i = 0; i < 260; i++) {
    ctx.globalAlpha = 0.25 + Math.random() * 0.45;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 0.6 + Math.random() * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 3);
  tex.anisotropy = 4;
  return tex;
}

/* -------------------------------------------------------------------- flow */

function makeFlow(curve, materials, spacing = 0.0155, size = 0.0058) {
  const divisions = Math.max(48, Math.round(curve.getLength() / 0.004));
  const points = curve.getSpacedPoints(divisions);
  const total = curve.getLength();
  const count = Math.max(6, Math.floor(total / spacing));

  const positions = new Float32Array(count * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = materials.water.clone();
  material.size = size;

  const pointsObject = new THREE.Points(geometry, material);
  pointsObject.frustumCulled = false;
  pointsObject.renderOrder = 2;

  const step = total / divisions;
  let travelled = Math.random() * total;

  function update(dt, speed) {
    travelled = (travelled + dt * speed) % total;

    for (let i = 0; i < count; i++) {
      let d = (i * spacing + travelled) % total;
      const idx = d / step;
      const i0 = Math.min(divisions, Math.floor(idx));
      const i1 = Math.min(divisions, i0 + 1);
      const f = idx - i0;
      const a = points[i0];
      const b = points[i1];
      const o = i * 3;
      positions[o] = a.x + (b.x - a.x) * f;
      positions[o + 1] = a.y + (b.y - a.y) * f;
      positions[o + 2] = a.z + (b.z - a.z) * f;
    }

    geometry.attributes.position.needsUpdate = true;
  }

  update(0, 0);

  return { object: pointsObject, update };
}
