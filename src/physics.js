/**
 * A deliberately small physics model, not instrumentation.
 *
 * Water path: feed (P1) → sediment → P2 → carbon → P3 → booster pump
 * → P4 → membrane → P5 (product). `base` is the drop in kPa across a new
 * stage at the reference flow, so dp = base * (Q / Qref) * multiplier and
 * health is that multiplier. A removed cartridge has almost no resistance;
 * a loaded one has more. The pump's contribution is the boost from P3 to
 * P4, drooping with flow and watched against its own baseline — the same
 * taps that read filter health read pump health.
 *
 * Safety states are behaviour, not fault arithmetic: no feed water stops
 * the pump (dry-run guard), a leak is flow with the tap closed, a full
 * tank pauses production, and a water-path fault locks the dispense valve.
 */

const FLOW_REF = 0.45; // L/min
const FEED_KPA = 300;
const BOOST_KPA = 480; // pump boost at the reference flow
const BOOST_DROOP = 0.15; // boost ∝ (Qref/Q)^droop
const RECOVERY = 0.5; // product fraction of the feed the pump draws
const TANK_L = 7; // storage capacity
const DISPENSE_LPM = 2.2; // faucet draw
const TIME_SCALE = 28; // tank time runs 28× page time
const IDLE_FLOW = 0.03; // below this the pump is off and ratios read idle

export const STAGES = [
  { id: "sediment", index: 1, name: "Sediment", base: 18.9 },
  { id: "carbon", index: 2, name: "Carbon", base: 10.6 },
  { id: "membrane", index: 3, name: "Membrane", base: 690 },
];

const BASE_TOTAL = STAGES.reduce((sum, s) => sum + s.base, 0);

/**
 * `feed` and `boostFactor` default to the municipal feed and a healthy
 * pump; a state only carries them when it departs. multipliers keep their
 * meaning: the measured stage drop relative to a new cartridge.
 */
export const STATES = {
  new: { multipliers: [1, 1, 1], flowFactor: 1, label: "New" },
  clogged: { multipliers: [3, 1, 1], flowFactor: 0.72, label: "Clogged" },
  removed: { multipliers: [1, 0.06, 1], flowFactor: 1, label: "Cartridge 2 removed" },
  bypassed: { multipliers: [1, 1, 0.03], flowFactor: 1.06, label: "Cartridge 3 bypassed" },
  weakpump: {
    multipliers: [1, 1, 1],
    flowFactor: 0.78,
    boostFactor: 0.55,
    label: "Weak pump",
  },
  dryrun: {
    multipliers: [1, 1, 1],
    flowFactor: 0,
    feed: 0,
    label: "No feed water",
  },
  leak: { multipliers: [1, 1, 0.38], flowFactor: 2.4, label: "Leak at base" },
  tankfull: { multipliers: [1, 1, 1], flowFactor: 0, label: "Tank full" },
};

const LOW_THRESHOLD = 0.35;
const HIGH_THRESHOLD = 1.8;
const PUMP_LOW = 0.75; // boost below this fraction of baseline flags the pump

// Seconds for the 3D flow to settle. Only the water particles ease: the
// numbers a visitor reads are the picked state's numbers immediately.
const EASE = 0.8;

// States in which the interlock refuses to open the dispense valve.
const LOCKED_STATES = ["removed", "bypassed", "leak"];

export function createSim() {
  let state = "new";

  // Smoothed copies, used for the particle speed only, so the transition reads
  // as water settling rather than a jump cut.
  const mul = [...STATES.new.multipliers];
  let flowFactor = 1;

  const noise = {
    p: [0, 0, 0, 0, 0],
    flow: 0,
    tdsIn: 0,
    phase: Math.random() * 10,
  };

  let clock = 0;
  let cached = null;
  let dispensing = false;
  let tankLevel = 0.55;
  let onChange = null;

  function setState(next) {
    if (!STATES[next]) return;
    state = next;
    if (next === "tankfull") tankLevel = 1;
    if (LOCKED_STATES.includes(next)) dispensing = false;
  }

  function setDispensing(on) {
    if (on && LOCKED_STATES.includes(state)) return;
    dispensing = Boolean(on);
  }

  function isLocked() {
    return LOCKED_STATES.includes(state);
  }

  function tick(dt) {
    clock += dt;
    const target = STATES[state];

    const k = 1 - Math.exp(-dt / EASE);
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

    // The reading belongs to the state that was picked, not to the visual
    // transition: a verdict can never be blank or quote the previous state.
    const resistances = STAGES.map((s, i) => s.base * target.multipliers[i]);
    const total = resistances.reduce((a, b) => a + b, 0);

    const flow = FLOW_REF * Math.pow(BASE_TOTAL / total, 0.22) * target.flowFactor;
    const flowReading = flow * (1 + noise.flow);
    const idle = flow < IDLE_FLOW;

    // The eased resistances and factors drive the water particles only.
    const easedTotal = STAGES.reduce((sum, s, i) => sum + s.base * mul[i], 0);
    const visualFlow =
      FLOW_REF * Math.pow(BASE_TOTAL / easedTotal, 0.22) * flowFactor;

    // Ladder: feed, the two prefilter drops, the pump's boost, the membrane.
    // P5 sits on the membrane branch, so a bypassed stage reads as P4 ≈ P5.
    // The boost belongs to the picked state like every other reading — only
    // the water particles ease.
    const feedKpa = Math.max(0, (target.feed ?? FEED_KPA) * (1 + noise.p[0] * 0.0014));
    const boost =
      idle || feedKpa <= 0
        ? 0
        : BOOST_KPA *
          (target.boostFactor ?? 1) *
          Math.pow(FLOW_REF / Math.max(flow, 0.06), BOOST_DROOP);

    const dp = [];
    const pressures = [];
    let p = feedKpa;
    pressures.push(p);

    for (let i = 0; i < STAGES.length; i++) {
      if (i === 2) {
        // The pump sits between the carbon and the membrane.
        p = Math.max(0, p + (idle ? 0 : boost * (1 + noise.p[3] * 0.01)));
        pressures.push(p);
      }
      const drop = idle ? 0 : (flow / FLOW_REF) * resistances[i] * (1 + noise.p[i + 1] * 0.012);
      dp[i] = drop;
      p = Math.max(0, p - drop);
      pressures.push(p);
    }

    // The table quotes the drop each tap pair actually sees. Stage i spans
    // pressures[i] → pressures[i + 1], except the membrane, which starts on
    // the far side of the pump at pressures[3].
    const stageReadings = STAGES.map((s, i) => {
      const tapA = i === 2 ? pressures[3] : pressures[i];
      const seen = Math.max(0, tapA - pressures[i + 1 + (i === 2 ? 1 : 0)]);
      const ratio = idle ? 1 : seen / ((flowReading / FLOW_REF) * s.base);
      return {
        id: s.id,
        index: s.index,
        name: s.name,
        dp: seen,
        ratio,
        pressure: tapA,
        nextPressure: pressures[i + 1 + (i === 2 ? 1 : 0)],
        status: idle
          ? "idle"
          : ratio < LOW_THRESHOLD
            ? "low"
            : ratio > HIGH_THRESHOLD
              ? "high"
              : "normal",
      };
    });

    const boostSeen = Math.max(0, pressures[3] - pressures[2]);
    const pumpNominal = BOOST_KPA * Math.pow(FLOW_REF / Math.max(flow, 0.06), BOOST_DROOP);
    const pumpRatio = idle ? 1 : boostSeen / pumpNominal;
    const pump = {
      dp: boostSeen,
      ratio: pumpRatio,
      status: idle ? "idle" : pumpRatio < PUMP_LOW ? "low" : "normal",
    };

    // Tank: production fills at the recovery fraction, the faucet drains it.
    // Flow is L/min, dt is seconds, so /60 puts both on the same clock.
    if (state === "tankfull") tankLevel = 1;
    tankLevel += (((idle ? 0 : flow * RECOVERY) / 60) * TIME_SCALE * dt) / TANK_L;
    if (dispensing) {
      tankLevel -= ((DISPENSE_LPM / 60) * TIME_SCALE * dt) / TANK_L;
    }
    tankLevel = Math.min(1, Math.max(0.04, tankLevel));

    // A full tank trips the float switch on its own: production pauses until
    // someone draws a glass. Only the resting state hands over — the fault
    // and guard states keep their demo stable with the tank pinned full.
    if (tankLevel >= 1 && !idle && state === "new") {
      onChange?.("state", "tankfull");
      setState("tankfull");
    }

    // Drawing down a full tank reopens the float switch: the pump resumes.
    if (state === "tankfull" && dispensing && tankLevel < 0.86) {
      onChange?.("state", "new");
      setState("new");
    }
    // An empty tank stops the draw.
    if (dispensing && tankLevel <= 0.05) {
      dispensing = false;
      onChange?.("dispense", false);
    }

    const tdsIn = 412 + Math.sin(clock * 0.11) * 4 + noise.tdsIn * 8;
    const tdsOut = Math.max(8, tdsIn * 0.092 + noise.tdsIn * 2.2);

    const verdict = buildVerdict(state, stageReadings, pump, pressures, flowReading, idle);

    cached = {
      state,
      flow: flowReading,
      visualFlow,
      pressures,
      stages: stageReadings,
      pump,
      tdsIn,
      tdsOut,
      tankLevel,
      dispensing,
      locked: isLocked(),
      verdict,
      time: clock,
    };
    return cached;
  }

  function read() {
    if (!cached) tick(0);
    return cached;
  }

  return {
    setState,
    setDispensing,
    isLocked,
    tick,
    read,
    get state() {
      return state;
    },
    get dispensing() {
      return dispensing;
    },
    set onChange(fn) {
      onChange = fn;
    },
  };
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

const INTERLOCK_NOTE = " Dispense is locked by the interlock.";

function buildVerdict(state, stages, pump, pressures, flow, idle) {
  const path = ladder(pressures, flow);

  // Behaviour states first: a guard stopping is not a stage fault.
  if (state === "leak") {
    return {
      level: "fault",
      title: "Leak detected — inlet closed",
      detail: `Flow ${format(flow, 2)} L/min with the dispense tap closed. The inlet valve has shut and the pump is stopped.${INTERLOCK_NOTE}`,
      stageId: null,
    };
  }

  if (state === "dryrun") {
    return {
      level: "warn",
      title: "No feed water — pump stopped",
      detail:
        "Dry-run guard: with no feed pressure the pump waits instead of running dry, and resumes on its own when water returns. Dispense from storage stays open.",
      stageId: null,
    };
  }

  if (state === "tankfull") {
    return {
      level: "ok",
      title: "Tank full — production paused",
      detail:
        "The float switch has stopped the pump at full storage. Drawing a glass reopens it automatically.",
      stageId: null,
    };
  }

  if (pump.status === "low") {
    return {
      level: "warn",
      title: "Pump boost below baseline",
      detail: `${path}. Boost ${format(pump.dp, 1)} kPa — ${format(
        pump.ratio,
        2
      )}× its flow-normalised baseline. Dispense stays open; production slows.`,
      stageId: null,
    };
  }

  const low = stages.find((s) => s.status === "low");
  const high = stages.find((s) => s.status === "high");

  if (low) {
    // The rule only sees a collapsed stage. Which cause to name comes from the
    // simulated state, because the two faults look the same to the sensors.
    let title = `Cartridge ${low.index} below baseline`;
    if (state === "removed") title = "Cartridge 2 removed";
    else if (state === "bypassed") title = "Cartridge 3 bypassed";
    return {
      level: "fault",
      title,
      detail: `${path}. ${low.name} stage: ΔP ${format(low.dp, 1)} kPa — ${format(
        low.ratio,
        2
      )}× its new-cartridge baseline.${INTERLOCK_NOTE}`,
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
      )}× its new-cartridge baseline. Service soon: dispense stays open.`,
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
