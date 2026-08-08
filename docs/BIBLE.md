# K-Pop Agency Manager — The Bible

*The living design document. The code is an implementation of this file.
Spec sections describe how systems work **now** and are edited in place.
The status ledger at the bottom is append-only — it is the project's memory.
If a decision isn't in the Bible, it didn't happen.*

Source design brief: `docs/DESIGN_BRIEF.md` (the owner's founding document).
Process reference: `docs/DEVELOPMENT_ENGINE.md`.

---

## §1 Laws

One-sentence laws. Enforced by tests, cited by name, never reverted casually.

1. **No visible Overall rating.** Talent is communicated through evaluator
   blurbs and, at most, four qualitative bands (Raw / Developing / Strong /
   Exceptional). The internal 0–100 scale never reaches the player's eyes.
2. **Reads are knowledge, not slot pulls.** Every perceived value is
   deterministic per (evaluator, person, domain, observation count).
   Reopening a screen never re-rolls an opinion.
3. **Certainty is never total.** Read fog narrows with observation but has
   a floor (`SCOUT.minReadWidth`).
4. **The public decides.** The company assigns a center; the debut breakout
   is chosen by centerPull + concept fit + noise. A designated center can be
   overshadowed, and that is content, not a bug.
5. **The player has a boss.** Objectives, allowances (3 signings), deadlines
   and trust live in state from day one.
6. **Respect the person.** No body measurements, weight systems, surgery,
   sexualization, player-controlled dating, or harassment feeds. Private
   life appears only as a non-interactive life-state note when work-relevant.
7. **Saves are sacred.** Versioned schema, one-shot version-gated
   migrations, forward-only stamping.
8. **Self-healing predicates.** Debut resolution and deadline checks fire
   when *due or overdue*, never on exact-date equality.
9. **One code path.** The soak harness and the UI call the same engine
   functions (`advanceWeek`, `signProspect`, `proposeGroup`, `planDebut`).
10. **All tuning lives in `js/engine/constants.js`.** No magic numbers in UI
    or scattered through systems.

## §2 Architecture

- Framework-free classic scripts under a shared `KP` namespace. No build
  step; Node test suites load the exact browser files in a vm sandbox
  (`test/load_engine.js`).
- Engine (`js/engine/`) is pure simulation; UI (`js/ui/`) renders state and
  forwards intents. UI never mutates simulation state directly.
- Seeded RNG (`mulberry32`, count-indexed for exact save/restore) drives
  simulation; a separate deterministic hash channel (`KP.hash01`) drives
  perceived reads and blurb selection.
- Person ids are allocated from `state.nextPersonId`, never from module
  memory (two live states must not interleave — suite 005 guards this).
- PWA: service worker precache, cache key in version lockstep, portrait
  manifest.

## §3 Calendar

4-week months, 48-week years. Week 1 = Jan Wk1 Y1. The opening objective
deadline is week 72 (18 months). Tentpoles: monthly showcase (every 8
weeks), scheduled debut, executive deadline. The Desk shows an upcoming
strip; advance is one week per tap with a week-report sheet.

## §4 Talent model

Five foundations: Vocals, Rap, Dance, Visuals, Charisma. Each is
`{cur, ceilLo, ceilHi, growth}` — the cone `[ceilLo, ceilHi]` is the hidden
potential range. The **true ceiling** is resolved lazily (first week of
development touching the domain) to a point inside the cone, stored in
`flags.ceil_<domain>`, still hidden. Eleven hidden personality traits
(workEthic, coachability, confidence, professionalism, adaptability,
resilience, creativity, competitiveness, leadership, warmth, dominance).
Ten hidden archetypes (naturalVocalist, performanceAce, centerCandidate,
lateBloomer, workhorse, producerMinded, varietyNatural, glassSpirit,
slowBurner, quietProfessional) mutate generation rolls.

**Derived qualities** (`KP.derived`) are computed, never purchased:
stagePresence, leadership, varietySkill, liveReliability, centerPull.
Live experience (showcases, rehearsals, debuts) feeds them — a trainee can
become a far better performer with no raw-skill change (suite 003 proves
it).

## §5 Perceived layer

`perceived = truth + deterministic offset` where offset width =
`(baseReadWidth − obs·widthPerObservation) · evaluatorAccuracy`, floored at
`minReadWidth`. Evaluators over-read their own specialty by +25% of width —
bias is character. Three staff evaluators: Coach Baek (vocals/rap, precise),
Director Cha (dance/visuals, blunt), Scout Im (charisma, instinct).
Blurbs are picked deterministically from per-domain, per-band line tables in
`js/engine/blurbs.js`. The overall recommendation keys off the two best
perceived domains — never an average of five. Rare **instinct notes** fire
when hidden charisma upside exceeds the scout's perceived read by >22.

## §6 Scouting economy

Targeted look: 4 budget, max 4 observations, each narrows every read.
Sign cost: base 14 + 6·(max rival heat). The executive allowance caps
external signings at 3 for the opening objective. Rivals escalate interest
weekly (watching → interested → hot) and sign hot prospects out from under
a slow player (5–16%/week). Fresh leads arrive ~30%/week.

## §7 Development

Weekly gains = base · growth · intensity · workEthic · coachability ·
fatigue drag · ceiling crawl · noise, split across ≤2 focus domains.
Intensities: rest / light / standard / heavy. Fatigue accumulates under
load, recovers on rest; above the soft cap (65) gains decay; above the hard
cap (88) burnout risk (forced light month). Breakthroughs (+2.5, +confidence)
and plateaus fire rarely. Monthly showcases grant live experience and an
observation to everyone.

## §8 Relationships & chemistry

Pair scores (−100..100) drift weekly from personality compatibility (warmth
helps, twin dominance clashes, effort mismatch grates, rivalry cuts both
ways) plus shared-focus context. States: close / friendly / professional /
tense / conflict. State *changes* surface as observations. Group chemistry
(hidden 0–100) = pair average blended with personality mix (exactly one
natural leader helps). The player sees words ("talented individuals, cold
room"), never a meter.

## §9 Groups

Player proposes 4–6 members with leader + center mandatory, main vocal /
dancer / rapper optional; maknae is recorded as a fact, not a role. Staff
picks are hints from perceived reads. The executive reviews the proposal in
words and remembers. One group in development at a time (vertical slice).

## §10 Studio & debut

Four generated demos: hook, vocalDemand, rapDemand, choreoPotential,
trendFit, and a natural concept lean. Eight concept families with talent
weights + personality resonances; `conceptFit` is individual and hidden —
the engine's source of accidental stars. Staff give lineup-aware demo
opinions in prose. Plan = song + concept + rehearsal allocation (must total
100) + promo level + date (≥4 weeks runway, ≤ deadline). Prep replaces
member training; rehearsal trains toward allocation at a discount and adds
live reps + fatigue.

Resolution: performance (skills vs demands, live reliability, prep,
fatigue) → reception (hook 30%, performance 30%, group fit 14%, trend 13%,
chemistry 12%, promo, luck σ9) → band (sensation / strong / solid / quiet /
miss) → breakout (centerPull 70% + conceptFit 30% + center exposure bonus
+ noise σ14). Consequences: trust delta, reputation drift, revenue,
member histories, "fans question the center" thread when overshadowed.

## §11 Economy

Budget units ≈ ₩10M feel. Start 120. Monthly stipend 12 vs upkeep
0.25/trainee/week — the stipend roughly covers a 9-trainee roster so that
*choices* (looks, signings, production 30, promo 10/22/40) are where money
goes. **History:** the original 6-stipend/0.5-upkeep economy death-spiraled
every soak org to 0 budget before production — retuned in v0.1.0 after the
harness caught it.

## §12 Events

Table events in `js/engine/events.js` each carry a predicate, weight and
cooldown; at most one fires per week on top of systemic notes. Current
table: deadline nudges (escalating), costly-trainee flag, contested-prospect
pressure, morale wobble, private-life note (non-interactive, per Law 6),
pre-debut viral clip.

## §13 Rival agencies

Novaline (trend chasers), Aurum (performance monsters); Whitecliff (patient)
is in data, unused in the 2-rival slice. Rivals read prospects through
their own coarse fog and weighted-pick targets by philosophy — distinctive
mistakes are intended. They escalate interest, sign, and appear on the
Industry tab and the wire.

## §14 Verification

- **Battery** (`node tools/run_battery.js`): accreting suites, exit-code
  verdict. 001 generation, 002 scouting/perceived, 003 development,
  004 group/debut, 005 saves. ~20k assertions.
- **Soak** (`node tools/harness.js [seeds]`): auto-player runs 84 weeks per
  seed through real engine calls; observatory census bands (sensations,
  strong+, quiet/miss, non-center breakouts, rival steals, burnouts) with
  EXTINCT/FLOOD alarms; hard invariant guards (scale, ceilings, fatigue,
  budget, unresolved debuts) kill the run.
- **E2E** (`NODE_PATH=$(npm root -g) node test/e2e_walkthrough.js`):
  Playwright drives the real UI at 390×844 through a full career, 32 checks.
- **Lockstep** (`node tools/version_lockstep.js`): version agrees across
  constants, sw cache key, index cache-busters, splash tag, precache list.

**Ship ritual:** battery → soak → e2e → lockstep → Bible note → push.

## §15 Roadmap (owner-gated)

Per brief §21. Phase 2: multiple groups, comeback cycles, charts,
endorsements, staff hiring, richer rival AI. Phase 3: international
markets, tours, awards, producer ecosystem. Phase 4: career mobility and
executive politics. Phase 5: generations and long-term history.
**Gate:** the owner plays the v0.1.0 slice and reports feel before any
Phase 2 system is designed. The brief's MVP success test (§20) is the
checklist for that conversation.

## §16 Planned work — the procedural mandate (v0.2.x line)

> Owner, after v0.1.0 shipped: *"the next step for the game will be making
> everything procedural. every run should feel different."*

**Status: approved direction, specced, NOT started.** Gate: the owner plays
the v0.1.0 slice first; the feel report may reorder or cut phases below.
Nothing in this section is built until that conversation happens.

### The audit (what is static across runs today, measured v0.1.0)

| Layer | Today | Verdict |
|---|---|---|
| People (talents, cones, personality, archetypes) | procedural | fine |
| Player company | Hanseong, identical every run | **scripted** |
| Rivals | always Novaline + Aurum, fixed blurbs | **scripted** |
| Objective | identical text/deadline/allowance | **scripted** |
| Opening trainees | slots 0/1 hard-coded to the §25 characters | **scripted** |
| Executive | pool of 3; personality is a label, no mechanics | shallow |
| Evaluator staff | 3 fixed people, fixed biases | **scripted** |
| Blurbs | ~148 fixed lines; repeat runs re-read them | shallow pool |
| Names | 30×42 combos | shallow pool |
| Songs / group names / producers / headlines | 225 / 110 / 5 / 5 | shallow pool |
| Market trends | `trendFit` is a static per-song roll | no world state |

The principle for the fix, from the design grammar: **texture comes from
generators plus census bands** — generate everything, then let the
observatory prove every archetype of world stays alive and nothing floods.

### Phases (each a small versioned release: code + suite + soak + ledger)

- **v0.2.0 — Voices and names.** Content generators replace shallow pools:
  syllable-built Korean names (collision-checked), song-title grammar,
  group-name generator, producer/headline generators. Blurbs become
  assembled lines (voice × domain × band × detail fragment) instead of
  fixed strings — target ≥10× effective variety. Law 2 holds: assembly is
  hash-picked, deterministic per person/evaluator/observation.
- **v0.2.1 — The staff.** Evaluators are generated people: name, role,
  favored domain, accuracy, and a voice that mechanically selects their
  blurb register (precise / blunt / instinct / dry / poetic). Staff differ
  per save, so *whose* opinion you learn to trust differs per save.
- **v0.2.2 — The company you join.** Player company and rivals generated:
  names, sizes, budgets, philosophies, reputation profiles. Signatures get
  mechanical pull (a vocal-house's inherited trainees skew vocal; a
  performance-house attracts dance prospects — reputation is gravity, per
  brief §12). Rival count 2–4; philosophies sampled; Whitecliff's "patient"
  archetype finally activates.
- **v0.2.3 — The scenario.** The scripted §25 openers become a **hook
  library** the generator samples 2–3 from: broken brilliance (elite at X,
  poor at Y), hidden gem (ordinary reads, strange scout notes), sunk-cost
  veteran ("use her or cut her"), contested prospect, feuding pair,
  natural mentor. Same teaching function every run, different people every
  run. Objective generator varies deadline (60–84wk), member range,
  signings allowance, and budget, all framed in the executive's voice.
- **v0.2.4 — Executives with teeth.** Personality becomes mechanics:
  patience scales deadline-pressure events and missed-deadline penalty;
  trend-chasers judge reception vs trendFit, traditionalists vs brand fit;
  micromanagers send more directives; profit hunters weight revenue in
  trust deltas. Review and debut lines come from personality-keyed tables.
- **v0.2.5 — The market moves.** A per-seed trend state (which concept
  families are rising/falling) drifts over time. `trendFit` is computed
  against the trend state at release week, not stored on the song — so the
  *same* demo is a different bet in month 3 vs month 12, and comeback
  timing (brief §10) becomes a real decision. Headlines report actual
  world events (rival signings, trend shifts), not flavor.
- **v0.2.6 — Pre-history.** Generate 3–5 years of industry past at new
  game: rival groups with names, debut receptions, a chart memory. Company
  reputations are *derived from that history* instead of declared, and the
  wire/Industry tab reference real prior events. This is the foundation
  the Phase-5 "generations" roadmap item builds on.

### Cross-cutting rules

1. Same seed → identical world, including all generated content (suite 001
   invariant extends to companies, staff, scenario, history).
2. New suite per phase, plus a **divergence suite**: two different seeds
   must share no company name, executive, staff lineup, objective text, or
   opening-hook instantiation.
3. Observatory additions: scenario-guarantee guards (every world has ≥1
   teaching hook and ≥1 contested prospect), name-collision alarm,
   company-archetype census band, trend-state sanity (no concept pinned
   hot/cold for a whole run).
4. Generators live in `js/engine/` with fragments in data tables; UI code
   never assembles content.
5. Save migrations: existing v0.1.0 saves keep their scripted world —
   migrations backfill the new fields (trend state, staff records) without
   rewriting anyone's story. A League-Office-style letter is not needed;
   the changes are invisible to a mid-run save.

## §17 Watch items

Re-checked every soak; either fixed or watched, never silently tolerated.

- **Burnout census runs cold** (0/40 orgs with the cautious auto-player;
  band top 45%). The mechanism triggers under sustained heavy load (suite
  003 forces it), but a sensible policy never sees it. Watch whether human
  play produces it; if not, fatigue soft cap may be too forgiving.
- **Rival steals at 40/40 seeds** — band-legal but pinned at the top; if
  players report the board feels like a fire sale, tune
  `rivalSignHotChance` down.
- **Whitecliff unused** at RIVALS.count=2 — activates when rival count
  grows in Phase 2.
- **`ScheduleBlock`, `Contract`, `Market` domain objects** from brief §17
  are not yet modeled; weekly training assignment stands in for schedules
  in the slice.

---

## Status ledger (append-only)

> **v0.1.0 — the debut vertical slice** (initial release)
> Everything from brief §20: fictional company + executive + role, ~28
> prospects/trainees with hidden five-domain talent + cones + personality +
> archetypes, evaluator blurbs through a deterministic perceived layer,
> scouting with targeted looks and rival interest, signing under an
> executive allowance, weekly training + fatigue + showcases, emergent
> relationships and chemistry observations, group proposal with roles and
> executive review, four generated demos + eight concepts, debut prep,
> resolution with public reception and breakout selection, executive
> review + reputation movement + revenue, autosave + 3 manual slots.
> Owner's founding words carried into the game: *"I don't need five perfect
> trainees. I need one group people remember."* The opening scenario is
> brief §25 verbatim (inherited exceptional-vocalist-poor-dancer, the
> technically-average girl everyone watches, two rivals circling the most
> charismatic prospect).
> Numbers: battery 5/5 green (~20.8k assertions); 40-seed soak clean —
> reception median 53 (32–78), sensations 1/40, strong+ 9/40, non-center
> breakouts 16/40, rival steals 40/40; e2e 32/32; lockstep 22 modules.
> Found-by-process: the launch economy death-spiraled (stipend 6 vs upkeep
> 18/month) — every soak org hit ₩0 before production; retuned to 12/0.25.
> Also fixed pre-ship: ceiling clamp could mint 101-cap cones; module-level
> id counter interleaved parallel states (moved to `state.nextPersonId`);
> modal stopPropagation swallowed every sheet button (e2e caught it).
> Next: owner plays the slice; feel report decides Phase 2.

> **Planning note (docs-only, post-v0.1.0)** — Owner set the next
> direction while testing the slice: *"making everything procedural.
> every run should feel different. no need to code anything yet while I
> test."* Audited what is static across runs (company, rivals, objective,
> opening trainees, staff, and all shallow content pools — measured
> numbers in §16) and specced the v0.2.x procedural line: content
> generators → generated staff → generated companies → scenario hook
> library → executive mechanics → drifting market trends → pre-history.
> Gated on the owner's v0.1.0 feel report. No code written.

