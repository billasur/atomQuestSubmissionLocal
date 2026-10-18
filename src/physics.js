/**
 * A deliberately small physics model, not instrumentation.
 *
 * Each stage has a resistance in kPa per L/min. The drop across a stage is
 * dP = k * Q * R, and health is the ratio R_effective / R_new, which is the
 * same as dP / (Q * R_new). A removed cartridge has almost no resistance;
 * a loaded one has more.
 */

const FLOW_REF = 0.45; // L/min
const FEED_KPA = 300;
const SENSOR_NOISE_KPA = 0.05;

export const STAGES = [
  { id: "sediment", index: 1, name: "Sediment", base: 42 },
  { id: "carbon", index: 2, name: "Carbon", base: 22 },
  { id: "membrane", index: 3, name: "Membrane", base: 520 },
];

const BASE_TOTAL = STAGES.reduce((sum, s) => sum + s.base, 0);

export const STATES = {
  new: { multipliers: [1, 1, 1], flowFactor: 1, label: "New" },
  clogged: { multipliers: [3.4, 1, 1], flowFactor: 0.72, label: "Clogged" },
  removed: { multipliers: [1, 0.012, 1], flowFactor: 1, label: "Cartridge 2 removed" },
  bypassed: { multipliers: [1, 0.1, 1], flowFactor: 1.06, label: "Bypassed" },
};

const LOW_THRESHOLD = 0.35;
const HIGH_THRESHOLD = 1.8;

export function createSim() {
  let state = "new";

  // Smoothed state so the transition reads as water settling, not a jump cut.
  const mul = [...STATES.new.multipliers];
  let flowFactor = 1;

  const noise = {
    p: [0, 0, 0, 0],
    flow: 0,
    tdsIn: 0,
    tdsOut: 0,
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
    for (let i = 0; i < mul.length; i++) {
      mul[i] += (target.multipliers[i] - mul[i]) * k;
    }
    flowFactor += (target.flowFactor - flowFactor) * k;

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

    const flow = FLOW_REF * Math.sqrt(BASE_TOTAL / total) * flowFactor;
    const flowReading = flow * (1 + noise.flow);

    const pressures = [];
    let p = FEED_KPA * (1 + noise.p[0] * 0.0014);
    pressures.push(p);

    const stageReadings = STAGES.map((s, i) => {
      const dp = flow * resistances[i] * (1 + noise.p[i + 1] * 0.012);
      p = p - dp;
      pressures.push(p);
      const ratio = dp / (flowReading * s.base);
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

    const low = stageReadings.find((s) => s.status === "low");
    const high = stageReadings.find((s) => s.status === "high");

    let verdict;
    if (low) {
      verdict = {
        level: "fault",
        title: `Cartridge ${low.index} removed or bypassed`,
        detail: `${low.name} stage: ΔP ${format(low.dp, 1)} kPa at ${format(
          flowReading,
          2
        )} L/min — ${format(low.ratio, 2)}× its new-cartridge baseline.`,
        stageId: low.id,
      };
    } else if (high) {
      verdict = {
        level: "fault",
        title: `Cartridge ${high.index} clogged`,
        detail: `${high.name} stage: ΔP ${format(high.dp, 1)} kPa at ${format(
          flowReading,
          2
        )} L/min — ${format(high.ratio, 2)}× its new-cartridge baseline.`,
        stageId: high.id,
      };
    } else {
      verdict = {
        level: "ok",
        title: "All three stages within range",
        detail: `Normalised ΔP at ${format(flowReading, 2)} L/min: ${stageReadings
          .map((s) => format(s.ratio, 2) + "×")
          .join(", ")}.`,
        stageId: null,
      };
    }

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

function format(value, digits) {
  return value.toFixed(digits);
}
