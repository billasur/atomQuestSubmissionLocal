# atomQUEST 2026 — Round 2 Playbook
### Team The Collector · Alliance University Bengaluru · Water Purifier track (Track 2)
**Deadline: 4 November 2026, 11:59 PM IST — upload on the GradPartners platform.**

This document is the single working file for Round 2: what the round rewards, what the
research says, exactly what to build in the remaining days, and how to produce the two
deliverables (90-second video + 1–2 page progress report).

---

## 1. What Round 2 actually grades

From the official brief:

| Requirement | Detail |
|---|---|
| Video | ≤ 90 s, ≤ 50 MB. Must cover: team, problem + solution, progress so far, **demo of the core function**, done/pending, **status of the safety / fail-safe mechanism** |
| Progress report | PDF, 1–2 pages, 7 fixed sections; **checked against what the video shows** |
| Naming | `atomQUEST2026_[TeamName]_[CollegeName]_Track[No]_Video` / `_Report` |
| Evaluation | Value delivered + progress made; readiness and seriousness. Phone recording is explicitly good enough |
| Hard rule | Same track and area as the abstract; hardware prototypes are the focus — "software-only considered only if the value is immense" |

**The strategic read:** Round 2 is a progress gate, not a polish contest. Judges
(Atomberg engineers) want evidence you can actually build hardware and that the
safety story is real. Our weakest flank is exactly that: everything shipped so far
is a simulation. So the plan below front-loads a **working bench rig** — even a
partial one with live sensor numbers on an OLED beats a perfect simulation.

**The strongest card we hold:** Atomberg launched its own purifier — the
**Intellon** (June 2025, ₹17,999, 7-stage RO+UF+UV+Alkaliser, "India's 1st Adaptive
Water Purifier", pay-per-part service model). Intellon shows TDS in/out and an
*inferred* filter-health %, but it cannot tell **which** cartridge is failing, and it
cannot detect a housing refitted empty. Our pitch: *The Collector is the water-path
integrity layer Intellon doesn't have* — measured, per-cartridge, fraud-resistant,
plus pump-health monitoring (Atomberg is a motor company; this is their home turf).

---

## 2. Research digest (what to say, and what not to claim)

### 2.1 The problem is real and quantifiable
- **~37.7 million Indians** are affected by waterborne diseases annually; ~73 million
  working days lost (India Water Portal). Use this number; **do not** use the old
  "1.5 million child deaths" figure (dated 2000s estimate).
- IS 10500:2012 drinking-water TDS: acceptable **500 mg/L**, permissible 2,000 mg/L.
  Rajasthan/Gujarat groundwater commonly 500–2,000 mg/L; northern plains 300–800.
- Domestic RO market ≈ USD 2–3.6 Bn (2025), ~17–18% CAGR. AMC plans run
  **₹2,000–6,000/yr** for 3–4 service visits — the service chain is the failure surface.
- **Why TDS-out misleads** (verified): TDS meters measure conductivity — they cannot
  see bacteria, viruses, cysts, lead, nitrate. WHO sets **no health-based TDS
  guideline** (palatability only). A purifier showing "TDS 12" can be serving
  microbiologically unsafe water through an empty housing. This is the core claim of
  our problem statement and it is solid.

### 2.2 The service-chain failure modes — frame carefully
- **Documented:** a Bengaluru user found a **fake filter fitted by a branded-franchise
  technician** (Reddit r/bangalore 2022); Bangalore Mirror reported a ₹6,000 repair
  fraud by a fake technician; brands themselves run "beware of fake service"
  campaigns. Counterfeit look-alike cartridges are a recognised global problem.
- **Plausible but NOT formally documented in India:** housings refitted *without* the
  cartridge; users bypassing the membrane for flow. **Do not present these as
  documented incidents.** Say: "failure modes the service chain makes possible, and
  which no purifier on the market can even detect." That phrasing is unattackable.

### 2.3 Prior art — be honest, then show the delta
- ΔP-based filter-life estimation is textbook in **air** filtration (US5036698A 1992;
  Sensirion sells DP sensors for HVAC filter monitoring) and standard in **industrial
  RO** (ΔP across membrane stages triggers CIP cleaning; Toray holds recent patents).
- Domestic purifiers overwhelmingly use **timers or litre-counters**: LG PuriCare
  counts dispensing minutes; Xiaomi prescribes annual swaps; Whirlpool uses a 6-month
  timer or gallon counter.
- Missing-cartridge detection **exists but is mechanical/binary**: WO2012151749A1
  ("no filter, no run" ball seal), SharkNinja HydraSense "filter missing" — all are
  seat switches on proprietary cartridge interfaces. **None would catch a housing
  refilled empty or a counterfeit that seats correctly.**
- Low-pressure switches in every RO already do crude dry-run protection; pressure
  sensors exist only to control the pump (US20160083278A1), never to assess filters.

**Our genuine differentiators (say exactly this):**
1. Per-stage **normalised ΔP** (ΔP ÷ Q) across all three stages of a *domestic* RO —
   three independent water-path measurements, not one protective switch.
2. **Install-time baseline fingerprinting** — each cartridge's ΔP-vs-flow curve is
   recorded when new and re-checked at every service; an emptied housing (ΔP collapses
   below 0.35× baseline) or a wrong part is named by stage.
3. **Pump-health trending** from the measured boost across the booster pump — a motor
   going weak shows up months before flow dies. (Atomberg synergy: their BLDC stack.)
4. **Fail-locked dispense** — the tap refuses to serve while a water-path fault is
   latched, closing the loop from detection to protection.
Caveat to keep in the back pocket: ΔP measures *resistance*, not removal efficiency —
a counterfeit with matching geometry shows a near-identical ΔP. Fingerprinting
detects presence/geometry, not chemistry. (One judge may know this; volunteering the
limit buys credibility.)

### 2.4 Standards to name-drop
- **IS 16240:2023** (RO point-of-use systems): minimum **40% recovery**, TDS-reduction
  testing at feed ≥1,500 mg/L, output aligned to IS 10500. Under the QCO, BIS
  ISI-mark is mandatory to sell RO purifiers in India. No Indian clause mandates
  water-path integrity over the product's service life — that's our gap.
- **NSF/ANSI 58** (US): ≥75% TDS reduction, structural integrity, and **automatic
  shut-off when the tank fills** — the closest analogue to our fail-safe set; benchmark
  the Round 3 demo against it.

### 2.5 Key citations
1. Atomberg Intellon product page — https://atomberg.com/products/intellon-waterpurifier
2. atomQUEST 2026 on GradPartners — https://gradpartners.in/e/atomquest-2026-339
3. WHO TDS background document (no health guideline) — who.int/docs/default-source/wash-documents/wash-chemicals/total-dissolved-solids-background-document.pdf
4. IS 16240:2023 — archive.org/details/gov.in.is.16240.2023 · summary: wqia.in/is-16240-2023
5. NSF/ANSI 58 — nsf.org/knowledge-library/nsf-ansi-58-reverse-osmosis-drinking-water-treatment-systems
6. India Water Portal, "When Water Kills" (37.7M cases/yr) — indiawaterportal.org/faqs/when-water-kills
7. Fake-filter incident (Bengaluru, 2022) — reddit.com/r/bangalore/comments/yr4grb
8. ΔP filter-life patent US5036698A — patents.google.com/patent/US5036698A
9. Mechanical missing-cartridge interlock WO2012151749A1 — patents.google.com/patent/WO2012151749A1
10. BIS certification mandatory for RO purifiers (The Hindu, 2023) — thehindu.com/news/cities/chennai/bis-certification-to-be-made-mandatory-for-all-ro-based-water-purifiers/article67361978.ece

---

## 3. What is already done (as of 25 Oct)

| Item | Status |
|---|---|
| Concept site (Vite + three.js) | Live, 4 camera presets, 9 simulated states, live trace + table, mobile-ready |
| **Real-world anatomy upgrade** | Booster pump plumbed between carbon and membrane; 5-tap ladder P1–P5; storage tank + faucet + reject-to-drain line with restrictor; inlet solenoid; SMPS; leak probe |
| **Safety states in sim** | Fail-locked dispense (tap refuses on fault), dry-run guard, leak shutdown, tank-full float stop, weak-pump warning |
| Physics model | ΔP = k·Q·R per stage, flow-normalised; pump boost with flow droop; tank/production/dispense cycle |
| BOM + validation plan | On the site; bench targets stated as targets, not results |
| Repo | github.com/billasur/atomQuestSubmissionLocal, main @ `1b0d528`, `npm run build` passes |

**Honest gaps:** nothing has been plumbed, wired, or measured. That is what the next
9 days are for.

---

## 4. The build — exactly what to buy and assemble

### 4.1 Shopping list (verified India prices, Oct 2026)

| # | Item | Spec | Qty | Price | Source |
|---|---|---|---|---|---|
| 1 | Pressure transducer | G1/4 stainless, 0–1.2 MPa, 0.5–4.5 V | 5 | ₹686–1,149 ea | KitsGuru ₹686 / Robu ₹1,149 |
| 2 | ADS1115 ADC | 16-bit 4-ch I2C | 2 | ₹129–149 | Robu |
| 3 | Flow sensor | **YF-S402** (0.3–6 L/min, F=73·Q) | 1 | ₹280–400 | Sharvi / Robocraze |
| 4 | Flow sensor spare | YF-S201 (1–30 L/min — too coarse, spare only) | 1 | ₹219 | Robu |
| 5 | TDS module | Analog Gravity clone, 0–1000 ppm | 2 | ₹399–559 | Robu / Rees52 |
| 6 | Booster pump | E-Chen 75–100 GPD, 24 V | 1 | ₹1,300–1,850 | Parijata / RO spares (SP Road) |
| 7 | Solenoid valve | 24 V, 1/4" QC, NC | 2 | ₹99–250 | RO spares / Amazon |
| 8 | Float switch | side-mount reed | 1 | ₹119 | Robu |
| 9 | **Flow restrictor** | FR-450 (75 GPD) — **mandatory, without it the membrane never sees pressure** | 1 | ₹75–200 | oolalaji / RO spares |
| 10 | SMPS | 24 V, **3 A** (pump 2.5 A + solenoids) | 1 | ₹350–470 | Amazon / Robu |
| 11 | Buck converter | 24 V→5 V, 5 A (logic rail, separate from pump rail) | 1 | ₹199 | Robu |
| 12 | ESP32-S3 devkit | N16R8, USB-C | 1 | ₹549–999 | Robu / Amazon |
| 13 | OLED | 0.96" SSD1306 I2C | 1 | ₹150–200 | Robu |
| 14 | Relay module | 2-ch 5 V opto (pump + solenoid drivers) | 1 | ₹209 | Robu |
| 15 | PE tubing | 1/4" OD, food-grade | 10 m | ₹150–300 | RO spares |
| 16 | Push-fit fittings | tees/elbows/straights 1/4" | ~20 | ₹300–500 | RO spares |
| 17 | Cartridges | 10" inline sediment (5 µm) + carbon block | 1+1 | ₹449–900 | RO spares |
| 18 | Membrane + housing | 75–100 GPD | 1 | ₹621–999 | RO spares |
| 19 | Reference gauge | glycerin 0–1.6 MPa, G1/4 bottom conn. | 1 | ₹250–600 | IndiaMART |
| 20 | Test dust | wheat flour / talc (NOT ₹14k ISO dust) + 342 ppm cal sachet | — | ₹250–400 | grocery / Amazon |

**Total ≈ ₹10,500–14,500.** Bengaluru RO-spares shops (SP Road, Gandhi Bazaar) beat
hobby stores on pump/valves/fittings; hobby stores (Robu, Silverline) for electronics.

**⚠ The one trap that kills this project:** the popular **XGZP6847 die is gas-only**
— water destroys it. Use the stainless G1/4 transducers above (oil-isolated, water-safe).

### 4.2 Electronics architecture (one afternoon)

```
24 V SMPS ──► pump (relay ch1) + inlet solenoid (relay ch2) + dispense solenoid
     └──► buck 5 V ──► ESP32-S3, OLED, ADS1115 ×2, sensors
Star ground at the SMPS. Flyback diode across pump + each solenoid coil.
I2C bus: OLED 0x3C, ADS1115 #1 0x48, ADS1115 #2 0x49 (4.7k pull-ups, <30 cm).
```
- All five 0.5–4.5 V pressure outputs go to the two ADS1115s (8 single-ended
  channels — 5 pressures + 2 TDS + 1 spare). Never the ESP32 ADC (nonlinear,
  4.5 V out of range). PGA ±4.096 V → ~0.04 kPa/LSB.
- Flow: YF-S402 pulse on an interrupt pin; 0.45 L/min → ~33 Hz (calibrate the
  coefficient against a graduated cylinder — some clones ship wrong constants).
- TDS modules: power only while sampling (DC excitation polarises the probe);
  calibrate both probes against the same 342 ppm sachet — mutual consistency
  matters more than absolute accuracy.
- Sample 20 Hz; burst-average ≥16 ADS1115 readings per channel (the pump's
  diaphragm pulses at ~45–50 Hz — never single-sample).

### 4.3 Plumbing map (matches the 3D sim exactly)

```
tap/feed ── inlet solenoid ── flow sensor ── TDS-in ──► P1 ─ [sediment] ─► P2
         ─ [carbon] ─► P3 ─► [booster pump] ─► P4 ─ [RO membrane] ─► P5 ─ TDS-out ─► tank
                              └─ membrane reject ─► flow restrictor ─► drain
tank ─► dispense solenoid ─► faucet      float switch at tank top
```
- 20–30 cm of tubing between pump and P4, and ≥30 cm between tap and each
  transducer (compliance = cheap pulsation damper). Mount transducers port-up
  at high points; add one bleed tee at the highest point; fill slowly from the
  bottom, run to waste until bubble-free.
- Cut PE tube **square** with a proper cutter, push in 12–15 mm, tug-test every
  joint. Budget 5 spare fittings — push-fit leaks are 90% of day-one grief.

### 4.4 Calibration & the four-state test (the numbers that go in the video)

1. **Zero:** pump off, open to atmosphere, tare all five channels in firmware;
   re-zero after a 10-minute warm-up.
2. **Span:** screw the glycerin gauge into a tee at P4; agreement within ±2% FS is
   fine. Cheaper check for the low taps: 1.00 m of water head = 9.81 kPa — hang a
   2 m tube off P2 and read the step.
3. **Flow:** graduated cylinder + stopwatch at three throttle points; store the
   pulse coefficient.
4. **States:** New (fresh set) → Clogged (dose flour/talc grams at a time into the
   feed bucket while recirculating until P1−P2 triples) → Carbon removed (housing
   refitted empty — **do this outdoors, expect spray**) → Membrane bypassed
   (tee + valve around the membrane). Read each at ~0.25 / 0.40 / 0.55 L/min,
   three repeats, log water temp.
5. **Interlock:** with any fault latched, dispense solenoid refuses. Film this.

**Pass targets (write them as targets, not results):** normalised ΔP repeats
within ±4%; removed/bypassed read below 0.35× baseline; loaded stage flagged before
flow falls below 0.30 L/min; pump boost repeats within ±8% at a given flow.

### 4.5 Ten-day schedule (2 people, 25 Oct → 4 Nov)

| Day | Track A (Prahalad — sensors/firmware) | Track B (Sanskar — mechanical) |
|---|---|---|
| Sat 25 | Order everything (paid by tonight); ESP32 + OLED bench test | Source RO-spares list locally |
| Sun 26 | ADS1115 driver + 20 Hz logging skeleton | Plumbing: loop + taps, leak-test with pump only |
| Mon 27 | Flow pulse counting; OLED readout | Fit transducers, bleed the lines |
| Tue 28 | Zero + span calibration (§4.4.1–2) | Mount pump, valves, tank, float |
| Wed 29 | Baseline capture: new-cartridge fingerprints at 3 flows | Leak re-check, tidy runs |
| Thu 30 | **Four-state test** + interlock logic in firmware | Load cartridge to 3× baseline (§4.4.4) |
| Fri 31 | Repeats + temperature notes; log everything | Photos/video of the rig at every step |
| Sat 1 | Buffer / analysis plots | **Record video footage** |
| Sun 2 | Video edit (90 s, script below) | Report PDF |
| Mon 3 | Review both against the brief's checklist | Upload by 6 PM IST (buffer before deadline) |
| Tue 4 | — hard deadline 11:59 PM IST — don't be here |

**Cut order if behind:** drop P1 (infer feed from the rest) → manual switch instead
of dispense-solenoid firmware → second TDS probe sampled manually → loaded-cartridge
study becomes a partially-unseated cartridge. **Never cut:** leak testing, the flow
restrictor, the interlock demo, the OLED.

---

## 5. Fail-safe set (this is a scored item — the video must show status)

| Fail-safe | Detection | Action | Status today |
|---|---|---|---|
| **Fail-locked dispense** | any stage < 0.35× baseline, or leak | dispense solenoid refuses; "DO NOT USE" on display | simulated in 3D site; firmware on the bench rig |
| **Dry-run guard** | no feed pressure at P1 | pump disabled, auto-resume | simulated; trivial in firmware (P1 < threshold) |
| **Leak shutdown** | flow with tap closed | inlet solenoid closes + pump stops | simulated; hardware = 2 bare wires + 10k pullup, costs nothing |
| **Tank-full stop** | float switch | production pauses, resumes on draw | simulated; float switch ₹119 in the BOM |
| **Pump watch** | boost < 0.75× flow-normalised baseline | warn + service flag | simulated; the "Weak pump" state demos it |

Round 3 will require the safety mechanism **working on video** — the interlock and
dry-run guard are the two to have rock-solid on the bench by 1 Nov.

---

## 6. Deliverable checklists

### Video (≤90 s, ≤50 MB) — script in [VIDEO-90S.md](./VIDEO-90S.md)
- [ ] Team details (names, college, track) — 5 s
- [ ] Problem + how we solve it — 15 s
- [ ] Progress: bench rig + 3D twin — 20 s
- [ ] **Core function demo: live ΔP naming the missing cartridge** — 25 s
- [ ] Done / pending — 10 s
- [ ] **Safety status: interlock refusing to dispense** — 10 s
- [ ] File named `atomQUEST2026_TheCollector_AllianceUniversity_Track2_Video.(mp4|mov)`
- [ ] Under 50 MB (1080p H.264, ~8 Mbps, 90 s ≈ 90 MB → use 6–7 Mbps or 720p)

### Progress report (PDF, 1–2 pages) — draft in [progress-report.html](./progress-report.html)
All 7 mandated sections, in the brief's order:
1. Team name, college, track, area of exploration
2. Problem + how we're solving it
3. Components/modules completed so far + **sourcing-risk status**
4. Amount spent so far vs the abstract's cost estimate
5. Changes since the abstract (revised claims, delays + reasons)
6. Safety / fail-safe status
7. Planned next steps for Round 3
- [ ] Photos/screenshots of the rig inside the report (the brief explicitly allows it)
- [ ] Report numbers match the video exactly
- [ ] `atomQUEST2026_TheCollector_AllianceUniversity_Track2_Report.pdf`

---

## 7. Round 3 preview (design for it now)

2-minute video: prototype **in operation**, performing its core function, **with the
safety mechanism working**, plus a detailed explanation. Shortlisted teams get
Atomberg mentors. So the bench rig must survive to Round 3 — build it on a board,
label the taps P1–P5, and keep every wire serviceable. The demo choreography to
master: normal run → swap in the empty housing → OLED names "CART 2 MISSING" →
dispense refused → reset.
