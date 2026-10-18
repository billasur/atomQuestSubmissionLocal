/**
 * A deliberately small physics model, not instrumentation.
 *
 * `base` is the drop in kPa across a new stage at the reference flow. The drop
 * across a stage is dP = base * (Q / Qref) * multiplier, and health is the
 * ratio multiplier_effective / 1, which is the same as dP / (Q * base). A
 * removed cartridge has almost no resistance; a loaded one has more.
 */

const FLOW_REF = 0.45; // L/min
const FEED_KPA = 300;

export const STAGES = [
  { id: "sediment", index: 1, name: "Sediment", base: 18.9 },
  { id: "carbon", index: 2, name: "Carbon", base: 10.6 },
  { id: "membrane", index: 3, name: "Membrane", base: 226.4 },
];

const BASE_TOTAL = STAGES.reduce((sum, s) => sum + s.base, 0);

export const STATES = {
  new: { multipliers: [1, 1, 1], flowFactor: 1, label: "New" },
  clogged: { multipliers: [3, 1, 1], flowFactor: 0.72, label: "Clogged" },
  removed: { multipliers: [1, 0.06, 1], flowFactor: 1, label: "Cartridge 2 removed" },
  bypassed: { multipliers: [1, 1, 0.03], flowFactor: 1.06, label: "Cartridge 3 bypassed" },
};

const LOW_THRESHOLD = 0.35;
const HIGH_THRESHOLD = 1.8;

const SETTLE_MUL = 0.02;
const SETTLE_FLOW = 0.005;

export function createSim() {
  let state = "new";

  // Smoothed state so the transition reads as water settling, not a jump cut.
  const mul = [...STATES.new.multipliers];
  let flowFactor = 1;

  const noise = {
    p: [0, 0, 0, 0],
    flow: 0,
    tdsIn: 0,
    phase: Math.random() * 10,
  };

  let clock = 0;
  let cached = null;

  function setState(next) {
    if (!STATES[next]) return;
    state = next;
  }

  function tick(dt) {
    clock += dt;
    const target = STATES[state];

    const k = 1 - Math.exp(-dt / 0.18);
    let drift = 0;
    let flowDrift = 0;
    for (let i = 0; i < mul.length; i++) {
      mul[i] += (target.multipliers[i] - mul[i]) * k;
      drift = Math.max(drift, Math.abs(target.multipliers[i] - mul[i]));
    }
    flowFactor += (target.flowFactor - flowFactor) * k;
    flowDrift = Math.abs(target.flowFactor - flowFactor);

    // The water path is still changing: no reading is published, so the
    // verdict can never quote numbers that belong to the previous state.
    const settled = drift < SETTLE_MUL && flowDrift < SETTLE_FLOW;

    // Random walk on each sensor, then relaxed back toward zero.
    for (let i = 0; i < noise.p.length; i++) {
      noise.p[i] += (Math.random() * 2 - 1) * 0.014;
      noise.p[i] *= 0.93;
    }
    noise.flow += (Math.random() * 2 - 1) * 0.0009;
    noise.flow *= 0.94;
    noise.tdsIn += (Math.random() * 2 - 1) * 0.05;
    noise.tdsIn *= 0.97;

    const resistances = STAGES.map((s, i) => s.base * mul[i]);
    const total = resistances.reduce((a, b) => a + b, 0);

    const flow = FLOW_REF * Math.pow(BASE_TOTAL / total, 0.22) * flowFactor;
    const flowReading = flow * (1 + noise.flow);

    const pressures = [];
    let p = FEED_KPA * (1 + noise.p[0] * 0.0014);
    pressures.push(p);

    const stageReadings = STAGES.map((s, i) => {
      const dp = (flow / FLOW_REF) * resistances[i] * (1 + noise.p[i + 1] * 0.012);
      p = p - dp;
      pressures.push(p);
      const ratio = dp / ((flowReading / FLOW_REF) * s.base);
      return {
        id: s.id,
        index: s.index,
        name: s.name,
        dp,
        ratio,
        pressure: pressures[i],
        nextPressure: p,
        status:
          ratio < LOW_THRESHOLD ? "low" : ratio > HIGH_THRESHOLD ? "high" : "normal",
      };
    });

    const tdsIn = 412 + Math.sin(clock * 0.11) * 4 + noise.tdsIn * 8;
    const tdsOut = Math.max(8, tdsIn * 0.092 + noise.tdsIn * 2.2);

    const verdict = settled
      ? buildVerdict(state, stageReadings, pressures, flowReading)
      : {
          level: "settling",
          title: "Reading the water path",
          detail: "Waiting for the flow to settle — no reading yet.",
          stageId: null,
        };

    cached = {
      state,
      flow: flowReading,
      pressures,
      stages: stageReadings,
      tdsIn,
      tdsOut,
      verdict,
      time: clock,
    };
    return cached;
  }

  function read() {
    if (!cached) tick(0);
    return cached;
  }

  return { setState, tick, read, get state() { return state; } };
}

/**
 * The ladder is quoted in full, in the same 1-decimal kPa the stage table
 * prints, so the verdict and the table cannot disagree.
 */
function ladder(pressures, flow) {
  return `${pressures.map((p, i) => `P${i + 1} ${format(p, 1)}`).join(" → ")} kPa at ${format(
    flow,
    2
  )} L/min`;
}

function buildVerdict(state, stages, pressures, flow) {
  const low = stages.find((s) => s.status === "low");
  const high = stages.find((s) => s.status === "high");
  const path = ladder(pressures, flow);

  if (low) {
    // The rule only sees a collapsed stage. Which cause to name comes from the
    // simulated state, because the two faults look the same to the sensors.
    let title = `Cartridge ${low.index} below baseline`;
    if (state === "removed" && low.id === "carbon") title = "Cartridge 2 removed";
    else if (state === "bypassed" && low.id === "membrane") title = "Cartridge 3 bypassed";
    else if (state === "removed") title = "Cartridge 2 removed";
    else if (state === "bypassed") title = "Cartridge 3 bypassed";
    return {
      level: "fault",
      title,
      detail: `${path}. ${low.name} stage: ΔP ${format(low.dp, 1)} kPa — ${format(
        low.ratio,
        2
      )}× its new-cartridge baseline.`,
      stageId: low.id,
    };
  }

  if (high) {
    return {
      level: "fault",
      title: `Cartridge ${high.index} clogged`,
      detail: `${path}. ${high.name} stage: ΔP ${format(high.dp, 1)} kPa — ${format(
        high.ratio,
        2
      )}× its new-cartridge baseline.`,
      stageId: high.id,
    };
  }

  return {
    level: "ok",
    title: "All three stages within range",
    detail: `${path}. Normalised ΔP: ${stages
      .map((s) => format(s.ratio, 2) + "×")
      .join(", ")}.`,
    stageId: null,
  };
}

function format(value, digits) {
  return value.toFixed(digits);
}
