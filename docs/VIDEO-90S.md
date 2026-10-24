# Round 2 Video — 90-second script, storyboard, shot list

**File name:** `atomQUEST2026_TheCollector_AllianceUniversity_Track2_Video.mp4`
**Hard limits:** 90 s, 50 MB. The brief says a phone recording is enough — do NOT
over-produce. Shoot landscape 1080p, lock exposure/focus, get the rig lit from a
window + one desk lamp, and record every shot 3–4 seconds longer than needed so
editing has handles.

---

## The 5 beats the brief demands (mapped to seconds)

| s | Beat | On screen |
|---|---|---|
| 0–8 | Team details | Both faces, name card, rig behind |
| 8–23 | Problem + how we solve it | B-roll of a purifier service / the 3D site |
| 23–43 | Progress so far | Bench rig pans, OLED, 3D twin side by side |
| 43–68 | **Core function demo** | Live ΔP naming the missing cartridge |
| 68–80 | Done / pending | Split screen or caption card |
| 80–90 | **Safety status** | Interlock refusing to dispense |

---

## Script (read it aloud twice before recording — it fits 90 s at normal pace)

### [0–8s] TEAM — talking head, both of you, rig in frame
> "We're Prahalad and Sanskar from Alliance University, Bengaluru — water purifier
> track. This is The Collector: an RO purifier that checks its own water path."

**Shot:** static mid shot, the rig on the table behind/beside you. Overlay: team
name + college + track (lower third).

### [8–23s] PROBLEM — voiceover over B-roll
> "Filter life in a domestic RO is estimated, never measured — days and litres on a
> display. And the only real sensors, TDS in and out, can't see the water path.
> A housing refitted without its cartridge, or a bypassed membrane, is invisible —
> TDS still reads great. Our fix: a pressure tap on both sides of every stage and
> the pump. Pressure drop divided by flow is a fingerprint of each cartridge."

**B-roll (record these separately):**
- B1: any RO purifier's display showing filter % / TDS (10 s)
- B2: technician-style hands opening a cartridge housing (your own rig counts)
- B3: the 3D site's Problem section scrolling

### [23–43s] PROGRESS — pan of the bench rig + the 3D twin
> "So far: the full five-tap plumbing on the bench — feed, after sediment, after
> carbon, pump outlet, product — a 24-volt booster pump, flow sensor, two TDS
> probes, all logged twenty times a second by an ESP32 on this display. The
> pressure-drop health model runs on the rig and in this interactive 3D twin we
> built, so every fault we demonstrate on hardware was designed here first."

**Shots:**
- S1 (8 s): slow pan across the rig, ending on the OLED showing live kPa
- S2 (7 s): screen recording of the 3D site — Overview preset, then click
  **Cartridges** preset (the twin sells the concept)
- S3 (5 s): close-up of a labelled tap: a paper tag "P4 · PUMP OUT" on the tube

*(If the rig isn't ready in time: S1 becomes a table-top shot of the ordered
components laid out with labels, and say "components in hand, plumbing this week"
— never fake a reading.)*

### [43–68s] CORE FUNCTION DEMO — the money shot, do it in ONE take
> "Here's the core function. Fresh cartridges: every stage reads one-point-oh times
> its new-cartridge baseline. Now I refit the carbon housing with no cartridge
> inside — exactly what a rushed service visit can do. The drop across stage two
> collapses to near zero — point-zero-six times baseline — while flow stays normal.
> TDS out barely moves. The display doesn't estimate: it names it. Carbon two,
> missing."

**Choreography (rehearse once dry):**
1. Camera locked on the OLED + the cartridge row (medium close-up, both in frame)
2. Normal run: OLED shows "ALL OK", table shows 1.00× across (5 s hold)
3. Hands enter, pull the carbon cartridge, refit the empty housing (10 s)
4. Hold on the OLED flipping to "CART 2 MISSING" + the tablet/laptop next to it
   showing the 3D twin's red verdict (8 s hold — let it breathe)
5. Voiceover lands the last line over the hold

**Fallback (no rig):** the same demo in the 3D twin — click *Cartridge 2 removed*,
show the verdict + ladder change, then click **Dispense a glass** and show the tap
refusing. Screen-record at 1080p. Honest, still scores.

### [68–80s] DONE / PENDING — caption card + voiceover
> "Done: the sensing chain end to end, the health model, the three-dimensional
> twin, and the four-state test protocol. In progress: the loaded-cartridge
> characterisation and temperature compensation. Sourcing risk that cleared: the
> water-safe pressure transducers — the common hobby sensor is gas-only; we
> switched to stainless diaphragm modules, all in hand."

**Overlay card (make in Canva, 5 lines max):**
- DONE — 5-tap sensing chain · ΔP health model · 3D twin · test protocol
- PENDING — dust-loaded characterisation · temperature compensation
- SPENT — ₹___ of the ₹___ estimate *(fill from your abstract)*
- NEXT — four-state bench validation, then Round 3 integration

### [80–90s] SAFETY STATUS — the fail-safe working
> "Detection is only half of it. The dispense interlock is live: with a water-path
> fault latched, the tap refuses to serve. The dry-run guard and leak shutdown run
> on the same controller. For Round 3: this rig, integrated into the purifier
> shell — with the safety mechanism working, not promised."

**Shot:** close-up — press *Dispense* with the fault latched: the valve stays
shut / the screen says DO NOT USE / (3D twin: the red "Dispense locked" note).
Hold 3 s. End frame: team name + "The Collector — measured filter health."

---

## Recording notes

- **Two devices:** phone for the talking/rig shots; laptop screen-recording
  (QuickTime → New Screen Recording, or OBS at 1080p/30) for the 3D twin.
  Zoom the browser to ~125% so the sim fills the frame; use the **Cut-away** and
  **Cartridges** presets; dark room + full screen = clean capture.
- **Audio:** record the voiceover SEPARATELY in one quiet take (phone in your
  collar or a quiet room), then lay it over the cuts. Room-echo voiceover is the
  #1 quality tell.
- **Order of shooting:** 1) all rig close-ups while the rig is warm and running,
  2) talking heads, 3) screen recordings, 4) voiceover last (you'll know the
  exact pacing).
- **Edit:** CapCut / iMovie / DaVinci (free). Cuts every 4–7 s. Captions for the
  key numbers ("0.06× baseline"). Export H.264 1080p, **6 Mbps** → ~68 MB for 90 s;
  if over 50 MB, drop to 720p or 4.5 Mbps. Check the file size BEFORE naming.
- **Consistency rule:** every number shown in the video must match the report.
  Record the rig's actual readings on the day and paste them into
  progress-report.html before exporting the PDF.

## Shot list (tick off on the day)

- [ ] T1 talking head, both members, rig in frame (×3 takes)
- [ ] S1 rig slow pan ending on OLED (×2)
- [ ] S2 3D twin screen recording: overview → cartridges preset → removed state → dispense refused
- [ ] S3 tap tag close-up "P4 · PUMP OUT"
- [ ] D1 demo: normal → remove carbon → OLED "CART 2 MISSING" (×3 takes, keep the best)
- [ ] D2 demo fallback: same sequence in the 3D twin (record even if D1 works)
- [ ] F1 fail-safe close-up: dispense refused with fault latched (×2)
- [ ] B1/B2 problem B-roll (purifier display / housing opened)
- [ ] V1 voiceover, one quiet take
- [ ] E1 end frame (name + tagline, 3 s)
