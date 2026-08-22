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
   blurbs and, at most, five qualitative bands (Raw / Developing / Capable /
   Strong / Exceptional — clean 20-point ranges, owner's ladder as of
   v0.4.1). The internal 0–100 scale never reaches the player's eyes.
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

**Ages** (owner's law, retuned v0.3.1: *"15-16 should be the norm, just
like reality, with 14-18 making up the bulk of trainees, and 19-21 being
far more uncommon. I don't want to go any younger than 14."*): weighted
14–22 via `GEN.ageWeights`, mode 15–16 (~44%), 14–18 ≈ 86%, 19+ ≈ 14%,
mean ~16.6. **The 14 floor is a hard line** — asserted person-by-person
in suite 001, re-checked on every fresh weekly lead in suite 016, and
alarmed in the observatory. The v0.3.1 migration regenerated existing
saves' scouting boards under the new curve (narrated by Scout Im; the
signed roster untouched — those people are the save's story).
History: v0.1.1 moved uniform 16–23 (48% aged 20+) to peak 17–18; this
release moved the peak to 15–16.

**Derived qualities** (`KP.derived`) are computed, never purchased:
stagePresence, leadership, varietySkill, liveReliability, centerPull.
Live experience (showcases, rehearsals, debuts) feeds them — a trainee can
become a far better performer with no raw-skill change (suite 003 proves
it).

## §4b Generation realism (v0.3.2)

Two owner laws from a pair of dossier screenshots:

**Polish comes from training time** (*"a 14 year old shouldn't be that
polished"*): trained skills (vocals/rap/dance) scale with age — mean 30
at 14 rising to 52 at 22, and the *spread* narrows with youth too (sd 10
at 14 → 15 at 22), because training time is what differentiates people.
Visuals and charisma stay age-independent — they are innate, and a
14-year-old with an exceptional face is exactly what street casting
finds. Measured: 2% of 14–15s carry a Strong trained skill, and ~80% of
those are archetype prodigies (naturalVocalist, performanceAce) — the
exception always has a reason.

**The market is efficient** (*"I find it hard to believe a 19 year old
with that much talent would just be walking around on the streets"*):
an 18+ *prospect* whose trained skill rolls elite (>62) is corrected
down 75% of the time — someone already signed the great ones. The
surviving 25% are flagged `overlooked` and narrated by the scout
("Somebody upstream made a mistake. Move before they correct it") — the
implausibility becomes a story. Inherited trainees are exempt: the
building trained them; that IS the explanation.

**Sources follow profiles**: weighted by the rolled person — academies
produce the trained kids (dance-academy finds measure +dance), street
casting and social media find young magnetic faces, and 19+ prospects
arrive mostly through referrals, auditions and academies. Suite 017.

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

**The band ladder (v0.4.1, owner's ranges):** Raw 1–20, Developing 21–40,
**Capable 41–60**, Strong 61–80, Exceptional 81–100. The owner's reasoning
verbatim: *"developing implies they're still learning and then it's a big
jump to being strong. capable bridges that gap."* Each of the 25
domain×band blurb cells exists and composes (asserted in suite 015);
boundaries are asserted exactly in suite 001. The voice split that
matters: Developing = still learning ("the coaching is landing — give it
time"), Capable = does the job, unremarkably ("dependable mid-formation;
nobody watches her, nobody worries about her"). Note Exceptional now
starts at 81 (was 72) and Raw ends at 20 (was 34) — the top grade got
rarer and the bottom one kinder, both consequences of the owner's clean
ranges, not separate tuning decisions.

## §6 Scouting economy

Targeted look: 4 budget, max 4 observations, each narrows every read.
Sign cost: base 14 + 6·(max rival heat). Rivals escalate interest weekly
(watching → interested → hot) and sign hot prospects out from under a
slow player (5–16%/week). Fresh leads arrive ~30%/week.

**The tutorial rail and the open agency** (v0.2.3, owner: *"after the
debut of the first group, remove the cap on signings but have the CEO put
pressure on you if you're spending too much... the first group feels like
a tutorial and then the game opens up"*). The 3-signing allowance binds
only while no group has debuted (`KP.signingsCapped`). The first
post-debut directive announces the change in the executive's voice
("the signing allowance is retired… I read the books every month").
After that, signings are limited by budget and by **fiscal pressure**:
the CEO reads a rolling quarter of net budget movement at each month
boundary. A quarter more than 90 in the red escalates pressure
(noticed → warned → board-level); level 2+ costs trust (−3/−5); surplus
quarters cool it, with a "books look like a business again" note at
zero. One expensive album month is business — three red months are a
problem. Tuning history: a per-month threshold FLOODed the census (40/40
orgs nagged); the rolling quarter with a split notice/warned census
landed at 13/40 noticed, 1/40 warned.

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
helps, twin dominance clashes, real effort mismatch grates, rivalry cuts
both ways) plus shared-focus context. States: close / friendly /
professional / tense / conflict. State *changes* surface as observations.
Group chemistry (hidden 0–100) = pair average blended with personality mix
(exactly one natural leader helps). The player sees words ("talented
individuals, cold room"), never a meter.

**Repair forces** (v0.1.2 — owner: *"a lot of conflict and no way to do
anything about it other than hope"*; measured 65% of pairs tense-or-worse
at week 40, 36% in open conflict). The compatibility mean is now ~neutral
(always-negative penalty terms gated behind real thresholds), negative
pairs regress toward professional scaled by professionalism (`reversion`),
and feuding pairs kept on *separate* training focus cool off extra
(`coolOff`) — separation is a deliberate player lever, hinted in the UI.
Post-fix texture: ~20% tense, ~1–6% open conflict, warmth intact.

**The sit-down** (`KP.mediatePair`): the player's direct tool. Costs staff
time (3), 6-week cooldown per pair, success odds from professionalism +
warmth − twin dominance (clamped 15–90%). Outcomes in prose: cleared
(+10..24, small morale lift), cool (+2, "calm, not peace"), rare backfire
(−6) when two dominants share a small room. Frictions render as **friction
cards** — the problem and its handle together — in the dossier, the group
room report, and the builder preview. Guarded by suite 007 and two census
bands (friction alive in every org; conflict-heavy endings rare).

## §9 Groups & roster exits

Player proposes 4–6 members with leader + center mandatory, main vocal /
dancer / rapper optional; maknae is recorded as a fact, not a role. Staff
picks are hints from perceived reads. The executive reviews the proposal in
words and remembers.

**The project** (v0.2.5 — owner: *"these 3 are in, now the rest of the
trainees know there's a project and they start working to make it. you
could even pinpoint what you're looking for"*). From the builder, 1–3
locked members + up to 2 declared sought domains open a provisional
group. While open: the building is told (one announcement letter), free
trainees train at ×1.15 with +1 weekly fatigue (they push), and the
sought domains fill any spare focus slot they have — the player's own
plan always wins. Locked members get a small morale drip (a secured spot
steadies you); occasional standout notes name the hardest-working
hopeful. Finalizing a lineup consumes the project — a locked member left
out of the final lineup takes a real morale hit and her file remembers.
Shelving the project disappoints every hopeful. One project at a time,
never during group development. Suite 013.

**Editing roles after formation** (v0.3.3 — owner: *"the ability to edit
roles for a group already formed, with a penalty if applicable. changing
the center should have consequences if it's a questionable choice"*).
`KP.setGroupRoles`: leader + center mandatory, members only, solos
refused, no-ops refused. Every named-role move has a human cost — the
demoted lose morale (the center seat costs double, plus confidence), the
promoted gain, files remember, and the old and new center's relationship
strains. Pre-debut, that is all: the room adjusts quietly. Post-debut, a
center change is public: a **questionable** pick (new centerPull more
than 8 below the old) costs popularity and draws urgent PR blowback
("the comment sections are asking what the company is thinking");
handing the center to the breakout the public already chose (the
overshadow correction) *gains* popularity ("the internet takes full
credit"); anything between gets cautious coverage. Center history is
kept. UI: Edit Roles on the group page, with a warning when they've
debuted. Suite 018; the builder role-select snap-back bug (no change
handler) is fixed with an e2e regression check.

**Multiple groups** (v0.2.2): `state.groups[]`, each with its own id,
demos, prep, popularity, promo cycle, discography, and results. Rules:
one group *in development* at a time (a new lineup needs every existing
group debuted), a person belongs to at most one group, names are unique.
`KP.freeTrainees` is the pool a new lineup draws from. The Groups tab
lists group cards when there are several; the Studio grows a group
switcher and defaults to whichever group most needs a record. Comeback
directives carry `objective.groupId` and only resolve on that group's
release — the executive targets whichever act has waited longest.

**Releasing** (v0.1.1): `KP.releaseTrainee` is a player action only — the
engine never auto-cuts (design-grammar law). Rails: debut-lineup members
and debuted idols cannot be released; spent signings are not refunded; the
file records the exit; close friends of the released trainee lose morale,
and the confirm dialog names them before the player commits. Accessible
from the dossier behind a confirmation.

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
chemistry 12%, promo, luck σ9, plus popularity lift on comebacks and the
**spark**) → band (sensation / strong / solid / quiet / miss) → breakout
(centerPull 70% + conceptFit 30% + center exposure bonus + noise σ14).
Consequences: trust delta, reputation drift, revenue, member histories,
"fans question the center" thread when overshadowed.

**The spark** (v0.2.0): when a big hook (≥68) meets a magnetic top
performer (pull ≥66), a 35% roll adds +4..10 — the defining-clip moment,
noted in the PR digest as a circulating fancam. The sensation band edge
(75) was calibrated against a measured 200-seed debut distribution to
~3.5% — rare but never extinct.

## §10b The comeback loop (v0.2.0)

The debut is the first release, not the end. One machinery
(`planDebut`/`resolveDebut`) serves every release:

- **Objective ladder** (`js/engine/career.js`): when an objective resolves
  — met, met poorly, or missed — the executive issues the next directive
  as a letter, with a reinvestment grant (25 + performance-scaled) and
  sometimes an extra signing. Comeback objectives carry a target reception
  that moves with the story (last result ± trust). Self-healing predicate:
  `objectiveSuccessionDue` fires on any resolved objective with no
  successor, once. Missing a comeback window costs less trust (−15) than
  missing the debut (−30) and always earns "one more window."
- **Popularity** (hidden 0–100, worded as burning/hot/warm/cooling/fading):
  founded by the debut (15 + reception·0.75), compounded by comebacks
  (0.55·old + 0.55·reception), lifts comeback reception (±12 max) and
  album revenue, and **decays** (−0.35/week) once promotion + 8 grace weeks
  end — the room between releases is where momentum goes to die.
- **Promotion cycle**: 4 weeks after each release, members run hot (fatigue
  +7/week, media/live exp up); after that, idols *recover* (−8/week).
  This replaced the v0.1.x bug where idols kept accruing training fatigue
  forever; the v0.2.0 migration repairs pegged saves with a narrated
  management-review letter.
- **Idol self-development** (v0.2.4 — owner: *"a system where they auto
  focus on the attribute with the most runway… once they've debuted,
  everyone kind of knows what they need to work on"*). In idle weeks
  (no prep, no promotion), a debuted idol auto-trains the domain with the
  most runway to her resolved ceiling: half the trainee rate, scaled by
  growth and work ethic, ceiling-crawl near the top, +3 fatigue against
  the −8 recovery, and skipped entirely above 60 fatigue — rest wins.
  No player controls: it simulates a professional who knows her gap.
  Visible as a "drilling X" roster chip, a dossier observation, and a
  rare inbox note. Suite 012 guards growth, focus choice, ceilings,
  tired-rest, promo non-interference, and determinism.
- **Charts-lite**: each release records a peak position (from reception +
  popularity + σ6 noise) and weeks-charting; the discography on the group
  page is the story so far, on the record.
- **Demos refresh** every cycle: resolution clears `state.demos`; the
  Studio regenerates four on next open, era accent and all.
- **Formats** (v0.2.1): Single (30, 4wk runway, ×1.0) / Mini-album (55,
  6wk, ×1.6) / Full album (90, 8wk, ×2.3). Bigger records cost more, need
  more runway, pay more; format and track count land in the discography.
- **Rollout focus** (v0.2.1): promotion weeks are spent somewhere — Music
  shows (hard live reps, most fatigue), Variety & media (media exp,
  personalities get found), Fan engagement (morale, popularity trickle,
  +4 weeks of decay grace). Applied weekly by `idolWeek`.
- **Comeback labels** (v0.2.1, owner-reported bug): comeback reports drew
  labels from the debut band table ("A strong debut"). Comebacks now
  label from `COMEBACK.bandLabels`, and the miss/quiet/solid public notes
  are debut/comeback aware. The migration relabels an afflicted saved
  report in place.
- **Stage names** (v0.2.1, tightened v0.2.3 — owner's law: *"if using a
  stage name, only use that in reports"*): assignable to lineup members
  and idols (dossier → "Give a stage name"), ≤14 chars, unique
  case-insensitively, with deterministic suggestions. `KP.displayName`
  (full) and `KP.publicGiven` (short) rule **every report surface** —
  inbox notes, PR digests, development/health/showcase notes, relationship
  and chemistry observations, friction cards, sit-down outcomes, release
  fallout, event texts. The dossier header keeps the legal name — a
  personnel file, not a report. Suite 011 sweeps 30 weeks of reports for
  real-name leaks.

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

Novaline (trend chasers), Aurum (performance monsters), Whitecliff
(patient — finally activated in v0.4.0's 3-rival opening). Rivals read
prospects through their own coarse fog and weighted-pick targets by
philosophy — distinctive mistakes are intended. They escalate interest,
sign, and appear on the Industry tab and the wire. As of v0.4.0 they are
full competitors, not just scouts: they run acts, debut, come back, and
rise or fall as companies — see §19.

## §14 Verification

- **Battery** (`node tools/run_battery.js`): accreting suites, exit-code
  verdict. 20 suites: 001 generation (incl. age distribution), 002
  scouting/perceived, 003 development, 004 group/debut+ladder, 005 saves,
  006 releasing, 007 mediation, 008 comeback loop, 009 rollout, 010
  multigroup, 011 opening, 012 idol growth, 013 the project, 014
  hype/solo, 015 generators, 016 age curve, 017 generation realism, 018
  roles, 019 the living world, 020 the fan feed. ~24k assertions.
- **Soak** (`node tools/harness.js [seeds]`): auto-player runs 140 weeks
  per seed through real engine calls — signings, training, sit-downs,
  debut, and repeated comebacks; observatory census bands (24: debut
  reception spread, breakouts, rival steals, burnouts, friction, conflict
  endings, multi-release looping, top-10 peaks, fanbase survival, second
  groups, fiscal pressure, hype, solos, rival act debuts, chart life,
  company lifecycle, feed life, chart top-three, crowded weeks) plus an
  age census, with EXTINCT/FLOOD alarms; hard invariant guards (scale,
  ceilings, fatigue, budget, unresolved releases, pinned idol fatigue,
  chart bounds, rival-count bounds, feed caps and well-formedness) kill
  the run.
- **E2E** (`NODE_PATH=$(npm root -g) node test/e2e_walkthrough.js`):
  Playwright drives the real UI at 390×844 through a full career — scouting,
  training page, sit-down, release flow, debut, reload, a full comeback
  cycle, and the Industry tab's Scene/Chart/Feed — 60 checks.
- **Lockstep** (`node tools/version_lockstep.js`): version agrees across
  constants, sw cache key, index cache-busters, splash tag, precache list.

**Ship ritual:** battery → soak → e2e → lockstep → Bible note → push.

## §15 Branch & deploy model

The owner plays on mobile via **GitHub Pages, deploying from a branch**
(owner's choice of hosting; branch-deploy chosen over an Actions workflow
because the game is a static site with no build step — a pipeline would add
moving parts and nothing else).

- **Working branch** (`claude/new-session-…`) — where development happens;
  every push has already passed the §14 ritual.
- **`main` — production.** The Pages source. The deployed site is the live
  game the owner plays; whatever save lives in that phone's localStorage is
  the true production environment (Law 7 applies to it above all).
  Work rides working branch → `main` only when the ritual is green.
- A **`testing`** lane can be added later for risky builds: the owner
  flips the Pages source branch to try them — no code changes needed.
- The site is subpath-safe by construction (all-relative asset paths,
  relative sw registration, `start_url: "."`), so it serves correctly from
  `https://<user>.github.io/KP-Game/`. Keep it that way: never introduce
  root-absolute URLs.
- Updates reach the phone through the version lockstep: a new release
  changes the sw cache key + busters, so the next launch refetches and the
  old cache is deleted on activate. "Deployed" means the Pages build for
  the commit went green — that check is part of done.

**Save durability (v0.5.1).** The production save is the sacred object
(Law 7) and it lives in Safari's evictable web storage — so it is now
defended in depth: `navigator.storage.persist()` is requested at boot
(meaningful on iOS home-screen installs; System sheet shows
protected/best-effort), the **title screen** fronts every launch
(Continue with career meta / New career / Import save), starting a new
career over a live autosave demands explicit confirmation, and **Export
save** in the System sheet produces the career as copyable JSON or a
downloaded file that re-imports from the title screen. `KP.tryImport`
is a guarded door: shape-checked, migrated on the way in, refuses
garbage and saves from newer builds with narrated reasons, never
throws. Telemetry: save size shown in the System sheet, measured in
every soak (~168 KB after 140 weeks vs ~5 MB quota; hard guard at 400
KB), 10-year probe ~380 KB — years of headroom.

**The Capacitor decision (owner-raised, deliberately deferred).** The
measurement shows heap and quota are NOT near-term constraints; the
Pages feel-loop is the project's engine and a native wrap would slow
it. Wrap triggers, agreed in advance: a save approaching ~2 MB,
app-store distribution, or native capabilities (notifications, IAP).
The wrap is cheap when wanted — the game is a framework-free static
folder; Capacitor points at it as-is plus a storage adapter behind
`KP.saveLocal`. Even then, Pages remains the dev channel.

## §16 Roadmap (owner-gated)

*(The v0.2.3 queue — stage names in all reports, cap lift + fiscal
pressure — shipped; see §6, §10b and the ledger.)*

*(The hype & solo queue shipped as v0.2.6 — hard-directive version, per
the owner. See §10c and the ledger.)*

**Standing design note — the leader role** (owner, after asking what the
engine looks for in a leader: *"as we add media stuff and tours, things
of that nature, the leader role will start to matter more"*). Do NOT
bolt abstract leader mechanics onto the current systems. Instead, every
future media/tour/variety system must ask "what does the leader do
here?" and give the role visible work: fielding interviews, carrying
press conferences, covering for members on camera, holding the room on
tour legs, being the face of apologies when something goes wrong. A
well-aligned leader (assigned role matches emergent leadership) should
make those systems go smoother; a misaligned one should show. The
leader's weight accretes with content, not from a stat aura.

## §10c Hype, the hard directive & solo acts (v0.2.6)

**Hype** (`person.hype`, hidden, worded quiet / noticed / buzzing / "the
internet has decided"): emergent events find magnetic trainees (weekly
chance scaled by centerPull — trending covers, resurfaced street-cast
photos, escaped showcase clips), and everything decays 0.5/week. A
window, not a stockpile.

**The hard directive** (owner: *"dude I want the hard version"*): at hype
≥65 the CEO stops asking — a dated directive to debut her, "in a group,
alone, I do not care which," 20 weeks. Met by any debut (trust +6, a
rare compliment). Missed: trust −12, her hype collapses to 20, her
morale drops, and the letter ends "Remember that I remember." Tracked in
`state.hypeDirective`, archived to objectiveHistory as `hypeDebut`,
shown on the Desk as a second clock in magenta.

**Cash-in**: at debut, member hype lifts reception (group: Σ·0.12 capped
12; solo: ·0.16 capped 15), founds extra popularity (Σ·0.25), and pulls
the public's eye in the breakout roll. Hype zeroes on debut — it became
the act.

**Solo acts**: one-member acts through the same release machinery
(`type:'solo'`). Roles collapse to herself; "chemistry" is her own nerve
(45 + confidence·0.18); reception adds a charisma edge and ×1.4 luck
variance — high leverage, nowhere to hide; promo fatigue ×1.5 on the one
body; overshadow impossible. The executive reviews solos in their own
voice. Kept honest by risk, not rules — the objective ladder keeps
demanding groups. Suite 014; census: internet-found-someone 40/40,
directives 21/40, solo debuts 20/40 in soak.

Per brief §21. Phase 2: multiple groups, comeback cycles, charts,
endorsements, staff hiring, richer rival AI. Phase 3: international
markets, tours, awards, producer ecosystem. Phase 4: career mobility and
executive politics. Phase 5: generations and long-term history.
**Gate:** the owner plays the v0.1.0 slice and reports feel before any
Phase 2 system is designed. The brief's MVP success test (§20) is the
checklist for that conversation.

## §17 Planned work — the procedural mandate (v0.3.x line)

*(Renumbered from v0.2.x: the owner finished the slice and chose the
comeback loop first — it shipped as v0.2.0. This mandate is next in line.)*

**GATE OPENED** — owner, after playing through v0.2.6: *"the game feels
good. I think we can start really fleshing it out now."* The line is
live. **v0.3.0 (Voices and names) SHIPPED** — given names are
syllable-built (1,400 combos, world-unique, no doubled syllables; family
names stay a real small pool, that IS Korea), song titles and group
names come from grammars, producers and headlines generate, and blurbs
assemble from canonical wholes + opener×detail fragments (~20+ variants
per domain×band cell, deterministic per person under Law 2). Retired
song titles never reissue. Remaining phases below, in order.

*(v0.4.0 note: the "company you join" phase's rival half is partially
subsumed — companies now generate dynamically through the lifecycle
(`genCompanyName`, emerge/merge/split), and Whitecliff activated with
RIVALS.count 3. Still open from that phase: generating the PLAYER's
company and the authored starting rivals themselves. Generated staff and
executives-with-teeth remain next in the line.)*

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

- **v0.3.0 — Voices and names.** Content generators replace shallow pools:
  syllable-built Korean names (collision-checked), song-title grammar,
  group-name generator, producer/headline generators. Blurbs become
  assembled lines (voice × domain × band × detail fragment) instead of
  fixed strings — target ≥10× effective variety. Law 2 holds: assembly is
  hash-picked, deterministic per person/evaluator/observation.
- **v0.3.1 — The staff.** Evaluators are generated people: name, role,
  favored domain, accuracy, and a voice that mechanically selects their
  blurb register (precise / blunt / instinct / dry / poetic). Staff differ
  per save, so *whose* opinion you learn to trust differs per save.
- **v0.3.2 — The company you join.** Player company and rivals generated:
  names, sizes, budgets, philosophies, reputation profiles. Signatures get
  mechanical pull (a vocal-house's inherited trainees skew vocal; a
  performance-house attracts dance prospects — reputation is gravity, per
  brief §12). Rival count 2–4; philosophies sampled; Whitecliff's "patient"
  archetype finally activates.
- **v0.3.3 — The scenario.** The scripted §25 openers become a **hook
  library** the generator samples 2–3 from: broken brilliance (elite at X,
  poor at Y), hidden gem (ordinary reads, strange scout notes), sunk-cost
  veteran ("use her or cut her"), contested prospect, feuding pair,
  natural mentor. Same teaching function every run, different people every
  run. Objective generator varies deadline (60–84wk), member range,
  signings allowance, and budget, all framed in the executive's voice.
- **v0.3.4 — Executives with teeth.** Personality becomes mechanics:
  patience scales deadline-pressure events and missed-deadline penalty;
  trend-chasers judge reception vs trendFit, traditionalists vs brand fit;
  micromanagers send more directives; profit hunters weight revenue in
  trust deltas. Review and debut lines come from personality-keyed tables.
- **v0.3.5 — The market moves.** A per-seed trend state (which concept
  families are rising/falling) drifts over time. `trendFit` is computed
  against the trend state at release week, not stored on the song — so the
  *same* demo is a different bet in month 3 vs month 12, and comeback
  timing (brief §10) becomes a real decision. Headlines report actual
  world events (rival signings, trend shifts), not flavor.
- **v0.3.6 — Pre-history.** Generate 3–5 years of industry past at new
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

## §19 The living world (v0.4.0)

> Owner: *"I think the next step is the AI. I want to see other companies
> debuting new acts and competing with me. I want to see new companies
> emerge on scene, others fall or split, merge, etc. let's start making
> the world come to life. and I also want to start adding an in world
> social media side. I want to see fans posting about their favorites,
> groups they don't like, their crushes, their biases, all of that fun
> stuff."*

All of it lives in `js/engine/industry.js`; tuning in `KP.C.INDUSTRY`,
`KP.C.CHART` (scene-chart half) and `KP.C.FEED`.

**Rival acts.** Every rival carries `prestige` (0–100), `acts[]` and a
`nextDebutWeek`. A debut consumes 4 trainees from the rival's roster,
generates a named act (same group-name generator as the player's, one
shared uniqueness set) with a concept and a quality anchored to prestige,
and releases a lead single immediately. Acts come back every 16–26 weeks:
reception = quality·0.85 + popularity·0.15 + noise − 6, popularity
compounds or cools exactly like the player's mechanic in spirit, prestige
drifts toward act outcomes. Idle acts cool; an aging act with a cold
fanbase risks the "conclusion of team activities." Rival debuts always
make the wire; comebacks only when hot (≥64) — the chart and the feed
carry the rest.

**The scene chart** (`state.chart`). Every release — the player's and the
rivals' — enters with score = reception + popularity·0.2, decays ×0.88
weekly, and drops below 8. Positions are stamped once per week AFTER all
releases resolve (`KP.chartStamp`), giving the Chart sub-tab honest
▲/▼/NEW movement. Player entries are highlighted.

**One chart, one truth (v0.4.4).** The original v0.4.0 design kept the
old formula-based `chartPeak` as "the wider streaming market" alongside
the scene chart. The owner caught the contradiction immediately — a #1
scene-chart song whose discography read "peaked #41" — and the two-chart
fiction was retired. Now: a release's opening `chartPeak` is its actual
entry rank; `chartStamp` syncs `chartPeak = entry.peakPos` and
`chartWeeks = weeksOn + 1` into the group's release record and stored
report every week the entry lives; when the entry drops off, the record
freezes as history. The legacy formula (104 − reception·0.92 −
pop·0.22 + noise) is gone from resolution. Migration 0.4.4 reconciles
old archives — live entries sync exactly, dead records map onto the
scene-chart scale by reception — narrated by the data team. Lesson for
the file: never ship two sources of truth for one number the player can
see in two places.

**Crowding.** `industryWeek` runs before the player's release resolution
and counts rival releases that week; `resolveDebut` subtracts
min(6, 2.5 × count) from reception and says so in the public notes when
it bites (≥5). Rival cadence makes this a real scheduling consideration
(~29/40 soak orgs hit at least one crowded release).

**Company lifecycle** (monthly, floor 2 / ceiling 6 companies):
- **Emerge** — fresh money founds a label (generated name via
  `genCompanyName`, low prestige, hungry blurb).
- **Fall** — a company below prestige 26 with no active act folds.
- **Merge** — with 4+ rivals, the two weakest combine under a new name,
  keeping both rosters and all acts.
- **Split** — a powerhouse (prestige ≥72, roster ≥14) sheds a faction
  that becomes a new competitor with its philosophy and six trainees.
New companies scout the same prospect board through the same fog.
`state.lifecycleEvents` counts these for the observatory.

**The fan feed** (`state.feed`, Industry → Feed). Curated, not a
firehose: at most 4 posts/week, 44 kept, newest first, written once and
never re-rolled (Law 2 applies to the feed). Posts come from what
actually happened, in priority order: player release reactions (band-
aware praise or snark, breakout bias posts, overshadow discourse,
crowded-week complaints), industry events (debuts, hits, disbandments,
collapses, mergers, splits), then ambient chatter (hyped trainees, chart
battles, bias-of-the-week posts, opinions on rival acts). Handles are
generated (`genFanHandle`) — invented accounts only, never real people.

**Content law (hard, from brief §11/§13, tested as a negative law in
suite 020):** snark aims at songs, styling and company decisions — NEVER
at bodies or appearance; no harassment; crushes stay wholesome ("hope
she's getting enough rest"). The fans are funny, not cruel.

**Whitecliff activates:** the opening scene now seeds all three authored
rivals (RIVALS.count 3), each arriving with prestige, 1–2 running acts
with history, chart residue and a debut calendar — the scene chart and
feed open mid-conversation. Migration 0.4.0 runs the same seeding on
existing saves and announces itself as the industry desk expanding.

**Rivals with faces (v0.4.3, owner: aggressive signing, real lineups,
all viewable).** Rival acts carry `members[]` of real people in
`state.people` (status `rival`, `company` set). When a rival debuts, it
casts its board signings FIRST (best peak-talent forward — the people it
took from under you actually debut for it, and the wire names them),
topped up with generated in-house trainees (`flags.rivalNative`,
debut-aged 16–19; seeded/backfilled acts 17–24). Act quality is now
member-derived: 0.55 × lineup score (best trained skill / charisma /
visuals) + 0.35 × prestige — signing talent genuinely builds better
rival groups, which is why they want it. Aggression: interest shifts
0.18→0.26 weekly, sign chances 0.05/0.16→0.09/0.25, a `hungerMult` 1.7
inside 16 weeks of a planned debut ("they are casting"), and target
picking adds a raw-peak-talent term with sharper top-weighting.
Mergers move every signed person's company label with the deal. All of
it viewable: act rows on the Scene tab open an act page — members with
portraits/ages, "was on your board" flags with a Scout Im sting, and
the act's discography. The age law (§ GEN) governs the scouting
pipeline only; rival idols run 16–26 by design and the census scopes
accordingly. Migration 0.4.3 backfills faces onto existing acts via the
same seeding path.

## §20 The fatigue economy (v0.4.2)

> Owner: *"the idols in groups are perpetually running on fumes. is that
> by design?"* It was not — it was a leak. The v0.2.0 design said
> "promotion runs hot, then the schedule breathes," and a migration
> letter even promised rest days, but nothing in the rules ever CREATED
> idle weeks: the studio hands out fresh demos on release day, so a
> prompt player ran prep→release→lock forever. Probe measurement: 100%
> of post-debut weeks pinned at fatigue 100. Owner chose the remedy:
> *"I like both"* — contractual rest AND exhaustion with teeth.

**The rail — the calendar closes.** After a release: `promoWeeks` (4) of
promotion, then `restWeeks` (3) of contractual rest. `planDebut` refuses
a new lock until the calendar reopens, with promo-phase and rest-phase
reasons; the Studio shows a closed-calendar hero ("Let them sleep.")
instead of the planning board. During the rest window recovery runs at
`restRecovery` (15/wk, vs 8 idle) and morale climbs. The harness
auto-player waits out the window AND waits for avg fatigue < 45 —
modeling a player who reads the warnings.

**The teeth — pushing is legal, and a gamble.**
- Rehearsal load is `DEBUT.prepFatigue` 6/wk (was a hardcoded 9); promo
  focus loads dropped 9/6/5 → 7/5/4. Above `promoSoftCap` 70 the
  managers rotate her stages: promo load halves. The risk does not.
- Locking over a roster averaging ≥ `lockWarnAt` 65 succeeds and returns
  a staff warning the UI shows as a modal ("this one will cost them").
- Any member at fatigue ≥ 88 during rehearsal or promotion risks an
  **overwork incident** (4.5%/member/wk): medical staff bench her for
  2–4 weeks (urgent inbox letter, morale −8, her file remembers). While
  benched she does nothing but recover (12/wk) — no rehearsal gains, no
  promo work.
- A member still benched on release day costs the stage `perfPenalty` 4
  each, and the public counts heads in the report. A gassed-but-standing
  roster (avg ≥ 75) gets its own public note: the cameras noticed.

**Measured shape** (max legal pace, no voluntary breathers): sawtooth
between ~30 and ~90 with real recovery valleys every cycle, peaks
creeping upward across back-to-back sprints — sprint debt is real, and
the breather that clears it is the player's decision, prompted by the
staff, never forced beyond the 3-week floor. Census: idol weeks average
off the fumes in 40/40 worlds (rolling half-year); medical benchings
occur in most max-pace runs by design.

**v0.6.9 amendment — the crunch.** Owner: *"I'm still running into
the issue of everyone in a group running on fumes during promotion
after I let them rest to fresh before planning a new release."* The
audit confirmed it: flat 6/week rehearsal for the WHOLE runway meant
a fresh room hit release day at ~47 and peaked at ~79 mid-promo —
resting first was being punished. Three changes, all fiction-true:
(1) rehearsal load tapers — full only in the final `crunchWeeks` (3);
before that it is recording, fittings and teasers at ×0.35 — so a
long runway stops being a fatigue trap; (2) a one-booking rollout
week half-breathes (pacing is a real tool, not just an empty slot);
(3) the staff DEFAULT plan ends gentle — the last promo week is
thank-yous and a livestream. Measured after: staff default peaks
61–70 (a full campaign SHOULD end tired), a player-paced rollout
peaks 59 and recovers into the final week. Fumes are now a choice —
max runway, max bookings, no light weeks — not destiny.

## §21 The national chart (v0.5.0)

> Owner, after v0.4.4 unified the scene chart: *"I actually like your
> instinct on a wider streaming chart as the more prestigious chart to
> chase. finding a way to implement it would be important though since
> we aren't simulating the wider world."* The answer: simulate it at
> low resolution. The wider world doesn't need agencies — it needs
> artists who release, chart, and fade.

**The mainstream pool** (`state.national.artists`, 29): 6 titans, 11
established, 12 risers — generated boy groups, girl groups, soloists and
bands (`genArtistName`), each with fame, a release cadence, and slow
fame drift. Titans release a little slower and land much harder;
`megaChance` 0.55 of a titan release being a cultural moment (×1.3).
Monthly churn: an artist under fame 32 may bow out for a fresh riser
(wire note + feed elegy) — the pool never changes size.

**The board** (`state.national.entries`): same machinery as the scene
chart, harder field. National songs have longevity (decay 0.93 vs the
scene's 0.88; titan hits 0.965 — the summit is DEFENDED), higher floor
(14), bigger cap (48). Pool releases, scene-rival releases and player
releases all enter with the scores they carry; ranks are stamped weekly
by the same `chartStamp`. Since same-rate entries never swap order, a
release's national peak is essentially its opening rank — you chart as
high as the week you drop, then defend, which is how release timing
stays a decision.

**One truth per board:** `chartPeak` = scene, `nationalPeak` = national,
both synced live from their entries and frozen on drop-off (v0.4.4
law). Hard invariant, guarded in soak and suite: `nationalPeak >=
chartPeak` — a superset field can never rank you better.

**Milestones** (top 20 / 10 / 3 / #1): crossed tiers are recorded on the
entry; only the deepest new tier speaks each week. First national top
10 and first #1 per group are executive letters with trust and
reputation attached — the national board is the one the CEO's directors
read at breakfast. The fans have tiered reactions in the feed; a debut
that OPENS in the national top ten gets its own public note.

**Balance, measured (40-seed max-pace soak):** national alive 40/40,
top-20 touched 40/40, top-10 40/40, **#1 in 15/40** — the summit stays
rare even for the tireless auto-player, which means it will be a
genuine career event at human pace. Tuning history in the ledger: the
first cut let 39/40 top the chart; titans got stronger, longer-lived,
more frequent, and one extra seat before the summit held.

**UI:** Industry → Charts is a two-board room (Scene | National seg).
Discographies read "peaked #x · national #y"; studio and results carry
both chips, labeled — never one number in two places.

**Roadmap hook:** national milestones are the natural spine for future
executive objectives, media/tour content and the leader-role accretion
(§16 standing note) — "get me a national top ten by year's end" is a
better directive than any reception target. Not built yet; noted.

## §22 The company-simulator mandate (v0.6.x line)

> Owner, opening the line: *"This should be the update where the game
> stops being primarily a roster-builder and becomes an actual K-pop
> company simulator… the outside world needs enough machinery to react
> to what you've built."* Full directive on file; the constraints that
> govern every phase below, in the owner's words:
> - *"The thing I'd avoid is turning promotion into twenty sliders
>   where optimal play becomes obvious. Give me constrained choices and
>   opportunity costs."* No slider-optimization. Slot-limited weeks.
>   You cannot send a group to six music shows, three variety programs,
>   seventeen fan signs, Tokyo, Los Angeles and Mars simultaneously.
> - *"There's one system I'd put above almost everything else: memory.
>   The simulated public needs to remember things."* Memory is
>   infrastructure, built FIRST (v0.6.0, §23); every later system reads
>   it or writes it.
> - Social media should be fun to read, not a task list: *"don't make
>   every post actionable. Half the fun is doomscrolling your fictional
>   fandom and yelling at people."*

### Phases (each a small versioned release; owner feel-reports may
### reorder or split — this list is a map, not a contract)

- **v0.6.0 — Memory (SHIPPED, §23).** Narratives: form, reinforce,
  decay, influence. The keystone.
- **v0.6.1 — Individual popularity & bias data.** Per-idol recognition
  / core fandom / casual interest, moved by the events that already
  exist (breakouts, fancams, hype, benchings). Jane's viral moment
  spikes JANE. The least musically important member becoming the
  public's favorite is a feature, not a bug. Writes to memory.
- **v0.6.2 — Promotion strategy (the centerpiece) → SHIPPED as
  v0.6.3 (§25) after the owner reorder.** The rollout builder:
  music shows, variety, radio, dance challenges, fan signs,
  livestreams, rest — as SLOTTED activity picks per week with money
  and idol-energy costs riding the v0.4.2 fatigue economy. Overwork
  discourse ("she looks exhausted") flows through the feed and
  sentiment, feeding memory.
- **v0.6.3 → SHIPPED EARLY as v0.6.2 (owner reorder: "keep leaning
  into social media") — Interactive social media.** See §24. The
  promotion builder moved to the next slot and shipped as v0.6.3.
- **v0.6.4 — Competitive release calendar (SHIPPED, §26).** Announced
  comebacks visible in advance; challenge or dodge; rivals ambush
  committed dates; head-to-head weeks are scored, remembered, and
  feuded over ("Novaline, you absolute motherfuckers" is the target
  emotional response, verbatim).
- **v0.6.5 — Music-show ecosystem (SHIPPED, §27).** Named shows, stage
  picks, encores, ending fairies, wins. The Gaya-encore-goes-viral
  moment: emergent, memory-fed, feed-amplified — and it lives on the
  WINNING encore now.
- **v0.6.6 — Regional popularity (SHIPPED, §28).** KR / JP /
  greater-China / SEA / NA / LATAM / EU; concepts and members resonate
  differently by region. Prerequisite for tours — the desk keeps
  saying the word uninvited.
- **v0.6.7 — Tour planning → SHIPPED as v0.6.8 (§30).** Venue scales,
  legs, pacing, production budget, setlists. Undersell/oversell both
  visible and narrated. Tours grow regional fandom and prestige, not
  just cash. Leader role gets tour-leg work (§16 standing note paid off).
- **v0.6.8 — Fandom identity (SHIPPED in v0.7.0, §31).** Fandom name, colors/lightstick, size
  vs intensity, fanclub membership, spending power. Casual-huge vs
  small-and-devout behave differently in everything above.
- **v0.6.9 — Brand deals & ambassadorships (SHIPPED in v0.7.0, §31).** Group and individual;
  visuals become an economy; individual recognition feeds back into
  the group. "Justice for the visual role."
- **v0.6.10 — Festival & award circuit (award season SHIPPED in v0.7.0, §31; festivals folded into a later pass).** Invitations from reputation
  and relationships; schedule interruptions; award season as campaign
  — nominations, wins, snubs, fandom warfare. Reads memory hard.
- **v0.6.11 — Variety/personality careers.** Variety monsters, actors,
  MCs, OST singers, producers; secondary strengths become careers;
  writes heavily to individual popularity + memory.
- **v0.6.12 — Creative teams.** Producers, songwriters, choreographers,
  stylists, MV directors with reputations and artist chemistry; losing
  yours to Aurum should hurt.
- **v0.6.13 — Member participation.** Songwriting/producing/choreo/
  styling credits shift public perception from performer to artist.
- **v0.6.14 — Hiatus as strategy.** Deliberate disappearance: cooling
  risk vs full restoration and anticipation. The v0.6.0 dormancy
  narrative + return bonus is the seed; this phase makes it a chosen
  tool with bigger stakes.
- **v0.6.15 — Contracts & leverage.** Individual fame gets a seat at
  the negotiating table. Keeping stars happy becomes a system. Late on
  purpose — it needs everything above to matter.

Company reputation by category and media narratives are NOT separate
phases: they live inside memory (§23) and deepen with every phase.

## §23 Memory (v0.6.0) — the world remembers

> Owner: *"If Jane has three viral fancams, the fourth should reinforce
> an existing Jane fancam reputation rather than being treated like a
> random event… the world develops opinions about your company, your
> groups, and individual idols — and remembers why it has them."*

**The narrative** (`state.memory`, module `js/engine/memory.js`) is a
structured opinion: `{ key, subjectType (company/group/idol),
subjectId, strength, evidence, firstWeek, lastWeek, meta }`. It FORMS
when a pattern crosses a threshold, STRENGTHENS (+16) on each new piece
of evidence, DECAYS (−0.35/wk) without any, is pruned below 8, capped
at 24 living opinions per world. Everything deterministic — memory
never rolls dice. Words are rendered live (`KP.narrativeText`) so stage
names stay current; the structure is the memory, the phrasing is not.

**Current narrative keys:** company identity from sustained reputation
(vocalHouse / performanceHouse / starMaker / hitFactory, monthly check
≥68 rep — note HCG's founding rep forms vocalHouse in week 1, because
six years of history walked in with you); monsterRookies (≥75
reception); underperformed (comeback ≥12 under the last); dormant (40
silent weeks, nagged every 8); fancamStar (2nd viral moment — the
first is luck); itGirl (3rd breakout).

**Influence — memory changes how events are read (all deterministic):**
long-awaited return +4 reception and the dormancy narrative resolves;
vocal-pedigree debuts read ±(+2/−3) against expectation; a second
debut under the pedigree draws a comparison to the previous main vocal
BY NAME in the public notes (the owner's Ha-eun/Hyunseo/Gaya example,
mechanized). The trades' monthly headline pulls from live narratives
half the time; the fan feed reacts to formations and resurfaces living
narratives ambiently ("the Jane fancam industrial complex remains
undefeated").

**Where it shows:** Industry → Scene "The conversation" (all living
narratives), group page "The narrative", dossier "The public knows
her" — each line stamped with when it formed. One evidence door
(`KP.recordEvidence` + `recordViral`/`recordBreakout` thresholds) so
every future system writes memory the same way.

**Migration:** the clippings file opens ALREADY FULL — standing
reputation, recorded sensations and remembered breakout counts become
the narratives the world would have formed by now, narrated as the desk
opening its file.

**The whole world (v0.6.1).** Memory covers everyone now. Rival
companies carry identities (philosophy narratives — trendCopier /
performanceFactory / patientHouse — seeded silently at world start,
reinforced monthly, EARNED in public by companies that emerge later)
and event-driven stories: **poachers** (3 board steals — the scouts
give it the name), **risingPower** (prestige crossing 75),
**fadingHouse** (a disband under prestige 35). Rival acts carry
**rivalMonsterRookies** (75+ debut), **hitStreak** (3 consecutive
64+) and **flopEra** (2 consecutive <40) via per-act streak counters.
All of it shows on their Scene cards ("what the world says about
THEM"), on act pages ("The story"), in the wire, and in the feed; the
player-card "conversation" filters to player subjects so rival stories
never crowd it. Hungry rivals show a "casting a new group" chip —
what other companies are doing is now legible at a glance.

**Social presence (v0.6.1, module social.js).** Every person carries a
PUBLIC follower count — in-fiction numbers the whole world can see
(the no-Overall law bans hidden talent scales, not these). Design
rule: entirely hash-driven — initialization, weekly jitter and event
spikes key off (seed, person, week) and consume ZERO rng draws, so
the system added no seed drift anywhere. Lazy init mints a plausible
following from who she already is (status, hype, group popularity,
breakout/viral history) — one code path covers new games, fresh
leads, generated rival members and old saves. Weekly growth follows
what is actually happening: promoting idols surge, idle idols coast,
trainees grow only as fast as the internet cares, dormant acts stall,
fancamStar/itGirl narratives compound ×1.5. Spikes: virals, breakouts
(+reception-scaled), debuts, rival releases. Milestones (100k, 500k,
1M, 5M) fire once each for roster people, with letters. Visible on
roster rows, dossiers (with weekly delta), and rival act member
cells. Jane's viral fancam spikes JANE — the least musically
important member becoming the public's favorite is now measurable,
which is the on-ramp to v0.6.2's promotion decisions and the eventual
brand-deal economy.

## §24 The discourse (v0.6.2) — interactive social media

> Owner: *"Let posts react to real events… Give the player limited
> company responses: ignore, statement, clarification, apology, legal
> threat, lean into meme, member livestream. Importantly, don't make
> every post actionable. Half the fun is doomscrolling your fictional
> fandom and yelling at people."*

**The storm** (`state.discourses`, module `js/engine/discourse.js`): a
trending topic with a kind, a subject and a heat level. Ignites from
REAL events only: overwork worry ("she looks exhausted" — promoting at
avg fatigue 75+), dating rumors (tabloids target 50k+ followers; always
false in this world, per the content law), styling discourse (weak
receptions), shaky encore clips (performance < 45, targets the least
live-reliable member), health worry (medical benchings), and positive
fancam waves (sparks and virals — an OPPORTUNITY with a window). Max 2
live at once — the internet can only care about so much.

**The burn:** heat feeds itself when hot, dies when cool (the desk's
advice "most storms die on their own" is tuned to be TRUE — first cut
had negative storms only climbing, and the soak flooded with
boil-overs until the physics matched the fiction). A storm fading
under 15 costs nothing — correct ignores are rewarded. A negative
storm crossing 85 BOILS OVER: popularity and morale pay, the desk
writes the epitaph ("sometimes silence is a statement too — this time
it read as one").

**The response desk (Feed tab, trending cards):** constrained menu per
kind — statement, apology, legal threat, lean-into-meme, member
livestream — plus the ever-present option of saying nothing. ONE
response per storm ("the company has spoken once; speaking twice IS
the story"). Statements ride professionalism, livestreams ride warmth
(and cost the member real fatigue), memes ride an existing fancamStar
narrative, hotter storms are harder to steer, legal threats can
Streisand (+30 heat, "they're threatening fans now"). Misses feed the
story a news cycle but bleed heat long-term; successes resolve it —
ridden positive waves convert to followers and popularity. Every
response instantly becomes a feed post judging it.

**The feed itself:** posts now wear personas — fan / company stan /
casual / anti / press — with antis bound by the same content law as
everyone (songs, styling, companies; never bodies). Live storms post
themselves into the feed weekly, persona-true and sentiment-colored.
Volume up (6/week, 64 kept): a feed worth doomscrolling, where MOST of
it remains deliberately non-actionable.

**Harness:** the auto-player runs the same desk (statement at heat
50+, ride positive waves) — storms trend in 40/40 soak worlds, get
steered successfully in 40/40, and boil only when ignored, which the
diligent bot never does; the boil path is suite-proven instead.

## §25 The rollout desk (v0.6.3) — promotion is a plan, not a dial

> Owner, in the mandate: *"The thing I'd avoid is turning promotion
> into twenty sliders where optimal play becomes obvious. Give me
> constrained choices and opportunity costs… I shouldn't be able to
> send NUNITE to six music shows, three variety programs, seventeen
> fan signs, Tokyo, Los Angeles and fucking Mars in the same week."*

**The plan** (`g.prep.rollout` → `g.rollout`, `KP.C.ROLLOUT`): every
release locks with a 4-week promotion plan, at most **2 bookings a
week**, chosen from seven activities — music show, variety, radio, fan
sign, dance challenge, livestream, rest. Each has a cost (billed at
lock, on top of record + marketing), a fatigue price, and a distinct
payoff: shows build live reps, popularity and the stage; variety
builds media reps and faces; radio is cheap breadth; fan signs buy
morale AND afterglow (`gracePerWeek` → `g.promoGrace` stretches the
post-promo popularity decay grace); the challenge is cheap follower
reach; livestreams are free warmth; rest is rest — an under-booked
week breathes (`emptyWeekRecovery`). Omitting the plan gets the staff
suggestion (`ROLLOUT.DEFAULT`: hard reps early, faces later).
Validation rails refuse >2 slots, <4 weeks, unknown activities
("nobody can book Mars"), and bills the plan before the lock succeeds.

**The week** (`KP.rolloutWeek`, replacing the old single-focus promo in
`idolWeek`): each promo week applies that week's bookings to every
member — exp, fatigue (softcapped), morale, group popularity, follower
spikes — and rolls the SPECIALS that make stories: a scheduled music
show can produce **the encore moment** (5%/week — the best vocalist at
60+ vocals "casually murders the vocal": viral evidence, follower
spike, fancam-wave storm, feed post; the §22 Gaya clip, live), a
running challenge can **break containment** (10%/week, keyed to
centerPull), fan signs surface warm clips. Overwork stays a gamble:
promoting past the fatigue line can bench somebody mid-rollout and
ignite the benched storm.

**The feed floor** (same release — owner: *"I'm still often only
seeing 1 or 2 new posts each week"*): `FEED.weeklyMin` (4) is now a
guarantee, not a hope. After event posts, the ambient pool fills the
week to at least the floor — and two ambient categories (narrative
resurfacing, rival-act opinions) were un-gated so a fresh world's pool
can never run dry. Suite-proven: EVERY week ≥ 4 posts across 40 weeks,
cap 6 still holds.

**A determinism law, learned the hard way:** the social mint reads
mutable facts (group popularity, hype), so WHEN it first runs is part
of the number — the old lazy-on-first-look init meant merely *viewing*
a profile could fork a save from its unviewed twin. Every door people
enter the world through now mints on the spot (`KP.mintSocialAll` at
newGame, fresh leads, rival cast, and in the 0.6.1/0.6.3 migrations);
the lazy branch in `socialOf` remains only as a safety net. Corollary
kept from v0.6.1: rng draws must never be gated behind hash-derived
values.

**Migration:** old `promoFocus`/`prep.focus` converts to a plan in the
same spirit (musicShows → show+radio weeks, variety → variety+radio,
fanCare → fanSign+livestream with grace 8) and the desk announces the
job. **Harness:** the bot books the staff default when flush and a
thrifty radio-and-livestream plan when tight — a player trims the plan
before skipping the release, so the bot does too.

## §26 The release war (v0.6.4) — the calendar is a battlefield

> Owner, closing the loop on the mandate: *"so far, I don't have any
> reason to hate my rivals."* Target emotion, verbatim from §22:
> *"Novaline, you absolute motherfuckers."*

**The public calendar** (`KP.releaseCalendar`, module
`js/engine/calendar.js`): rival comebacks are announced up to 4 weeks
ahead (`act.announcedWeek` — one source of truth, ON the act; big acts
draw a desk letter, small ones just hit the calendar). The player's
locked date goes public the week after lock — teasers exist, the
industry reads them. Announced weeks show on the Desk strip and on the
Studio date picker (`vs SIREN` on the chips), so the choice at pick
time is real: dodge the traffic for clean air, or book a shared week
on purpose and make it a statement.

**The ambush** (`KP.calendarWeek`): while a release worth sniping is
locked (popularity or walk-in hype ≥ 22) with ≥2 weeks of runway, a
rival with an act due within ±3 weeks of the date may MOVE it onto the
date — the most prestigious motivated house does it, because they can
afford the pettiness. Weekly chance 0.12, per-company cooldown 14 —
tuned to ~2.7 ambushes per 140-week career (memorable, not constant;
the first cut at 0.25 hit 40/40 careers and read as background noise).
The letter says what everyone is thinking: "Scheduling coincidences do
not exist in this industry." Two ambushes by the same company form the
**dateSniper** narrative — the staff start calling them what they are.

**The decision** (`KP.respondClash`, war-room card on the Studio):
HOLD — the date stands, morale ticks up, head-to-head it is — or SLIP
2 weeks (bill 8, morale down: "the members did not say anything, which
said plenty"; the anti posts call it scared behavior; refused when it
would cross the executive deadline). One decision, once. Ignoring the
card is a hold — silence is a choice too.

**The battle** (`KP.releaseWar`, resolved inside `resolveDebut`): ANY
same-week landing by an act of stature (pre-release popularity ≥ 20 —
who they WERE, so a titan flopping on your date still counts) is a
scored head-to-head, ambush or coincidence alike. Higher chart score
takes the week: winner +3 popularity +2 morale, loser −2/−2 and the
rival act pays −3 when we win; their floor manager tells the trades
"We were not aware anyone else released this week." (They were aware.)
Every meeting lands on the group's **feud ledger** (`g.feuds[actId]`:
wins/losses, rendered on the group page and the rival act page) and at
2 meetings the **rivalry** narrative forms — its text reads the ledger
LIVE ("1–1 on shared weeks, and both fandoms keep receipts").

**The copycat:** a player hit at reception ≥ 72 gets clocked by
trend-chaser rivals (50%); their NEXT debut wears the stolen concept,
the reveal letter names the lane ("The stylists know what they saw"),
the trendCopier narrative reinforces, and the fans pile on. The steal
is silent when it happens — the reveal IS the debut.

**Feed:** every beat posts persona-true — announcements, ambush
pettiness ("petty? deeply. am I seated? front row"), slips, holds,
victory gloats, defeat stingers, copycat receipts, plus rivalry and
dateSniper narrative arrivals.

**Harness:** the bot fights when the room can win (popularity within
10) and dodges when it cannot and the books allow; war census — the
calendar lives in 40/40 worlds, battles fought 40/40, shared weeks won
40/40, rivalries canon in ~17/40, ambush average printed per career.

## §27 The music-show ecosystem (v0.6.5) — three stages, one trophy a week

> §22 phase spec: *"Named shows, stage picks, special stages, encores,
> ending fairies, wins. The Gaya-encore-goes-viral moment: emergent,
> memory-fed, feed-amplified."*

**The stages** (`KP.C.SHOWS` + three first-class rollout activities,
module `js/engine/shows.js`): "a music show" was never one thing. **The
Countdown** is the Sunday institution (fandom-weighted, floor 46 — you
do not win it by showing up), **Prime Stage** is the performers' show
(live-command-weighted), **Pop Wave** is the cable upstart
(freshness-weighted, floor 32 — the underdog door). Booking them is
the same rollout chip flow with different bills and payoffs; the
generic `musicShow` activity is gone (old saves rotate through the
three in migration).

**The win** (`KP.showsWeek`): every week each show computes a winner
among everyone actually promoting — player groups whose plan books the
stage, rival acts within 4 weeks of a release, and (on the two
broadcast shows) the **national pool the week it drops**: a titan
comeback week is not your week, whoever you are. Scores are fandom /
live / freshness per the show's weights plus a hash-driven wobble —
zero rng, the same week always airs the same way. Below the floor,
nobody wins.

**Winning matters:** trophies on the group page shelf, popularity and
morale, follower spikes — and the FIRST win in company history is an
event (trust +3, the members cry through the encore, the CEO puts the
trophy photo where the board will see it). Six wins on one stage forms
the **showDarling** narrative ("might as well engrave their name on
it") — tuned from 3 after the soak showed 39/40 careers hitting it:
dynasty, not tenure. The **encore moment** moved here from the rollout
desk: it belongs to WINS now — a real vocalist (65+) on the winning
encore goes viral through the standard pipeline, and a fandom-vote win
with a shaky room can ignite the encore storm instead. Every show
appearance also ends on an **ending fairy** — visuals and pull with a
weekly wobble, so it rotates onto the one nobody expected — whose
fifteen-second clip sometimes outperforms the stage.

**Losing matters too:** a rival act taking the trophy with your group
standing on stage for the announcement is a letter ("Second on
points. The cameras found our members' faces immediately") and it
feeds an existing rivalry narrative. Rival wins are only NEWS the
first time or when they beat you — a hot act re-winning weekly is
wallpaper, and wallpaper crowds real letters out of the desk (learned
in review when show-win mail trimmed dormancy and boil-over letters
out of the inbox).

**Harness:** first trophies in 40/40 soak careers, rival stage wins in
40/40 worlds, the darling narrative in ~20/40 — a story half of long
careers earn.

## §28 Regional popularity (v0.6.6) — the map opens

> §22 phase spec: *"KR / JP / greater-China / SEA / NA / LATAM / EU
> per group and idol; concepts and members resonate differently by
> region. Prerequisite for tours."*

**One truth per number:** KR *is* `g.popularity` — the number the
charts, shows and release war already run on. The six overseas regions
(`g.regions`, module `js/engine/regions.js`) are new numbers, and the
whole layer is **rng-free**: releases, virals, promo spread and decay
all run on state and hash — zero seed drift by construction (the
v0.6.1 social lesson, applied from day one).

**How the map moves:** every release exports — gain = reception ×
concept affinity × reach (fame is what travels: reach grows with the
home fanbase) × **saturation** (the tenth hit moves Japan less than
the first — markets asymptote instead of pinning 100, learned when the
first soak ended every career at 99+ everywhere). The affinity table
is craft-resonance data per concept per region (bright lands in Japan
and SEA, hip-hop in the Americas, dreamy in Europe, elegant in Greater
China…) — same world, different concept, the map flips. Member viral
moments cross borders through the ONE existing door (`recordViral`):
each idol has two **personal strongholds** — hash-derived corners of
the map that simply love her, never inferred from anything about who
she is — where her clips land at 6× (saturating). Livestreams spread
thin and everywhere; the dance challenge lands hard in two
hash-picked regions. Idle regions cool at 0.12/week — overseas
fandoms are patient, not eternal.

**Why it matters:** release revenue multiplies by average overseas
warmth (a devoted map adds ~+30%; "the overseas orders moved first");
a region crossing 40 ("loud") is a letter from the overseas desk; a
region past 75 forms the **regionStronghold** narrative — "moves
numbers in Japan like a domestic act", loudest region rendered live —
which arrives in 26/40 soak careers with best-region endings spread
67–83 (texture, not a solved map). Tours (v0.6.7) will read all of
it: `devotedAt` 65 is the tour bar, and the migration letter already
says the word "tour" keeps appearing in meetings uninvited.

**Surfaces:** "The map" on the group page (six chips: quiet /
stirring / loud / devoted), the overseas-desk margin note on idol
dossiers ("her clips travel best in Japan and Latin America — nobody
assigned that"), loud-crossing letters, region-flavored feed posts
(subway ads, fan-sub accounts, 4am streaming parties), and the
stronghold story in the trades.

## §29 Creative direction (v0.6.7) — the brief the producers pitch to

> Owner: *"something I would like to see is choosing a concept for a
> group that has an affect on the songs pitched to them."*

**The brief** (`g.concept`, set on the group page — "Creative
direction" chips, or Open field): a group-level commitment. With a
brief, `generateDemos` writes TO it: two of the four demos in-lane
(tagged "to the brief" on the demo card, with a small hook bonus — a
clear brief makes better records), one adjacent stretch, one wildcard
the producers push regardless. No brief = the field, exactly as
before. Changing the direction re-tools the pitches (demos regenerate
next cycle) and resets the identity streak — identity is earned per
lane. Locked productions cannot change direction mid-flight.

**Identity** (`g.conceptRun`): consecutive in-lane releases count; at
2 the **conceptIdentity** narrative forms — "the sound IS the group,"
lane named live. It compounds with everything that already exists:
in-lane consistency also concentrates the same regional affinities
(§28), so a committed lane builds its overseas market faster — the
systems interlock without extra wiring.

**The pivot:** releasing off a previous concept while the identity
narrative is live cuts the story's strength in half and makes news —
"the fandom is split between growth and give it back" — unless the
pivot lands at 70+ reception, in which case it is a REINVENTION and
the recaps call it an era. The feed argues either way, persona-true.

**Migration:** groups with two-plus trailing same-lane releases walk
in with the brief and the streak they earned; mixed discographies
stay open. **Harness:** the bot commits to the concept its debut
proved (reception ≥ 55), like a player would — which raised the whole
meta's release quality through fit-consistency and forced a world
push-back: titan chart entries linger longer (titanDecay .965→.972,
summit back to 9/40), megahits hit harder (1.38→1.45), and the show
dynasty bar rose (darlingAt 6→7). The lesson on file: a strategy
feature is a difficulty change, and the environment must answer it.

## §30 The road (v0.6.8) — tours, and the posting incident

> §22 phase spec: *"Cities, venue sizes, pricing, dates, rest days,
> production budget, setlists. Undersell/oversell both visible and
> narrated. Tours grow regional fandom and prestige, not just cash."*
> Shipped with the owner's rider: keep expanding immersion, player
> decisions, and social media.

**The touring desk** (module `js/engine/tour.js`, on the Studio when
the calendar is open): four constrained choices, every one with teeth.
A **scale** you believe you can fill (club halls / theaters / arenas —
each with a cost per leg, a fatigue price, and a sweet-spot demand); up
to four two-week **legs** across home (demand = the domestic fanbase)
and any overseas region warm enough (the §28 map is the routing sheet —
a cold region cannot book an arena; the promoter refuses). A **pacing**
(punishing is cheaper and costs the humans ×1.3; humane costs money) and
a **setlist** with a point (the hits sell ×1.08; new material seeds the
next release's reception; fan service buys morale and deepens the
regions ×1.2). Eligibility rails mirror the release calendar: no
touring mid-prep/promo/rest, a 20-week cooldown, and a fanbase floor.

**Every leg reports honestly** when it closes: demand vs sweet spot
decides the letter. ≥1.35 = **SOLD OUT in minutes** ("we under-booked.
Wonderful problem") — bonus revenue, morale, reputation, +4 region.
<0.75 = **soft** — "the upper sections were curtained off and everyone
pretended not to notice," revenue gutted, morale hit. Between = the
road as it should feel. Touring GROWS the region (+8/leg, saturating
per §28 physics) — the map is the point, the money is the byproduct.
A member whose personal stronghold hosts a leg gets her moment (the
crowd sings her lines; viral pipeline fires). The **leader role pays
off on the road**: leadership ≥60 trims everyone's fatigue; a room
nobody runs breeds unmanaged frictions, per leg, narrated. Post-tour
rest is contractual (3 weeks), and the studio is closed while they
tour — one calendar, real opportunity costs.

**The posting incident** (new discourse kind, the social-media
expansion): idols with real followings sometimes post something that
"reads very differently in daylight" — and the chance more than
doubles past fatigue 70, because tired people post carelessly. The
storm has a systemic cause the player can actually manage upstream.
Response menu: delete-and-apologize / add context / lean into the
joke — through the whole existing v0.6.2 machinery (burn, boils,
feed judgment).

**Harness:** the bot tours when the calendar and the map allow, books
legs a competent player would (at least solid, never the promoter's
bare minimum — the first policy booked marginal legs and 34/40
careers played to curtains), humane pacing, the hits. Census: tours
in 40/40 careers, sellouts 40/40, soft legs 0/40 for the diligent bot
(the risk is player-facing, suite-proven), posting incidents trend in
~33/40 worlds.

## §31 The fandom era (v0.7.0) — a name, an invoice, and a trophy

> Three §22 phases shipped together because they interlock, plus the
> owner's rider: *"let's have other groups give their members stage
> names. just feels right."*

**Fandom identity** (`g.fandom`, module `js/engine/fandom.js`): at
popularity 35 the fan cafés hold a naming vote — a decision card on
the group page offers three generated proposals or "let them decide"
(a hash vote the fans will bring up forever). The fandom gets a name,
a color, and INTENSITY: size is g.popularity (the number that already
existed — one truth), devotion is new. It grows from fan-facing care
(fan signs, livestreams, fan-service tour legs, sold-out rooms,
shared trophies) and cools 0.2/week without it. Teeth: an organized
fandom votes on music shows (+intensity×0.1 to show scores), buys
records (revenue ×(1+intensity/400)), and floods bad tags with
fancams (storms on the group cool +2/week past intensity 60).

**Brand deals** (`state.deals`, module `js/engine/deals.js`): offers
find the faces the market wants — visuals ×0.5, reach, the it-girl
narrative — and land on the Desk with an expiry ("brands do not
wait"). Signing pays a lump plus a weekly trickle, builds mediaExp
and following, costs shoot fatigue monthly; two campaigns form the
**brandDarling** narrative ("the visual role sends invoices now").
The conduct clause is real: a boiled storm on an ambassador cancels
the deal with a 50% clawback and a cold letter.

**Award season** (`state.awardHistory`, module `js/engine/awards.js`,
rng-free): nominations at week 44 read the YEAR THAT HAPPENED —
Rookie (this year's debuts, player and rival), Song (this year's
releases + national peaks), Artist (popularity + trophies + fandom
intensity) — with a hash "jury wobble." The ceremony at week 47 pays
winners (trust +3, popularity +3, honors chips on the group page, a
speech that thanks the fans first) and RADICALIZES the snubbed:
losing a shortlist you were on gives the fandom +6 intensity —
"nothing organizes a fanbase like an injustice."

**Rival stage names:** about half of every generated rival lineup now
debuts under a stage name (deterministic per person, from the same
curated pool the player draws from — uniqueness enforced worldwide,
which promptly broke a five-version-old suite fixture that wanted
"Lume"). Old saves get theirs in migration: they always had them; the
files just show them now.

**Economy ruling, on the record:** with tours, deals and fandom
revenue, a competently-run mature company stays solvent — the
fiscal-pressure census went extinct under the diligent bot and the
band floor was set to 0 on the same principle as un-boiled storms and
un-soft tour legs: risk mechanics may read zero under a competent
bot; they exist for human misplay, and the suites prove they bite.

## §32 The inner life (v0.7.1) — depth, not width

> Owner: *"interactive social media is still bare bones. individual
> idols still feel like sets of attributes more than people with
> lives. the CEO and executive above the player are pretty abstract…
> maybe bring in an expert on the industry to help make it deeper,
> rather than wider?"* An industry-expert consult was run against the
> Bible and the engine; its diagnosis: the feed was a broadcast with
> no people in it, the idols never spoke and wanted nothing, and
> reading your own roster was never tested. Six of its twelve
> proposals shipped as one release (modules life.js, meeting.js);
> board season and the executive pet project are the natural sequel.

**Off the clock** (`KP.factsOf`, hash-truth, zero save bytes): two
personal facts per person — the dog, the crane games, the film
cameras, the four siblings — stable forever, rendered on the dossier
("— the staff, fondly") and read by the Bubble. **What she wants**
(`KP.ambitionOf`): one ambition each (a solo / a trophy / a sold-out
room / the variety table), seeded by archetype and personality;
weeks that feed the dream feel different (+morale on variety weeks
for the variety dreamer), and the day it lands — through the single
`ambitionTouch` door wired into show wins, sold-out legs, variety
accumulation and solo debuts — pays +8 morale, a history line, and a
letter ("she called home first, then cried in the practice room, in
that order"). Morale becomes psychology, not weather.

**The Bubble** (`KP.bubblePosts`, hash-gated weekly): idols' paid-
message screenshots reach the feed, and the tone reads her TRUE
state — fatigue ≥70 leaks tired-honest 3am messages, high morale
leaks lunch photos and laughter, rest weeks leak day-off diaries
built from her facts. The feed shows interiority instead of asserting
it — and a player who reads the bubbles knows the roster. **The
regulars** (`KP.C.LIFE.REGULARS`): six persistent handles
(@fromthebarricade, @chartseyes_kr, @formerstan_txt…) voice ~35% of
fan posts, persona-consistent — the fandom has PEOPLE in it now.

**The dorm** (`g.rooms`): room charts assigned at debut; roommates
amplify relationship drift ×1.5 in BOTH directions; the reshuffle
lever (bill, cooldown, greedy re-pair by warmth) is the sit-down's
domestic twin, on the group page.

**The Monday meeting** (`state.execQuestion` / `state.execNotes`,
rng-free): every ten weeks the executive asks one question with
constrained answers — "Which trainee is closest to ready?" (your
named pick is checked when she debuts: deliver and the exec remembers
warmly; release her or miss the window and she quotes your own words
back with the date) or "When does GroupX come back?" (this quarter /
next / no promises — promises are checked against the actual
calendar). Ignoring the question for a month is also an answer, and
it is noted. The sim's core skill — reading people through the fog —
finally has a witness.

**Suite catch on the way in:** the comeback-promise predicate
originally accepted a release made the same week the promise was —
`>=` vs `>` on one comparison; the suite's broken-promise fixture
caught the free pass.

## §33 The foundation (v0.7.2) — architecture for the Living Industry era

> Owner: *"audit the architecture for the next several years of
> simulation complexity. Do not change frameworks unless necessary.
> Identify where state, simulation systems, UI rendering, persistence,
> and event generation are too tightly coupled, then build the
> architectural foundation required."*

Full audit and the extension recipe live in **docs/ARCHITECTURE.md**;
this section is the summary of record. The framework stays framework-
free — nothing ahead requires more than discipline, made structural.
Five findings, every one backed by a shipped-and-fixed bug from this
project's own ledger; four fixed by the new kernel (js/engine/
kernel.js), one (persistence) found sound and left alone:

1. **The weekly tick** — 26 hand-numbered sections → an explicit
   named pipeline (CORE_PHASES); new systems insert phases via
   `KP.registerWeekly` and never edit the driver again.
2. **Notes** — two lifecycles, boolean urgency, arrival-order trim →
   ONE bus: `KP.note` (validated; malformed notes throw at the
   source) and a priority-aware trim (critical/high never trimmed,
   flavor first). The v0.6.5/v0.7.1 silent-trim bugs and the v0.6.8
   null-note crash are structurally impossible now.
3. **Feed reactions** — a 34-branch magic-string chain → the
   `KP.onFeedEvent` registry, consulted first, duplicate-safe; the
   old chain is frozen legacy.
4. **Render purity** — the studio view was drawing rng during render
   (the v0.6.3 social-mint bug class, back through another door):
   demos now generate at proposeGroup (action) and restock via the
   tick; PROMOTED TO LAW: rng draws happen in the tick and in player
   actions, never in render.
5. **The validator** — `KP.validateState` (ghosts, NaNs, room-chart
   partitions, deal references) runs as a hard guard EVERY WEEK of
   every soak seed.

The determinism suite-property held through the refactor (the
pipeline preserves exact phase order; suite 037 forks it 30 weeks).
Three fixture repairs on the way through — one of which (fandom
intensity ≥60 changing storm physics changing reception) was the
audit accidentally proving the systems interlock for real.

## §34 The timeline (v0.7.3) — a feed you check every week

> Owner: *"more persistent accounts, more templates for posts, more
> ways for idols to post. the social feed should be something you
> check every week."* Built entirely on the §33 kernel — a registered
> weekly phase and registered feed reactions, zero edits to the
> drivers. The foundation's first customer.

**Regulars with taste** (`state.feedCast`): the recurring cast grew
to 14 handles, and they develop BIASES — a viral moment gets an idol
adopted by an unattached fan/stan account (through the single
`recordViral` door, deterministically; parasociality is destiny), and
the adopted account posts about her in its own recognizable voice,
reading her §32 facts. The heartbreak clause: a boiled storm on their
person and the account posts a quiet "taking a step back" — no
drama, no thread, somehow worse than a thread — and stays unattached.

**Idol posting moments** (all hash-calendar, all wholesome): monthly
**selca day** (one member per group takes the timeline, follower
spike); **birthday weeks** from a hash-derived birth week per person —
morale, spike, the members' posts, and a fandom past intensity 50
funds the subway-station ad she visits in a mask and cries at anyway;
**livestream clips** that turn a booked livestream into timeline lore
built from her facts. The Bubble (§32) continues alongside.

**Volume**: weeklyMax 6→8, floor 4→5, kept posts 64→80, plus two
always-on ambient chatter slots so the raised floor holds in the
quietest fresh world. Suite-proven: every week ≥5 for 40 weeks.

**Quality-of-trim ruling** (kernel dividend): narrative FORMATION
letters are now priority-high — the birth of a public narrative is
news and stops losing inbox races to louder weeks, permanently. The
louder timeline also surfaced honest fixture truths: two members
crossing 100k in the same week is a feature, and the boil random-walk
needed a pinned-decay mechanism test (the physics stay soak-proven).

## §35 The people (v0.7.4) — personalities you feel weekly

> Owner: *"and now let's give the idols real personalities. I want to
> feel their existence every single week."* The stats already existed
> (§32 gave facts and ambitions); this release makes them BREATHE.
> Second full customer of the §33 kernel: one registered phase
> (`personhood`, order 856) plus one registered feed reaction —
> drivers untouched.

**The voice** (`KP.voiceOf`): every person gets one of seven stable
voices — blunt, sunshine, deadpan, gremlin, softspoken, earnest, wry —
derived from personality thresholds (dominant+confident → blunt,
warm+confident → sunshine, professional+cool → deadpan, creative
chaos → gremlin, gentle+warm → softspoken, workhorse → earnest), with
a hash fallback so middle-of-everything people still get a real one.
Never stored, never drifts. The dossier's "Off the clock" note now
ends with how she talks in the room.

**The mood** (`KP.moodOf`): her week in one honest word — benched /
running on fumes / glowing / quietly off / worn / steady — derived
live from burnout, fatigue, and morale. `UI.condChips` now renders
this single word everywhere the old two-chip fatigue/morale readout
lived: one-truth law applied (two derivations of the same vitals sat
adjacent on every roster card).

**The spotlight** (`personhood`, order 856): one person per week (two
when the roster tops six) hash-rotates through the roster and her
week becomes a specific scene read from REAL state: the workhorse
logged out of the practice building at 1am, the competitor rewatching
a lost battle's stages (−1 morale, only within 4 weeks of the loss),
the warm one engineering a food run that thaws a tense pair (+2 rel),
the leader rearranging van seating around a tired member, ambition
glimpses, close-friend scenes, and per-voice fallback moments — with
separate practice-room texts for trainees. Effects stay tiny:
presence, not power.

**The staff scan**: going quiet is not a rotation event — morale
under 38 with resilience under 50 gets flagged whoever the spotlight
is on, one person per week (the worst off), 10-week cooldown so
concern reads as concern, not nagging. Priority high: "worth a look
before it becomes a number" is a warning, and warnings survive trim.
Soak ruling: 0/40 under the bot (it rests, mediates, and wins its way
out of the hole) — the fiscalNoticed precedent applies; mechanism
suite-forced.

**Priority ruling — the spotlight is high**: at flavor the person
survived the trim in only 5/40 soak orgs; at normal, 20/40. The trim
was silently deleting the release's entire mandate in loud mature
worlds. The spotlight is capped at 1–2 notes weekly by construction,
cannot flood, and now files at high: 40/40 orgs feel the people in
≥70% of weeks. Public/private line: only debuted idols echo on the
timeline (`personMoment` reaction, registry); trainee weeks stay desk
notes.

## §36 The tracklist (v0.7.5) — the record is more than its title

> Owner: *"keep building the idols. they need to be the stars… build
> track lists for singles, mini albums, and albums that the fans can
> react to. this gives us opportunities to actually give the idols
> opportunities at solos, units, etc."* Plus: *"more flavor in the
> artist file — I'm seeing a lot of repeats in all three categories."*

**The build** (`KP.buildTracklist`, action-time rng at lock): formats
have carried a track count since v0.2.1; now the count is songs.
Track 1 is the chosen demo; b-sides get generated titles, producers,
and a hidden hook. Open credit slots sit mid-record — none on a
single, track 3 on a mini, tracks 3 and 6 on a full album. Solo acts
and duos open none.

**The A&R pass** (`KP.assignTrack`, until release week): an open slot
takes a solo (one member), a unit (2–3, fewer than the group), or
stays with the group. One special credit per member per record —
spread the light. The Studio prep card shows the full tracklist with
a credit sheet per open slot.

**Release week** (`KP.tracklistResolve`, from resolveDebut): a solo
credit is a career event — social spike, +6 hype carried into the
NEXT cycle (hype is otherwise zeroed at release), +5 morale, a
permanent history line, and the `solo` ambition door opens: a solo
b-side IS the solo she wanted. Units read REAL chemistry from the
relationship ledger — a close pair reads as "not acting" (+4 morale
both), a tense pair gets clocked ("professional on the record" —
snark lands on whoever paired them, never on the people). After a
record with reception ≥55, a 22% sleeper: the highest-hook b-side
outgrows the single (+2 popularity, the truthers organize). All three
inds (`soloTrack`, `unitTrack`, `bsideSleeper`) render through the
kernel registry. The dossier gains a discography-margin note; the
group page discography lists credits and sleepers per release.

**The variety pass**: FACTS 12→36; every ambition gets 3 phrasings;
the stronghold margin note gets 5 framings and 3 attributions; the
off-the-clock note 4 framings and 4 attributions — all hash-picked
per person, so two dossiers never read as the same form with the
names swapped. Bot upgrade: the harness ships minis past 160 budget
and albums past 320, then assigns the most-followed member the solo
and the next two the unit (public numbers only). Census: solos 40/40,
units 40/40, sleepers 30/40.

## §37 The second consult (post-v0.7.6) — the reciprocity diagnosis

> Owner: *"it feels like something is missing. I can't put my finger
> on it. maybe an expert can take a look at the immersion side?"*
> Two independent expert audits (industry/fandom lens + sim-design
> lens) plus in-house analysis, all three converging on the same #1.
> Ideas only — nothing here is built until the owner picks.

**The diagnosis**: every release since v0.7.1 made the idols more
VISIBLE; none made them RESPONSIVE. They cannot see the player, want
anything from the player, remember the player, or be lost by the
player. The game models parasociality for NPC fan accounts while
modeling no relationship at all between player and roster. Tells:
"Worth a conversation" notes with no conversation verb; the promise
ledger (meeting.js) pointing only UP at the exec; every idol-directed
verb an HR form.

**Ranked proposals** (machinery notes in parens):
1. **The office door** — idols initiate scenes toward the player;
   constrained voice-true replies; answers minted as predicate-checked
   promises on HER ledger (meeting.js promise pattern + persona.js
   scene pattern; both proven).
2. **Contracts & renewal** — the seven-year clock; renewal as a scene
   reading the whole ledger; rare fully-narrated departures. Ends §9's
   no-exit rail for idols the player failed.
3. **Standing with the company** — per-idol memory of DIRECTED player
   acts, in words never meters; gates renewal tone, apology sincerity,
   leader effort. (Morale stays weather; this is the psychology.)
4. **Presence with teeth** — spotlight follows drama pressure instead
   of round-robin; ~1 in 5 moments carries a hinge or choice. Revises
   the "presence, not power" doctrine (persona.js header): skimmed
   flavor is how idols regress to attribute sets.
5. **The industry as society** — cross-company friendships from
   music-show weeks, coffee trucks, debut-class cohorts; the shaped
   year (year-end gayo stages, festival circuit, summer-song season).
6. **Sharp smalls**: bonsang/daesang ladder (first-daesang arc; snub
   mechanic doubled); named staff w/ bylines, poachable; fan trucks
   (the fandom protests YOUR decisions); persistent producers (the
   rejected demo becomes a rival hit); group debut anniversaries;
   aftermath states (wounds with shadows, not one-week deltas).

**Recommendation on record**: ship #1+#2 as one arc ("the door opens,
and eventually the clock runs"). Everything else composes on top.

## §38 The stage door (v0.8.0) — the interaction foundation

> Owner, after Audit II: *"approved."* The foundation release the
> audit required before the reciprocity arc. No features — RAILS,
> plus the Monday meeting migrated onto them as the proving customer,
> exactly as sim.js proved the weekly pipeline in §33.

**Scenes** (kernel): a scene is a held decision — someone waiting on
the player's answer. `KP.registerScene(kind, {title, body, options,
resolve, expire?})`; `openScene` queues on `state.scenes`;
`resolveScene` is the ONE action door (draws rng, notes through the
bus, removes). Unanswered scenes expire through the weekly
`stageDoor` phase (order 786) — and expiry is narrated, because in
this house silence is content. The Desk renders every pending scene
through ONE "Waiting on your answer" rail; app.js dispatches every
option through ONE `scene-opt` case. Duplicate kinds, malformed
defs, and unregistered opens all throw at the door.

**Claims** (kernel): the exec's promise ledger, generalized. A claim
is plain data with a SUBJECT (`exec` today; `idol`, `fandom`,
`staff` tomorrow) and a registered predicate that runs weekly, fires
once, and stamps `resolvedWeek`. Settled claims keep a bounded tail
(10). `state.execNotes` and `state.execQuestion` migrated over and
deleted; `KP.answerMeeting` survives as a one-line shim.

**The directed-acts door**: `KP.recordDirected(state, personId,
kind, weight)` — the single write path for what the PLAYER did to a
specific person. Bounded ledger (40), half-life 48 weeks (kindnesses
fade, wounds heal — slowly). `KP.standingOf` derives words, never
meters: "she would run through a wall for this company" → "counting
the days". First writers wired: solo credit +3, unit credit +1,
successful mediation +2 both, releasing her close friend −3 to the
one left behind. No UI surface yet — the standing FEATURE is the
next release; this is its substrate, filling from today so the
door's first scenes open against real history.

**Validator**: scenes and claims are structurally checked weekly in
the soak (unregistered kinds, missing subjects → hard violations).
Laws 6 and 7 added to ARCHITECTURE.md.

## §39 The whole industry (master plan, post-v0.8.1)

> Owner: *"I want to make a plan to literally add every single thing
> the experts pointed out along with anything we had left from our
> roadmap we were working on previously."* This section is that plan
> — every §37 consult item (both expert reports, deduped), every §32
> first-consult leftover, every unshipped §22 far-map phase, and the
> mechanical debt, sequenced so each release stands on the one before
> it. Append-only like everything here; reorder on owner's word, the
> way §22 was reordered twice.

**Sequencing logic**: Phase A makes the player real to the people
(the consult's unanimous #1) — it must come first because Phase B's
biggest system (contracts) READS everything Phase A writes: standing,
kept promises, answered doors. Phase C is careers-entire and world
texture that composes on top. All of it runs on §38 rails: every new
conversation is a registered scene, every promise a subject claim,
every directed act through the one door. No release below requires
new architecture; Audit II stands.

### Phase A — The Reciprocity Era (v0.8.x): the player becomes real

- **v0.8.2 — The office door.** Idols initiate scenes toward the
  player: the REQUEST (rest, a room change, a stage-name talk), the
  CONFESSION (she's struggling before it's a number), the CHALLENGE
  (she disagrees with the concept), and the ASK — the ambition
  meeting ("she wants to know if there's a plan for her"), minting
  predicate-checked claims with subject:idol; kept ones put your
  fingerprints on the ambition letter, broken ones get your date
  quoted back by the person it devastates. Scene text voice-true
  (blunt opens your door differently than softspoken); answers write
  the directed-acts ledger. ALSO IN: the persona rework the critic
  demanded — spotlight follows DRAMA PRESSURE (morale extremes,
  fresh losses, ambition proximity, friction) with the rota as
  boredom fallback only; MOMENTS gain an optional choices field
  (competitiveSting / warmthGlue / leaderCarry become small scenes);
  roughly one moment in five carries a real hinge. Revises the
  "presence, not power" doctrine: presence WITH teeth.
- **v0.8.3 — Standing & scars.** Standing surfaces (dossier words,
  never meters) and starts gating what morale can't buy: apology
  sincerity in storms, leader carry effort, what she says at the
  door. Aftermath states: a boiled storm on an idol leaves a
  weeks-long shadow (subdued bubble tone, changed mood word, one
  recovery scene) instead of a one-week delta. Group debut
  ANNIVERSARIES (the most ritualized date in real fandom): café
  banners, N-years hashtags, memory callbacks on the timeline —
  birthday-week infrastructure reused wholesale.
- **v0.8.4 — The building.** Named staff, generated per career like
  the executive: a road manager per debuted group and a head vocal
  coach, with hash-stable voices, who SIGN the notes they currently
  narrate anonymously, disagree occasionally, buffer tour fatigue
  slightly — and can be poached by a rival (a scene; her departure
  is a morale event, a feed event, and a directed-acts entry).
  Execs with taste (§32): the executive develops favorites and
  concept opinions; 3–4 new exec question types reading real state
  (the trust nadir, the fandom name, the dodged head-to-head).
  Board season (§32): the yearly review as a scene. The executive
  pet project (§32): an assignment you didn't choose.

### Phase B — The Living Industry (v0.9.x): time, society, loss

- **v0.9.0 — Contracts & the clock** (§22 v0.6.15 + consult #2).
  Contract years stamped at signing/debut; the standard seven-year
  shape; renewal opens ~2 years out as a SCENE whose tone reads the
  whole ledger — standing, ambitions fed or starved, promises kept,
  quietWeeks answered or ignored, years of fatigue. Outcomes: full
  renewal / renegotiated terms (leverage: her individual fame — §22's
  "seat at the negotiating table") / renewal-minus-one (the group
  survives as four; the files and fans remember) / graduation into
  solo management / the farewell tour everyone knows is the last.
  Rare fully-narrated departures of the genuinely neglected — §9's
  no-exit rail rewritten; departures mostly WARM (the content law
  already writes bittersweet). One departure per career is enough;
  the possibility charges every quiet week with meaning.
- **v0.9.1 — The society** (consult #3). Your idols meet the
  industry: music-show waiting rooms roll hash-stable cross-company
  friendships (personality-gated — sunshine befriends everyone);
  friendships generate feed content, coffee trucks on tour weeks,
  public congratulations on first wins; debut-class cohorts get
  named by fans and resurface at award season; a senior publicly
  stans your rookie. Presence, not power — aimed outward.
- **v0.9.2 — The year** (consult #4 + §22 v0.6.10 festivals).
  Annual tentpoles on the calendar strip: year-end gayo stages
  (invitation by popularity; special-stage collabs that feed the
  society layer), spring university festival circuit (mid-tier
  money and live reps), summer-song seasonality (bright concepts
  spike in season), holiday variety specials, the January dead
  zone. Awards ladder rework: bonsang (several, attainable) vs ONE
  daesang (brutal); the first-daesang arc gets the full first-win
  treatment — history line, ambition door, a speech that names the
  fandom; the §31 snub-radicalization mechanic doubled ("a bonsang,
  again").
- **v0.9.3 — The constituency** (consult #5). The organized fandom
  acts on YOUR decisions: protest trucks and joint statements
  (intensity-gated scenes — concede, hold, or half-measure, and the
  fandom remembers like the exec does) over center changes, missing
  credit slots, overworked schedules. The company gets a voice: the
  official café notice and the fan meeting as player verbs; the
  lightstick launch as a real event instead of flavor text.
- **v0.9.4 — The credits** (consult #8 + §22 v0.6.12/v0.6.13 +
  §32 leftovers). Producers become a small persistent pool with
  track records visible in the discography; repeat collaboration
  forms a signature-sound narrative through §23 memory; the
  rejected demo resurfaces as a rival hit (the industry's favorite
  ghost story). Creative teams widen: a named choreographer and
  stylist with chemistry, poachable (losing yours to a rival should
  hurt). Member participation: songwriting/production credits shift
  perception from performer to artist, feeding the variety of §36
  tracklists. Quote-chain threads (§32): feed posts that reply to
  each other. School milestones (§32): graduation and entrance
  ceremonies for the young trainees.

### Phase C — Careers Entire: the long game

Shipped: ~~The second job~~ (v0.9.11, §52), ~~The disappearance~~
(v0.9.12, §53). Amended post-audit (owner: *"I like all three
suggestions. fold them into the remaining Phase C plan"*) — the
0.9.13 audit's three deferred findings join the map, front-loaded
because all three answer the standing "the game in general feels
easy" report, and the audit's measurements are fresh:

The FINAL unified order (fourth re-sequencing — the depth mandate,
the second sitting, and all eight pitched items ruled in and
merged where the machinery is shared). Every release measured
against the standing clause (arrive, claim, mark):

1. **The price of fame** (audit B1 + §55.1; SHIPPED v0.9.14,
   §56). Stature-scaled
   production costs (self-balancing sink, payroll demoted to
   retainer) + the sponsor's invoice: duties that claim calendar
   weeks, strain toward clawback, and the mid-contract solo
   request scene. Bands: budget trajectory, obligations
   kept/missed, solo requests.
2. **The clip + the catalog** (§55.8 + catalog-alive; SHIPPED
   v0.9.15, §57). Virality
   rewired to named stages with provenance carried forever — and
   the catalog stirring in the other direction: resurfaced clips,
   anniversary spikes, the four-year-old B-side reverse-charting.
   Every release ever shipped becomes a lottery ticket that never
   expires. Before the gravity on purpose.
3. **The practice room years + the regional schools** (§55.9 +
   §55.14; SHIPPED v0.9.16, §58). The trainee pipeline deepened at both ends: where they
   come from — persistent named academies in the home circuit's
   cities, with specialty lanes, alumni ledgers, reputations that
   move with their graduates, and audition classes submitted to
   every company's casting call — and how they live and leave:
   evaluation days with visible rankings, debut-team speculation
   the trainees feel, the quitter, and the aging-out clock with
   all three endings. Scouting trips and school partnerships give
   the board its geography.
4. **The title fight** (contested release loop; SHIPPED v0.9.17,
   §59). The pitch meeting
   gets politics: the producer's push, the exec's known taste,
   the member's demo against the professionals'; repackages
   extend eras; the MV becomes an object with a budget tier. The
   most-repeated loop in the game, finally contested.
5. **The gravity, both directions** (§55.2 + slumps; SHIPPED
   v0.9.18, §60). One set of
   individual-trajectory rails: the transcendence read and its
   clamor (solo-in-group / the hold / the spin-out) — and the
   slump, the downward arc with its own middle register. Group
   identity arcs (festival icons, variety group, OST factory).
   *Interstitials by owner ruling, before slot 6 — BOTH SHIPPED:
   v0.9.19 the mandate (§62), v0.9.20 the member desk (§63). Slot 6
   (the bad blood + the fansite masters) is next, on approval.*
6. **The bad blood + the fansite masters** (§55.3 + named fans +
   §55.13; SHIPPED v0.9.21, §64). Rivalries with teeth at three
   tiers, formed from SOURCES beyond the shared week — debut
   class, concept, position, the award stolen twice — and the
   gasoline gets faces: the big accounts with funding power,
   closeness, and turn risk. Conflict finally costs.
7. **Festival season + award night** (§55.4 + the attended
   ceremony; SHIPPED v0.9.22, §65). The calendar's events become
   scenes: festival invitations with schedule surgery and travel
   bills, headline calls for the icons — and the year-end ceremony
   played out (seating, speeches, the daesang moment).
8. **The service** (§55.7; SHIPPED v0.9.23, §66). Military
   enlistment — the boy-group story completed: notice at 26, the
   wall at 28 (law, with a longhaul invariant), stagger vs
   together, paused contract clocks, the loyal service hiatus,
   and the discharge return stage the countdown machine banks.
9. **The rise and fall + the offer + the generations** (§55.10 +
   being poached + §55.12; SHIPPED v0.9.24, §67, + rival service
   folded in on owner's order after v0.9.23). Rival eras made
   legible, the annual power ranking, the overtake, collapse
   fallout as a free-agent signing class, the imperial rival's
   job offer — and the scene's own memory: NAMED GENERATIONS
   declared when the wave turns, every act stamped, gen-vs-gen
   discourse, and the torch-pass narrative the week a rookie
   outsells the old guard. Plus: rival boy acts carry the
   enlistment window (rotations, pauses, the return that punches).
10. **The deep map + the tongue + the world's auditions** (§55.5 +
    §55.15). Region verbs gated and colored by language; the
    fluent member becomes the voice abroad; interpreters for
    hire — and international scouting: global audition tours,
    prospects with home regions and native languages on the file,
    the member whose hometown airport fills when the tour finally
    comes.
11. **The secret** (SHIPPED v0.9.30, §72). Secrecy, the reveal, the
    response menu, the fandom's spectrum — under the full content
    law, late in the order on purpose so every system it touches
    is already deep.
12. **Time takes its share** (audit A4 + B4 + succession + the
    board; SHIPPED v0.9.32, §73). Senescence, trust drift,
    executive succession (the ledger reset to "prove it again"),
    and the founder's own board — every anti-saturation clock in
    one release. *The sagas (§71) shipped between slots, v0.9.31.*
13. **The imprint** (§55.11). The associate label — the founding
    machinery in reverse, the powerhouse's finale verb, staffed
    if you like by the free agents of #9 and the graduates of
    your own story.
14. **The wardrobe department** (§22 v0.6.12). Named
    choreographers/stylists, chemistry, poaching — the last
    room in the building gets its names.

Nothing remains parked. 1.0 is declared, never counted to.

### The debt rider (any release, when touched)

- Migrate the frozen 34-branch feed chain to the registry,
  branch-by-branch as releases touch those inds.
- §18 watch items stand every soak: feed tone freshness, chart
  easiness, overwork under human play, fiscal solvency ruling.
- Capacitor wrap stays parked until the owner calls for stores.

### The honest constraints

- **Content is the budget.** Scenes × 7 voices × options is the
  real cost of Phases A–B; the proven mitigation (voice-neutral
  option text, per-voice opener lines) is doctrine.
- **The bot must learn every verb** or the soak goes blind — each
  release ships its bot policy and bands, same as always.
- **Departure mechanics touch every invariant** (rooms, roles,
  credits, deals); v0.9.0 gets the longest suite of the plan.
- Eleven releases at the established cadence. Each ships the full
  ritual; each is playable and pushed the day it lands. Reorder on
  owner's word at any time — the plan serves the feel reports, not
  the other way around.
- **Version labels are provisional past Phase B** (owner ruling,
  post-plan): "let's watch the version numbers because I don't know
  when we'll hit 1.0." Phase C ships under whatever number the line
  has reached; 1.0 is DECLARED by the owner when the game earns it,
  never reached by counting.

## §40 The office door (v0.8.2) — the idols initiate

> §37's unanimous #1, built on §38 rails. Owner: *"approved to get
> started with 0.8.2."* For the first time, the people the player
> manages can SEE the player: they knock, they ask, they remember
> the answer, and they check the receipts.

**The knock** (`officeDoor` phase, order 787): condition-gated,
voice-true (seven per-voice openers — the blunt one is already
sitting down; the gremlin has walked past your office four times),
paced to stay memorable: one open idol scene at a time, ~5-week
global cooldown, 16-week per-person cooldown, 55% weekly chance
when someone is eligible. Four doors:
- **The ASK** — the ambition meeting, once per career per person
  ("she wants to know if there is a plan for her"). PROMISE mints an
  `ambitionPromise` claim, subject:idol, 48-week window: delivered,
  she thanks you for meaning it (+3 directed); missed, she uses her
  minute for one sentence — "It has been a year since [date]" — and
  it would be easier if she were angry (−4 directed, −6 morale).
  HONEST is filed, not dropped (+1 directed, no claim). DEFLECT is
  the smile they teach for music-show losses (−2 directed).
- **The REQUEST** — running on fumes, she asks for a real week.
  Grant: −14 fatigue, the van is quieter and everyone hates it.
- **The CONFESSION** — the RESILIENT one struggling (the staff scan
  catches the fragile; the tough ones knock). Lighten quietly /
  coach talk / "the comeback needs her" — all remembered.
- **The CHALLENGE** — confident + bad personal concept-fit: she can
  name the exact bars where the lane fails her. Retool sends the
  producers back in with her notes (demos regenerate); holding the
  line is respected and filed.
Silence: scenes expire in 3 weeks — she stops waiting, −2 directed,
"she is fine. That word is doing a lot of work."

**Persona teeth** (the critic's #6): the spotlight now follows
DRAMA PRESSURE (low morale, high fatigue, fresh battle losses,
starved ambitions, warm members near friction), 4-week per-person
feature cooldown, rota as the boredom fallback. The three effect
moments (sting / glue / leaderCarry) put a CHOICE on the desk (one
at a time; 2-week expiry resolves the old way without you, on the
record). "Presence, not power" is amended: presence WITH teeth.

**Census**: knocks 40/40 orgs, promises kept 20/40 (real stakes),
choices seen 38/40, leftWaiting floored 0 by the competent-bot
ruling. suite_039 repointed at the classic fallback path (still
live); suite_042 owns the choice path.

## §41 Standing & scars (v0.8.3) — trust with teeth, wounds with shadows

> §39 Phase A continues. The critic: *"a world that remembers your
> chart positions but not your scars feels like a press archive, not
> a life"* and *"morale is a currency, not a memory."*

**Standing surfaces**: the dossier reads it in words from the road
staff, off the record — only once a directed-acts history exists.
And it GATES what morale can't buy:
- **Sincerity** (`respondDiscourse`): statements and livestreams from
  an idol with standing ≥3 read as real (+8% steer); from one
  counting the days, they don't (−8%). The public can hear it.
- **The leader's pull** (`rolloutWeek`): a leader with leadership
  ≥55 AND standing ≥3 absorbs promo grind for the room (−1 fatigue
  per booking for the others). Followership is earned off-stage.
- **The doorway** (`door.js` opener): standing colors how she walks
  in — "she came to you first, before her manager" vs "she almost
  took this to her manager instead."

**Scars** (`scars.js`): a boiled storm on an idol sets an 8-week
shadow — mood word "carrying it", bubble reduced to two messages and
a photo of the sky (the fans reply "take your time" and mean it).
When it lifts: the RECOVERY scene — first real laugh at practice —
and the tone of her return is the player's call: loud (+4 morale,
front-and-center content, `scarBack` on the timeline, +2 directed)
or quiet (+2, her own pace, +1). Ignored, time does what time does —
with a little guilt on the record. Census floored 0 under the bot
(scars require a boil; the bot steers every storm — same physics as
discourseBoiled).

**Anniversaries** (`life.js`): debut anniversaries every 48 weeks —
café banner changes at midnight, N-years hashtags, the members'
practice-room live, +2 morale, social spikes, and the §23 memory
system's stories retold on schedule. The timeline shows up for it
(three-voice feed reaction). 40/40 soak orgs celebrated one.

## §42 The building, the boys, and the company's own names (v0.8.4)

> Phase A closes, plus two owner adds: *"0.8.4. also, let's find a way
> to get boy groups in here, and I'd like the option to name my groups
> and songs myself, along with the generated options."*

**The building** (`staff.js`): every debuted group gets a NAMED road
manager (hash-stable) who commits the van seating chart and coffee
orders to memory within two days; rivals poach the good ones off hot
groups (counter-offer scene: pay 25 or say goodbye — leaving costs
the members morale and the seating chart starts from zero; ignoring
the window loses her to the group chat). The head vocal coach has a
name. The exec has TASTE (hash-derived favorite concept): her kind
of hit earns the un-hidden smile and +1 trust; other wins get "good
result" in the tone of someone whose favorite genre this is not.
BOARD SEASON yearly (week 46): own the slow build / promise growth
(a claim with a number, read back aloud in one year) / point at the
artists. The PET PROJECT, once per career: a solo debut inside the
year, hers personally — delivered, the favor is banked permanently.
New exec question: the second lineup, with a claim. The quietWeek
staff scan now carries the manager's byline.

**Boy groups**: gender at generation; male given-name and stage-name
pools; the opening board leans female (25% male — the mandate is a
girl group) with weekly leads closer to even (35%); ONE GROUP, ONE
GENDER (proposeGroup law, "the exec was very clear"); rival acts
gendered too (35% boy acts), cast around their best signees' gender.
THE PROSE: ~370 pronoun placeholders across 15 files on a fillPro
kit ({she}/{her}/{pos}/{hers}/{herself}/{girl} + capitals) — female
output byte-identical to before, male output grammatically reviewed;
verified by a full boy-group-career scan: 0 strays, 0 unresolved
placeholders across every note, scene body, option, and toast.
Two conversion agents ran the bulk; strays they flagged (scouting,
social, standingOf) fixed in integration.

**Naming rights**: free-text group names in the builder (typed name
beats the marketing team's chips) and record-title renaming at the
studio before lock (`KP.renameDemo`, uniqueness-checked against
every discography — the archive keeps receipts).

**Rulings on the way through**: solo/unit credit notes promoted to
priority-high (career events — the milestone precedent); exec-taste
notes high (the exec speaking about a release is executive news);
soloDebuts census ceiling 0.60→0.75 (the pet project now DEMANDS
solos by design — 39/40 careers get assigned one). Census: boys
signed 33/40, boy second acts 10/40, managers named 40/40, board
faced 40/40.

## §43 Contracts & the clock (v0.9.0) — the seven-year shape

Phase B opens (§39). Every career now has the shape the real industry
gave the genre: the exclusive contract, seven years from the debut
stage, and the one conversation at year five that decides how the
years get used. This is the system the whole ledger was built to feed
— renewal is where every answered door, kept promise, and quiet week
of neglect finally becomes arithmetic.

**The clock** (`js/engine/contracts.js`, weekly order 784).
`p.contract = { start: debutWeek, years: 7, term }`, stamped
idempotently the week a group debuts. `KP.contractYear` reads it in
years; the dossier head shows it plainly ("Exclusive contract · year
N of 7 · term T" — "final term" in magenta when she is leaving).
Migration backdates existing idols to their group's debut week, with
a memo that lands the weight: *every quiet week just started
counting.*

**The read** (`KP.renewalRead`). One function turns the ledger into
a table disposition: standing (×1.5, half-life 48wk), ambition met
or ignored, promises kept and broken, doors left waiting, a
warm room (group pop ≥55), morale. Bands: **devoted** (≥6),
**professional** (≥0), **strained** (≥−5), **gone**. Fame
(`social/150k`, capped 4) is leverage — it prices the signature but
never decides the band. Words at the table, numbers never shown.

**The table** (scene kind `renewal`, one at a time, spaced 6wk,
expires in 3). Per-band bodies; per-band doors:
- *devoted*: sign, or sign-and-sweeten (30 — she was signing anyway;
  the sweetener was for the years).
- *professional*: meet the terms (40 + fame×12, charged in full) or
  offer the standard paper (−1 directed; her representation files
  the silence).
- *strained*: give real terms, or hold the company line — a coin
  (`holdLeaveChance` .5) between a grudging re-sign and a dated
  seventh year.
- *gone*: write the ending right (farewell lap, warm, `endingHonored`
  +2) or try to change the arithmetic (`changeMindChance` .25, +.15
  at standing ≥3 — some saves happen in rooms with no cameras).
Renewal resets the clock (`start = week`, `term++`) — the reset is
itself the gate; the next table is five years out. An expired table
is `tableLeftWaiting` (−3) and comes back colder.

**The departure** (`KP.departIdol`, warm/cold). Roles reassigned
inside the lineup (leader by leadership, center by centerPull with
centerHistory), rooms re-partitioned, deals wound down, her open
claims settled void, every scene holding her name off the desk with
her, close friends grieve (−3 + `friendDeparted` directed), pop hit
4 warm / 9 cold, morale 4/7. The status is `departed`, the file
stays open **forever**. Warm goodbyes are handwritten letters; cold
ones are three sentences the fandom reads everything into. The
group continues as N — suite-proven through a full post-departure
comeback cycle.

**The anti-immortality rule.** Ignoring the table is not a strategy:
half a year past the seventh with the read at gone, she departs cold
on her own — the silence was the answer. (Found by the harness's
long-horizon pass: without it, a neglected roster simply never left.)

**Graduation** (`KP.graduateToSolo`): leaves the lineup, stays an
idol, gets an undebuted solo act — plannable like any other. Offered
by the renewal flow in a later pass; the door exists and is
suite-tested now.

**The long clock in the harness.** Renewal opens at ~week 246 —
beyond the 140-week census — so the soak gains a second pass: 3
seeds × 380 weeks (two attentive orgs sharing the bot's renewal
policy, one neglect org that never answers a scene), guarding that
tables open, re-signs happen, the neglect org actually loses people,
and `validateState` stays green every single week. Census band:
`contractStamped` 40/40. Renewal/departure bands live in the long
pass, not the 140-week census — by construction, not by ruling.

## §44 The staff read (v0.9.3) — personality made legible

Owner feel report: *"it's really difficult to gauge personalities."*
The audit agreed with the feeling exactly: twelve engine systems read
the eleven personality numbers (chemistry, coaching, discourse,
tours, the renewal table), while the artist file's blurbs are hash
flavor and the UI never says the numbers at all. Personality was
consequence-only — you learned who someone was after she cost or
saved you.

**KP.staffRead(state, p)** (persona.js): the same live numbers, in
words. Each of the eleven axes has a high line (fires ≥65) and most
a low line (≤35) — "when plans change mid-run, the room looks at
{her} first" / "takes every note politely and then does it {pos} way
anyway." Only genuine edges speak; the three sharpest are the read,
sharpest first; a person with no edges reads *still forming — she
has not shown the room her edges yet.* No rng, no hash, no state
touched (render law — suite-proven by serialize-compare). Rendered
on the dossier's working card under "How the staff read her,"
attributed to the coaching staff. Prospects are excluded on purpose:
character is read in the building, not from a scouting clip.

**The room report grows two truths** (relationships.js):
- *Quiet pairs.* The report used to list only close pairs, so a
  hub-and-spoke room (everyone trusts the center, nobody else close)
  looked finished while the consensus said "workable." Now the
  non-close, non-friction pairs are named — "friendly, not yet
  trusted" / "cordial, not close yet" — capped at three, coldest
  first, and only when some pair IS close (an all-quiet room is
  already covered by the consensus line). Frictions still render
  separately with sit-downs attached.
- *The mix, in words.* The personality half of the chemistry blend
  can hold a warm room at "workable" and was invisible: stacked
  dominance ("the thermostat reads it"), warm rooms ("tailwind"),
  cool rooms ("built on purpose") now get named beside the leader
  lines.

## §45 The society + the home circuit (v0.9.4)

Owner: *"so society is next. now 0.9.4. also, I'd like you to add
'dates' to tours... should be able to just tour the country with
multiple dates. maybe have certain venues or cities request multiple
nights if sales are strong."* Two systems, one release: the industry
gets waiting rooms, and Korea gets toured instead of visited.

**The home circuit** (tour.js). The KR leg is no longer one show:
`KP.krRoute(state, g, scale)` routes the country — Seoul always,
then every city whose room the promoter believes the fanbase can
fill at that scale (`KR_CITIES` with demand weights: Busan .80,
Incheon .70, Daegu .62, Gwangju .55, Daejeon .52; city demand =
popularity × weight). The circuit plays two cities a week; each
date reports honestly (sold out / solid / soft). **A sold-out city
asks for a second night and gets it** — extra date, encore revenue
at .85, capped at `maxKrDates` 9 total — answering the old overseas
letter's "second night we cannot book" at the one desk that holds
the keys. Pricing is per circuit week, not per flat leg. The wrap
letter counts cities, dates, and encores earned; popularity moves
with sold cities. One truth: planner preview, booking, and the
weekly grind all call `krRoute`. Legacy mid-tour saves (no
`tour.kr`) fall through to the old single-show path — no migration.

**The society** (society.js, new module, weekly order 857). §39
consult #3, presence not power, aimed outward:
- *The waiting room.* Promo weeks roll cross-company friendships
  with rival idols whose acts worked the same shows this month —
  personality-gated through `KP.voiceOf` (sunshine ×1.5, deadpan
  ×.5, warmth the base). Stored in `state.industryFriends` (capped
  12, spaced 5wk), stamped into her history, fed to the timeline.
- *The coffee truck.* A friend marks your opening week (release or
  tour start) with a banner truck — morale, a note, two fandoms
  crying about a beverage vehicle.
- *Public congratulations.* Your idol congratulates a friend's
  release within the hour; both fandoms declare a one-day armistice.
- *The senior stan.* Once per group, early (≤12wk post-debut), an
  idol from an act two-plus years older names your rookie a
  favorite, unprompted — priority-high, social spike, a history
  line ("named her a favorite rookie, in public").
- *The debut class.* Every award season (week 45), fan accounts
  line up the same-year debut class — your group beside the rival
  acts it debuted against, then and now.
Dossier: "Industry friends, the real kind" on The file tab. All five
inds answer through the feed registry.

**Census** (all alive first soak): homeCircuit 40/40, encoreEarned
40/40, friendMade 37/40, coffeeTruck 14/40, seniorStan 39/40,
debutClass 20/40, industryCongrats 31/40. Ruling: the circuit
lengthened tours → fewer overseas legs → map ~3pts cooler →
`strongholdNarrativeAt` 75→72 (the §18 watch item's own
prescription; regionStory 0/40→5/40). Fixture truth found on the
way: the fandom-intensity "identical releases" fixture sat at 55,
above the birthday-ad funding threshold (50) — different feed
content is different rng; pinned to 45.

## §46 The year (v0.9.5) — the calendar has a shape

§39 consult #4. Owner: *"0.9.5 approved."* Before this, week 30 felt
like week 7. Now the year has seasons, tentpoles, and one prize that
is genuinely hard to win.

**The season read** (`KP.seasonRead(state, conceptId)`, year.js —
one truth for number and words, consumed by the release driver):
January (weeks 1–4) is the dead zone, −3 to every reception, "brave,
or badly scheduled"; a bright record in the summer window (24–33)
gets +4, "the season did some of the promotion for free." Ordinary
weeks read 0 and say nothing.

**The tentpoles** (weekly phase `theYear`, order 750):
- *Spring festivals* (16–20): every debuted act with a real fanbase
  plays the university circuit once a year — mid-tier FEE (capped
  24), live reps, a field, students screaming b-sides. Big acts
  headline ("the dean asked nicely"); a pop ceiling here was dead
  content under a competent org (2/40) and the fee cap carries the
  mid-tier flavor instead.
- *Summer* (wk 24): the song-of-the-summer race opens as atmosphere;
  the reception lift does the mechanical work.
- *Gayo December* (invites wk 46, stages wk 48): invitation is by
  popularity (≥55), period. The stage pays morale and fandom; a
  waiting-room friendship can become the special-stage collab
  (society layer feeding year-end television, `gayoCollabChance`).
  Groups that released this year but missed the bar get the quiet
  December — "someone said 'next year' in a voice that made it a
  plan."
- *January* (wk 1): one atmospheric note. Everyone's favorite month.

**The ladder** (awards.js): the three categories are bonsangs —
several, attainable, unchanged mechanics. Above them, ONE
**daesang**: the whole year weighed once — popularity ×1.2, trophies
×2.5, the year's receptions, symmetric between player and rivals (the
asymmetric fandom term removed) — and the field now seats the
NATIONAL chart's year-defining acts ("the open market," scored from
peak position and chart tenure). The scene's best act still has to
beat the nation's giants; that is what makes it brutal (census:
16/40 win it, vs 31/40 before the giants sat down). The **first
daesang** gets the full treatment: morale, a history line on every
file, the ambition door touched, and a speech that names the fandom
before anyone else. Later ones land "less lightning, more law."
Shortlisted with a bonsang in hand while the daesang goes elsewhere
= **"a bonsang. Again."** — snub gain doubled (`snubAgainMult`);
nothing radicalizes like almost.

**Bugs caught by the build**: daesangWonYear stored 1-based (a
year-one daesang read falsy and the "first" would have repeated);
the v0.9.4 debut-class cohort had the same 0-based guard (year one's
award season skipped its own class — fixed, band 20/40→38/40).

## §47 The constituency + genre-bending (v0.9.6)

Owner: *"0.9.6 approved. and I have a personal request... if I want a
k-metalcore group, I should be able to do it... extremely high risk
high reward. could be critically acclaimed but unpopular, could flop,
could change the industry. all on the table."* Plus §39 consult #5.

**Genre-bending** (concept `fusion`, the mash):
- A ninth creative direction: **Genre-Bending** (creativity-heavy
  brief; producers pitch to it like any other). Under the brief, the
  studio's lock panel opens *the collision*: pick two of fourteen
  genres (metalcore, trot, EDM, jazz, drill, city pop, hardcore
  punk, R&B, folk, industrial, orchestral, disco, shoegaze, bossa
  nova) — or none, and release it straight. Reads as
  `K-metalcore × trot` (`KP.mashLabel`).
- At release, the mash rolls the whole table (rng in tick, weights
  in `FUSION`, tilted by the room's average creativity):
  **industry shift** (~6%+, reception floored at 84, `genreShift`
  narrative — "every A&R meeting now contains the phrase 'something
  like that'" — pop +8, fandom +8, critical-priority note),
  **acclaimed** (~18%+, reception CAPPED at 45 — best-reviewed
  record the company ever made and almost nobody bought it; fandom
  +6, trust +2, morale +2, `acclaim` asterisk in the discography),
  **flop** (~30%−, reception capped at 26, morale −3, snark at the
  SONG per content law), **worked** (remainder, +6 — a good record
  with a strange engine). Census first soak: 14/40 orgs mashed
  (bot runs ~1/3 of second groups under the brief), 4 shifts, 6
  acclaims, 10 flops — the whole table lives.

**The constituency** (constituency.js, weekly order 860):
- **Grievances watched**: a moved center (departure reassignments
  excluded — the fandom knows the difference), a five-plus-track
  record shipped with zero member credits, a member worked onto the
  medical bench. Grievances age out in ~3 weeks; outrage has
  logistics.
- **The truck** (scene `fanTruck`): intensity ≥55 + fresh grievance
  + spacing → an LED truck parks outside, with the facts (they are
  never wrong about the facts; that is what makes them the
  constituency). Doors: **concede** (cost 20, fandom +4, trust −1,
  grudge −1 — barricades sell albums), **half-measure** (a statement
  that says nothing beautifully; grudge +0.5), **hold** (grudge +1,
  intensity −2 — the next truck is already funded). Expiry = the
  worst answer. The grudge counter raises future truck odds
  (+0.15/point), colors the scene body, and shows as a "keeping
  receipts" chip on the group page.
- **The company's voice**: `KP.cafeNotice` (free, cooldown 6wk,
  cools the freshest grievance — talking first is a strategy),
  `KP.fanMeeting` (25, cooldown 16wk, clear calendar; fandom +5,
  morale +2, grudge −0.5, the cake incident is canon),
  `KP.launchLightstick` (once per group, needs a named fandom and
  pop ≥45; costs 35, sells 60 — that is what lightsticks do; the
  ocean is one color now). All three on the group page beside the
  fandom card.

## §48 The credits (v0.9.7) — the names behind the songs

§39 consult #8. Owner: *"0.9.7 approved."* The songs stop coming from
strings and start coming from people.

**The writers' room** (credits.js): six persistent hash-named
producers per world (`KP.producersOf`), each with a home lane they
mostly pitch (`laneStickiness` .6) and a works ledger capped at 12.
Every demo and b-side carries a `producerId`; every release stamps
its producer's track record. The desk reads the record in words
(`KP.producerHeat`: unproven / cold streak / workmanlike / reliable
/ in demand) on the discography's new "The credits" chips. Three
records with the same producer → the **signatureSound** narrative:
"a signature is an asset. It is also a cage with excellent
acoustics."

**The ghost story**: at lock, the best rejected demo with a real
hook (≥62) gets shopped (`state.ghostDemos`, capped 6). Ten-plus
weeks later, when a rival lands a hit (reception ≥60), a coin: the
hit turns out to be the demo this company passed on — retooled,
retitled, unmistakable. The A&R meeting about it will be very quiet.

**The pen** (tracks.js): members with a producer's mind (archetype)
or real creative reach (creativity ≥70) co-write b-sides —
`writeChance` .22, ≤2 per record. The booklet says so: first credit
is a history line, a priority-high note, a social spike, and the
liner-notes chip in the discography; the dossier counts the pen
record ("the word 'artist' has started replacing 'performer'").

**The timeline talks to itself** (§32): some weeks a post gets
quoted — a real reply riding above a real post, handle attached,
inside the weekly cap.

**The gowns** (§32, year.js): February (week 6) graduates the
19-year-olds who kept studying through all of this — gown photo,
flowers, the members screaming from the second row, a history line,
and the one day a year the whole internet behaves.

**Deferred to Phase C**: the named choreographer/stylist with
poaching (the §39 line item) — the producer pool proved the pattern;
the wardrobe department joins when variety careers land.

## §49 The flagships (v0.9.8) — the era gets contested

Owner: *"the game in general feels easy. every release is straight to
#1 on the scene chart. never lost a head to head."* Diagnosis by
measurement: an idle org gets beaten fine (peak #2, out-recepted) —
but under active play the popularity flywheel compounds to 85+ while
rival acts MEAN-REVERT to a ~70 ceiling by construction
(`pop×0.55 + reception×0.5` with receptions capped by quality). The
world's stars had a glass ceiling; the player's didn't. Difficulty
was never about judging — it was about the market not producing
peers.

**The flagship dynamic** (industry.js, `INDUSTRY.FLAGSHIP`):
- `KP.sceneCeiling(state)` — the player's hottest debuted act sets
  the bar the market plays at. No debuted act, no ceiling, no chase.
- Each rival company's best living act is its **flagship**. Weekly,
  the machine invests: `pop += gap × catchUp (.025)` toward the
  ceiling — a 40-point gap closes ~1/wk, pursuit on the scale of
  eras, not weeks.
- **The punch-up**: a flagship releasing from behind gets
  `+min(punchCap 10, gap × .25)` reception — hunger, not magic; the
  cap holds. Head-to-head weeks and chart #1 stay symmetric
  arithmetic — the rivals simply arrive at the player's weight class
  now.
- **The hunting note** (`flagshipHunt`, high): when a flagship pulls
  within 8 of the ceiling, the trades call the chase — the player
  learns the era is contested BEFORE losing a week to it.

**The tenure margin** (awards.js, `rookieDaesangMargin` 8): a
debut-year act — player or rival — must beat the runner-up by a real
margin to take the daesang; inside it, the jury defaults to a body
of work, with the envelope-debate note on the record. The rookie
grand slam survives only when the year survives every argument
against it (follows the owner's LUMI sweep question).

**Census** (all first-try): warLost 30/40 (the owner's "never lost a
head-to-head" is now impossible as a typical career), peakDenied
38/40 (releases miss #1 routinely), flagshipHunt 23/40 — while
chartTopTen and playerTopThree stay 40/40: great careers still reach
the summit; they just stop living there rent-free.

## §50 The founding (v0.9.9) — Phase C opens

Owner: *"I'm not the CEO, I work below them. how about an option,
after your reputation is high enough, to leave and start your own
label? completely fresh start, going up against what you built.
would require cash and rep."* The player's career was always the
one career the game didn't simulate. Now it is.

**The door** (`KP.foundingEligible`): exec trust ≥70 (the trust IS
the collateral — investors call her first), ≥2 full years served, at
least one real honor (award or national #1), and at least one debut
to your name. Shown on the Desk once the career could plausibly open
it — locked with the honest reason until it does.

**The war chest**: your career, liquidated. `seedBase` 60 +50/daesang
+15/bonsang +25/national-#1 +1.5/trophy +6/year, capped 320. It is
the new label's entire opening budget.

**The walk** (`KP.foundLabel(state, name)` — typed name, double-tap
confirm, irreversible, once per save):
- The old company becomes a RIVAL: prestige from your honors,
  `founderGrudge: true` (protected from lifecycle fold/merge — the
  founder's old house never quietly exits the story), and every
  debuted group converted to a rival act — same name, same members,
  same popularity, discography carried, trophies as showWins.
- The people stay people: files forever, status `rival`, contracts
  void, and a history line each — those with real standing "kept the
  door pass as a bookmark."
- The world keeps its book: group narratives retarget to the rival
  acts; company narratives drop (that reputation belonged to the old
  house); chart entries de-flagged; scenes/claims/deals/grievances/
  ghosts settle or clear.
- The fresh start: typed letterhead, new hash-picked executive,
  trust 55, fresh fiscal/staff/board, a regenerated scouting board
  (the scene knows your name now), and the founding objective:
  first debut inside 18 months. The world clock never stops.
- The fight: the flagship system (§49) means your old group — now
  the legacy's flagship — pursues and punches at YOUR new ceiling.
  Going up against what you built is mechanical, not flavor.

**§39 Phase C amendment**: Phase C ("Careers Entire") opens with the
founding — the player's own career entire. Remaining: variety
careers, hiatus & returns, the deep map, the wardrobe department.

## §51 The last group (v0.9.10) — the intro becomes true

Owner, on the new-career screen: *"it says the last group still sells
but it is aging. But then you have no group to start with. We either
need to change that wording or provide an aging group at the end of
their contracts to kind of keep it cohesive."* The second option,
obviously — the copy was always the better game.

**The seed** (`KP.newGame`, `legacySeed()`): every new career opens
with the company's six-year girl group already in the building.
- **Four vocalists, mid-twenties** (23–26): vocals 66–80 — the
  vocal-house reputation embodied — dance/charisma/visuals formed,
  ceilings nearly spent, `liveExp` 90, zero scouting fog
  (`observations` 4), morale worn to 52–64, two history lines
  (their debut; watching your introduction from the good chair).
- **The group**: debuted week −252 (5.25 years), popularity 56,
  concept `elegant` two eras deep, roles set, rooms assigned,
  `promoUntil` coherent with a last release 60 weeks back (the
  studio is open to them on your first morning), `legacy: true`
  as the start-content marker.
- **The discography tells the story**: a #1 debut single (reception
  74), then minis at 67/#2 and 58/#5 — a real peak, then the slide.
  "Still sells, but aging" is now readable on the shelf.
- **The receipts**: fandom named and fading (intensity 42), trophies
  `{countdown: 2, popWave: 2}` — real hardware, deliberately short of
  `darlingAt` (7) so the dynasty story is earned on the player's
  watch — and `firstShowWinWeek` −180 so the first-trophy beat never
  re-fires for wins that predate you.
- **The clock is the drama**: contracts run from the real debut, so
  all four are inside the §43 renewal window on day one. Their
  renewal folders reach the Desk before your first debut does — the
  opening scenario now argues with itself for your attention, which
  is the job.

**Roster order is a contract**: six trainees FIRST, then the four
veterans — every fixture that slices the roster for a debut lineup
stays honest.

**The opt-out**: `KP.newGame(seed, name, { legacy: false })` skips
the seed. Mechanism suites run lean by explicit choice; the harness,
the e2e, and suite 052 run the real opening. The battery's opening
truth lives in suite 052 — the one place that proves the game the
player actually gets.

**Knock-on rulings**: the generation-age census reads trainees and
prospects only (veterans are not evidence about the youth pipeline);
`daesangField` giants seat at base 140 (careers now start with an
established act in the race); the `showDarling` band flipped from
ceiling to floor (§18).

## §52 The second job (v0.9.11) — careers entire, item one

§39 Phase C's first line item ("The second job", from §22 v0.6.11):
secondary strengths become real careers. Productions call for the
idols the market wants — a fixed panel seat for the funny one, a
music-show mic for the poised one, a drama OST for the voice — and
the gig pays the PERSON, not the group. New module gigs.js (51
total), weekly order 785 (after contracts, before the stage door).

**The call** (`state.gigOffers`, deal-offer pattern): weekly chance
once anyone qualifies, capped at 2 open engagements company-wide.
Eligibility reads the DERIVED stats, not the résumé — varietySkill
≥60 for the panel, stagePresence ≥62 + group pop ≥50 for the MC
mic, vocals ≥70 for the OST — plus a real following (social ≥15k).
Named shows and dramas from GIGS pools. Offers expire in 3 weeks;
the Desk answers ("Casting calls" cards, accept/decline).

**The run**: weekly pay to the budget, fatigue to her body (+2),
mediaExp every 2 weeks (which feeds varietySkill back — the loop),
follower drip every other week on air. A wrapped run pays the group
+1 popularity ("individual recognition feeds back"), touches the
`variety` ambition (her OWN seat, not four promo bookings), and
counts on the file: `panelArcs`, `mcRuns`, `ostDrops`.

**The clash — the system's heart**: a busy group week (prep, promo,
or the road) always costs her body (+3 more fatigue). Whether it
costs the SHOW is a gamble: `clashMissChance` 0.25 per busy week
that the van does not make the taping. Missed tapings are counted
out loud ("the production 'understands completely', which is what
productions say while they count"), and at 3 the production quietly
recasts — public note, morale −6, no wrap payoffs. The staff flag a
moonlighting member at comeback lock, and the player holds the
lever: `KP.quitGig` pulls her out first (morale −4, controlled,
still no wrap credit). Ride the gamble or cut it short — the
scheduling tension IS the system.

**The OST**: 3 recording weeks, lump on delivery, reception rolled
from her voice + the group's reach + week luck. At ≥74 it is
EVERYWHERE (triple follower spike); either way the drama's audience
meets her without the group's name.

**The narratives** (memory): `varietyMonster` at 2 wrapped panel
arcs, `nationalMC` on the first full MC run (the public trusts few
faces), `ostVoice` at 2 drops. All three render in coverage lines,
long formation text, and the industry quote-post map.

**Bot policy**: book when she has room (no prep/tour, fatigue <55),
pull out at strain 2 with >4 weeks left (the controlled exit beats
the recast). Bands: gigBooked, gigWrapped, ostDropped, gigTension,
secondJobStory — all alive on the first calibration soak.

**Knock-on rulings**: gaffe band ceiling lifted (the second job
grows followings and fatigue — see §18); daesang giants 140→145
(the giants panel and sing OSTs too; scarcity holds).

## §53 The disappearance (v0.9.12) — hiatus as strategy

§39 Phase C item two ("The disappearance", from §22 v0.6.14).
Not-releasing was always possible; ANNOUNCING it is a move. New
module hiatus.js (52 total), weekly order 789.

**The announcement** (`KP.declareHiatus`): debuted, not in prep,
not touring, not mid-promo, not already gone. A press-release note
(`hiatusDeclared`, feed reactions through the registry), a history
line in every member's file, and the clock starts.

**The stay**: real rest — fatigue −4/week extra, morale +1/week —
and room for the second job (§52): gig offers get `hiatusOfferBonus`
+0.08 while a group is parked, and an empty calendar never misses a
taping. Past `graceWeeks` (6) the public starts forgetting:
popularity −0.6/week, fandom intensity −0.4/week, one plain desk
note when the walk down begins, and a durable `hiatusCooledEver`
stamp for the census.

**The return**: locking any record ends the hiatus at the lock —
`returnAnnounced` ("IS COMING BACK"), `g.returnFrom` stamped with
the weeks away. The release settles the bet through
`KP.hiatusReadsRelease` (same one-door contract as seasonRead):
**anticipation counts only the weeks PAST grace** — the weeks that
paid the cooling toll — at 0.75/week, capped at 10. A stay inside
the window is a schedule gap wearing a press release: stamp
consumed, nothing earned. This is the load-bearing ruling — the
first soak exposed that a floor below the grace window made a
6-week "hiatus" a free reception bonus on the natural release gap
(dominant strategy, no bet). Now every point of hype is bought with
popularity, which is the §22 spec's actual sentence: cooling risk
vs full restoration and anticipation.

**Blocked doors**: touring while announced-gone is refused ("a
hiatus with tour dates is called a tour").

**UI**: group page — declare button with a confirm sheet that
states the trade; hiatus status in hero and cards; the parked card
counts the weeks and switches tone at the grace boundary.

**Bot policy**: declare at avg fatigue ≥55 with an open calendar;
stay grace+6 weeks so the bet is real; un-park by locking the
return. Bands: hiatusDeclared, hiatusReturned, hiatusCooled (ceiling
1.00 by design — every earning hiatus pays the toll).

**Knock-on rulings**: secondJobStory ceiling 0.70→0.85 (parked
groups wrap gig arcs clash-free — the synergy is the thesis);
daesang giants 145→148 (declared returns land warmer; the giants
stage returns too — third step, see §18 for the indexing note).

## §54 The audit (0.9.13) — the world holds

Owner: *"we have so many systems interacting that it's time for a
full code audit: bugs, saves, aging, persistence, balance, code
health, anything that can corrupt a long save."* Four parallel
review passes (determinism, growth, departure integrity, aging &
economy) plus a new permanent torture tool. Every finding verified
against the code before fixing; every fix regression-pinned in
suite 055 (90 assertions).

**The new rail** — `tools/audit_longhaul.js`: five scenario careers
to week 620 (three standard, one total neglect, one founding
mid-run) with a deep checker every 10 weeks: referential integrity,
status-level engagement checks, NaN/Infinity sweep, clamp ranges,
save round-trip identity every 40 weeks, determinism forks at three
horizons, size telemetry. Runs clean; joins the ship ritual for
releases that touch state shape.

**Fixed — save-killers:**
- A group emptied by departures while holding a locked release
  crashed `resolveDebut` every week FOREVER (the one true
  brick-a-save bug found). `departIdol` now closes the chapter:
  prep/tour/hiatus/demos die with the act, `retiredWeek` became a
  real gate honored by planDebut, tours, hiatus, the studio picker,
  the Monday meeting, dormancy, and the demos desk.
- localStorage quota failures threw out of every autosave
  mid-action: now caught, warned once, career safe in memory.
- Founding generated people without re-syncing the module id
  counter (id collisions could overwrite files on loaded saves) and
  skipped the social mint (render-time state writes). Both now
  match the scouting/industry discipline — pinned by a
  found-the-same-save-twice byte-identity test.

**Fixed — ghosts and holes:** departure clears pending deal/gig
offers (and `respondDeal` gained the status guard `respondGig`
always had — no more signing departed idols for money); unreleased
tracklist credits strip when the credited member departs; the
maknae recomputes; trainee release sweeps scenes/project
locks/hype directives with narration instead of silent lapse; the
same-week door knock for departed people closed; founding clears
dealOffers/gigOffers/gigs/project, deletes never-signed prospect
files, stamps `p.company` on converts, frees fan-account handles,
and re-keys monsterRookies → rivalMonsterRookies while dropping
group narratives that cannot be told from the other side.

**Fixed — the ratchets (balance):**
- Award scoring counted CAREER-TOTAL trophies, making the daesang
  an annuity by year five. Now `trophiesYear`/`showWinsYear` —
  "the whole year, weighed once" is finally literal — reset at the
  ceremony, symmetric for rivals. The giants' bar stepped back
  148→140 (the three steps countered exactly the inflation this
  removes).
- Budget runaway (measured: ~9,000 by year 13, every cost gate
  trivial): a monthly success payroll — 1/member + 0.2 per
  popularity point above 50 for debuted acts. Rookies are cheap;
  institutions bill like institutions. The soak bot learned to
  read the CEO's letters (no tours, lean formats under fiscal
  pressure) — the same adaptation a sensible player makes.
- The three ungated scene spends (renewal sweeten/terms, poach
  counter, truck concede) now respect the balance.
- Prospects age out of the board at 24 (files deleted — nobody
  ever met them); every eligible 19-year-old graduates (the
  narration cap no longer eats the third diploma).

**Fixed — kernel-law and hygiene:** builder name suggestions no
longer peek the live rng stream (hash-seeded throwaway); the Desk
marks mail read at navigation time, not on a 600ms render timer;
releases archive their own tracklist copy (alias hazard); no more
`undefined` stored in state; dead constant removed; OST NaN guard;
objectiveHistory capped at 50. `KP.validateState` extended with
status-level checks — the reason the harness never saw these holes
is that it only checked existence.

**Measured and accepted (watch, not fix):** save growth ~40-45
KB/year dominated by rival-native files (~600 KB at year 13;
single-copy quota breach extrapolates to ~a century); no senescence
mechanics (a 33-year-old trains like a rookie — flavor gap, owner's
call); trust saturates high by year 3; the deep economy fix
(stature-scaled production costs) deferred — it changes visible
prices and deserves the owner's feel pass.

## §55 The depth mandate (post-audit consult)

Owner, in full: *"the game is extremely wide but it lacks depth
when it comes to career narratives, both for groups and soloists."*
Six named holes, each with the owner's example preserved and a
mechanism sketch. These are the raw material for the re-sequenced
Phase C map in §39 — each ships as its own release with the full
ritual.

**1. The sponsor's invoice** (*"sponsors are only a positive right
now. you sign the contract and nothing happens. they should come
with all sorts of obligations, sponsored shows etc."*). Deals stop
being free money: each contract carries DUTIES — periodic sponsored
appearances that claim real calendar weeks (the gig-clash pattern,
proven in v0.9.11), with missed obligations straining the deal
toward clawback. And the solo request (*"the member who gets asked
to perform solo for a sponsor and you have to decide if you want to
let them"*): mid-contract, the brand asks for the face ALONE — a
scene with teeth. Allow: money, individual shine, envy seeds in the
room. Refuse: the brand cools, and she knows you said no.

**2. The gravity** (*"social media, executives, and the industry as
a whole would begin clamoring for a solo career for a member who
begins to transcend their group"*). A transcendence read — her
share of the group's followers, her narrative shelf (fancam star,
it-girl, variety monster, OST voice), her breakout count — crosses
a line and the CLAMOR begins, from every voice the game already
has: the trades write the "bigger than the group?" feature, the
fandom splits into solo-clamor and ot5-loyalist camps (discourse),
the exec asks at the Monday meeting, sponsors request her alone
(§55.1), and eventually SHE knocks (the §40 door, the ask she
rehearsed). Player paths: the in-group solo debut, the hold (a
resentment clock the renewal table will read), or the spin-out.
Plus group identity arcs (*"a group becoming known as festival
icons"*): repeated behavior mints identity narratives — festival
icons, the variety group, the OST factory — that change how
invitations and coverage arrive.

**3. The bad blood** (*"when group members don't get along, the
negative effect is barely felt. I want rivalries to be able to
form, both within the group, company, and scene as a whole with
the fandoms serving to throw gas on the fire"*). Three tiers, one
principle — conflict must COST and the fandom must amplify:
in-group, sustained cold pairs escalate to a rivalry state with
felt effects (stage costs when both perform, tracklist credit
disputes, camera-time fights, the "they didn't stand together"
discourse the fans always notice); in-company, two own groups too
close on the calendar cannibalize each other and their fandoms
turn on each other; in-scene, the existing feud/rivalry narratives
get the fandom-warfare amplifier — every shared week a fan-war
discourse that can boil.

**4. Festival season** (*"we should have annual festivals that
actually reach out to you about a group and you have to see if you
can fit in the schedule, arrange the travel, etc."*). The §46
festival pass grows up: NAMED annual festivals with weeks-of-year,
prestige tiers, and slot deadlines; organizers INVITE — a scene,
not a notification — and the answer means schedule surgery
(promo/tour/gig conflicts read out loud), travel with a fatigue
bill, a fee, and a slot. Playing the circuit builds the
festival-icons identity (§55.2); icons get headline calls.

**5. The tongue** (*"we can send our group to North America with no
media obligations and no clue if anyone can even speak English.
that's a real hole"*). Language per person: hash-seeded aptitude,
trainable (a focus, or a tutor with a bill). Overseas legs and
region promotion carry MEDIA OBLIGATIONS: with no speaker in the
room, the interviews flop (region gains cut, the awkward-clip
discourse); a fluent member becomes the voice abroad — individual
shine that feeds §55.2; an interpreter is hireable, at a cost and
a distance. Ships WITH the deep map — language is what makes the
region verbs earn their depth.

**6. The standing examples clause** (*"there are so many more
examples of things we could be doing"*). The pattern behind all
five: an event the game already narrates should instead ARRIVE
(a scene with a decision), CLAIM something real (weeks, money,
morale, a relationship), and LEAVE a mark (a narrative, a ledger
entry the world reads back). Every future depth release measures
itself against that sentence.

### The second sitting (owner's five + the agreed trainee pass)

Owner: *"since we're deep into the planning phase, let's keep
doing this."* Five more, each with the mechanism sketch:

**7. The service** (*"boy bands are missing one massive part of
their stories: military enlistment"*). Every male idol carries an
enlistment window with a hard deadline age; postponement runs out.
The decision is the industry's classic: STAGGER (the group works
short-handed, sub-units carry eras, the map of who-is-away-when
becomes the calendar's spine) or TOGETHER (the full ~two-year
chapter — the hiatus system's biggest customer). The contract
clock pauses in service; the fandom starts the wait ("see you in
2027"); the DISCHARGE RETURN STAGE is the event the whole system
builds toward — anticipation mechanics already exist (§53).

**8. The clip** (*"I'd like to see fancams and viral reactions
come as a result of actual stages... right now they just kind of
happen with no rhyme or reason"*). A rewiring pass, not a feature:
viral moments spawn FROM named stages — a show appearance, an
encore, a festival slot, a tour stop, a gayo stage — and the story
carries its provenance forever ("the Countdown fancam"). The
weekly dice roll is demoted to the rare "an old clip resurfaced"
(which is the catalog stirring — see the pitched list). Ships
BEFORE the gravity so transcendence reads sourced virality.

**9. The practice room years** (the agreed trainee pass — *"trainees
in general were where a lot of my thoughts were, and I think we're
on the same page"*). Monthly evaluation days with rankings the
trainees can see and feel; debut-team speculation once a project
opens (they know, and the game finally uses that they know); the
trainee who QUITS on you; and the aging-out clock — the six-year
trainee watching younger kids debut past her is a story the game
must be able to tell, and end, in every direction (her leaving,
your releasing, the last-chance debut).

**10. The rise and fall** (*"rival labels don't ever seem to do
anything but exist below me... I'd like to be able to see them
fold if they're not successful just like they can reach the top"*).
The lifecycle exists but is invisible and consequence-free. The
pass: rivals get LEGIBLE ERAS (rising / imperial / fading, worn on
their cards and in the trades' annual power ranking); a rising
rival genuinely overtakes (the flagship physics get a company-level
tier); and a COLLAPSE is an event with fallout — the roster hits
the open market as a new signing class: free-agent idols with
careers, fandoms, and opinions about your company.

**11. The imprint** (*"I'd like to see an option to form an
associate label for the big powerhouse we create"*). The late-game
verb: a subsidiary label with its own letterhead — install a head
(trusted staff, or a graduated idol turned executive), seed it
with cash and a group or debut it fresh, and it runs
semi-autonomously with prestige and profit flowing up (and its
failures reflecting on the house). The founding machinery run in
reverse: you stay, the label spawns. Phase C finale material.

### The fourth sitting

**14. The regional schools** (*"the industry in real life has worked
to decentralize and find talent outside of Seoul, and we should
too. they will be persistent and tracked, and when you or another
company begins casting for a new group, these schools would
naturally provide some of the auditions"*) → merges into THE
PRACTICE ROOM YEARS — the same pipeline, deepened at its other
end. Named persistent academies in the KR_CITIES the home circuit
already knows (the Busan vocal academy, the Daegu dance school),
each with a specialty lane, an alumni ledger, and a REPUTATION
that moves with its graduates' careers — the school whose alumna
becomes an it-girl gets hot, and the trades say so. When casting
opens — your project, or a rival's next debut (rivalScoutingWeek)
— the schools submit auditioners: prospects arrive carrying their
school on the file, and companies compete over the same pipelines.
Player verbs: the scouting trip (a visit buys sharper reads on a
school's current class) and the partnership (a retainer for first
look at their best). The far door — founding your OWN academy —
is noted for the imprint's era, not this one.

### The fifth sitting

**15. International scouting** (owner: *"international scouting...
yea or nay?"* — ruled YEA) → merges into THE DEEP MAP + THE TONGUE
(slot 10), where its enabling systems live. Global audition tours
as a scouting verb: fund the Bangkok, Tokyo, or LA auditions —
costly, higher-fog, higher-ceiling — and international prospects
arrive with a home region and a native language on the file. An
international member is a strategy, not a flavor: her home corner
of the regions map loves her from day one (the §28 hash-truth,
finally earned), she IS the fluent voice for that market's media
obligations, and the inversion is real — her DOMESTIC obligations
need her Korean, which the tongue tracks and trains. The airport
crowds when the tour reaches her hometown write themselves.
CONTENT-LAW EXTENSION, ruled at folding: the real discourse around
international members includes xenophobia, and the game will not
reproduce it as fan-voice content — home-region pride and the
bridge she becomes are the feed's register; the ugly half, if
touched at all, is institutional pressure the player manages,
never snark the feed performs. Name pools per origin are data
work, done with care.

### The pitched eight — all ruled in

Owner: *"yeah I want you to fit all of them into the order where
they fit neatly."* Each found its home by shared machinery:

- **The catalog alive** → merges into THE CLIP (§55.8): a
  resurfaced old clip IS the catalog stirring — one release owns
  provenance in both directions, the new fancam and the four-
  year-old B-side reverse-charting off one.
- **The contested release loop** → its own release, THE TITLE
  FIGHT: the pitch meeting gets politics (the producer's push,
  the exec's known taste, the member's demo on the table against
  the professionals'), repackages extend eras, the MV becomes an
  object with a budget tier.
- **Idol slumps** → merge into THE GRAVITY: the same individual-
  trajectory rails read both directions — transcendence up, the
  slump down (the vocalist who loses her nerve for an era). One
  release builds the arc machinery.
- **Fansite masters** → merge into THE BAD BLOOD: the fandom
  warfare gets named faces — the big accounts with funding power,
  closeness, and turn risk are precisely who throws the gasoline.
- **Award night attended** → merges into FESTIVAL SEASON: one
  release makes the calendar's events ATTENDED — invitations,
  schedule surgery, and the ceremony played out as a scene
  (seating, speeches, the daesang moment) instead of a note.
- **Being poached yourself** → merges into THE RISE AND FALL: the
  imperial-era rival's boldest move is the job offer — the
  founding's mirror, played against you.
- **Executive succession + the founder's board** → merge into TIME
  TAKES ITS SHARE: succession is the strongest answer to trust
  saturation (a new CEO resets the ledger to "prove it again"),
  and the founder's own board is the same medicine for the
  post-founding game.
- **Dating & Dispatch** → its own release, THE SECRET, late in
  the order on purpose: secrecy, the reveal, the response menu,
  the fandom's spectrum — written under the full content law
  (never at bodies, the snark aimed at institutions, the people
  written with care).

### The third sitting (two more, folded on arrival)

**12. Named generations** (*"we need a way to name generations,
because we will naturally create them with how much we're
expanding on rivalries"*) → merges into THE RISE AND FALL. The
scene gets a memory of its own eras: generation boundaries
declared by the world when the wave turns (a cluster of landmark
debuts, a genre shift, a dominant act dethroned), every act
stamped with its generation, the trades writing "4th gen" as
naturally as they write a group's name. Generational discourse
(gen-vs-gen comparisons, "the gen-2 sound is back" — which feeds
the catalog's resurfacings), and the TORCH-PASS narrative: the
week a rookie outsells the old guard's flagship, a generation
turns, and everyone knows it.

**13. Professional rivalries** (*"groups should have professional
rivalries as well beyond just when they've gone head to head"*) →
merges into THE BAD BLOOD. Rivalry formation gets SOURCES beyond
the shared calendar week: the debut-class rivalry (same cohort,
measured against each other at every award season — §46's
debutClass finally weaponized), the concept rivalry (two elegant
groups the coverage cannot mention separately), the position
rivalry (both chasing the same seat — #1 girl group of the gen),
and the award rivalry (beaten to the daesang twice by the same
name). Each source has its own formation logic, flavor, and
fandom temperature — the calendar collision becomes just one road
into a rivalry, not the only one.

## §56 The price of fame (v0.9.14) — map slot 1

Owner: *"well, let's start with 1."* Two systems, one sentence:
success stops being free.

**The stature bill** (audit B1, completed properly). ONE truth —
`KP.statureCostMult(g)` = ×1 at pop ≤50, +0.012 per point above
(×1.36 at 80, ×1.6 at 100); `KP.recordBill` prices promo + format
through it. planDebut charges it, the studio displays it (with the
"an act this size bills like it" line), and both bots estimate
with it. Rollout bookings stay flat — a radio slot costs what a
radio slot costs. The 0.9.13 payroll simplifies to a flat per-idol
retainer: fame-scaling lives in the production bill, where it
shadows the income it prices. Measured (620-week probe): unchecked
~8.9k; with the sink ~5.7–6.9k — a real governor, not yet a
plateau (see §18).

**The sponsor's invoice** (§55.1). A deal is a JOB now:
- Every `obligationEveryWeeks` (10) the brand books the face. On
  tour or benched = MISSED — rebooked pointedly in 3 weeks, and
  two consecutive misses terminate for cause with a quarter-lump
  clawback. In promo/prep = KEPT but squeezed (+4 fatigue, and the
  narration knows the van schedule). Otherwise kept clean.
- `state.sponsorLedger` keeps the durable census (kept, missed,
  clawbacks, solo asked/allowed/declined).
- THE SOLO REQUEST: once per deal, after week 6, the brand asks
  for the face ALONE — a scene. Allow: half a lump again,
  followers, hype, morale, `flags.soloShines` stamped (the gravity
  will read it), and the competitive members feel it. Decline: the
  brand cools (weekly payment drops), and she hears about the no
  from the brand manager, not from you — `heldBack` on the
  directed ledger, which the renewal table reads at −2 plus the
  mood it sours. Expire: the brand reads silence fluently.
- Desk: a "Sponsorships running" card with next-appearance dates
  and miss counts.

**Tuning history**: statureCostPer opened at 0.02 and starved the
soak economy (the belt-tightening bot spiraled: pressure → lean
singles → less income → pressure). Settled at 0.012 with the
payroll flattened. Fiscal bands recalibrated by ruling (books
0.85→0.95, trust-warnings 0.35→0.45): the CEO reading the books
most careers IS the feature, per the owner's own brief.

## §57 The clip + the catalog (v0.9.15) — map slot 2

Owner (§55, second sitting): *"I'd like to see fancams and viral
reactions come as a result of actual stages, not just randomly
throughout a career. right now they just kind of happen with no
rhyme or reason."* Two halves: virality gets provenance, and the
back catalog wakes up.

**The clip** (provenance). `KP.recordViral(state, person, source)`
now takes `{kind, label}` — the stage the moment came from. The
file stamps `p.lastViral` {week, kind, label}, the history keeps
"Went viral: <label>" forever, and the narrative carries
`meta.source` so the coverage names the stage (fancamStar: "It
started with <source>."; oneToWatch: "<source> did the rounds").
Six call sites sourced: the debut/comeback stage (spark), the
dance challenge, the encore, the ending fairy, the tour stop, the
practice-room cover. Sourceless calls still work (compat) — they
just have no story to tell.

**The catalog** (`catalog.js`, weekly order 565; `state.catalogLedger`
{resurfaced, revivals, lastClip} durable). Two blocks:
- *The resurfaced clip*: weekly `resurfaceChance` (0.015), an idol
  from a group ≥40 weeks debuted; the clip names a real stage (a
  trophy show or the first release) and its age; recordViral with
  kind `resurfaced`, social spike ×0.8. The old "random viral"
  roll is demoted — random no longer means sourceless.
- *The reverse chart run*: per group, releases ≥48 weeks old with
  reception ≥50 (or sleeper-blessed) can catch fire —
  `revivalChance` 0.003, +0.04 while a resurfaced clip of that
  group is ≤6 weeks warm (the clip→song pipeline). Sleepers get a
  +20 sort nod. The track re-enters the chart (`catalog: true`,
  score 46 + reception-scaled), `r.revivedWeek` prevents reruns,
  pop +2 / fandom +3 if the group is alive — and THE ROYALTIES
  arrive either way (base 25 + 1.2×(reception−30), fandom-scaled
  when alive): the label owns the masters, so a disbanded group's
  song still pays the company that shipped it. Both notes say the
  amount. catalogRevival narrative + feed reactions through the
  registry, with a disbanded variant ("the song did not").

**Calibration** (two soak rounds + a probe):
- revivalChance halved 0.006→0.003 (29/40 careers winning the
  lottery is a salary), revivalPop 3→2 (revival pop feeds the
  daesang score ×1.2 AND the stature bill — at 3 the catalog was
  quietly co-writing award season: daesang 17→20/40).
- The harness bot reads the sponsor calendar before booking tours
  — but the first gate (8 weeks) grounded ~80% of the road
  against a 10-week obligation cycle and the bot stayed home
  stacking comebacks (daesang flood, tour income gone). Settled
  at 4 weeks: the actual tour span.
- The royalties windfall was the fiscal fix found by probe: with
  the catalog OFF, trust-hitting fiscal warnings still ran 19/40
  — the catalog inflated bills (pop) without paying its own way.
  Income landing on exactly the orgs whose bills it raises closed
  the loop: 17/40, in band.
- hiatusDeclared ceiling ruled 0.95→1.00 (flapped at its own
  ceiling three builds; the floor is the alarm).
- Fixed en passant: society.js waiting-room picker crashed when a
  group emptied mid-promo (members.length guard, found by suite
  057); constants.js historical version comments repaired (the
  second job is v0.9.11, the disappearance v0.9.12, prospectAgeOut
  0.9.13 — whole-file version bumps had drifted them; bumps are
  now surgical, VERSION line only).

Suite 057 (27): provenance stamps/history/meta, sourceless compat,
resurfaced clip, reverse chart run (sleeper nod, catalog chart
entry, pop bump, royalties, anti-rerun), pipeline (base 0, boost 1
— only the boost fires), disbanded revival + validateState clean,
determinism fork.

## §58 The practice room years + the regional schools (v0.9.16) — map slot 3

Owner (§55.9 + §55.14): *"trainees in general were where a lot of my
thoughts were"* / *"the industry in real life has worked to
decentralize and find talent outside of Seoul, and we should too."*
The pipeline deepened at both ends: where they come from, and how
they live and leave.

**The regional schools** (`schools.js`, weekly order 620;
`state.schools` persistent, migrated into old saves on the next
tick). One named academy per home-circuit city (six), each with a
specialty lane (vocal / dance / all-round), an alumni ledger that
writes at the signature (yours AND rivals'), and a REPUTATION that
moves with its graduates: +4 when an alum reaches a debut stage,
+2 per viral week, +6 when she becomes the it-girl — drifting back
toward 45 absent news. Past 75 the trades call the school HOT
(note + feed reaction through the registry). While casting is open
anywhere — your project, or a rival inside its hunger window — a
school submits its class (~0.22/wk, rep-weighted pick): prospects
arrive with the school's stamp on the file, and everyone fishes
the same ponds. A hot school's class arrives better drilled (lane
skill lift, never breaking the cone). Player verbs, priced as
discretionary spending:
- *The scouting trip* (10, 8-week cooldown per school, and ONE
  trip per week total — 0.9.16.1, owner: Scout Im is one person on
  one train): +1 observation on every board lead from that school,
  plus one new name in the notebook.
- *The partnership* (32, 26 weeks): first look — their leads reach
  the desk pre-read, and rival scouts cannot open interest on a
  protected file while the window holds (the rival picker skips
  `firstLookUntil`).

**The practice room years** (`practice.js`, weekly order 610 —
right after releases, so debuts land on the room THIS week;
`state.practiceLedger` durable):
- *Evaluation day*, monthly: every free trainee ranked (talents +
  charisma + live experience + the day's mood), rank on the file,
  morale moving at the top, the bottom, and the biggest climber.
  Three straight months at #1 makes her "the ace" — and the ace
  left off a posted lineup takes it hard (morale −6, `passedOver`
  on the directed ledger, the history line about the silence).
  The board renders in the Training tab; the trainees read it
  before you do.
- *The speculation*: the week a project opens, the room knows —
  hopefuls near the top of the board arrive an hour early, the
  rest do the math and say nothing.
- *The resignation letter* (scene): a discouraged long-timer
  (morale < 38, tenure > 60wks, worse if bottom-ranked, aging-out,
  or told the truth) brings it in. Accept with grace / a real week
  off (costs 8, quiets 12 weeks) / PROMISE the next lineup — a
  claim with teeth: `debutByPromise` resolves KEPT when she
  debuts, and MISSED the moment a lineup goes out without her OR
  the 40-week window closes — she packs the same night, and every
  trainee in the building does the arithmetic. Unanswered letters
  answer themselves (she leaves).
- *The aging-out clock*: a trainee ≥90wks tenure (or 22+ with
  40wks) watching a debut from the doorway takes the morale hit,
  gets the history line, and asks the question ONCE — a scene with
  all three endings: the promise (same claim), honesty (morale −8,
  `toldStraight` +1, resigned — quit risk up), or the kind cut
  (release, with a recommendation letter). And the fourth ending
  the game wants you to reach: the LAST-CHANCE DEBUT — she makes a
  lineup, the bow lasts a beat longer, `lastChanceDebut` narrative
  + feed, the promise resolves kept.

**Calibration** (three soak rounds + a probe): the school desk's
first prices (~170/career) tipped marginal orgs into trust-hitting
fiscal warnings — proven causal by an A/B probe with the desk
disabled (18/40 vs 19-21/40). Trip 12→10, partnership 40→32, and
the bot trips less often and never under fiscal pressure (red
quarters ground the train like they ground the road). Two old
bands re-ruled off their own ceilings (catalogRevived 0.70→0.75,
gig-ended-early 0.95→1.00 — the flap precedent). And the harness's
oldest fatigue invariant learned about second jobs: "a schedule to
blame" now includes a gig run that ended within the recovery
window (the exemption list predated v0.9.11).

Suite 058 (62): map seeding, lane cones, trip/partnership
mechanics, first-look protection, alumni ledger + moving rep + the
hot crossing, old-save migration, eval ranks, speculation, the
passed-over ace, all three letter answers, the broken promise, the
aging clock, the kind cut, the last-chance debut, determinism.

## §59 The title fight (v0.9.17) — map slot 4

The game's most-repeated loop, finally contested. §39: *"The pitch
meeting gets politics: the producer's push, the exec's known
taste, the member's demo against the professionals'; repackages
extend eras; the MV becomes an object with a budget tier."*

**The advocates** (`generateDemos` stamps them; `planDebut`
settles them). Every meeting has politics, worn openly on the
demo cards:
- *The producer's push*: ONE producer campaigns per meeting — his
  best hook. Pass his push twice (`pr.snubs[groupId]`) and he
  cools: his next pitches to this room arrive B-grade
  (snubHookMalus 6), and the good hooks go elsewhere — which was
  always the ghost demo's origin story. Picking his push clears
  the ledger.
- *The exec's known taste*: demos matching `execTaste` wear her
  stamp, deterministically. Passing her kind of record keeps a
  tally (`state.execTastePasses`); the third pass draws the
  remark — "Taste is not a directive. It is, however,
  remembered." The smile at results already existed (v0.9.8).
- *The member's demo*: a writer in the lineup (producer-minded or
  creativity ≥ the booklet bar) sometimes pitches her OWN —
  wilder hook distribution (lower floor, bigger spread: raw, or
  special). Picked: morale +8, her name rides the TITLE line into
  the booklet machinery, and a landing (≥65) gets the
  "self-produced" recaps (memberTitle ind + feed). Passed at a
  real lock: morale −4, `songPassed` on the directed ledger, the
  history line about filing the demo, not the feeling.

**The repackage** (`KP.planRepackage`). At release, the demos the
meeting passed on go into `g.eraLeftovers` (minus the one the
ghost machinery shopped). Inside `windowWeeks` (6) after promo
ends — album formats only, once per era — the era re-releases
with a leftover as the new title: cost ×0.55, MV optional, 3-track
reissue, 3-week cycle, revenue ×0.75, and reception carries the
era's heat (+15% of the era's reception above 50, when ≥60). The
eraExtended note + feed know exactly what a repackage means
("the fandom is already budgeting for the new photocards").

**The MV** (`plan.mv`). Priced as DELTAS so the default bill
never moves: plain −12 (the performance cut — saving is real, and
the internet's receipts go to the COMPANY, never the members),
standard 0, cinema +45 — all × the stature multiplier. Cinema:
reception +4, breakout spike ×1.6, the whole regions map +2 (MVs
are how overseas meets a record). Plain: reception −2 and the
polite snark. The release archives its tier.

**Calibration** (probes, recorded honestly): the bot repackages
hot eras and flexes cinema when rich — and the probes showed
repackages are net-PROFITABLE (fiscal improved with them on) and
cinema barely registers. The fiscal trust-warning band's flood was
neither: measured 14-25/40 across ten soaks in three releases,
its 0.45 ceiling sat inside its own noise and flapped per
reshuffle — ruled to 0.65 (the tail where a genuine poverty
spiral would push), per the v0.9.14 owner brief that the CEO
reading the books IS the feature. hiatusReturned ruled 0.95→1.00
(the flap precedent). The producer-cooling path runs dormant in
soak by construction — the bot picks the best hook, which IS the
push — suite-held, §18.

Suite 059 (44): one push per meeting on the best hook,
deterministic taste stamps, the member demo (ledgered), her title
credit riding to the booklet, the pass (morale/directed/history),
snub ledger, the taste tally + remark, MV bills and the twin-fork
reception gap (exactly the tier gap), the repackage
(window/drawer/carry-by-formula/short cycle/once-per-era/single
refusal), determinism.

## §60 The gravity, both directions (v0.9.18) — map slot 5

Individual trajectories get rails. §39: *"the transcendence read
and its clamor (solo-in-group / the hold / the spin-out) — and
the slump, the downward arc with its own middle register. Group
identity arcs."* One module (`gravity.js`, weekly 640), one
ledger (`state.gravityLedger`), both directions of the same
physics: a member can outgrow the room, and a member can lose it.

**The read** (`KP.transcendRead`). Deterministic, no rolls: the
follower gap is the spine — `(share − 1/n) × 120` — plus the
shelf (narratives that name HER: fancam star, it girl, variety
monster, national MC, OST voice, brand darling, ×8 each),
breakouts (×5, cap 4), and solo shines from allowed sponsor
stages (×4, cap 3). `KP.gravityWord` translates it: "one of the
room" → "the face" → "first among equals" → "bigger than the
group?". Crossing `transcendAt` (24) starts a watch; holding it
four straight weeks (`holdWeeksToClamor`) begins the clamor.
Groups under `minMembers` (3) are exempt — a duo IS two solos.

**The clamor, staged.** The trades run the feature (`biggerThan`
narrative minted, `gravityTrades` note, ledger `clamors`). Week
3 the fandom formally splits — a `soloClamor` discourse where
both camps love her, which is what makes it a war. Week 6 the
board asks: the NEXT Monday meeting leads with the solo question
(`state.gravityExecAsk` → `soloQuestion`), promise or "the group
comes first" (morale −3, heldBack). Week 10 she knocks — the
`soloKnock` scene, the ask she rehearsed: promise (a `soloPromise`
claim, 30 weeks, one truth shared with the exec's promise,
dup-guarded), hold (heldBack −2, morale −5), or open the door
(`graduateToSolo`, settled `spinout`). Ignoring the knock is
leftWaiting. Past the exec stage an unanswered clamor ticks the
resentment clock every 6 weeks (morale −2, heldBack) — **unless a
promise with a date is on the record**: a promise is an answer,
not a hold, and breaking it already costs more (morale −8,
promiseBroken; the missed date resolves against you). The settle:
any solo credit of hers dated after the clamor began exhales the
whole thing — morale +8, fandom +3, promiseKept, both camps told
they won, live clamor discourses resolved. A live clamor also
×3s the sponsor solo-ask chance (`sponsorMult`) — the market
reads the trades too.

**The slump.** Entry (rolled, `enterChance` 0.08/wk): morale
< 42 AND confidence < 45 AND a fresh wound (last release
miss/quiet, or an encore-era storm inside 8 weeks) — the nerve
goes when everything else already has. While slumped, `derived()`
damps stagePresence and liveReliability ×0.82 (`flags.slump` —
the stage stats, never the practice room; the "the nerve" chip
on the condition line says what the staff know). The `quietEra`
scene offers the middle register: shield her (8 weeks off the
front — confidence +1.5/wk, protected directed, and the group's
stages miss her: `shieldPerformance` −3 to live scoring), push
(−1/wk), or have the friend talk first (morale +4, shield
recovers ×1.5 after). Exits: confidence back to 55, sixteen
weeks of just living, or THE STAGE — a show win while slumping
ends it that night (`g.lastShowWinWeek`, stamped by shows.js),
`foundFooting` note, history, ledger.

**The identity arcs** (one-truth counters from the systems that
already count): `g.festivalsPlayed` ≥ 3 → `festivalIcons`
(festival pay ×1.6), summed panel arcs + MC runs ≥ 3 →
`varietyGroup` (gig offers ×1.6), summed OST drops ≥ 2 →
`ostFactory`. Narratives with memory/industry/feed voices.

Soak reality (measured, 40 + 80 seeds): end-state top reads
median ~50 vs the bar at 24 — over 140 weeks nearly every group
mints its biggest member, which is the genre truth, and ~all
settle with the in-group solo because the release cadence (~20
weeks) is the real clock. The promise-pause is what keeps that
humane: before it, 100% of orgs paid resentment ticks while the
wheel turned (structural, not chosen); after, 13/80 — the orgs
that held or let a promise lapse. The slump is fully dormant in
bot play (morale-managed bots never crater) — suite-held, §18.

Suite 060 (37): the deterministic read + word + no-re-roll, the
staged clamor (trades/narrative/discourse/exec question) and the
injected-credit settle, the knock's three forks serialized
(promise → backdated miss → promiseBroken; hold → heldBack;
open → spinout), the slump entry/damp A/B/shield/stage exit,
forced-counter arcs + feed registry, 40-week determinism fork.

## §61 The mandate (planning sitting; items 1/2/5 SHIPPED v0.9.19 §62, items 3/4 SHIPPED v0.9.20 §63)

Owner, verbatim: *"I'd like to pivot away from the player just being
able to debut a group or solo whenever they want. typically the
directive would come down from above when it's time to debut a new
act. the player is essentially an executive producer. I'd also like
to add 3 year trainee contracts in line with the current real life
standard. and I'd like to add more options for group members: the
option to remove them from the group but retain their contract,
terminate them entirely, or put them on hiatus."* Plus voluntary
exits, answered from the record below. Four items, one theme: the
player's chair gets a job description — executive producer, not
owner-operator. Placement ruled by the owner at this sitting: BEFORE
slot 6, as one release (or two if the build wants a seam: the
mandate, then the member desk). GO given next sitting, with a fifth
item: *"I'd like to see hype build around debuts and comebacks after
we've announced them. right now we announce it and the feed is
basically quiet"* — the announcement rollout ladder (teaser beats,
the feed anticipating, hype accruing toward the date) ships with the
mandate. Build order: v0.9.19 the mandate (items 1, 2, 5), then
v0.9.20 the member desk (items 3, 4).

**1. Debuts come down from above.** The generalization of machinery
we already have: the hard directive (§10c) is an exec-MANDATED debut
with a dated window, the pet project (§32) demands a solo, and the
secondGroup Monday question already puts lineup timing on the exec's
record. The pivot: `planDebut` for a NEW act gates on an open
mandate. Mandates arrive from the sources the game already reads —
board season, a hot trainee room (the practice-room speculation),
market reads, hype directives, the pet project — each with a window
and a shape ("a girl group, this year"; "her, alone, 20 weeks").
The player executes everything inside it: lineup, concept, song,
budget, timing. Design guards: (a) the player can PITCH upward — a
meeting verb that asks the board for a mandate, agency preserved as
persuasion with trust as the currency; (b) a full trainee room the
exec ignores must be rare by construction (the exec reads the same
room the player does); (c) COMEBACKS stay free — the mandate gates
new acts, not the release loop; (d) the founding (§51) flips the
chair: your own label answers to nobody, which retroactively makes
Phase C's exit MEAN something.

**2. Three-year trainee contracts** (the real-world standard). A
trainee clock stamped at signing, ~156 weeks, running beside the
practice-room tenure machinery (§58 evals, aging-out, last chance).
At expiry: renew (a real conversation — her read of her own odds
against the room's), walk (the file remembers), or convert early at
debut into the seven-year idol contract (§46, existing). Interacts
with slot 3's shipped systems: the aging-out clock and the trainee
contract clock are two different fears and should FEEL different —
one is the market, one is the paper.

**3. The member desk** — three verbs on a contracted member, all
consequences the systems already price:
- *Remove from the group, keep the contract*: she becomes a groupless
  idol — machinery live since 0.9.18.2 (renewals null-safe, gigs and
  second jobs continue). Directed ledger takes the hit; the fandom
  asks in public; the door back (a future lineup, her solo) stays
  open. This is the line-up surgery verb the builder's post-formation
  editing (§13) never had.
- *Terminate entirely*: the buyout. Money cost scaled to remaining
  contract + stature, morale shock to everyone who shared a dorm
  with her, fandom/discourse fallout, and the standing clause (§55.6)
  applies — the industry watches how companies end people.
- *Individual hiatus*: the group promotes as N−1 (the real-world
  standard for health/rest); her fatigue/nerve recovers on the
  group-hiatus rails (§the disappearance) scoped to one person; the
  slump's shield (§60) is the 8-week version — this is the open-ended
  one, with the same public-forgetting physics.

**4. Voluntary exits — the record and the gap.** Exists: idols choose
to leave at renewal tables (§46; the longhaul consistently shows
chose-to-leave departures), trainees bring the resignation letter
(§58, suite-held), the gravity's open door graduates her out (§60).
The gap: a mid-contract "I want out NOW" — the meeting SHE calls.
Design: an idol-initiated scene (door machinery, §42) triggered by
the ledgers that already exist (promiseBroken, heldBack, disbandedUs,
morale floor) — negotiate (terms cost), hold her to the paper (she
stays and the directed ledger prices it), or release her (the
termination verb above, at her request — cheaper in money, costlier
in the room's trust in you). One truth with the renewal read: the
same standing math, read early.

## §62 The mandate (v0.9.19) — the executive producer

Owner: *"pivot away from the player just being able to debut a group
or solo whenever they want... the directive would come down from
above... the player is essentially an executive producer"* + 3-year
trainee contracts + *"I'd like to see hype build around debuts and
comebacks after we've announced them."*

**The greenlight** (`mandate.js`, weekly 735; `state.mandates`,
`state.mandateLedger`). New acts start when the directive comes down.
`KP.openMandates` is one read-through truth over every desk that was
already issuing them: the founding objective (the 18-month girl group
IS the first greenlight), the hard directive (§10c — HER, any shape),
the pet project (a solo, virtual through its claim), the second-lineup
promise (a promise the paper won't let you keep is not a promise), and
real board greenlights. `proposeGroup`/`openProject` gate on a fitting
mandate (kind, gender, named person must be IN the lineup); the debut
consumes it (met, archived); a window left dark 40 weeks lapses at
trust −3 — greenlights are trust, and trust is a consumable (a lineup
in development buys grace). Comebacks stay free: the mandate gates new
acts, not the release loop. Graduation spin-outs bypass the boardroom
— her table already granted it.

**The pitch** (`KP.pitchMandate`). You take the room's case upstairs.
Deterministic and legible — the exec says yes for reasons (trust ≥ 45,
four free names for a group, books off warning) and no for reasons,
never for dice; either answer closes the boardroom calendar 8 weeks.
The Desk shows every open greenlight as a window card and carries the
pitch button. The board can also greenlight unasked when the floor
gets loud (5+ free, no dev group, weekly 6%) — bot-dormant since a
sensible boss always asks first (§18).

**The paper clock** (`p.traineeContract`, contracts weekly). Three
years, the industry standard, stamped at signing (inherited kids carry
a year already served; the migration backdates old saves and rolls
served terms forward). Expiry reaches the desk 8 weeks early as the
`traineeRenewal` table: offer another term (morale +4, term++, the
belief notarized — but at morale < 38 with 4+ years served SHE
declines, politely, finally) or let it run out. Unanswered tables
answer themselves — she packs the locker without a meeting. A term
lapping mid-lineup bridges to the debut without a table, and the debut
trades the trainee paper for the seven-year contract.

**The build-up** (teasers weekly 590). Locking a record is now a
public event (`eraAnnounced`, feed reaction) and the wait is content:
teaser beats at T-3 (concept film), T-2 (tracklist poster), T-1 (MV
teaser) warm the members' hype (+1.5/beat) and bank
`g.prep.buildup` (base 4 + fandom×0.10 + popularity×0.06 per beat);
the timeline counts down out loud (teaser posts lead the week's feed);
the release cashes the countdown as an opening edge — capped at +4
reception (`rel.anticipation`, archived), an amplifier, never the
record. Soak: debut reception median moved 60→65 — announced eras
opening stronger is the designed shape, absorbed inside every band.

Soak reality: pitches granted 36/40, lapses 24/40 (thin-roomed orgs
ask early, age-out eats the bench, the window dies and they re-ask —
priced at −3 each), trainee tables 24/40, countdown edges 40/40. Six
new bands; mandateBoard and traineeWalked run bot-dormant (suite-held,
§18).

Suite 061 (54): the founding-directive coverage, the dark-room
refusal, all three pitch denials + the grant + the cooldown, the
debut consuming the mandate, the lapse (A/B forked to isolate the
trust cost from a same-week show win), the unasked greenlight, all
four virtual mandates with the personal-mandate lineup requirement,
the paper stamps (sign/inherit/migrate), the table's four endings
(renew, her decline, farewell, the unanswered answer), the mid-lineup
bridge, the debut conversion, the countdown (announcement note,
beats, banked capped edge, feed), 30-week determinism.

## §63 The member desk (v0.9.20) — §61 items 3/4

Three verbs on a contracted member, and the meeting SHE calls. All in
contracts.js beside the machinery they share: `KP.lineupSurgery` is
the extracted one-truth for taking a person out of a lineup (roles,
rooms, maknae, unreleased credits, the left-behind, the empty-group
retirement) — the departure, the termination, and the removal verb
all run the same surgery.

**Remove from the lineup, keep the paper** (`KP.removeFromLineup`).
Blocked on the road, mid-prep, and mid-era; refused below three
members (that is the disband, or the solo). She becomes a groupless
idol on her own calendar — the 0.9.18.2 machinery carries her (gigs,
deals, renewals). Morale −12, `cutFromLineup` −3 on the directed
ledger (the renewal table and the walkout both read it), the room
loses morale watching the seat empty, the statement says "individual
activities" and the fandom reads it four times looking for the
sentence that explains it.

**Terminate entirely** (`KP.terminateContract`, `KP.terminationCost`).
The buyout: 40 + 30×years-remaining + 40×her fame read. Idols only —
trainees are released, not bought out. She departs cold through
departIdol; everyone who shared a dorm takes `watchedTermination` −2
and learns something about the building it will not unlearn.

**The personal break** (`KP.declareMemberBreak`/`endMemberBreak`,
`p.flags.personalHiatus`). The group promotes as N−1: `KP.onBreak`
unifies the medical bench and the declared break at every desk that
books people — prep rehearsal, idol weeks, training, brand events
(missed while away), gig offers, and the live stage (livePerf simply
does not count her). The memberDesk weekly owns the recovery
(fatigue −2.5, morale +0.8 — one truth per number; idolWeek just
skips her). Open-ended, mood word "on a break", return is hers to
schedule, the fandom keeps the seat. Solos are pointed at the group
hiatus instead.

**The meeting she calls** (`walkOut` scene, weekly 788). When the
grudge ledger (promiseBroken/disbandedUs/cutFromLineup ×2, heldBack/
leftWaiting/watchedTermination ×1, heldToPaper ×2) reaches 5 AND
morale is under 35: 10%/week, one per person per year, the lawyer's
font on the desk. Hear her out (60 + 30×fame — morale +10, `heardOut`
+2, she stays), hold her to the paper (morale −8, confidence −4,
`heldToPaper` −2 — the renewal table will remember this meeting
better than either of you), or let her go (a warm departure, cheaper
than the fight). The unanswered meeting is `leftWaiting` −2, and next
time the font will not be addressed to you first.

Soak: bot-dormant end to end (0/40 walkouts — the sit-down-happy bot
never stacks five grievances on one person; §18), all verbs
suite-held (suite 062, 46: the removal with role-integrity and the
below-two refusal, the priced buyout with the budget gate and the
dorm's lesson, the break's declare/rest/N−1/return cycle, the
walkout's four forks serialized, determinism).

## §64 The bad blood + the fansite masters (v0.9.21) — map slot 6

§55.3's brief verbatim: *"conflict must COST and the fandom must
amplify."* One module (badblood.js, weekly 592), one ledger
(state.badBloodLedger), three tiers plus the gasoline with faces.

**Tier 1 — in-group.** A pair holding open conflict 8 straight weeks
can HARDEN into a named rivalry (rel.rivalry): chemistry takes a drag
beyond the pair score (rivalryChemDrag 45, read inside
groupChemistry — every stage and release feels it), a unit track
pairing rivals becomes a credit dispute (once per era, both pay
morale, the booklet note says two flawless takes were never in one
room), and promo weeks risk the didntStand discourse — the distance
the cameras notice. The hatchet buries only through sustained thaw
(6 non-conflict weeks — mediation and time, the handles the game
already sells).

**Tier 2 — in-company.** Two own groups promoting the same week
split one audience: −4 reception at any release landing into an own
group's promo window, and the civilWar discourse — two fandoms under
one letterhead, every receipt a screenshot of the same company
calendar. Census counts the habit (3+ overlaps), not the accident.

**Tier 3 — in-scene (§55.13).** Professional rivalries form from
SOURCES (state.sceneRivalries, max 2 per group): the debut class
(same cohort, both above 45 pop), the concept (the coverage cannot
mention them separately), the position (within 8 pop of the same
seat), the award (the name that took the daesang twice while you
watched), and the calendar feud grown personal (3+ head-to-heads).
Shared release weeks heat the rivalry (+8, decay 0.5/wk), ignite
fanWar discourses, and at heat 30 the trades mint the archRivals
narrative. A named-rivalry head-to-head fights harder (+2 reception
— both trenches buy everything).

**The fansite masters.** A biased regular (the v0.7.3 cast) with 30
weeks of tenure and a subject worth the lens (25k social) graduates
to MASTER — the airport previews, the lens that costs more than a
car. Powers: funds the countdown (buildup +6 once per era, fandom
+2, the subway-station note), organizes the room. Turn risk: a
betrayal on her bias's directed ledger inside two weeks
(heldToPaper, cutFromLineup, promiseBroken, watchedTermination) can
flip the account — the 2am closing notice, receipts aimed at the
COMPANY per the content law ("She deserved better than this
building"), fandom −6, the masterTurn discourse. The account
closes; the person was never the target.

Soak: scene rivalries 40/40 (the genre truth — every act that
matters gets measured against a name), fan wars 38/40, in-group
8/40 (the bot mediates; the owner's neglect will not), masters
40/40, closing notices 24/40, habitual cannibalization 12/40.

Suite 063 (30): the cold streak hardening + both files + the chem
drag A/B + the burial, the two-groups-one-calendar price and the
in-house war, class-source formation + the heat/clash/canon ladder,
the master's graduation/funding/turn with the receipts, 30-week
determinism.

## §65 Festival season + award night (v0.9.22) — map slot 7

§55.4 verbatim: *"annual festivals that actually reach out to you...
you have to see if you can fit in the schedule, arrange the travel."*

**The named circuit** (festivals.js, weekly 745; state.festivalLedger).
Five annuals with weeks-of-year and tiers: Cherry Point Campus Week
(spring, tier 1), Han River Summer Wave (tier 2), Gyeongju Moonlight
Garden (tier 2), Neon Harbor (tier 3 — headlining it is a line in a
career summary), First Frost Fest (winter, tier 1). Organizers INVITE
four weeks out — a scene whose body reads the schedule surgery out
loud (tour, release week, running promo, hiatus, members on fumes)
and prices the answer: travel bills up front, the fee lands at the
stage, at most three a year, once per edition, and bookers skip acts
mid-road. Icons (festivalIcons — threshold 3→6 now that the circuit
offers three a year) always get the call and headline tiers 2+ at
×1.6. A booked slot the calendar later eats is MISSED: fandom −2 and
the fans who bought train tickets are right to be angry (3/40 in
soak after the bot learned to ground tours and hold hiatuses over
bookings — a real mistake, not structural blindness). The v0.9.5
auto-circuit retired with honor; suite 047 rewired to the invite
flow.

**Award night attended** (awards.js). The week before the ceremony,
a nominated company gets the seating chart and ONE question: who
takes the microphone if the night delivers — the leader (steady
hands), the breakout (the public's pick; the clip travels), or the
member who writes (the writers' rooms remember being thanked). The
leader not chosen notices (−2 morale). The ceremony reads the plan:
bonsang speeches name the chosen speaker; the daesang moment speaks
in their voice (three speech texts); a society friend at the next
table is on their feet before the envelope finishes opening. The
speaker stamps once per night (morale +6, gaveTheSpeech, the
history line about practicing in the van). A nominated night that
stays one ends with the speech folded in a jacket pocket — one
edit needed next year: the date. Unanswered charts default to the
leader, because protocol is always fine, which is the whole
problem with protocol.

Soak: invitations 40/40, headlines 18/40, misses 3/40, the mic
planned 40/40 and spoken ~always (ruled — a competent bot wins a
bonsang most careers). Suite 064 (26): the invitation with
conflicts read aloud, travel billed at accept, the stage on its
week, the headline call, the eaten booking, regrets, the seating
chart, the chosen mic, the consumed plan, the spoken-or-folded
ending, 45-week determinism.

## §66 The service (v0.9.23) — map slot 8

§55.7 verbatim: *"boy bands are missing one massive part of their
stories: military enlistment."* Every male idol carries an
enlistment window with a hard deadline age; postponement moves a
date, never removes one.

**The clock** (military.js, weekly 786; state.serviceLedger;
constants MIL). Notice age 26, the wall at 28, service 72 weeks
(~18 months in 48-week years). The wall is LAW: a male idol who
reaches the deadline enlists that week, meeting or no meeting (one
deferral only — mid-tour, the date negotiated to the day after the
final show). A male trainee who hits the wall un-debuted leaves the
building for service instead — the story that ends at the practice
room door. The longhaul holds the invariant: no male idol strictly
past the wall who is neither serving nor served.

**The decision** (servicePlan scene, once per debuted boy group
when the eldest reaches notice age). The industry's two answers,
read with the ages out loud: STAGGER — each man goes as his window
closes, the group holds the line short-handed (onBreak covers every
desk: shows play N−1, tours leave him off the bus, festivals stage
without him, deals close with a farewell post, no renewal tables,
no member-desk verbs, no clamor from a base) — or TOGETHER — one
joint date that executes when the current era ends: everyone at or
past 20 enlists at once, the group enters a SERVICE hiatus that
never cools (the wait is loyal; the reason is the law), and the
ordinary grace clock restarts only at the last discharge (graceFrom).
Unanswered folders default to stagger, filed by the scheduling
office, pointedly.

**The papers** (enlistPapers scene, per man at notice age under
stagger or on a solo desk; one per week). Send him now — sooner
gone, sooner back, the fandom's dread flips to a date — or hold to
the wall and spend the runway on eras with the same goodbye waiting
at the end. While he serves: the contract clock pauses one-for-one
(p.contract.start advances with the week — renewalRead, contractYear
and the seventh-year math all stay honest for free), fatigue drains,
his file reads "serving."

**The return stage** (the event the whole system builds toward).
Discharge stamps p.serviceDone (durable), morale +8, professionalism
+4 (the spine of steel), fatigue capped at 30, the gate photo in
history and on the wire. When the LAST serving member comes home the
group gets g.returnStage — a comeback locked inside 24 weeks banks
returnBuildup (26) straight into the countdown and the announcement
reads THE RETURN; a service hiatus additionally converts its whole
absence through the standard hiatus anticipation read, capped where
all hype is capped. Migration '0.9.23': male idols already past the
wall in old saves are recorded as served in early-career gaps the
paperwork never captured (the age-backfill's cousin, one legal note);
men inside the window get the feature arriving instead.

Soak: structurally silent by age math (prospects generate 14–22, so
no male idol reaches 26 inside 140 weeks) — two bands assert that
silence [0–10%]. The teeth live in the longhaul's haul-service
scenario (a boy group seeded at 23–24): plans 1, notices 4,
enlisted 4, walls 0, discharged 4, returns 1 across 620 weeks, with
the wall invariant and the clock-pause checked throughout. Suite
065 (41): the folder, the papers, the bus, the paused clock, the
send-off morale, the wall, together's joint date + loyal hiatus +
restarted grace, the return lock with THE RETURN note, the guarded
member desk, the migration, 90-week determinism.

## §67 The rise and fall + the offer + the generations (v0.9.24) — map slot 9

§55.10 verbatim: *"rival labels don't ever seem to do anything but
exist below me... I'd like to be able to see them fold if they're
not successful just like they can reach the top."* Plus §55.12
(named generations), being poached (the pitched eight), and the
owner's post-v0.9.23 order: rival boys pay the service tax too.

**The eras** (risefall.js, weekly 562; KP.rivalEra). Derived, never
stored: imperial at prestige ≥74, rising on a +6 half-year climb
from 45+, fading at ≤32 or a −5 slide, steady otherwise (trend read
from a 12-week-sampled prestige trail). Worn on the rival cards in
era colors — and the ranking is not just copy: an imperial house's
releases come +3 backed, a fading one's −3 thin.

**The power ranking** (state.powerRanking; every January, woy 2).
One number the whole industry argues about: rivals at prestige ×0.8
+ flagship pop ×0.45; the player at top-group pop + second ×0.4 +
trust ×0.35 + career daesangs ×4. Published with deltas; the top
seat changing hands is written up as THE OVERTAKE — ours, theirs,
or between two rivals, each with its own prose. The ranking card
rides the Industry scene above the letterheads.

**The collapse fallout** (KP.mintFreeAgents; state.freeAgents). A
starved fold now mints a SIGNING CLASS: the folded house's best
named people (≤29, top five by talent + following) hit the open
market for 16 weeks, listed by name on the wire and priced by fame
on the Industry desk. Signing one (KP.signFreeAgent) brings a
veteran with a career, a carried fandom, and an opinion of your
company read from trust; the file keeps her first house forever
(flags.veteran). Unsigned windows close on their own — a rival
signs her while the scene deliberates, hash-picked, deterministic.

**The offer** (theOffer scene). An imperial-era house at prestige
≥78 courts a proven operator (trust ≥55, non-founded, ~once per
two years): the founding's mirror, played against you. Two
respectable answers ship — decline (both halves of the story are
worth something; trust +2) and leverage (the board finds 120 of
"previously committed" budget within the hour, trust +3, and the
exec remembers agreeing under these circumstances). Accepting —
running THEIR machine — is a game mode, deferred to the
succession/board era (slot 12); ruled in §18.

**Named generations** (state.gen {n, since, landmarks, torch}).
The scene arrives mid-conversation: gen 3, seeded two years deep,
with seed acts older than two years stamped gen 2 (without an old
guard no torch can ever pass — first-soak lesson, 0/40 → 33/40).
Every act carries the number of the wave it debuted into: rival
acts at creation, player groups at first debut, the legacy group
gen 2. The wave turns (minYears 4) on any of three triggers: three
landmark debuts (reception ≥78) inside a year, THE TORCH PASS (a
current-gen rookie, rival or ours, outsells the old guard's best
release of the year — old guard includes the player's own veterans
holding pop ≥60), or the old guard simply GONE (the seven-year
wall retires whole waves; when the last prior-gen act leaves,
history closes the book itself — the fix for decade worlds frozen
at gen 3). Turns are critical-priority news with feed reactions;
ambient gen-vs-gen chatter rides the timeline; gen chips ride act
rows and group heroes.

**The rival service** (RISEFALL.SERVICE, coarse by design). When a
male act's member hits the wall: warm acts (pop ≥55) run a
ROTATION — releases continue −5 short-handed for serviceWeeks+36,
the first man stamped away, everyone serviceDone at the end — and
cool acts PAUSE whole: no releases, popularity cooling, all men
≥20 stamped away, and the first release after discharge is a
RETURN that punches +8 (returnPrimed). The trades print both. The
longhaul holds a rival-side wall invariant (age > deadline+2 must
be served, serving, or inside a rotation/pause).

Numbers: soak ruled on 40-seed measurement confirmed at 80
(rankings 40/40+80/80, seat moved 40/40, classes 4/40, offers
32/40 + 61/80, turns and torches 33/40 + 64/80, rival service
0/40 age-silent — seeded act members are 17–24 and the wall is 28).
Longhaul: rankings 12/12 years every world, rival services 4–6 per
decade world, gen turns 1–3 per 13 years (the 4–6-year wave
cadence), wall invariants clean. Suite 066 (48): eras, ranking
ordinality, the minted class + the signing verb + the closing
window, the offer + leverage, stamps, the forced turn, the organic
torch through the industry weekly, rival rotation + pause +
returnPrimed, migration, 90-week determinism.

## §68 The star's clock (v0.9.25) — owner-directed insert

Owner, verbatim: *"if she wants solos, one solo stage shouldn't be
enough, forever... I want the fans calling for a solo album... it
should feel like a ticking clock until she's on hiatus from the
group for her solo career, or leaves her group entirely."*

**The ladder** (gravity.js, on the §60 rails; constants STAR). A
settled clamor stays settled ~40 weeks — then, if she is STILL the
top transcendence read, it RE-ARMS one rung bigger (rung stored on
g.gravity; census reclamors). Rung 1 (the stage) settles on a solo
track credit as before. Rung 2 (THE ALBUM): the fandom's discourse
is albumClamor — a campaign, not a debate — her knock brings a
handwritten tracklist, the promise is a soloAlbumPromise claim, and
settlement is KP.releaseSoloAlbum: a real record (cost, reception
from stagePresence + best talent + the transcendence read, chart
entry, revenue, +morale, big social spike, the group's fandom
splitting attention), stamped p.soloAlbums/lastSoloAlbumWeek. Rung
3 (THE CAREER) never settles by side payment: only the knock
answers — LAUNCH (graduateToSolo, warm: same house, originGroupId
stamped, the career ledgered) or HOLD, which pays heldToPaper −3
and rung3Morale −8 into the exact grudge ledger the walkout
machinery reads: hold her long enough and she leaves entirely,
through the meeting with the lawyer's font. The clock's speed IS
her personality, talent, and demand — the transcendence read gates
every re-arm.

**Chapter two.** Her graduation stamps g.newEra: the group's first
era locked inside 30 weeks announces itself as a new chapter, on
purpose, with buildup +8 and copy that refuses the word
"diminished."

**The return run.** A graduated star next door (originGroupId)
means every announced comeback raises the obvious question within
the hour — the returnRun scene. Inviting her back books one era as
a full member: buildup +30, reception +4, fandom +3, the sleeve
stamps rel.returnRun forever, both calendars go home richer.

Calibration ride-along: the star's clock (albums, return runs) plus
0.9.24.1's hype concentration raised bot years enough to chase the
daesang ceiling a third time — per the band's own rule the GIANTS
answered, not the ceiling: the national bar stepped 140→146
(62.5%→55% at 40 seeds, snub band healthy). Suite 067 (30): the
re-arm, the campaign, the tracklist knock, the album promise kept,
rung-2 settlement, the fork with no promises on it, the launch with
chapter two, holding's grudge entry, the return run end to end,
60-week determinism.

## §69 The portfolio (v0.9.26 — SHIPPED) — owner-directed

Owner: *"a major company might only debut a new girl group once every
5 to 7 years. essentially one per generation... a flagship boy group,
girl group, units and soloists are more in line with reality."* And
the frame that resolves early-game pacing: *"eventually early game
will follow a player choice"* — three starts (fresh label / current
veteran start / major with infrastructure), specced as THE THREE
DOORS — SHIPPED v0.9.28. The portfolio pass ships
first because a major start means nothing until the doctrine exists.

**The doctrine.** Once a company is ESTABLISHED (two debuted groups,
or one at real stature), new-group greenlights come down only for
doctrine reasons: the GENERATION TURNED (the industry's clock — debut
classes cluster in a wave's first years, which the §67 gen machinery
already declares), a FLAGSHIP IS ENDING (seven-year wall in sight,
disband, service chapter), or WHITESPACE (an empty hall). Pitches
outside doctrine get a no with a reason, on a long cooldown. Fresh
companies keep the hungry-label ramp — that is not an exception, it
is the truth of startups, and it becomes the fresh-door start later.

**The units.** The pressure valve that makes generational cadence
fun: unit ERAS — two or three members, a persistent unit identity,
its own release cycle between group eras. Lightweight by design (an
event like the solo album, not a second group object — one person,
one groupOf, one truth). Units + solo albums + return runs are the
between-eras content engine that lets a two-group major feel busy.

**The world matches.** Rival debut scheduling breathes on the same
generational rhythm: debuts land in a wave's opening window, the
late-gen years stretch the intervals. The whole scene inhales at
each turn together — which is what a generation IS.

## §70 The deep map + the tongue + the world's auditions (v0.9.29) — map slot 10

§55.5 + §55.15, shipped whole. LANGUAGE colors the map's verbs
(tongue.js; constants TONGUE; state.tongueLedger). Each overseas
market has a language; KP.speaks reads native tongue or conversational
Korean (koConversational 60); KP.voiceAbroad finds the member who can
carry a market's mics. On overseas tour legs the fluent voice
multiplies revenue ×1.18 with a note in her honor; no voice bills the
interpreter (−6/leg, ledgered). THE WORLD'S AUDITIONS:
KP.fundAudition(region) — cost 60, annual per region — mints 2–3
prospects with origin, native language, Korean started mid-sentence
(25–45), ceilings +6 and observations 0 (higher ceiling, harder read
— the whole bet), names drawn from per-origin pools kept modest, real
and respectful (§55.15's data work). THE HOME TRUTH: an
international's first stronghold IS her origin (strongholdsOf
override — the §28 hash-truth, finally earned), and the first tour
leg through her home region fills the airport: morale +8, a permanent
history line, a critical note, once per tour per region. THE TONGUE
TRAINS: weekly 792, Korean +0.25 trainee / +0.5 active idol, capped
95, with the crossing-the-line note when the joke finally lands.
CONTENT LAW (ruled at folding, restated in code): the feed's register
for international members is home-region pride and the bridge — the
ugly half exists only as institutional pressure, never fan-voice
snark. Bands: auditionRun 40/40 (bot funds a circuit yearly when
flush), intlSigned 6/40 measured; natNumberOne ceiling ruled
0.50→0.60 (41/80 — the summit trend tracks the whole star-power
arc; fourth chase goes to the national board's decay). Suite 070
(22): the circuit, the file, the fog, the names, the annual gate,
the signing stamp, home-first strongholds, the tongue crossing, the
voice abroad, the interpreter, the airport, 50-week determinism.

## §71 The sagas (v0.9.31 — SHIPPED)

Owner, across the sitting: rare world events that *"basically invade
the world and have the potential to reshape it, rather than come in
with a script."* The ruling frame: each saga gets a BIRTH
CERTIFICATE, NOT A BIOGRAPHY — one standard entrance script, then
the sim takes the wheel. No outcome stages, no destiny; receptions,
era reads, the power ranking, collapse and coronation are all owned
by the existing physics, and the trades narrate whatever actually
happens in the same voice they use for everything else.

**The deck.** Each new save hash-seeds one saga (occasionally two),
timed into years 2–8 — deterministic per seed, rare enough to feel
like a world event, guaranteed enough that most careers get one.
Each saga carries a pool of FIVE generated names (company + act,
hash-picked per save) so the same entrance never wears the same
letterhead twice. Nothing borrows a real name or mirrors an
identifiable real organization — inspiration is shapes, never
identities. The pool of sagas is APPEND-ONLY and grows as ideas
arrive.

**The launch five:**
1. *The super-group project* — a new house arrives with an elite
   international act and deep pockets, courting your international
   trainees on the way in. Then: physics.
2. *The global joint venture* — a foreign major brings the co-build
   offer to YOUR desk first: worldwide auditions on their money,
   split control, split revenue. Decline and it signs across the
   street. The one saga whose entrance is a player decision that
   changes the world's inputs.
3. *The reverse invasion* — an overseas company enters Korea
   directly with diaspora talent: pre-warmed overseas regions, a
   cold domestic market, tongue mechanics running backwards, an
   unscored outsider in the January ranking.
4. *The heir's money* — a fortune bankrolls a label whose budget
   ignores prestige for a while: signing prices distort everywhere,
   poaching offers get stupid, and the ending — stabilized power or
   the biggest signing class the game can mint — belongs to whether
   their gambles hit.
5. *The second capital* — a regional city funds a bid to become the
   scene's other center: supercharged region verbs for years, and
   the harvest belongs to whoever actually plants there.

Entrances obey the arrive/claim/mark law; injected entities obey the
world's laws from the first week. Verification: forced-fire suites
for the entrances, the longhaul for the distribution of fates.
Scheduled after slot 11 (the secret).

**As built (v0.9.31, sagas.js, weekly order 561 — between the
industry's release pass and the generation math, so a saga's
entrance single can be the landmark that turns a wave).**
`KP.planSagas` hash-plans the deck at the world's first tick —
hash-only, zero rng, so unfired worlds stay byte-identical to
pre-saga builds: first saga in weeks [60,320], a 35% second saga
70–250 weeks later, capped at week 384. `KP.fireSaga` runs the
entrances; each injects through the existing structures
(state.rivals, real minted people with `origin`/`nativeLang`/`ko`
on file, chart + national + weekReleases entries) and then owns
NOTHING further — eras, ranking, collapse, coronation are physics.
Injection ignores maxRivals: the cap governs organic emergence,
not invasions. The five hooks the invasions legitimately bend:
rival scout intake ×3 + interest escalation ×2.5 + free-agent cost
×1.5 while a bankroll runs (heir); overseas leg revenue ×1.3 and
export gains ×1.35 and audition cost ×0.5 +1 minted in the funded
region (second capital); audition cost 0 + annual world class +
overseas leg revenue ×(1−0.25) under the pact (JV). The JV is the
one entrance that is a player decision (`globalJV` scene, 3-week
expiry, expiry = decline); declining hands the pact to the top
rival, +8 prestige and a co-built international act 20 weeks
later. The heir's runway (120 wks) resolves on prestige at the
wall: ≥55 stabilizes into a real company, below it the tap closes
(−12 prestige, roster cut to 4) and existing collapse physics
inherit the wreck. Ledger `state.sagaLedger`; census `sagaFired`
9/40 first soak (window math predicts ~31% inside 140 weeks, the
rest belong to the longhaul, whose invariant asserts every
620-week world got invaded 1–2 times); suite_072 (41 checks)
forced-fires all five entrances and lints the strings against
real-name borrowings.

## §72 The secret (v0.9.30 — SHIPPED) — map slot 11

Dating & Dispatch, under the FULL content law. The non-negotiables,
restated as rails: the relationship is REAL but never player-
controlled and never detailed — no partner identity beyond "someone
outside the industry" / "someone in it," no bodies, no meddling
verbs, adults only (the existing 19+ privateNote is the seed). The
player's entire game is the COMPANY'S side: secrecy logistics, the
camera clock, the reveal, the response menu, and the fandom's
spectrum. The snark aims at the cameras and the industry's norms,
never at her. She is written with care in every line.

**The ground truth.** A privateNote (19+, existing) sometimes
deepens: p.flags.secret = { since, sphere: 'outside'|'industry' } —
non-interactive, surfaced to the player only as her manager's
careful brief. **The camera clock**: a fictional tabloid desk (name
pool, never a real outlet) whose weekly reveal risk reads her fame,
her schedule density, and time — with a PROTECT posture the company
can pay for (cover schedules, decoy vans) that lowers it.
**The reveal**: photos land as a critical scene with the response
menu — confirm warmly (ask for privacy), the privacy statement
(neither confirm nor deny), deny (cheapest today, costliest if it
resurfaces), or silence. **The spectrum**: the fandom's reaction is
a SPECTRUM, not a verdict — read from fandom identity/intensity,
her standing, the relationship's length, and the response chosen;
the devoted grieve and defend in the same thread, the casuals
shrug, a fansite master may post the closing notice. Fandom and
morale move; a warm confirm is the response she never forgets
(directed +), a forced denial is one she carries (madeHerHide −,
into the walkout-read grudge ledger). Recovery arcs over weeks;
the discourse kind aims its heat at the tabloid and the norms.
Verification: forced-fire suite + soak bands on the ledger.

## §73 Time takes its share (v0.9.32 — SHIPPED) — map slot 12

Audit A4 + B4 + succession + the founder's board: every
anti-saturation clock in one release. The whole module (tenure.js,
weekly order 859) is hash-timed and consumes NO rng — worlds fork
byte-identical through every clock, and the battery shipped with
zero stream drift.

**Senescence (audit A4 closed).** The line is 28. Past it, three
quiet multipliers: training gains fall off 12%/year to a 0.35
floor (development.js gainFor), fatigue recovery softens 6%/year
to 0.55 (sim.js rest + idle recovery), and liveReliability gains
the stage-IQ floor — +1.5/year capped at +9 (person.js derived).
What the years take in bounce they pay back in floor: the veteran
never misses on a tired night. One crossing note per idol, written
with care (a professional's rebuilt week, never a decline), one
history line, a gold "the veteran's pace" word on the dossier.
Words never meters.

**Trust drift (audit B4 closed).** Above 75, trust decays 1 per 4
weeks toward 75 — excellence becomes the expectation. The bar sits
ABOVE the founding gate (70) on purpose: the gate stays winnable,
the summit does not stay owned. The exec says the quiet part once
per era ("last year's miracle is this year's baseline").
First-soak measurement: 40/40 orgs tick the clock — universal
weather for a high-riding bot, exactly the design; the band guards
the floor (a dead clock is the regression).

**Executive succession.** Chairs have eras: 5–7 years, hash-timed
per exec generation, first succession no earlier than week 96,
non-founded houses only (a founder cannot be succeeded out of
their own chair). On the turn: the farewell (tone reads trust),
a new chair from the widened six-exec pool (hash-picked, never
the same person), and the ledger reset — trust snaps to
startTrust + (trust − startTrust) × 0.35, prove it again, in both
directions. The new exec brings their own taste (execTaste hash
carries execGen — only once a succession has happened, so
pre-succession worlds keep their exec's ears), their own someday
pet project (petProjectDone cleared), their own bar (driftNoted
cleared). The first meeting is a scene: walk the record (+3, the
receipts move her where charm never would) or the clean page (+1,
the year will be read closely); letting it expire spends the
benefit of the doubt (−2). Longhaul: 1–2 successions per 13-year
non-founded run, invariant-held.

**The founder's board.** A founded house seats three names the
week the war chest arrives (hash-stable): the lead investor, the
industry veteran, the first believer. They decorate board season's
scene body, sit on the company card, and speak twice per founding:
the runway memo when the budget falls below a quarter of the war
chest ("I funded a company, not a countdown") and the confidence
letter when it more than doubles (+2 trust, "Told them so").
theOffer's accept path (running the rival's house) remains a ruled
build for the owner to call — the succession machinery it needs
now exists.

Verification: suite_073 (35 checks), soak bands senesceSeen
(39/40, floor-guarded), trustDrifted (40/40, floor-guarded),
successionSeen (silence-asserted — era math says none inside 140
weeks), longhaul invariants (non-founded ⇒ ≥1 succession; founded
⇒ board seated) plus the time ledger printed per scenario.

## §74 The holdout + the blank page (BOTH SHIPPED — v0.9.33 + v0.9.34)

Owner, in full: *"I'd like potential trainees to have agency. a
particularly talented and highly sought after recruit wouldn't
necessarily sign on with a more reputation company at the first
offer. I'd think they'd hold out for one of the powers to come
knocking. and this brings me to my second request. a fourth door on
game start that is completely fresh. name your own company, start
with no trainees, and no reputation. hard mode, essentially."*
Ruling frame agreed in the sitting: these are ONE design — the
door's difficulty IS the mechanic. Sequencing delegated (*"I'll
trust your judgement on when to implement"*): the holdout ships
first, alone, so its rates calibrate against the three existing
doors; the blank page lands on a measured mechanic.

**The holdout (trainee agency).** A prospect's only agency today is
passive — rivals sign her away, but the player's offer never gets
refused. The change: the top slice of talent WITH a hot market
(real peak talent above the bar AND rival heat ≥ 2) knows what she
is worth — hash-stable per person, with a hash-carved minority who
sign gratefully anyway (some kids just want the door that opened).
Her bar reads the world's existing numbers: a top-3 seat on the
power ranking, OR a reputation lane matching HER lane at real
height. An offer below the bar is DECLINED — human, her whole
future in her voice, no budget spent — and every decline names the
paths past it: become bigger (the call-back: when the company
crosses her bar while she is still on the board, she calls, and
that note should feel enormous); keep showing up (courtship —
repeated sincere visits; the third one wins her, the underdog
pitch the powers never bother to make); and nothing else. Money
alone never flips her — stupid offers are the HEIR saga's tool,
and a bankrolled rival CAN jump her bar; the player cannot. The
risk runs both ways: while she holds out, rival escalation keeps
running — but SHE refuses the small houses too (rivals below a
prestige bar skip her), so some holdouts sign with a power, and
some get burned by their own bar — the power never calls and the
age-out clock (§58) files her with "waited for a letterhead that
never wrote." The sim owns every ending. When she does sign, the
market's read is priced in: a holdout signs at a premium. Census:
holdouts seen / signed by which path / lost to powers / aged out;
the bot learns to fall back to the next name and to re-visit.

**As built (v0.9.33, scouting.js).** `KP.holdoutOf`: peak talent ≥
64 (measured: fresh boards run top-5 ≈ 72–78, ≈ the top 8%) AND
rival heat ≥ 2, minus the grateful quarter (hash-carved).
`KP.holdoutBar` names the open door: callback > stature > lane >
courtship. Stature = a top seat read against the FIELD (rank ≤
min(3, rows−3): in a four-company scene only the leader counts)
AND an absolute score ≥ 85 — the legacy start opens scene-rank 1
at score ~64, a small pond, not a power. Lane = her best domain's
rep lane ≥ 60 (the current door's vocal-72 house gets the vocal
prodigies by design — that asymmetry is the identity working).
Courtship = the third sincere visit (6+ weeks apart; rapid
re-offers are named as insincere and do not count). Declines cost
nothing and name the paths; the premium (×1.4) is priced into
`KP.signCost` whether or not she takes the call. The call-back:
a holdout with ≥1 visit watches the rankings — when the company
crosses her bar she calls, once, critical-priority. Rivals below
prestige 55 get the same no (the roll still spins — stream-safe);
the heir's bankroll jumps her bar, as ruled. A power signing her
prints the loss; the age-out sweep prints the burn ("waited for
a letterhead that never wrote") and ledgers agedWaiting. Census:
holdoutWon 11/40, holdoutLost 40/40 (the powers ARE knocking),
holdoutMet 0/40 bot-dormant (§18) — the e2e walkthrough, tapping
the hottest row like a human would, hit a live decline and the
suite (074, 37 checks) holds every path.

**The blank page (the fourth door).** Name your own company, empty
practice rooms, no reputation. Hard mode — built almost entirely
from machinery that already exists: this door is THE FOUNDING AT
WEEK ONE, WITHOUT THE FAME. state.founded from day one, the
founder's board (§73) seated with its named checks-writers, the
runway memo waiting, no executive era above you and no succession
— you named it, you own it, you answer to the money. Unlike the
fresh door (which still hands over inherited trainees and a
granted objective), the rooms here are EMPTY: the same scouting
board as everyone else, the bottom of the power ranking, Unproven
label on the letterhead — which is exactly where the holdout
mechanic becomes the door's teeth. The sought-after kids will not
take your calls. You build from the overlooked — low-heat files,
unpolished regional-school kids, the free agents nobody valued —
until the ranking says otherwise and the first holdout calls YOU
back. That arc (nobody → the call-back) is the door's whole
fantasy, and the door tunes its war chest and signing cap against
MEASURED holdout rates, not guesses.

**As built (v0.9.34, newgame.js blankSeed + the §73 machinery).**
`newGame(seed, name, {door:'blank', companyName})`: the inherited
class is deleted whole (the shared seeding stream stays
byte-identical across doors), roster empty, budget = the war chest
(240; the §73 runway memo fires below 25% of it), trust 55,
signings 6 (the founder's allowance), reputation 25 in every lane
(Unproven label), `state.founded` stamped week zero so the
founder's board seats itself at the first tick, no succession
ever, no theOffer ever — you named it (custom input on the door
card, default "Paper Label"), you own it, you answer to the
money. The founding directive (girl group, 18 months) is the
opening greenlight, same as every door; OPENERS.blank speaks the
investor's line. The holdout is the wall exactly as planned: rep
25 clears no lane and a four-row pond clears no rank — suite 075
(26 checks) proves the no AND the playability (a class signed
from the overlooked, debuted on the seed round, books intact).
Longhaul gained haul-blank: 13 years from nothing, board seated,
never #1, clean through a bursting heir saga. Bots cast for the
directive's gender now (the mixed board made group formation
flaky in founded runs — fixed for all modes).

## §75 The network (v0.9.35 — SHIPPED) — recruitment reshaped

Owner, in full: *"we have no applicant system at all, and we aren't
simulating a gap in scouting ability for a brand new company vs a
major. a small, brand new company... would [lean] really on
applicants, referrals, and whatever publicly visible prospects are
out there. the washouts from other bigger programs; competition
show contestants who didn't make it; social media; and street
casting. holding auditions would be another option... essentially,
I'm saying the board should be empty at game start. all of the
prospects already exist, but you have to choose who you uncover.
bigger companies already have the academy relationships, wide
scouting networks, countless applicants, etc. we should simulate
that."* Ruled the priority release: *"it reshapes a core system.
the board was good for our needs but now we have the foundation to
expand it."*

**The inversion.** The board stops being the world and becomes what
your NETWORK can see. No new meter — the network is read live from
numbers that already exist (power-ranking score, best reputation
lane, company age, school partnerships, debuted idols). The board
opens near-empty and fills through CHANNELS, each with its own
cost, quality, fog, and — the part that makes it a game —
CONTESTEDNESS: private channels (applications, referrals, street
casting, your audition calls) are yours alone — rival scouts never
see your mail, so private kids rarely accrue the heat that makes a
holdout — while the public landscape (school leads, washouts,
season finalists, viral kids) is visible to every desk in the city
and arrives contested. The small company's honest strategy is the
private stream and the washouts; the major's is everything at once.

**The channels.** Applications: inbound weekly, volume scaled by
the network read and spiked by recent hits — a major gets the pile,
an unproven letterhead gets envelopes. Referrals: the building's
people know people — low volume, LOW FOG (a referral arrives
half-read), scaled by roster and staff. Washouts: rival seasonal
evaluations' named cuts stop vanishing — they return to the open
board with their history stamped ("cut at Aurum's evaluation"),
trained polish, and no letterhead loyalty; plus the anonymous
stream of big-program washouts. The season: an annual generated
competition show airs in the world and its finalists who didn't
make it land on the public board with followings attached and heat
already on them. Social media: the viral kid every desk sees the
same morning. Street casting: the always-available verb — cheap,
wide variance, the occasional gem. The open call: the audition
verb comes home — turnout scales with your name (the major's line
around the block, the blank page's folding chairs). Doors open
with the network they'd really have: the major's standing channels
deliver a wide board on day one; the inheritance a handful; the
fresh label a couple of files; the blank page nothing but the
verbs. Old saves keep their boards — channels govern arrivals,
not history; channel-less files read as public.

**As built (network.js, weekly order 618).** `KP.networkRead`
calibrated at the doors (blank ~0.12, fresh ~0.14, inheritance
~0.44, major ~0.65) — every term a lever the player already plays
(ranking score, best rep lane, weeks alive, partnerships, debuted
idols). Opening batches 12/5/3/0 (major/current/fresh/blank).
Channel privacy is one filter in `pickRivalTarget`; referrals and
washouts arrive WITH their dated report (`takeReads` at mint — the
trusted look exists). The season: one of five generated show names
per year, finale at week 34, ignores the board cap (world events
do not check your desk). `KP.streetCast` (8, 4-wk cooldown, 15%
gem) and `KP.holdOpenCall` (40, 30-wk cooldown, turnout 2 +
floor(net×4)) are the verbs. Board cap 24. Two engine regressions
the louder mail surfaced and fixed for good: the fiscal pressure
letter now carries priority high (it was losing the weekly trim),
and the folded acceptance speech writes a durable history line.
Arrival notes yield the trim first (priority flavor). The board
census: fiscalNoticed flipped ceiling→floor per its own v0.9.14
note (second flap); the harness rival-count invariant learned the
saga overflow (+2). Longhaul saves run ~100KB lighter — the world
stopped minting speculative files nobody would ever see. Suite
076 (26 checks); 13 suites re-pointed at the new world, each by
its own rules; e2e 97 with the network card, both verbs, and the
door-sized board asserted in the browser.

## §76 The small label (C+D+E SHIPPED v0.9.37; A SHIPPED v0.9.38 — the table; B still planning)

Five mechanisms, one through-line: **being small has to feel
small.** The doors gave us hard starts; the network gave us a
scouting gap; but the RELEASE side still treats a one-room label
like a major waiting to pop. Owner, across two sittings:

*"feels a little too easy to just click the sign button as a
brand new label competing against established brands"* — and —
*"establish your label away from Seoul as an option to save
money"* — and — *"I want it to be HARD as a fresh label. Label
reputation should have a direct impact on a song's ceiling. if no
one knows who you are, it should be difficult to get the song out
there, even if you spend big. makes it a risk to spend big money
when it could return very little."* — and — *"a database of
procedural bookings for your groups. right now, the system is
built for majors... small labels with one group and a dream
aren't getting those bookings. they're getting a performance at
an elementary school. a small theater they have to pass out
flyers by hand for to fill. weddings. small sporting events.
University events... we're kind of just treating a fresh start
like it's a major label just waiting to pop when you debut.
getting that first successful comeback should mean something. and
it might require the luck of one of your small gigs going viral
because someone recorded it on their phone."*

**C. The obscurity wall — reputation caps the ceiling.** A new
derived truth, `KP.fameRead(state)`: the label's PUBLIC profile —
best reputation lane, total fandom, charting history (entries on
the scene chart, music-show wins). Distinct from `networkRead` by
design: the network is who YOU can find; fame is who knows YOU.
Two teeth, both at release resolution: (1) promo spend efficiency
scales with fame — at blank-start fame, a won-tier campaign
converts at a fraction (posters nobody stops for; playlists that
do not add you; radio that does not return calls) — spending big
while unknown is a genuine gamble, exactly as asked; (2) a soft
reception ceiling keyed to fame — an unknown label's song
struggles to be HEARD past a bar no matter its quality. Soft,
never absolute: quality still matters under the wall, and the
valves pierce it. **The valves:** a viral clip during the era, a
gig-cam moment (below), a member's social video, a discourse
storm, a music-show win. A release that beats the wall through a
valve is the breakthrough story — fame jumps hard, the wall moves
permanently, and §77's underdog-ambush verdict is the write-up.
That is what "the first successful comeback should mean
something" cashes out to: the wall is why it is hard, the jump is
why it matters. Majors never feel this system — their fame starts
above it. Blank/fresh doors live inside it for years.

**D. The booking pile — a comprehensive procedural gig economy.**
Owner: *"there should be a whole pile of bookings from the lowest
rung of fame up, all generated as needed."* New module
(bookings.js): a procedural OFFER GENERATOR, not a fixed list — a
grammar of venue × occasion × region × season that mints concrete,
named engagements on demand, always more than the group can take,
so choosing is the game. The rungs, bottom to top: **rung 0, the
anything-for-exposure circuit** — the elementary school assembly,
the wedding stage, the shopping-mall opening, the amateur sporting
event, the retirement-home show, the local product launch, the
small theater with the flyer week as a real verb (spend the
group's week papering the neighborhood to fill the room); **rung
1, the working circuit** — university festivals, local radio
guestings, the club circuit, busking permits, cable variety one-
offs, regional festival opening slots, bookstore fan-signs; **rung
2, the industry circuit** — showcase halls, brand stages, radio
tours, music-show debuts; **rung 3** — the existing majors'
machinery (music shows weekly, festivals, tours) takes over and
the pile thins out above you: the ladder retires itself. Offers
carry a fee (sometimes negative — you PAY for the theater), an
exposure profile (followers, regional popularity, a breath of
hype, occasionally fandom), fatigue, a calendar week, and a feed
line in the gig's own voice (content law: the comedy is the
situation, never the members). Seasonality keys the grammar to
the year that already exists — wedding season, school festivals
in spring and fall, university season, sports calendars.
**The phone-camera lottery:** every played gig rolls a tiny viral
chance scaled by stage quality and star presence — deliberately
NOT damped by fame or networkRead. The phone camera does not care
who you are; that is the point. It is the one channel obscurity
cannot close. **Music-show gating moves into the ladder:** below
the fame bar the music shows do not book an unknown label at all
(today they auto-run for everyone — the exact "built for majors"
complaint). The first music-show booking is a milestone the feed
marks.

**E. The campaign — promotion is played, not set.** Owner:
*"promotion of a debut or comeback itself becomes a game within
the game, rather than just choosing a few settings and advancing.
how you promote matters. how much you commit to your group
matters."* Locking a release opens a CAMPAIGN over the run-up and
promo weeks: each week the booking pile deals era-flavored offers
alongside campaign verbs (flyer week, showcase, fan-sign, radio
push, content drop), and the group's limited weekly slots get
placed by hand — schedule Tetris under fatigue, budget, and
calendar pressure. Campaign work accrues MOMENTUM, the era's
earned-media truth: momentum feeds §77 buildup, converts into
reception at resolution, and is the legitimate small-label route
UNDER the obscurity wall — paid promo converts through fame (the
wall's tooth #1), but a ground campaign converts through work.
Commitment is measured, not declared: a label that grinds the
weeks lands loud; a label that clicks advance gets the quiet
landing it earned. The old promo tiers survive as the PAID layer
(the ad buy) — the campaign is the EARNED layer stacked on top,
and at low fame the earned layer is the only one that pays. The
bot plays a simple campaign (take the best offer each week) so
soak keeps measuring honest worlds; the human game is in taking
the RIGHT ones.

**A. Contract negotiation** (prior sitting, shape held): signing
stops being one click. Prospects counter at the table — terms,
training guarantees, debut-by clauses — generalizing the holdout
machinery (§74) down into ordinary signings for low-rep labels.

**B. Regional founding** (prior sitting, shape held): found away
from Seoul — cheaper everything, a home-region popularity floor,
a weaker network read, and a longer road to the capital circuit.
Rides the regions map that already exists.

**Sequencing (delegated judgment):** C + D + E are ONE release —
the wall without the valves is just frustration, the pile without
the campaign is just flavor, the campaign without the wall has
nothing to push against. Together they are the biggest build since
the network; it ships as the next major release on approval, with
the campaign UI as its own full screen (the era desk). A and B
follow as their own builds. Interlocks noted for build time:
fameRead feeds §77 expectationRead's rep term naturally; momentum
feeds §77 buildup; the 0.9.35.2 viral-visibility damp stays on
trainee clips (network-driven) but must NOT apply to gig-cam
rolls (fame-independent by design); tours/festivals/music shows
keep their own systems — the pile generates AROUND them, never
duplicates them.

**As built (v0.9.37 — the grind).** Owner: *"this is the big one and
I want it to feel like it. depth is the goal."* Two new modules.
`fame.js` (rng-free): `KP.fameRead` derives the label's public
profile fresh every call — best rep lane, HITS (reception ≥ 60,
not weak-week chart peaks), trophies, standing above popularity 40,
publicly known faces, and breakthroughs (+0.05 each, permanent).
Calibrated: blank 0.09, fresh 0.13, current 0.45, legacy 0.64,
major 0.88. The wall (`applyWall`, at resolve, before the mash —
"changed the industry" pierces by definition): paid promo converts
through fame (floor 0.30, knee 0.55 — an aggressive spend at blank
fame wastes half), and under fame 0.50 a soft ceiling
(42 + fame x 65) compresses everything above it to 30%. Valves lift
the cap: momentum (x0.20), a gig-cam clip (+10), the defining
stage spark (+8). Momentum converts to reception at FULL rate
under the wall and HALF rate above it (first soak had street teams
walking majors to #1 — the asymmetry is the design, both ways).
A landing ≥ 62 from fame < 0.45 is a BREAKTHROUGH: +7 to the top
two rep lanes, +3 trust, durable narrative, and the wall moves for
good. Music shows gate at fame 0.28: below it show slots quietly
become radio at plan-lock (told once, out loud) — and the
call-back milestone only fires for a label that was ever actually
locked out (a house born famous stamps the date silently).
`bookings.js`: the pile mints named, dated, seasonal offers weekly
(kind x town x lead-week grammar, 16 kinds across 3 rungs, board
cap 6, deal bands keyed inversely to fame, dries up above 0.62);
`takeBooking` (one stage per group-week, negative fees bill at
signing, flyer week for flyerable rooms costs real fatigue and
boosts the draw), resolution pays fee/exposure/liveExp/fatigue
with quality read off the stage, and rolls the phone-camera
lottery — camBase 2.2% x kind x stage quality, deliberately
UNdamped by fame. The campaign: `campaignPush` (five verbs, one
per group-week, diminishing returns at 140, decay 2/idle-week,
radio gated by fame, showcase once) feeds momentum + §77 buildup.
The era desk lives on the Desk (campaign card with momentum in
WORDS + push row; booking pile with per-group send + flyer
buttons); the company card carries the fame word and the
shows-closed flag. Longhaul grew a 9th scenario (haul-fresh) plus
a first-debut bot policy (AUDITLINE had sat undebuted for 13 years
in every prior audit): the fresh house organically played 20 gigs,
worked 62 pushes, caught one phone-cam viral, felt the wall,
BROKE THROUGH, and got the shows call-back at week 23. Census:
campaignRun floored 90%; gig/wall/break bands are CEILINGS on the
famous legacy soak (gates broken if they rise) with the positive
path verified in haul-fresh invariants + suite_078 (48 checks).
Found and fixed along the way: archetype gifts stacked ceilings
past 100 (lateBloomer at 90 trained to 101 — latent since the
gift table; capped at generation + seed sites + migration
'0.9.37'), planDebut accepted unknown promo tiers (NaN budget),
same-week gig takes double-played, boardSeason census moved to a
durable counter (the 40-entry convoLog evicted busy worlds), and
truckParked flipped ceiling→floor (the campaign made the fandom
noticing overwork the norm — the alarm is trucks VANISHING).
Battery 78/78, soak 40 clean, longhaul 9x620 clean, e2e 102.

**As built (v0.9.38 — the table, §76 A).** Owner: *"let's keep
moving forward with contract negotiations."* In scouting.js beside
the holdout it generalizes: `KP.counterOf` — a file worth arguing
over (perceived avg ≥ 48) counters when fame < 0.45. Exemptions
are the fiction: holdouts (their premium IS the table), the
application pile (believers came to YOU), the famous (the name
closes). What she asks for is who she is, hash-stable per file:
washouts demand the DEBUT-BY CLAUSE ("never again on a
handshake"), high work ethic asks for the TRAINING GUARANTEE
(fee 15 up front, growth x1.12 delivered by development.js), the
rest price the risk as a SIGNING BONUS (signCost x 0.5 x (1−fame),
min 8). `signProspect` grew an opts param: the first call returns
the counter (counted once), `{answer:'accept'}` signs the terms —
refusing the terms is refusing the signature, and the board has
other suitors. The clause has teeth (weekly 'table', order 616):
kept = a debut ("the paper goes in a frame," morale +4, ledger);
a formed lineup holds the clock's breath; the date passing opens
the clauseCall scene — honor the paper (she walks free, clean,
`releaseTrainee`, the practice room re-reads its contracts) or
plead ONCE (+24 weeks, morale −8, directed 'heldToPaper'); the
second deadline and an expired scene both walk her, colder.
Red-flag warning note 12 weeks out; debut-by + training chips on
the talent row; the counter renders as a table sheet off the sign
modal (walk away / sign the terms). tableLedger durable; census
counterMet/clauseLive are CEILINGS on the famous legacy soak
(0/40 measured, by design) with organic witnesses in the longhaul
(haul-founder met 2 bonus counters under the bar, haul-blank 1)
and suite_079 (30 checks) forcing every kind and both clause
endings. No migration — ledger and clause self-init. Battery
79/79, soak 40 clean, longhaul 9x620 clean, e2e 102.

## §80 The label consult (EXPERT DEPTH AUDIT — the v0.10 map; 1+8+3 SHIPPED v0.10.0; 2+7+14 SHIPPED v0.10.1; 6+10 SHIPPED v0.10.3)

Owner: *"bring in a kpop expert, I want more depth. the width is
excellent and some of our systems are deep, but I want the whole
game to feel like you're really managing a label and that requires
depth across the board."* An independent industry-expert pass over
the Bible and engine, merged with the in-house engine audit. The
headline both audits reached separately: **the money is not real
yet.** Revenue is one line minted at release resolution; members
are never paid; nothing is ever pressed, recouped, distributed, or
settled. The deepest remaining distance between this sim and
"really managing a label" is the business itself.

**The fifteen findings**, condensed (full expert prose preserved in
the session record):

**1. Album versions & the chodong number** (HIGH). An album is a
product line — versions, photocards, pre-order benefits, a pressing
decision made against pre-order data — and first-week sales
(chodong) are the PUBLIC scoreboard of fandom size. Game: revenue
is one lump; photocards are feed jokes. Mechanism: a pressing
sheet at release lock (versions 1-4, POB tier, pressing size vs a
pre-order read fed by buildup/momentum); release week mints a
chodong number reported beside reception — the §77 comparison
machinery reads it free; under/over-pressing is the sold-out story
or the warehouse memo.

**2. Jeongsan — settlement & trainee debt** (HIGH). Idols see no
pay until the label recoups its investment; "our first settlement"
is a stock interview line and the #1 renewal-fight driver. Game:
budget is company-only; every won of training spend vanishes.
Mechanism: a per-group recoup ledger (pre-debut costs + era
bills), a contract split routing the group's share against the
debt, FIRST SETTLEMENT as a scene and permanent history; unsettled
grind writes a neverPaid directed entry renewalRead weighs;
individual income settles faster and breeds in-room envy; renewal
negotiates the SPLIT.

**3. The two publics — physical vs digital** (HIGH). Fandom-wallet
and general-public-ears are near-independent markets; careers are
strategized around which one you're selling to. Game: one
reception number. Mechanism: split the landing into FANDOM SALES
(chodong) and PUBLIC LEGS (digital tenure); concepts/demos get a
lean; the exec wants the GP hit, the books want the physical
floor; the profile becomes identity ("sells like a titan, streams
like a rumor").

**4. The Japan cycle** (HIGH). A second discography on its own
calendar — partner label, JP versions/originals, Oricon, the
hall→arena→dome ladder; groups vanish from Korea for a quarter.
Game: Japan is a passive region. Mechanism: partner licensing deal
past a JP threshold opens a second release lane (JP-version cheap /
JP-original real) claiming real in-country weeks, an Oricon-style
board, dome as the crown; rival titans run it too.

**5. The production pipeline** (HIGH). Recording (line
distribution!), choreo creation, the MV shoot, jacket shoots —
stations that slip into public postponement notices. Game: prep is
an opaque countdown. Mechanism: the runway auto-schedules stations
with cost/event surfaces — sick vocalist pushes recording, the
per-era named choreographer defines live difficulty, the MV shoot
is the fatigue spike + on-set clip lottery, line distribution is a
one-card decision the fandom litigates; slippage forces postpone
(expectation cools) or crunch.

**6. Fandom commerce** (HIGH-MED). Paid membership, merch drops,
Season's Greetings (Q4), fancons — the steady commerce paying
salaries between comebacks. Game: the fandom is never sold
anything. Mechanism: fanclub enrollment at an intensity threshold
(price tier trades money vs intensity), seasonal drops on the year
system, the fancon as a between-eras booking; overreach rolls the
"we are not ATMs" storm.

**7. The quarterly books** (HIGH-MED). Revenue by segment, cost by
group, per-era recoup — the question "is this group profitable"
starts real boardroom conversations. Game: one budget number.
Mechanism: a quarterly statement card (revenue streams, cost per
group, era recoup lines); exec/board trust re-anchors to segment
truths; a group red 4+ quarters opens the hard conversation as a
scene. Cheap to build — mostly aggregation.

**8. The fan-sign inversion** (MED-HIGH). Real fan signs SELL
albums — lottery entry per copy, the "cut line" as a public
fandom metric. Game's causality is backwards (a gift you pay
for). Mechanism: sign rounds convert intensity into album units in
the first-week window, mint a cut-line number, escalate
exploitation-discourse risk and fatigue; the morale payoff stays —
both things are true.

**9. The point system** (MED). Music shows publish component
scores; fandoms campaign against the exact formula. Game: opaque
win math. Mechanism: post-air component breakdown in words ("the
digital carried; the live vote didn't come home"), fandom
auto-mobilizes by intensity, ONE player nudge per week; near-miss
legibility is injustice fuel the intensity system eats.

**10. The catalog annuity** (MED). Back catalog pays monthly
forever; publishing royalties follow the PERSON — a member who
wrote a hit gets paid after leaving. Game: catalog is a lottery
ticket, credits are reputational. Mechanism: weekly catalog
trickle (reception-weighted decay, spiking on revivals); member
writing credits attach personal royalty streams that accelerate
her settlement and become renewal leverage.

**11. The song market** (MED). Demos cost money and have other
suitors; passing on a future hit is the A&R story. Game: four free
demos. Mechanism: asking prices folded into the bill; hot hooks
marked "circulating" with a dated window rivals can buy through;
the song camp as a spend verb; producer relationships gate who
shows you their best — the §79 A&R seat gets its multiplier.

**12. The medical desk** (MED). Injuries and vocal damage as arcs
— the seated-performance notice, push-through-or-protect judged
forever. Game: one reversible fatigue meter. Mechanism: rare
injury events off high-fatigue physical weeks with a diagnosis
scene (full rest / partial participation / push through with
compounding risk); nodules for vocalists; chronic files accumulate
— the veteran's knee is a character.

**13. The overseas promo circuit** (MED). Convention festivals, TV
one-offs, English versions — how mid-tiers actually break NA/EU
between tours. Game: the map is passive between tours. Mechanism:
the festival machinery grows an overseas wing (region-keyed slots,
travel bills, tongue-gated results); the English version joins the
JP-version lane; circuit gains improve the next tour's routing.

**14. The distributor** (MED). Somebody else puts the record in
stores for 20-30% — and decides whether a no-name label reaches
retail at all; graduating deals is a small-label milestone. Game:
revenue arrives frictionless. Mechanism: a distribution contract
as company state (starter deal: fat cut, no reach — one more brick
in the obscurity wall), better tiers unlocked by fame/chodong,
advances against royalties, the courting call after a
breakthrough.

**15. Monthly evaluations** (MED — in-house addition). Trainee
life runs on the monthly eval: ranked showcases, posted results,
elimination pressure — the ritual that makes practice years FELT.
Game: practice rooms exist, the ceremony doesn't. Mechanism: a
monthly eval week (hash-timed) minting ranks from perceived reads
(the fog applies — the coaches rank what they SEE), morale swings
by trajectory not position, rank history on the file, the
bottom-rank talk composing with practice.js quit/aging machinery.

**The proposed shape of v0.10 (delegated sequencing, owner rules):**
- **Phase M — the money** (the spine): 1 + 8 + 3 as one release
  (the product: pressing sheet, chodong, fan-sign inversion, two
  publics), then 2 + 7 + 14 (the settlement: jeongsan, quarterly
  books, the distributor). Nothing would move "really managing a
  label" further.
- **Phase P — the making**: 5 + 12 (pipeline + medical), then 11
  (song market).
- **Phase W — the world**: 4 (Japan), 13 (circuit), 10 (catalog).
- **Singles**: 6 (commerce), 9 (points), 15 (evals) slot anywhere.
- The standing queue (§78 A/B, §79 staff, §76 B regional) threads
  between phases on call.

**As built (v0.10.0 — the product, findings 1+8+3).** New module
`product.js`. `KP.fanbaseRead` — an ESTIMATE of core buyers,
derived fresh: popularity^1.55 x3 + SQRT(members' social) x12
scaled by fandom intensity + lastChodong x0.25 (the only number
that stops being an estimate). The social term is deliberately
sublinear and the feedback deliberately damped: the first
calibration's linear/0.35 version compounded flagship chodongs x7
over four eras and ran the soak's budget-runaway invariant off the
road — the governor is structural, not a band edit. Calibrated
arcs: rookie debut ~350 copies, mid flagship 10k growing to ~35k
over four eras; revenue parity with the old economy at first eras
(rookie 31 vs 27, flagship 76 vs 88) with fandom-built acts
earning more, net of pressing bills. **The pressing sheet** joins
planDebut (auto-suggested when absent — every old caller works):
versions 1-4 (collectors buy the line, diminishing), POB tier,
run preset (cautious 0.85 / suggested 1.25 / bold 1.9 x the
pre-order read, which includes the sheet's own demand lift so the
preset is TRUE headroom), sign rounds 0-3; the bill (version
design + POB + per-unit manufacturing + rounds) charges at lock —
one truth with the studio display, suite-checked. **The chodong**
settles at resolution: demand = fanbase x sheet mults x sign
boost x reception lift x noise (debuts anchor between the lock
read and the settled hype); sold-out pays the reorder's 25% late
and prints the story; run > demand x1.6 prints the warehouse
memo; the number publishes with an era-over-era comparison and
archives on the release. **The fan-sign inversion**: rounds sell
albums (boost scaled by intensity), cost real member fatigue,
mint the cut-line number publicly, and 2+ rounds roll the
album-dumping storm (new discourse kind, aimed at the company).
**The two publics**: digital = reception + standing (through
format/overseas mults); physical = the chodong; revenue = their
sum; skew mints identity narratives ('sellsLikeTitan' /
'digitalDarling', both memory switches). UI: the pressing card in
the studio (four segmented choices + the read), chodong chip +
stream split on the results page. Census: chodongMinted floored
90%; soldOut ruled [0.20,0.90], warehouse [0.30,1.00] — the
gamble's two tails, dead-at-0 and wallpaper-at-1 both alarms.
Repairs en route: suite_056's one-truth bill grew the pressing
term; suite_053 asserts the CASTING not the offer count (a
week-tick viral can legitimately arm a second call); suite_051's
founded label now answers §76 A counters (low fame post-founding
— the systems composing as designed). Battery 80/80, soak 40
clean, longhaul 9x620 clean, e2e 103. No migration — old saves
press their first sheet at the next lock.

**As built (v0.10.1 — the settlement, findings 2+7+14).** New module
`money.js`. **Jeongsan:** every era's bills (`accrueDebt` at
planDebut, tour costs too) plus the practice years (15/member at
debut) sit on a per-group recoup ledger; the group's 30% share of
release and tour revenue pays it down ON PAPER (the label keeps
the cash) until the ledger crosses zero — then the firstSettlement
scene: pay it warm with backpay (morale +8, the framed-deposit
history line) or to the letter (a leanSettlement directed entry
each; an unheld meeting is the coldest option and says so).
Post-settlement the share is PAID — real money leaves every era,
plus a morale trickle. Unsettled 120+ weeks after debut renews a
neverPaid directed entry yearly with a note naming it what it is —
the number-one reason renewal tables go cold. **The books:**
`ledgerFlow` tracks streams at their sites (albums, streams,
tours, deals, appearances, distributor, production, marketing,
signings, artistPay); every 12th week closes a statement — tracked
lines + operations-as-residual + net, the exec initialing or
red-penning — rendered as a card on the Desk with per-group recoup
status. Three loss-making eras in a row open the redInk scene:
back them (trust −2, morale +4) or tighten the belt (next era's
bills x0.85). **The distributor:** tiers indie/standard/major
(cut 30/25/18%, reach 0.85/1.0/1.12) applied inside settleProduct
— marginPerK recalibrated 1.55→2.0 so standard-tier nets match;
lazy-init by fame (no migration); a chodong past the next tier's
bar draws the courting call (sign / sign with an advance at 15%
vig repaid from pressings / stay). Battery hunt: the quarterly
notes' feed draws re-phased every legacy stream and suite_014's
40-week hype-peak sample collapsed CORRELATED across seeds —
rewritten to assert the deterministic mechanism (networkRead gap)
plus a 60-week sample where the law reasserts (15/24 vs 4/24);
ostDropped floor 0.05→0.02 (the grind era's fuller calendars
bench idols out of second jobs — honest fiction, pipe
suite-proven). Battery 81/81, soak 40 clean, longhaul 9x620
clean, e2e 103.

**As built (v0.10.3 — the recurring money, findings 6+10).** New
module `commerce.js` (weekly order 756, before the books at 758 so
the flows land in the same statement). **Fandom commerce:** paid
membership opens as a scene once intensity hits 35 — the price is
a sentence (warm +2 intensity, market rate, steep 2.0x rate at
-3), dues arrive up front and renew on the anniversary; Season's
Greetings every week-44 window (standard or lavish 1.6x with a
production bill, skipping costs intensity — December does not
reschedule); the tour merch table ships once per tour; and
`KP.holdFancon` — the between-eras verb (Groups card button):
guards on debut/quiet calendar/organized fandom/36wk cooldown,
revenue off fanbaseRead, +4 intensity, member fatigue and a morale
touch, cheap and impossible to review badly. All of it flows
through `ledgerFlow('commerce')` and `settleShare`, so recurring
money repays recoup and pays settled groups. **The ATM story:**
every commerce event records a push on a 24-week rolling window;
3+ pushes risk (35%) the "we are not ATMs" discourse — first soak
measured 0/40 because only fancon+greetings pushed, so club
enrollment and the tour table now count (structural fix, not a
band edit; second soak 31/40). **The catalog annuity:** every
released record with reception past 45 pays weekly under a
halfLife-48 decay that floors at 0.15 — an old hit never pays
zero — into a `catalog` stream the quarterly statement names.
**Publishing follows the person:** writers credited on tracklists
accrue royalty checks every 8 weeks; at 12 the ownMoney narrative
forms ("she does not need the re-sign the way the others do") and
a departed writer's quarterly letter keeps arriving after the
door closes. Bands ruled: club/greetings/fancon/catalog floors
0.90/0.80/0.70/0.90, atmStorm [0.15,0.95]. Battery 83/83, soak 40
clean, longhaul 9x620 clean, e2e 103.

## §81 The v0.10 build order (RULED — owner: "I like all of them and
I want to build them comprehensively. plan out the order first")

All fifteen consult findings (§80) plus the standing queue (§78 A/B,
§79, §76 B), ordered by dependency and pacing. Three ordering laws:
(1) MONEY FIRST — both audits named it the deepest gap, and half the
roadmap's other systems want real revenue streams to land in;
(2) SYSTEMS FEED FORWARD — each release builds surfaces the next
one multiplies (the books read the product's streams; the staff
seats multiply the studio the song market completes; Japan reuses
the product's release machinery; scandals bite harder once there is
real money to threaten); (3) VARIETY BEATS — big structural money
releases interleave with play-texture releases so no stretch of the
roadmap feels like accounting homework.

**v0.10.0 — the product** (§80: 1 + 8 + 3). The pressing sheet
(versions, POB tier, pressing size vs the pre-order read), the
chodong number as the second public scoreboard, the fan-sign
inversion (signs sell albums; the cut line), and the two-publics
split (fandom sales vs public legs). The foundation: revenue
becomes streams with real causes.

**v0.10.1 — the settlement** (§80: 2 + 7 + 14). The jeongsan
recoup ledger and contract split, FIRST SETTLEMENT as a scene, the
quarterly books (revenue by stream, cost by group, era recoup —
the exec and board re-anchor to them), and the distributor
contract (starter deal's fat cut as one more brick in the wall;
tiers, advances, the courting call). Depends on 0.10.0's streams.

**v0.10.2 — the person in public** (§78 A + B). The channel/live
permission asks and the content-agnostic scandal ladder. Placed
here deliberately: a variety beat after two money releases, and
scandals gain their real teeth from 0.10.1 — a sponsor pullout
now hits a P&L somebody reads.

**v0.10.3 — the recurring money** (§80: 6 + 10). Fandom commerce
(membership enrollment, drops, Season's Greetings, the fancon) and
the catalog annuity (weekly trickle + per-person publishing
royalties). Both are between-comeback revenue; both land as line
items in books that already exist; catalog royalties accelerate
settlements from 0.10.1 and arm the renewal table.

**v0.10.4 — the making** (§80: 5 + 12). The production pipeline
(recording/line distribution, choreo, the MV shoot, jackets,
slippage → postpone-or-crunch) and the medical desk (injuries and
nodules as arcs, the diagnosis scene, chronic files). Medical
hooks the pipeline's physical stations, so they ship together.

**v0.10.5 — the song market** (§80: 11). Demo prices, circulating
windows rivals can buy through, the song camp verb, producer
relationships gating access. Completes the studio the pipeline
deepened.

**v0.10.6 — the staff** (§79). The second fog. Deliberately after
0.10.4/0.10.5: every seat now has a deep system to multiply — A&R
→ the song market, marketing → the campaign and the product,
coaches → training and the pipeline, the road manager → tours,
the scout → the network. Hiring somebody great finally has
somewhere for the greatness to show up.

**v0.10.7 — the rituals** (§80: 15 + 9). Monthly trainee
evaluations (the ranked showcase, fog-true) and music-show point
legibility (component breakdowns in words, one mobilization nudge
a week). Two legibility rituals, one mid-size release, a breather
before the world opens.

**v0.10.8 — the Japan cycle** (§80: 4). The partner deal, the
second release lane (JP-version / JP-original) on its own
calendar, the Oricon-style board, the dome ladder, rival titans
running the same cycle. Reuses the product machinery from 0.10.0.

**v0.10.9 — the world circuit** (§80: 13). The overseas promo
wing (convention slots, TV one-offs, the English-version lane) —
the map's dead time filled, tour routing fed.

**v0.10.10 — the regional founding** (§76 B). The last standing
item: found away from Seoul — cheaper everything, a home-region
floor, the longer road to the capital circuit. Lands last so the
regional economics are legible in books that exist.

Cadence: one release at a time, full ritual each, delegated
sequencing within a release; the owner can reorder or interrupt at
any point and the queue re-threads.

## §79 The staff (PLANNING — approved for write-up, build awaits the call)

Owner: *"staff is another area we haven't explored nearly enough. I
don't want to do explicit staff attributes — I think that's the lazy
approach. I want a combination of personality, experience, and
reputation. what a potential hire is known for may not necessarily
be what they're best at. allows you to take a risk on an unknown
with little reputation and find out you hired a genius, or spend on
a well known name only to find out their style doesn't mesh with
your setup. the attributes remain under the hood at all times."*

**The law: the second fog.** Trainees already live behind a fog the
player pierces with observation. Staff get the same architecture
with a crueler twist: the fog NEVER fully lifts. No stat sheet, no
reveal moment, no number in any blurb, ever. The truth exists under
the hood (hash-stable per person — aptitude for the seat they hold,
plus a style) and the player reads three surfaces that each tell
part of it, none of it straight:

**Personality** — observable the way people are observable: how
they talk in interviews and staff notes, how they handle a bad
week, what the rest of the building says. The staff-read machinery
(v0.9.3) generalizes: your CURRENT staff read a candidate's
personality with their own bias and their own accuracy. Personality
is true and learnable — it is also not skill.

**Experience** — the résumé: verifiable facts. Years in, seats
held, rooms they were in — which acts, which companies, which eras.
Facts are TRUE but selection-biased: a résumé says where somebody
was, never what they did there. "Three years at a top-three house
during a famous era" is either the architect or the person who
booked the practice rooms. The résumé will not tell you which.

**Reputation** — what the industry SAYS they are known for, with a
tier (unknown / working / known / a name) and a known-for tag.
Reputation is the PRICE — a name costs multiples — and reputation
is correlated with truth imperfectly, by construction: some names
are riding one lucky credit the industry misattributed to them;
some unknowns are the genius nobody has caught yet (the gem roll,
same family as street casting). What a hire is known for may not
be what they are best at — the tag and the truth can point at
different seats entirely.

**The seats and their fingerprints.** Each seat quietly multiplies
the system it runs: the scout seat moves read widths and network
reach; the vocal and dance coach seats move training gains; the
performance director moves stage/live development; the A&R seat
moves the demo distribution the producers pitch; the marketing
seat moves campaign momentum efficiency and the margins of paid
conversion (§76); the road manager moves tour wear. The player
never sees the multiplier — they see RESULTS, months of them,
tangled with every other cause. The attribution problem IS the
game: was the good era the new coach or a strong class? The sim
knows and will not say. Firing a genius because the kids were weak
is the tragedy; keeping a dud because the name reassures the board
is the trap. Staff notes arrive in each person's voice — prose
evidence, personality-true, skill-ambiguous.

**Mesh — the style clash.** Separate from aptitude: a STYLE
(drillmaster / nurturer, big-machine / scrappy, classicist /
trend-chaser) that meshes or grinds against YOUR setup — company
size, doctrine, the roster's personalities, the other seats. A
genuine genius built for a major's machine underperforms their own
truth in a one-room label; a scrappy nurturer punches above their
tier in exactly that room. Mesh is discoverable only by working
together, and the notes hint at friction in prose long before the
numbers would prove it.

**The market.** Candidates surface procedurally through the
network (§75) and the fame read (§76): unknowns apply to unknown
labels; names take the meeting only when the label is worth being
seen at and the money is real. The interview is a scene —
personality legibility only, zero skill signal. And the door
swings both ways: your results build your staff's reputations, and
rivals poach the people your success made famous — keep them with
raises, or lose them and become the school everyone hires from.
The incumbent trio (Coach Baek, Director Cha, Scout Im) and the
building's named staff become the founding hires: replaceable,
retirable, poachable, and — for the first time — actually somebody.

**Sequencing (delegated judgment):** sits in the queue beside §78;
natural order is §78 A (the channel), then either §79 or §78 B by
feel at the time. §76 B (regional founding) remains ready. All
await the call.

**As built (v0.10.2).** Two modules. `broadcast.js` — the platform
is WeCast (invented). Asks arrive weekly (5%, one public-person
scene at a time): the outgoing knock with the LIVE ask or — the
creative ones — the CHANNEL deck; low professionalism (<32)
sometimes does not ask, and the unsanctioned live reaches the desk
after the fact (slide / mandatory training / reprimand — sliding
emboldens, reprimand chills the mic for a year and lands in the
directed ledger). Answers: allow / media training first (cost 4,
gaffe rate halved for life) / decline (morale, keptOffline
directed, the ask returns). A running channel uploads weekly:
follower drip personality-scaled and — the law — fame-UNdamped
(the camera does not care who you are; the drip math is
suite-asserted identical across doors); upload virals (4%,
presence-scaled) mint hype and recordViral; every mic rolls the
GAFFE (base 3.5%, professionalism/resilience-priced,
training-halved, lives run 2x hot): on a KNOWN face (publicEye or
pop ≥ 55) it is priority-high news, the gaffe discourse storm, and
active deals cooling at 40% — on an unknown it reads as candor and
does small charming numbers, teaching the lesson for later.
"Really help a small unknown, really hurt a major," mechanized.
`scandal.js` — the story breaks rare (base 0.0009/person-week x
professionalism/resilience pricing x exposure surface: channel,
deals, gigs each add 35%), named at ALTITUDE from a four-shape
deck, severity 1-4 (58/25/12/5, publicEye biases up, fame < 0.30
caps at 2 — the unknown label's story dies on page four). The
response desk: statement (buy the frame) / silence / deny — the
deny trap re-breaks at 35% inside 12 weeks, +1 severity, trust
−3, "the second story has an author." Severity 2 cools every deal
and dents popularity; 3 forces the hiatus nobody planned
(declareMemberBreak + a 12-week clock that auto-returns); 4 opens
THE CHOICE: protect (cost 40, trust −4, fandom −8, the stoodByHer
narrative the whole roster reads) or release (status released,
the empty chair, fandom −15, the four-sentence statement) — and
an unanswered choice answers itself, worst. Survivable stories
age off with a weatheredStory scar narrative. Rivals draw from
the same deck weekly (1.2%). Census ruled first soak: mic 40/40
(floor 0.80), gaffes 36/40 (0.50), stories 31/40 (0.40 — one
every ~3-4 label-years), forced 15/40 ([0.10,0.90]). Repairs:
suite_014's absolute floor retired for the directional law (the
empirical bar cost a repair per release), suite_022 accepts a
rival signing the returned washout off the OPEN board, suite_049
pen count is career-cumulative. Battery 82/82, soak 40 clean,
longhaul 9x620 clean, e2e 103. No migration.

## §78 The person in public (A+B SHIPPED v0.10.2 — WeCast + the scandals)

Owner: *"let's begin planning to give trainees and idols even more
personality. they might ask for permission to go live or to start a
video channel a la YouTube (don't use the yt name.) things that
could really help a small unknown and really hurt a major group
depending on what's said. and scandals. no need to go in with what
the scandals are per our philosophy, but they absolutely do happen.
could force hiatuses or a member being let go. makes personality
matter even more."*

Two mechanisms, one law: **the person's own voice is a lever whose
throw scales with how known she is.** For a nobody, the upside is
proportionally enormous and the downside is chatter; for a famous
face, the upside is marginal and the downside is the front page.
That asymmetry is the whole design — it composes §76's fame with
§77's public eye and makes personality the risk model.

**A. The ask — going live, and the channel.** The office door
(v0.8.2) already lets idols knock; this adds two asks the
personality engine generates: permission for a one-off LIVE, and
permission to start a PERSONAL VIDEO CHANNEL on the game's own
platform (an invented name — never the real one; the feed's social
platform gets a video sibling). Who asks is personality: high
confidence + warmth + creativity knock early and often; high
professionalism asks properly; LOW professionalism sometimes does
not ask at all — the unsanctioned live is its own event, and the
company finding out afterward is a scene. The desk's answers:
allow / allow after media training (a real cost, a delay, a
lowered gaffe rate — the staff read from v0.9.3 prices the risk
out loud) / decline (morale, a directed-ledger entry, "the company
does not trust me," and the ask returns harder). A RUNNING channel
is a weekly presence: content in her voice (personality-keyed
flavor), follower growth that runs through the phone-camera law —
fame does NOT damp it, which makes it the small label's second
lottery ticket and a real §76 valve (a beloved channel feeds the
fame read's known-faces term). And every upload rolls the GAFFE:
she said a thing. At an unknown label a gaffe is survivable
chatter, maybe even charming; on a known face (§77 publicEye) it
ignites discourse, spooks brand deals, and hands the machine a
story. High judgment/professionalism rarely gaffe; low ones are a
lottery the player chose to run. The staff warned you.

**B. The scandals.** Per the house philosophy the sim never says
WHAT happened — the same discretion the secret (v0.9.30) keeps.
A scandal is a STORY with a severity, a shape drawn from an
abstract deck (an old post resurfaced; a remark on the record; a
conduct story with legs; an entanglement — named at that altitude,
never lower), and a subject. The base rate is rare and
hash-scheduled; personality moves it (low professionalism and low
judgment raise the surface, high resilience survives it better),
and EXPOSURE moves it — a channel, lives, variety seats, tour
seasons: the person in public has more public to answer to.
Severity ladder: (1) a storm — discourse machinery, survivable;
(2) sponsors flinch — a deal suspends, music shows quietly skip a
week; (3) the forced hiatus — the individual-hiatus machinery
(v0.9.20) fires with a public reason the company did not choose;
(4) the unsurvivable — the company chooses: release her (the
member-desk machinery, a fandom wound that heals) or protect her
(money, trust, a fandom SPLIT that scars, and the story on her
file forever). The response desk mirrors the secret's: statement /
silence / deny — and deny is still the trap if the story
re-breaks. Rivals draw from the same deck; the feed reads their
weeks the way it reads ours. Interlocks: §77 publicEye scales the
blast radius; §76 fame scales the stakes (the unknown label's
scandal dies on page four — its own bleak mercy); the walkout
math, standing, and scars all read the aftermath. Personality
matters more at every step — the owner's stated goal — and the
content law holds: consequences and institutions, never bodies.

**Sequencing (delegated judgment):** A then B, or both as one
release if the channel's exposure surface is built first — B
without A has less to feed on. Both sit behind §76 A (the table,
building now as v0.9.38).

## §77 The public eye (v0.9.36 — SHIPPED) — the industry out loud

Owner, in full: *"I also want a fandom and industry that remembers.
if one of my trainees goes viral, we declare her the ace, and she's
publicly known, then doesn't make the next lineup, that should be a
story. and company announcing a new group in the works should come
with expectations. comparisons should be made between groups both
within one company and the industry as a whole. I think this is the
biggest thing we have to work on. just how public the whole
industry is. make more use of the feed, with more unique posts."*

The diagnosis: the sim already KNOWS all of it — hype, lineups,
siblings, generations, announcement build-ups — but the public
never says it out loud. The world remembers privately; this release
makes it remember PUBLICLY. Four mechanisms, all reaction, no new
verbs (the bots already play it):

**The public trainee.** `KP.publicEye` — hype or following past the
line means the public knows her name before a single stage. While
she is known and unassigned, the feed keeps asking (the ace watch).

**The snub.** A debut lineup locking WITHOUT a publicly known
trainee is a story the moment it goes public: her quiet morale hit,
a history line written with care (the story aims at the company's
CHOICE, never at her), a directed-ledger entry the walkout math
reads, and a discourse storm ("where IS she?") with the company on
the answering end. The flip prints too: the known ace IN the lineup
seeds the countdown.

**Announcement expectations.** A planned debut mints an expectation
read at announcement — company reputation, ranking seat, and the
public names in the lineup — spoken in words (quiet curiosity /
the industry is watching / loud / arena-sized), grown by the
countdown, and SETTLED at the debut: over-deliver and the world
says nobody saw it coming (the underdog story is the level-zero
exceed — the blank page's whole arc); land short of loud
expectations and the miss is the story, on the record as narrative.

**The comparisons.** Releases stop landing in a vacuum: the house's
own siblings get measured against each other (one house, two
weathers), and the week's rival landings supply the industry-wide
yardstick — rookie against rookie, gen against gen, all read from
the week-ledger that already exists.

Every string family ships with deep template pools — the feed's
whole register widens. Verification: forced-fire suite, soak bands
per mechanism (measure-first), and the content law linted where the
snub is written.

**As built (v0.9.36).** New module `publiceye.js` (weekly order 596,
rng only via action-time `KP.rngFor` inside the announcement + the
weekly tick). The public line: `KP.publicEye` = hype ≥ 25 or social
≥ 60k. `KP.expectationRead` prices an announcement — company rep,
recent top-3 record, and every public name IN the lineup — into
four levels (quiet ear / people watching / loud / arena-sized), and
`KP.publicAnnouncement` mints it at `planDebut`: expectSet note,
aceMadeIt buildup (+6), and the snub loop — every public trainee
LEFT OFF loses morale (−6), takes a `passedOver` directed entry
(the walkout math reads it), gets a careful history line, and
ignites the `aceSnub` discourse aimed at the company's choice,
never at her. Second snub reads harsher. `settleExpectations` runs
at `resolveDebut`: buildup ≥ 30 raises the level one more, bars
[38/50/60/70], beat it by 12 → overDelivered (fandom +3, narrative,
level-0 text is the underdog ambush), miss a loud bar by 10 →
underDelivered (member morale −4, narrative "debuted under the bar
the company itself raised"), else met — the announcement always
gets an answer. `publicCompare` writes the house-sibling gap note
(|gap| ≥ 18 goes priority high) and the same-week scene yardstick
(chance 0.55 each). Weekly ace-watch: known unassigned trainees
draw feed chatter (5%). Eight feed-reaction families, 3-4 voices
each. Ledger `publicEyeLedger` durable; census floors expectSet /
verdictSeen at 90% (hook-unwired alarms), snubSeen measured 24/40,
compared floored 75%. Battery 77/77 (two stream-shift repairs:
suite_021 sharpened to the fatigue lecture — a producer-relations
warning rides the same channel; suite_064 decline block got the
0.9.24.1 icon stamp), soak 40 clean, longhaul 8×620 clean, e2e 97.
No migration — the ledger self-initializes.

## §18 Watch items

Re-checked every soak; either fixed or watched, never silently tolerated.

- **regionStory band floor lowered 10%→2% (v0.9.1)** — the stronghold
  threshold (75) sits in the tail of the 140-week best-region
  distribution (median ~71, unchanged by aging — verified against the
  v0.9.0 baseline). If human play never sees a second-home story in a
  long career, consider lowering `strongholdNarrativeAt` instead.
  *Resolved v0.9.4*: the home circuit lengthened tours (fewer overseas
  legs per career, map ~3pts cooler, band went 0/40) — threshold moved
  75→72 exactly as this item prescribed; band back to 5/40.

- **showDarling band flipped ceiling→floor (v0.9.10)** — careers now
  open with a six-year act holding two trophies per stage; a bot that
  keeps them winning reaches `darlingAt` (7) in ~38/40 worlds, and
  that is the designed shape of "still selling", not wallpaper. The
  band now guards the floor (30%): no darlings would mean broken
  stages. If human play finds the dynasty coverage line stale by
  year two, vary the `showDarling` feed/memory templates before
  touching `darlingAt`.
- **gaffeSeen ceiling lifted 0.90→1.00 (v0.9.11)** — the second job
  pushes followings past `gaffeMinSocial` and fatigue past the tired-
  posting bonus, so ~37/40 careers now see at least one trended
  posting incident in 140 weeks. One 2am storm per three-year career
  is realism. If human play reports storm fatigue, tune `gaffeChance`
  down before touching the second job's payoffs.
- **Daesang giants back at 140 (0.9.13; peaked 148 in v0.9.12)** —
  the three upward steps countered ALL-TIME trophy inflation; the
  audit year-scoped the trophy term, removing that inflation, and
  the bar stepped back (12/40 daesang at 140 with year tallies).
  The era-indexing prescription stands if creep returns.
- **The stature bill governs, not yet plateaus (v0.9.14)** — the
  620-week trajectory is ~5.7–6.9k with the sink vs ~8.9k without
  (~25% damped). Pushing statureCostPer past ~0.015 provably
  starves the mid-game (the bots ship lean under pressure and the
  income collapses — measured at 0.02). A true plateau waits on
  the map's LATER sinks: enlistment eras cut income (slot 8), the
  imprint costs seed capital (slot 13), and elastic optional
  spending (tutors, wardrobe) arrives with slots 9 and 14. Revisit
  the trajectory after each; the probe lives in audit_longhaul.
- **dealClawedBack censuses 0/40 with the obligation-aware bot
  (v0.9.15)** — the 4-week tour gate means the auto-player simply
  never books the road over a sponsored appearance, so the
  two-miss termination path goes unexercised in soak (round one,
  gate-less, proved it fires: 23/40). Band floor is 0 so this is
  legal; the mechanism is held by suite 056. If human play never
  sees a clawback either, the road is too polite — widen
  missRescheduleWeeks so a mid-tour rebooking can land mid-tour
  again.
- **Producer cooling runs dormant in soak (v0.9.17)** — the bot
  picks the best hook, which is definitionally the push, so
  `pr.snubs` never accumulates in the census (0/40). The mechanism
  is suite-held. Human play picks for concept, taste, and members —
  watch whether the cooling ever fires there; if the owner never
  sees a producer cool, surface the push more loudly in the studio.
- **The whole member desk runs bot-dormant (v0.9.20)** — the walkout
  needs five stacked grievances on one person plus an empty tank, and
  the bot's sit-downs prevent both (0/40); the three verbs are
  player-only by nature. All suite-held. Watch human play: the
  walkout SHOULD eventually reach an owner who holds solos back and
  breaks promises — if it never does, lower grudgeAt before touching
  the chance.
- **The unasked greenlight and the trainee walkout run bot-dormant
  (v0.9.19)** — the bot always pitches before the floor gets loud
  (0/40), and it renews every believer under the age wall while her
  decline needs morale the bot never lets crater (0/40). Both rails
  suite-held. Watch human play: if the owner never sees the board
  move first, raise roomPressureChance; if no trainee ever walks,
  the decline thresholds are too kind.
- **Mandate lapses sit at 24/40 (v0.9.19 first soak)** — the blind
  bot pitches with four free names, aging-out eats the bench, and
  the window dies for −3 trust before a re-ask. Real friction,
  correctly priced. If human play finds windows dying through no
  fault (a poached room, a red quarter), consider pausing the lapse
  clock while the books are on warning before lengthening windows.
- **The slump runs dormant in soak (v0.9.18)** — entry needs
  morale < 42 AND confidence < 45 AND a fresh wound, and the
  sit-down-happy bot never lets both crater (0/80). The whole
  rail (entry, damp, shield, talk, the stage exit) is suite-held.
  Watch human play — a neglected second group after a missed
  comeback is the natural door. If the owner never sees a quiet
  era, raise enterMoraleBelow before touching enterChance.
- **The fiscal ceiling has been chased three times (0.9.18.1)** —
  0.45→0.65→0.75→0.85, each time because a designed-cost or
  designed-pressure release moved the operating point up while the
  poverty tail stayed healthy (latest: 80-seed min end-budget 2065,
  none below 300). The warned-count band is drifting toward
  weather. Next flap: stop chasing and re-point the census at the
  tail itself (orgs ending under ~300, ceiling ~0.05) — that is
  the poverty-spiral regression this alarm exists to catch.
- **holdoutMet runs bot-dormant (v0.9.33)** — the bot signs early,
  before heat and board-training push anyone over the holdout line,
  so it never OFFERS below a bar (0/40); it still wins holdouts
  through the lane door (11/40) and loses one to a power in every
  world (40/40). The decline arc is suite-held and the e2e hits it
  live. Watch human play: the owner scouts hot kids and WILL meet
  the no — if the no never converts (no call-backs, no courtship
  wins in reports), lower powerScore or laneRep before touching
  talentMin.
- **The service is soak-invisible by age math (v0.9.23)** — no male
  idol reaches notice age 26 inside 140 weeks (prospects generate
  14–22), so both service bands assert silence [0–10%] and the
  positive coverage lives in the longhaul's haul-service scenario.
  If the generation curve ever ages up, or a legacy boy group ships,
  re-point the soak bands at real activity instead.
- ~~**Rival acts do not enlist (v0.9.23)**~~ — closed v0.9.24 on
  the owner's order: rival boy acts now carry the window (warm acts
  rotate short-handed, cool acts pause whole, returns punch), and
  the longhaul holds a rival-side wall invariant.
- **The offer has two answers, not three (v0.9.24)** — accepting
  the imperial house's job (running THEIR machine) is a new game
  mode, deferred to the succession/board era (slot 12) where
  executive machinery lives; the scene ships with decline and
  leverage, and the body plays the temptation honestly. If the
  owner wants the third answer sooner, it is a real build, not a
  toggle. *v0.9.32 update*: the succession/board machinery it
  needs now exists (§73); the accept path remains a ruled build
  awaiting the owner's call.
- **Generation cadence is ruled, not measured long (v0.9.24)** —
  minYears 4 with a 2-year backdated seed gives a first turn near
  year 2 and ~4-year waves after; the longhaul prints gen counts.
  If 13-year runs stack more than ~3 turns, raise minYears before
  touching the torch or landmark triggers.
- **clamorHeld measures choice now, not cadence (v0.9.18)** — at
  first soak 100% of orgs paid resentment ticks because settling
  needs a release and the release cadence (~20wk) outruns the
  clock; the promise-pause (an open soloPromise stops the ticks)
  dropped it to 13/80, the orgs that held or let a promise lapse.
  If the band floods again, check the promise path before the
  pacing constants.
- **The resignation letter never fires in soak (v0.9.16)** — the
  sensible bot keeps trainee morale above the quit line in all 40
  worlds (0/40), so the scene is suite-held only. This is the
  burnout-census pattern: the mechanism triggers under neglect a
  decent policy never produces. Watch human play; if the letter
  never arrives there either, raise quitMoraleBelow before touching
  tenure.
- **schoolHot runs rare (1/40, v0.9.16)** — one it-girl arc plus a
  debuted alum is barely enough to cross 75 in 140 weeks; longer
  careers cross more. If the owner never sees a school get hot,
  lower hotAt to 70 before juicing the rep gains.
- **People-file growth accelerated by the school pipeline
  (v0.9.16)** — classes and trips mint extra prospects: ~90 more
  files by week 620 (~725KB vs ~619KB saves). The age-out sweep
  handles the unsigned; the growth rides the same curve as the
  rival-native item below and shares its remedy.
- ~~**No senescence (0.9.13 audit A4)**~~ — closed v0.9.32: age
  bites at 28 (growth, recovery) and pays back in floor (stage
  IQ), words never meters; the legacy act makes the crossing
  near-universal in soak (39/40, floor-guarded).
- **Trust saturates high by year 3 (0.9.13 audit B4)** — gains
  outpace every loss path at scale; gates lose tension. Candidate:
  slow drift toward startTrust, or stature-scaled expectations.
  *Overtaken by the sink (v0.9.18)*: the founder probe measured
  trust hovering 40–60 across 13 bot years under the fiscal
  warnings — saturation is gone at bot policy, and the founding
  gate (70) is now the hard one. The longhaul grants the
  collateral when trust ALONE gates founding by week 150, because
  that audit soaks the founded shape; the soak owns the odds.
  *Closed v0.9.32*: the drift clock ships anyway — above 75, −1 per
  month toward 75, deliberately ABOVE the founding gate so the gate
  stays winnable while the summit stops being ownable.
- **Rival-native file growth (0.9.13 audit)** — ~25 files/year,
  ~half the save by year 13, quota breach ~a century out. If it
  ever matters: tombstone-compress members of long-retired acts
  (keep name/history, drop talent cones).
- **Burnout census runs cold** (0/40 orgs with the cautious auto-player;
  band top 45%). The mechanism triggers under sustained heavy load (suite
  003 forces it), but a sensible policy never sees it. Watch whether human
  play produces it; if not, fatigue soft cap may be too forgiving.
- **Rival steals at 40/40 seeds** — band-legal but pinned at the top; if
  players report the board feels like a fire sale, tune
  `rivalSignHotChance` down.
- ~~**Whitecliff unused** at RIVALS.count=2~~ — retired v0.4.0: the
  opening scene seeds all three rivals and the lifecycle grows the field
  to as many as six.
- **Chart top-three pinned at 40/40** (v0.4.0 soak) — band-legal at the
  top edge. The player's fresh releases usually outscore the rivals'
  decayed entries. If the owner reports the chart feels easy, raise rival
  act quality or add release-week clustering.
- **Feed tone** — the negative content law is tested, but *funny* cannot
  be asserted. Watch the owner's screenshots; stale or repetitive posts
  mean the template pools need widening (they are data, cheap to grow).
- **Overwork benchings at 40/40 max-pace runs** (v0.4.2) — the harness
  never volunteers extra idle weeks, so every soak org eventually eats a
  benching. Band-legal and arguably the point of the hard version, but
  if the owner reports the medical letters feel constant in human play
  (humans breathe more than the bot), lower `OVERWORK.chance` or raise
  the threshold before touching the rest window.
- **Sit-down treadmill** (v0.1.2): the soak auto-player, mediating every
  friction eagerly, runs ~16 sit-downs per org over 84 weeks. Band-legal
  and partly a policy artifact, but if human play feels like relationship
  whack-a-mole, consider longer-lasting mediation effects (a "settled"
  grace period) before touching drift again.
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
> numbers in §17) and specced the v0.2.x procedural line: content
> generators → generated staff → generated companies → scenario hook
> library → executive mechanics → drifting market trends → pre-history.
> Gated on the owner's v0.1.0 feel report. No code written.

> **v0.1.1 — first feel report, answered** (owner played on GitHub Pages)
> Owner's words, all four delivered: *"move advance week to the unused
> space at the top of the page between the week and currency"* — the
> Advance pill now lives in the topbar, always reachable, and the floating
> button is gone. *"quickly change their intensity from this page without
> having to click through the individual profiles… maybe a dedicated
> training page"* — new Training sub-tab in Talent: every trainee's focus
> chips and intensity control inline; members in debut rehearsals shown as
> schedule-owned. *"I need a way to release a trainee"* — releaseTrainee
> with rails (no lineup members, no idols, no refunds, close friends named
> in the confirm and shaken by the exit); suite 006 added. *"trainees skew
> too old. probably shouldn't be seeing many in training at 20+"* —
> diagnosed: uniform 16–23 put 48% of the pool at 20+, mean 19.4. Retuned
> to weighted 15–23 (`GEN.ageWeights`): mean 18.0, 21% aged 20+, guarded
> by suite 001 and a new observatory age census.
> Numbers: battery 6/6, 40-seed soak clean (age mean 18.0 / 21% 20+,
> reception median 53), e2e 38/38, lockstep green. Rode to main.

> **v0.1.2 — conflict gets a handle** (second feel report)
> Owner: *"a lot of conflict and no way to do anything about it other than
> hope it works out."* Diagnosis confirmed and quantified: the drift model
> was structurally biased down — always-negative penalty terms, no repair
> force — leaving 65% of pairs tense-or-worse by week 40 (36% in "open
> conflict", which §8 had promised was rare). Two-part fix: (1) drift
> rebalance — neutral compatibility mean, professionalism-scaled reversion,
> cool-off for feuding pairs trained apart (separation is now a real
> lever); (2) **the sit-down** — mediation with cost, cooldown, and
> personality-shaped odds, resolved in prose, surfaced as friction cards
> (problem + handle together) in dossier, group room report, and builder.
> Tuning took two soak rounds: the first pass left 22/40 orgs ending
> conflict-heavy (new census band FLOODed) because shared-focus corrosion
> kept mediation on a treadmill; softened it and strengthened reversion →
> 5/40, in band. Week-40 texture now ~20% tense, ~1% open conflict, warmth
> intact (27 close pairs vs 26 before — the game did not go bland).
> Numbers: battery 7/7 (suite 007 added), soak clean with two new
> relationship census bands, e2e 42/42 (stages a conflict, resolves it
> through the UI), lockstep 0.1.2. New watch item: sit-down treadmill.
> Rode to main.

> **v0.2.0 — the comeback loop** (owner finished the slice: *"I created a
> group, they debuted... now what?"* — chose the comeback loop over
> starting the procedural line, which renumbers to v0.3.x)
> The debut is now the first release, not the ending. Objective ladder:
> every resolved directive summons the next as an executive letter with a
> reinvestment grant — comeback targets that move with the story, gentler
> deadline penalties, always "one more window." Popularity founded at
> debut, compounded by comebacks, decaying in the room between releases;
> worded (burning/hot/warm/cooling/fading), never a meter. Promotion
> cycle: 4 hot weeks then real recovery — which killed a live bug found
> during design: idols kept their training intensity forever and pegged at
> 100 fatigue post-debut; the migration repairs afflicted saves with a
> narrated management-review letter. Charts-lite peaks + weeks per
> release; discography on the group page; Studio reopens each cycle with
> fresh demos; era accents follow the new concept. Also new: **the
> spark** — a big hook plus a magnetic performer can catch fire (+4..10,
> fancam note in the PR digest) — added after the observatory declared
> sensation debuts EXTINCT; the sensation band edge was then calibrated
> against a measured 200-seed distribution (78 → 75, ~3.5% of debuts).
> Numbers: battery 8/8 (suite 008: ladder, cycle, decay, fatigue
> recovery, migration, determinism), 140-week 40-seed soak clean with 12
> census bands (8.0 releases/org, every org loops, fanbases survive),
> e2e 48/48 (plays a full comeback cycle), lockstep 0.2.0 (23 modules).
> Rode to main.

> **v0.2.1 — the record and the rollout** (owner's screenshot caught the
> comeback report calling itself a debut; requests: albums, media/promo
> agency, stage names)
> Fixed the label bug at the table level (comeback band labels) and in
> afflicted saves (migration relabels the stored report). Formats:
> single/mini/full with real cost, runway, and revenue tradeoffs. Rollout
> focus: music shows / variety / fan engagement decide where the
> promotion weeks go — fan care stretches the popularity grace window.
> Stage names with suggestions, uniqueness, and the public/staff naming
> split. Numbers: battery 9/9 (suite 009), soak clean, e2e 48, lockstep
> 0.2.1. Rode to main. Second group ships next as v0.2.2.

> **v0.2.2 — the second group** (owner: *"a second group would be great"*)
> The single-group vertical slice becomes an agency: `state.group` →
> `state.groups[]` with per-group ids, demos, prep, popularity, promo
> cycles, and discographies. New-lineup rules (all groups debuted first,
> no shared members, unique names), a Groups tab that lists the portfolio,
> a Studio group switcher, per-group results reports, and comeback
> directives that name their group and target whichever act has waited
> longest. Migration moves an existing save's group into the new shape
> untouched, demos and open objective included. The soak auto-player now
> runs a two-group agency: 40/40 seeds launched a second group, 8.0
> releases and 2.0 groups per org, all 13 census bands alive.
> Numbers: battery 10/10 (suite 010: rails, independent cycles, targeted
> ladder, two-group determinism), soak clean, e2e 49, lockstep 0.2.2.
> Rode to main.

> **v0.2.3 — the open agency** (owner: *"remove the cap on signings
> [after the first debut] but have the CEO put pressure on you if you're
> spending too much. that allows the first group to feel like a tutorial
> and then the game opens up"* — plus the queued stage-name rule)
> The signing allowance is now the tutorial rail: it binds only until the
> first debut, and the first post-debut directive retires it in the
> executive's own words. In its place, fiscal pressure: the CEO reads a
> rolling quarter of the books monthly — noticed → warned → board-level,
> trust hits at level 2+, cooled by surplus quarters. Tuned through two
> soak rounds (monthly threshold FLOODed 40/40; rolling quarter + split
> census landed 13/40 noticed, 1/40 trust-warned). Desk shows "open
> signing" / "the board is watching spend" instead of the retired
> allowance chip. And the stage-name law shipped: every report surface —
> development, health, showcase, relationship, chemistry, friction,
> sit-down, release fallout, events, PR — routes through
> displayName/publicGiven; suite 011 sweeps 30 weeks of reports for
> real-name leaks and found zero. Numbers: battery 11/11, soak clean
> (15 bands), e2e 51, lockstep 0.2.3. Rode to main.

> **v0.2.4 — idols keep growing** (owner Q&A: idols only improved during
> comeback prep; owner chose auto-development — *"auto focus on the
> attribute with the most runway… everyone kind of knows what they need
> to work on"*)
> Idle idols now drill their biggest remaining gap automatically at half
> trainee rate, resting instead when tired, never crossing ceilings,
> never during promotion or prep. Surfaced as roster chips ("drilling
> Dance"), a dossier line, and rare inbox flavor. No migration needed —
> behavior only. Numbers: battery 12/12 (suite 012), soak clean (roster
> talent growth 10.4 → 10.9 pts, all bands alive), e2e 51, lockstep
> 0.2.4. Rode to main.

> **v0.2.5 — the project** (owner, from a builder screenshot: *"these 3
> are in, now the rest of the trainees know there's a project and they
> start working to make it. you could even pinpoint what you're looking
> for"*)
> Provisional groups: lock 1–3 members from the builder, optionally
> declare up to two sought domains, and the whole building reacts — an
> announcement letter, hopefuls training harder (×1.15, +1 fatigue) and
> self-directing spare focus toward what the project needs, locked
> members steadying, standout notes naming who is camping in the
> practice rooms. Finalizing consumes the project; dropping a locked
> member costs her morale and her file remembers; shelving disappoints
> every hopeful. Found-by-suite: openProject truncated to 3 locked
> before validating, letting a full lineup slip through as a project.
> Numbers: battery 13/13 (suite 013), soak clean, e2e 51, lockstep
> 0.2.5. Rode to main. Hype + solos + the hard directive ship next as
> v0.2.6.

> **v0.2.6 — the internet has decided** (owner: hype + solos, *"dude I
> want the hard version"*)
> Pre-debut hype as a decaying window: emergent events find magnetic
> trainees, the Desk grows a second clock, and past the threshold the
> CEO issues the hard directive — debut her in 20 weeks, group or solo,
> or eat −12 trust and watch her window collapse ("Remember that I
> remember"). Debuts cash hype into launch reception, founding fanbase,
> and the public's eye. Solo acts ship as one-member acts through the
> same machinery: her own nerve for chemistry, a charisma edge, ×1.4
> volatility, ×1.5 promo fatigue, nowhere to hide. Statistical suite
> check: hyped debuts open bigger on average across 15 paired seeds.
> Numbers: battery 14/14 (suite 014, green first run), soak clean with
> 18 census bands (internet found someone 40/40, directives 21/40, solo
> debuts 20/40), e2e 51, lockstep 0.2.6. Rode to main.

> **v0.3.0 — voices and names** (owner: *"the game feels good. I think we
> can start really fleshing it out now"* — the procedural gate opened)
> First phase of the procedural mandate: js/engine/gen.js. Given names
> syllable-built and world-unique (~1,400 combos vs the old 42-name
> pool; suite measured 200+ distinct names across 25 worlds, ≤25%
> overlap between any two); song-title grammar with five shapes and
> retired-title protection; group-name generator (four patterns);
> producer and headline generators; and the blurb system rebuilt as
> canonical wholes + opener×detail assembly — 6+ observed variants per
> (domain, band) cell where the old tables held 2–3, all still
> deterministic per person. Fixed pools removed from data.js.
> Process note: changing generation shifted every downstream seed, which
> exposed three old assertions as seed-snapshots rather than invariants
> (sit-down success rate, popularity delta, format revenue) — all three
> rewritten as formula-level or statistical invariants, per §5 of the
> process doc. Numbers: battery 15/15 (suite 015), soak clean (18
> bands), e2e 51, lockstep 0.3.0 (24 modules). Rode to main.
> Next in line: generated staff.

> **v0.3.1 — the age curve, again** (owner: *"15-16 should be the norm…
> 14-18 making up the bulk… 19-21 far more uncommon. I don't want to go
> any younger than 14. regenerate the pool in my save"*)
> New weights: mode 15–16, mean 16.6, 14–18 at ~86%, 19+ at ~14%, hard
> floor 14 (asserted per person, per fresh lead, and alarmed in the
> observatory). Migration reborn the scouting board in existing saves —
> old prospect files removed, a fresh generator-named board under the
> new curve, rivals circling its most charismatic face, Scout Im
> narrating ("the old files are archived, not mourned") — with the
> signed roster untouched. Numbers: battery 16/16 (suite 016: migration
> rebirth, roster preservation, determinism, the absolute floor), soak
> clean (pool mean 16.5, 13% aged 19+), e2e 51, lockstep 0.3.1.
> Rode to main.

> **v0.3.2 — generation realism** (owner, from two dossier screenshots:
> a polished 14-year-old and an elite 19-year-old street-cast — both
> implausible)
> Trained skills now scale with age in mean AND spread (young rolls
> cluster raw; prodigies come from archetypes — measured 2% of 14–15s
> polished, ~80% of those archetyped). Visuals/charisma stay innate.
> The market correction prunes elite trained skills from the 18+ board
> (75%) and flags the surviving 25% as overlooked finds with their own
> urgent scout note. Sources now follow profiles: street/social skews
> young, 19+ arrives through channels, dance academies produce dancers
> (all measured in suite 017). Emergent soak shift, in band: debuts got
> stronger (19/40 strong+, 4 sensations) because high-headroom young
> rosters grow more before debut day. Numbers: battery 17/17, soak
> clean, e2e 51, lockstep 0.3.2. Rode to main.

> **v0.3.3 — the center is a decision** (owner found the builder
> role-select snap-back bug and asked for post-formation role editing
> with consequences)
> Bug: the builder's role dropdowns had no change handler — selections
> were never stored and every re-render reverted to staff picks. Fixed,
> with an e2e regression check. Feature: Edit Roles on the group page.
> Every named-role move costs the demoted and rewards the promoted;
> the two centers' relationship strains; files remember. Post-debut
> center changes go public: questionable picks (−8 pull) cost
> popularity and draw urgent blowback, overshadow corrections gain it,
> the middle gets cautious coverage. Numbers: battery 18/18 (suite 018),
> soak clean, e2e 52, lockstep 0.3.3. Rode to main.

> **v0.4.0 — the living world** (owner: *"I want to see other companies
> debuting new acts and competing with me… new companies emerge on
> scene, others fall or split, merge… and I also want to start adding an
> in world social media side"*)
> New module `industry.js` (§19). Rivals run acts: prestige-anchored
> debuts that consume their rosters, 16–26-week comeback cycles,
> popularity that compounds and cools, disbandments when it goes cold.
> Every release enters the weekly scene chart (decay 0.88, honest
> movement arrows); releasing into a crowded week now costs reception
> (min(6, 2.5/rival release) — industryWeek runs before the player's
> resolution on purpose). Monthly lifecycle: labels emerge, starved ones
> fold, the two weakest merge, powerhouses shed factions — floor 2,
> ceiling 6, all through generated company names. The fan feed: ≤4
> curated posts/week reacting to real events (release reactions, bias
> posts, overshadow discourse, industry obituaries) plus ambient
> chatter, under the hard content law (snark at songs/styling/companies,
> never bodies; crushes wholesome) enforced as a negative-law scan in
> suite 020. Industry tab rebuilt as Scene/Chart/Feed. Whitecliff
> activated (3 starting rivals, each seeded with running acts — retires
> a §18 watch item). Migration 0.4.0 seeds the world into existing
> saves, narrated as the industry desk expanding. Two seed-snapshot
> assertions exposed by the new rng draws (suites 014, 018) were
> rewritten as mechanism-level invariants — the v0.3.0 lesson holding.
> Numbers: battery 20/20 (suites 019 industry, 020 feed), soak clean
> (24 bands: rival debuts 40/40, lifecycle 32/40, crowded releases
> 29/40, feeds full 40/40), e2e 60 (Scene/Chart/Feed walkthrough,
> fans naming the player's group), lockstep 0.4.0 (25 modules).
> Rode to main.

> **v0.4.1 — the five-band ladder** (owner: *"the rating system needs
> one more on between developing and strong. I'd call it capable…
> each would just occupy a 20 point range"*)
> BANDS is now Raw 1–20 / Developing 21–40 / Capable 41–60 / Strong
> 61–80 / Exceptional 81–100, exactly as specified (Law 1 amended).
> Blurb content rebalanced to match the words: lines that always read
> as does-the-job ("Capable when needed…", "Keeps up with the back
> line…", "Photographs fine…") moved from the old too-wide Developing
> cells into new Capable cells; fresh still-learning lines wrote
> Developing back up; charisma got an original Capable voice
> ("memorable is the next step"); RECOMMEND gained a Capable register
> ("dependable is underrated — sign her for the room"). bandRank now
> derives from the table instead of a hardcoded list. Side effects
> owned in the Bible §5 note: Exceptional starts at 81 (rarer),
> Raw ends at 20 (kinder). No data migration (bands are read, never
> stored — Law 2), but the rubric change is narrated to existing saves
> by Coach Baek ("the old forms had no word for it. Now we have the
> word."). Suite 001 asserts every boundary exactly; suite 015 asserts
> all 25 domain×band cells compose. Numbers: battery 20/20, soak
> clean (24 bands), e2e 60, lockstep 0.4.1. Rode to main.

> **v0.4.2 — the schedule breathes** (owner: *"the idols in groups are
> perpetually running on fumes. is that by design?"* Diagnosis: a leak —
> nothing ever created idle weeks, probe showed 100% of post-debut
> weeks pinned at fatigue 100. Owner: *"I like both"* — rest AND teeth.)
> Full spec in §20. The calendar closes after every release: 4 promo
> weeks then 3 contractual rest weeks at double recovery; planDebut
> refuses early locks, the Studio shows "Let them sleep." Loads
> rebalanced (prep 9→6, promo 9/6/5→7/5/4, soft cap above 70 as
> managers rotate stages). The teeth: locking over a worn roster draws
> a staff warning modal; members pushed at 88+ risk medical benching
> (2–4 weeks, urgent letter, no gains); still-benched members cost the
> stage at release and the public counts heads. Harness auto-player
> learned to breathe (waits for avg <45); census judges the rolling
> rhythm, not end-phase snapshots. Migration finally honors the v0.2.0
> promise: pinned rosters sent home to sleep, audit narrated. Probe:
> pinned-at-100 forever → sawtooth 30–90 with recovery valleys every
> cycle. Three fixtures that planned inside the now-closed calendar
> (suites 008, 009, e2e) updated to ride out the window — the rail
> works everywhere, including on our own tests. Numbers: battery 21/21
> (suite 021), soak clean (26 bands, idols off the fumes 40/40), e2e
> 62, lockstep 0.4.2. Rode to main.

> **v0.4.3 — rivals with faces** (owner: *"more aggressive in signing
> talented trainees… the trainees they DO sign to actually be a part of
> the groups they form… and all of them viewable"*)
> Spec grafted into §19. Rival lineups are real people now: board
> signings debut in the groups their rival forms (cast best-first, named
> on the wire — "with Kim So-yeon, once on our board, in the lineup"),
> filled out with generated in-house trainees; act quality derives from
> the actual members, so the stolen talent shows up in the reception
> numbers that compete with yours. Signing pressure up (~2× hot-sign
> rate, hunger surge while casting a debut, talent-seeking target
> picks); mergers move the people with the company. Scene act rows open
> a full act page: members, ages, "was on your board" stings, and the
> discography. Migration backfills faces onto every existing act. Two
> test-scope corrections, both principled: the age law measures the
> scouting pipeline (rival idols run 16–26 by design), and suite 012's
> focus-domain prediction now pins true ceilings first — the old
> midpoint guess drifted when lazy resolution re-ranked runway.
> Numbers: battery 22/22 (suite 022, 130 assertions), soak clean (28
> bands — board bleeds 3+ prospects in 40/40 worlds, a lost face
> debuted against the player in 40/40), e2e 64, lockstep 0.4.3.
> Rode to main.

> **v0.4.4 — one chart** (owner: *"my group has a song that's been
> number 1 but it shows #41 peak position"*)
> The v0.4.0 two-chart compromise (scene chart for positions, legacy
> formula for stored peaks) is retired — the owner caught the
> contradiction the design note had rationalized. Peak position IS the
> scene chart now: releases enter at their real rank, chartStamp syncs
> peak and weeks-on-chart into the discography and stored report weekly
> while the entry lives, and the record freezes when it drops off. The
> legacy formula is deleted from resolution. Migration reconciles old
> archives (live entries exactly, dead records mapped by reception),
> narrated by the data team: "songs that hit number one finally say
> so." Census updated: top-10 was table stakes on a ≤24-entry chart, so
> the band now asks for #1 (40/40 at max pace — consistent with the
> standing chart-easiness watch item). §19 gains the lesson: never two
> sources of truth for one visible number. Numbers: battery 23/23
> (suite 023), soak clean (28 bands), e2e 64, lockstep 0.4.4.
> Rode to main.

> **v0.5.0 — the national chart** (owner: *"I actually like your
> instinct on a wider streaming chart as the more prestigious chart to
> chase… since we aren't simulating the wider world"*)
> The wider world, simulated at low resolution — full spec in §21. A
> 29-artist mainstream pool (generated titans/established/risers with
> fame, cadence, drift and monthly churn) releases into a national
> board that runs on the scene chart's machinery but harder: slower
> decay, defended summit (titan longevity 0.965, megahits ×1.3), higher
> floor. Player and scene-rival releases enter with the scores they
> carry; nationalPeak syncs one-truth style beside chartPeak with the
> superset invariant (national >= scene) guarded everywhere. Milestone
> letters at top 20/10/3/#1 — first top-10 and first #1 are executive
> moments with trust and reputation attached. Balance was measured, not
> hoped: the first cut let 39/40 max-pace orgs top the chart; after
> three tuning rounds (titan fame/count/longevity/megahits) the summit
> held at 15/40 while top-20 stayed universal. Chart tab is a two-board
> room; discographies read "peaked #x · national #y." Migration seeds
> the pool, starts tracking anything still charting, estimates finished
> records defensibly, and delivers any milestone letters earned at
> first stamp. Three fixture repairs along the way (suite 019
> event-count floor, suite 009's second pre-rest-rail fixture, suite
> 024 fame-cap bound). Numbers: battery 24/24 (suite 024), soak clean
> (32 bands, national #1 in 15/40 — the summit holds), e2e 67,
> lockstep 0.5.0. Rode to main.

> **v0.5.1 — the front door** (owner: *"using the title screen as a
> place to store new game, continue, and import saves with an export
> save option in the settings menu"* — the durability layer from the
> Capacitor conversation, shipped web-first)
> Title screen fronts every launch: Continue (career meta on the
> button), New career (with an overwrite guard when a live autosave
> exists), Import save (paste or file, through the guarded
> KP.tryImport door — shape-checked, migrated on entry, garbage and
> future-version saves refused with reasons, never a throw). Export in
> the System sheet: copy or download, re-imports from the title.
> Boot requests navigator.storage.persist(); the System sheet reports
> protected/best-effort and the save's size in KB. Soak now measures
> save size every run (168 KB avg after 140 weeks, hard guard 400 KB,
> ~5 MB quota) — bloat cannot sneak up. §15 records the Capacitor
> decision: deferred with explicit triggers, Pages stays the
> feel-loop. Numbers: battery 25/25 (suite 025), soak clean, e2e 76
> (title flow, overwrite guard, Continue restore, export box),
> lockstep 0.5.1. Rode to main.

> **v0.6.0 — the world remembers** (owner opened the company-simulator
> mandate — full phase map in §22 — and put one system above almost
> everything else: *"the simulated public needs to remember things"*)
> Memory shipped first because everything else in the mandate reads it
> or writes it. New module memory.js (§23): narratives form at
> thresholds, strengthen +16 per evidence, decay 0.35/week, prune,
> cap at 24 — deterministic throughout, words rendered live so stage
> names stay current. Keys: company identity from sustained rep
> (vocalHouse forms week 1 — six years of history walked in with
> you), monster rookies, underperformed, dormant (with nag cadence),
> fancamStar (2nd viral — the first is luck), itGirl (3rd breakout).
> Influence is real and modest: long-awaited returns land +4 and
> resolve the complaint, pedigree debuts read ±2/−3 against
> expectation, and a second debut under the vocal-house name draws a
> BY-NAME comparison to the previous main vocal. The trades feature
> live narratives; the fans react to formations and resurface
> reputations ambiently. UI: "The conversation" on Scene, "The
> narrative" on group pages, "The public knows her" on dossiers.
> Migration opens the clippings file already full from existing
> history. Two cadence bugs caught by the suite (monthly check missing
> the first advance; dormancy forming only on exact multiples). Titan
> megahits nudged 1.3→1.38 after memory's reception bonuses pushed
> the national summit to 17/40 (back to 13/40). Numbers: battery
> 26/26 (suite 026, 33 assertions), soak clean (34 bands — living
> narratives 40/40, idol narratives 40/40), e2e 78, lockstep 0.6.0
> (26 modules). Rode to main.

> **v0.6.1 — the whole world has a story** (owner: *"keep it going and
> expand it to the whole world. I want to see what other companies are
> doing too. I want to see social media numbers on all of my idols and
> trainees profiles. think big"*)
> Memory covers everyone: rival companies earn identities (philosophy
> narratives seeded day one, reinforced monthly) and event-driven
> stories — poachers at 3 board steals, rising power at prestige 75,
> fading house at a low-prestige disband; rival acts track hit streaks
> (3) and flop eras (2) through per-act counters, and 75+ debuts get
> the monster-rookies treatment in print. Their stories live on their
> Scene cards and act pages; the player conversation filters to player
> subjects; hungry rivals wear a "casting" chip. And the numbers:
> every person in the world carries a public follower count — new
> module social.js, entirely hash-driven (zero rng draws, zero seed
> drift, proven by the fork suite), lazy-initialized from who she
> already is, growing with what actually happens (promo surges, viral
> spikes, breakout moments, narrative compounding at ×1.5), with
> once-each milestones from 100k up delivering letters. Shown on
> roster rows, dossiers with weekly delta, and rival member cells.
> One ordering bug caught at first run (rising-power check before the
> prestige update it reads). Numbers: battery 27/27 (suite 027), soak
> clean (36 bands), e2e 80, lockstep 0.6.1 (27 modules). Rode to
> main.

> **v0.6.2 — the discourse** (owner: *"keep leaning into social media.
> I want interactive social media to be a huge part of this"* — the
> §22 social-media phase pulled forward by owner reorder)
> Full spec in §24. Storms ignite from real events (overwork worry,
> dating rumors, styling, encore clips, benchings, fancam waves), burn
> on their own physics — cool ones die, hot ones feed themselves, 85+
> boils over with popularity/morale costs and an epitaph — and meet a
> constrained response desk on the Feed tab: statement / apology /
> legal / meme / livestream, once per storm, personality-modified,
> with real backfires (Streisand +30) and instant feed judgment of
> every response. Positive waves convert to followers when ridden.
> Feed grows personas (fan/stan/casual/anti/press, antis under the
> same content law) and volume (6/week, 64 kept); live storms post
> themselves. Tuning story: first physics had negative storms only
> climbing — 36/40 soak worlds boiled, contradicting the desk's own
> "most storms die on their own"; the burn was retuned (heat-scaled
> cooling, responded storms bleed +4) until the fiction was true. Two
> fixture repairs (organic storms pre-igniting in hermetic blocks; a
> suite loop replaying identical rng draws). Numbers: battery 28/28
> (suite 028, 30 assertions), soak clean (39 bands — storms trended
> 40/40, steered 40/40), e2e 85 (force a storm, respond, read the
> verdict), lockstep 0.6.2 (28 modules). Rode to main.


> **v0.6.3 — the rollout desk** (owner: *"I'm still often only seeing
> 1 or 2 new posts each week. really flesh that out with the next
> pass, and do the promotion rollout builder"* — the §22 centerpiece
> lands)
> Full spec in §25. Promotion is now a locked 4-week plan, two
> bookings a week from seven activities with bills at lock and
> distinct payoffs — shows build stages, variety builds faces, fan
> signs buy afterglow, the challenge buys reach, rest is rest — and
> the specials make stories: the encore moment (the Gaya clip,
> emergent), the challenge breaking containment, warm fan-sign clips,
> all writing to memory, followers and the feed. The feed floor is a
> guarantee now: every week posts at least 4 (two ambient categories
> un-gated so fresh worlds never run dry). The hard bug of the
> release: a suite fork diverged only when a migrated save was
> PROBED before advancing — the social mint reads mutable facts
> (popularity, hype), so lazy-on-first-look init made LOOKING at a
> profile part of the world's history. Every door now mints on the
> spot (newGame, fresh leads, rival cast, migrations); the law joins
> §25. Fallout fixed honestly: two old fixtures met the new bill
> (roll-rev funds the full album, the mini cost check includes the
> plan), suite_009's focus block rewritten against the desk, and the
> harness bot learned to trim its plan before skipping a release —
> which also un-wedged 6 soak seeds that starved at the lock.
> Numbers: battery 29/29 (suite 029, 61 assertions), soak clean (40
> seeds, every band alive, releases/org 7.3→9.0), e2e 87 (rollout
> grid rendered, chip toggled), lockstep 0.6.3 (28 modules). Rode to
> main.

> **v0.6.4 — the release war** (owner: *"let's keep going because so
> far, I don't have any reason to hate my rivals. I'm giving you
> creative freedom to make this as deep and immersive as possible"* —
> the §22 competitive-calendar phase, built to earn "Novaline, you
> absolute motherfuckers")
> Full spec in §26. New module calendar.js: rival comebacks announce
> up to 4 weeks out on a public calendar (Desk strip + Studio date
> chips show the traffic — "vs SIREN" at pick time); locked player
> dates leak the week after lock; a rival with an act in shifting
> range parks it on a date worth sniping (the most prestigious house
> does it — they can afford the pettiness), and the war-room card on
> the Studio offers the whole menu: hold the date, or slip two weeks
> for money, morale, and the antis calling it scared behavior. Any
> same-week landing by an act of stature resolves as a scored
> head-to-head — winner takes popularity and morale, loser eats both,
> the feud ledger on the group page counts forever, two meetings make
> the rivalry narrative (text reads the ledger live), two ambushes
> make the dateSniper name stick. Trend chasers steal the concept off
> a 72+ hit and the reveal is their next debut wearing it. Tuning
> story: first ambush cut (0.25 weekly) hit 40/40 careers — pettiness
> as background noise — retuned to 0.12/cooldown 14 for ~2.7 per
> career, memorable not constant; battle-worthiness reads PRE-release
> popularity so a titan flopping on your date still counts as a
> battle you won. One design catch in review: the first cut had the
> loser's popularity read post-flop, letting big-act flops dodge the
> battle entirely. Numbers: battery 30/30 (suite 030, 40 assertions),
> soak clean (45 bands — calendar alive 40/40, rivalries canon
> 17/40), e2e 89 (war strip on the Desk), lockstep 0.6.4 (29
> modules). Rode to main.

> **v0.6.5 — the music-show ecosystem** (owner: *"let's do it.
> music-show ecosystem next"* — the §22 phase where the Gaya moment
> gets a stage to happen on)
> Full spec in §27. New module shows.js: The Countdown, Prime Stage
> and Pop Wave replace the generic music-show booking — three
> first-class rollout chips with personalities, floors and distinct
> win math (fandom / live command / freshness), resolved weekly among
> everyone actually promoting: player groups, rival acts inside their
> release windows, and the national pool on broadcast weeks (a titan
> comeback week is not your week). Wins mint trophies on the group
> page, the first in company history is a boardroom event, six on one
> stage is a dynasty narrative, the encore moment now belongs to WINS
> (and a fandom-vote win with a shaky room ignites the encore storm
> instead), and every appearance ends on an ending fairy whose clip
> sometimes outruns the stage. Losing the announcement moment on your
> own stage is a letter — and feeds the rivalry file. Tuning stories:
> darlingAt 3 → 6 after 39/40 soak careers hit it (dynasty, not
> tenure); rival win letters cut to first-or-beat-us after show mail
> crowded dormancy and boil-over letters out of the weekly inbox trim
> (two suites caught it); the version-bump timing fork bit once more
> and was recognized by its tell. Numbers: battery 31/31 (suite 031,
> 19 assertions), soak clean (48 bands — first trophies 40/40,
> darlings 20/40), e2e 89, lockstep 0.6.5 (30 modules). Rode to main.

> **v0.6.6 — regional popularity** (owner: *"let's go"* — the §22
> phase that opens the map and sets the table for tours)
> Full spec in §28. New module regions.js, entirely rng-free: KR
> stays g.popularity (one truth per number); six overseas regions per
> group move on releases (reception × concept affinity × reach ×
> saturation), member viral moments (two hash-derived personal
> strongholds per idol — the "inexplicably huge in Brazil"
> phenomenon, wired through the single recordViral door), borderless
> promo (livestreams thin and wide, the challenge hard and local),
> and slow idle cooling. Warm maps buy records (overseas revenue
> multiplier at release), crossing loud is a letter, and a region
> past 75 is the regionStronghold story with the region named live.
> Concept affinity is craft data — same world, different concept, the
> map flips, suite-proven. Tuning story: the first soak pinned every
> career at 99+ everywhere (exports had no saturation) and the
> stronghold story flooded at both 55 and 70 — saturation physics on
> both doors plus threshold 75 landed best-region endings at 67–83
> across seeds with the story in 26/40 careers. The map feeds §22's
> next phase directly: devotedAt 65 is the tour bar. Numbers: battery
> 32/32 (suite 032, 35 assertions), soak clean (50 bands), e2e 89,
> lockstep 0.6.6 (31 modules). Rode to main.

> **v0.6.7 — creative direction** (owner: *"something I would like to
> see is choosing a concept for a group that has an affect on the
> songs pitched to them"*)
> Full spec in §29. Groups commit to a creative direction on their
> page; the producers pitch to the brief — two in-lane demos (tagged,
> slightly sharper), one stretch, one wildcard. Two consecutive
> in-lane eras form the conceptIdentity narrative; pivoting off a
> live identity halves the story and splits the fandom — unless the
> pivot lands 70+, which is a reinvention era. Direction changes
> re-tool the pitch meeting and reset the streak (the reset was the
> release's one real bug: without it, a pivot release REINFORCED the
> old identity — caught by the suite). Migration infers earned lanes
> from trailing discographies. Balance story: the bot committing to
> its proven lane raised the whole meta through fit-consistency —
> summit floods and show-dynasty floods followed, answered in the
> WORLD, not the feature (titanDecay .972, megaMult 1.45, darlingAt
> 7; summit 18/40 → 9/40). A strategy feature is a difficulty change.
> Numbers: battery 33/33 (suite 033, 21 assertions), soak clean (51
> bands — concept identity canon in 30/40), e2e 89, lockstep 0.6.7
> (31 modules). Rode to main.
\n
> **v0.6.8 — the road** (owner: *"yeah we need tours now for sure…
> you're free to continue expanding on immersion, and things for the
> player to do. expanding social media and expanding on the decisions
> the player has to make"*)
> Full spec in §30. New module tour.js: the touring desk on the
> Studio — scale, legs, pacing, setlist, four constrained choices
> with bills and human costs, gated by the §28 map (cold regions
> refuse arenas). Legs report honestly: sold out in minutes / solid /
> curtained-off soft, each narrated and paid. Tours grow regions
> (saturating), stronghold members get their overseas moment, the
> leader role finally pays off on the road, a new-material setlist
> seeds the next era, and post-tour rest is contractual. Social
> expansion: the POSTING INCIDENT discourse kind — tired idols post
> carelessly (chance doubles past fatigue 70; the storm has a
> systemic cause), with delete/context/lean-in on the menu through
> the existing PR machinery, plus tour-flavored feed content
> everywhere. One crash caught in soak (recordViral's null pushed
> raw into the inbox), one bot lesson (booking at the promoter's
> bare minimum put 34/40 careers in curtained sections — competent
> routing fixed it; the risk stays player-facing). Numbers: battery
> 34/34 (suite 034, 26 assertions), soak clean (55 bands — tours
> 40/40, sellouts 40/40, gaffes 33/40), e2e 89, lockstep 0.6.8 (32
> modules). Rode to main.

> **v0.6.9 — the crunch** (owner: *"I'm still running into the issue
> of everyone in a group running on fumes during promotion after I
> let them rest to fresh before planning a new release"*)
> A feel patch with an audit behind it (§20 amendment). The pipeline
> from fresh was: flat 6/week rehearsal × the whole runway → release
> day at 47, promo peak 79 — the players who rested and planned ahead
> were punished hardest. Fixes: rehearsal tapers (full load only in
> the final 3 crunch weeks, ×0.35 before — early cycle is recording
> and fittings, not twelve-hour practice); one-booking rollout weeks
> half-breathe; the staff default plan ends on a livestream-only
> week. Measured: default peak 79 → 65 (8-week runway), player-paced
> 59 with recovery inside promo. Tired at the end of a campaign is
> correct; fumes are now a choice. Numbers: battery 34/34, soak
> clean (benchings still alive at 38/40 for the never-idle bot),
> e2e 89, lockstep 0.6.9. Rode to main.
\n
> **v0.7.0 — the fandom era** (owner: *"keep going. and let's have
> other groups give their members stage names… add that along with
> the final three steps"* — fandom identity, brand deals, and the
> award circuit, closing the §22 near-map)
> Full spec in §31. Three modules (fandom.js, deals.js, awards.js)
> because the systems interlock: the naming vote is a player decision
> that mints a name and a color; intensity — devotion, grown by care,
> cooled by neglect — votes on music shows, buys records, and floods
> bad tags with fancams; brand offers chase visuals, reach and the
> it-girl narrative, pay real money, and die by conduct clause when
> an ambassador's storm boils; award season reads the actual year at
> week 44 and pays or radicalizes at week 47 — snubs are worth +6
> intensity, because nothing organizes a fanbase like an injustice.
> Rival lineups now debut half-under stage names from the shared
> pool (the worldwide uniqueness law promptly cost a five-version-old
> fixture its "Lume"). Balance ruling on the record: mature economies
> stay solvent — the fiscal-pressure band went extinct under the
> diligent bot and the floor moved to 0 on the standing principle
> that risk mechanics may read zero under competent play. Numbers:
> battery 35/35 (suite 035, 34 assertions), soak clean (59 bands —
> fandoms named 40/40, deals 40/40, awards won 40/40, snubs 21/40),
> e2e 89, lockstep 0.7.0 (35 modules). Rode to main.
\n
> **v0.7.1 — the inner life** (owner: *"…maybe bring in an expert on
> the industry to help make it deeper, rather than wider?"* — so one
> was brought in; six of its twelve proposals shipped)
> Full spec in §32, consult summarized there. Facts and ambitions
> are hash-truth (like §28 strongholds — zero rng, zero save bytes);
> the Bubble leaks true fatigue/morale to the feed weekly; six
> recurring fan handles voice a third of the feed; the dorm gives
> chemistry an address and a lever; ambitions make identical
> schedules mean different things per member and pay out through one
> door wired into wins, sold-out legs, variety weeks and solo
> debuts; the Monday meeting puts the player's roster-reads on the
> record and checks them by predicate — the executive remembers,
> quotes back, and notices silence. Fixture economy: the busier
> inbox promoted 100k milestones to urgent (they were getting
> trimmed); the direction suite's hook test became a mechanism test
> (amplified constant) after the smaller live bonus sank under
> generation noise; one real predicate bug (>= vs > let a same-week
> release satisfy a comeback promise). Numbers: battery 36/36 (suite
> 036, 51 assertions), soak clean (62 bands — bubbles 40/40,
> promises kept 38/40, dreams landed 40/40), e2e 89, lockstep 0.7.1
> (37 modules). Rode to main.
\n
> **v0.7.2 — the foundation** (owner: *"audit the architecture for
> the next several years of simulation complexity… then build the
> architectural foundation required for the planned Living Industry
> systems"*)
> Full audit in docs/ARCHITECTURE.md, summary in §33. New module
> kernel.js: the validated one-lifecycle note bus with priorities;
> the feed-reaction registry (34-branch frozen chain gets a lid);
> the weekly tick restructured into an explicitly named 28-phase
> pipeline extendable by KP.registerWeekly without editing sim.js;
> KP.validateState run weekly by every soak seed as a hard guard.
> One real determinism hazard found and fixed: the studio view drew
> rng during RENDER (demo generation) — a player who opened the
> studio had a different world than one who didn't, the v0.6.3
> social-mint bug class through another door; demos now generate at
> formation and restock via the tick, and "rng in tick and actions
> only, never render" is law. Persistence audited sound and left
> alone. Framework unchanged — the vm-loadable classic-script
> property is load-bearing for the battery. Numbers: battery 37/37
> (suite 037: kernel contracts, 19 assertions), soak clean with the
> validator armed, e2e 89, lockstep 0.7.2 (38 modules). Rode to
> main.
\n
> **v0.7.3 — the timeline** (owner: *"let's expand on social media.
> more persistent accounts, more templates for posts, more ways for
> idols to post. the social feed should be something you check every
> week"*)
> Full spec in §34. The kernel's first customer: the whole release is
> one registered weekly phase (lifeMoments, order 855) plus three
> registered feed reactions — sim.js and the frozen chain untouched,
> exactly as §33 promised. The cast grew to 14 regulars who develop
> biases at viral moments and quietly drop them after boiled storms;
> selca day runs monthly; birthday weeks trend from hash-derived
> birth weeks with fandom-funded subway ads past intensity 50;
> livestream weeks leave lore clips; the feed runs 8/week over a
> floor of 5 with 80 kept. Kernel dividend on the way through:
> narrative formation letters promoted to priority-high (the birth
> of a narrative is news — the trim-race bug class closes for good).
> Numbers: battery 38/38 (suite 038, 58 assertions), soak clean,
> e2e 89, lockstep 0.7.3 (38 modules). Rode to main.
\n
> **v0.7.4 — the people** (owner: *"and now let's give the idols real
> personalities. I want to feel their existence every single week"*)
> Full spec in §35. Seven stable derived voices with a per-voice line
> in the dossier; a one-word derived mood replacing the two-chip
> vitals readout everywhere (one-truth law); a weekly spotlight
> (personhood, order 856 — kernel registered, drivers untouched) that
> turns real state into one or two specific scenes per week, with
> trainee practice-room variants and tiny effects (sting −1 morale,
> glue +2 rel); a roster-wide staff scan that flags whoever is going
> quiet, cooldown 10 weeks, priority high. The load-bearing ruling:
> the spotlight files at HIGH priority — at flavor it survived the
> trim in 5/40 soak orgs, at normal 20/40; the trim was deleting the
> mandate itself in loud worlds. Capped at 1–2 notes/week by
> construction, it cannot flood. quietWeek census floored at 0 by the
> competent-bot ruling (the bot never lets morale crater; mechanism
> suite-forced). Numbers: battery 39/39 (suite 039, 44 assertions),
> soak clean, e2e 89, lockstep 0.7.4 (39 modules). Rode to main.
\n
> **v0.7.5 — the tracklist** (owner: *"keep building the idols. they
> need to be the stars… build track lists… opportunities at solos,
> units, etc"* + *"more flavor in the artist file — I'm seeing a lot
> of repeats"*)
> Full spec in §36. Records ship as real tracklists (action-time rng
> at lock): generated b-sides with producers and hidden hooks, open
> credit slots (0/1/2 by format) the player assigns until release
> week — a member's first solo (career event: spike, carried hype,
> the solo ambition door OPENS on a solo b-side), or a 2–3 member
> unit that reads real chemistry (close pairs read as truth, tense
> pairs get clocked). 22% sleeper b-side after a record people
> played. Three new inds through the kernel registry; Studio credit
> sheet; discography credits on the group page; a discography-margin
> note in the dossier. The variety pass: FACTS 12→36, 3 phrasings
> per ambition, 5×3 framings on the stronghold note, 4×4 on the
> off-the-clock note — all hash-picked, repeats gone. Bot ships
> minis/albums by budget and runs its own A&R pass on public
> numbers. Numbers: battery 40/40 (suite 040, 50 assertions), soak
> clean (solos 40/40, units 40/40, sleepers 30/40), e2e 89, lockstep
> 0.7.5 (40 modules). Rode to main.
\n
> **v0.7.6 — off the road** (owner: *"after a tour, the studio
> remains open... doesn't show the mandatory rest date"*)
> UI bug fix. The engine has always refused to lock a release inside
> post-tour rest (debut.js checks g.tourRestUntil, v0.6.8), but the
> Studio's rest card only knew the PROMO rest window — after a tour
> it rendered the full planning room with a locked door at the end.
> New "Home from the road" card: reopen date, room fatigue read, and
> a gold chip when a new-material setlist seeded the next era.
> Numbers: battery 40/40, e2e 89, lockstep 0.7.6. Rode to main.
\n
> **v0.8.0 — the stage door** (owner: *"approved"* on Audit II)
> Full spec in §38. The interaction foundation: scenes (registered
> held decisions, ONE Desk rail, ONE dispatcher case, narrated
> expiry), claims (the exec ledger generalized to subjects, weekly
> registered predicates, bounded settled tail), and the
> directed-acts door (recordDirected → derived standing in words,
> half-life 48wk; first writers: solo/unit credits, mediation,
> releasing a close friend). The Monday meeting migrated as proving
> customer — bespoke card, dispatcher case, and inline predicate
> loop deleted; behavior parity held by suite_036 unchanged in
> spirit. Validator extended to scenes/claims. Laws 6–7 added.
> This is the chassis for §37: the office door, the ambition ask,
> renewals, fan trucks — all assembly now. Numbers: battery 41/41
> (suite 041, 39 assertions), soak clean, e2e 89, lockstep 0.8.0
> (41 modules). Rode to main.
\n
> **v0.8.1 — the way back** (owner: three navigation bugs — back
> from a group-page dossier dumped to the groups list; back on the
> talent and industry tabs reset scroll to top; wanted the row you
> came from highlighted)
> Push-view navigation got a real stack: each push saves the current
> view + scroll position; Back pops to exactly where you were —
> group page, scroll offset and all — and the row you came from
> glows for ~2 seconds (.nav-here, cyan fade) so you never lose
> your place in a long list. Forward navigation still opens at the
> top. Tab switches and action-jumps (signing, proposing) clear the
> stack. Verified with a live-browser probe on all three reported
> flows. Numbers: battery 41/41, e2e 89, lockstep 0.8.1. Rode to
> main.
\n
> **v0.8.2 — the office door** (owner: *"approved to get started
> with 0.8.2"* on the §39 map; §37's unanimous #1)
> Full spec in §40. The idols initiate: four condition-gated,
> voice-true doors (ask / request / confession / challenge) on §38
> rails, paced to stay memorable; the ambition ask mints a
> subject:idol claim she checks — kept promises thank you for
> meaning it, broken ones quote the date back; every answer and
> every silence writes the directed-acts ledger. Persona teeth: the
> spotlight follows drama pressure with the rota as fallback, and
> sting/glue/leaderCarry put a real choice on the desk with an
> expire-to-classic fallback. Doctrine amended: presence WITH teeth.
> suite_039 repointed at the fallback path; suite_042 (49
> assertions) owns the door. Census: knocks 40/40, promises kept
> 20/40, choices 38/40. Numbers: battery 42/42, soak clean, e2e 89,
> lockstep 0.8.2 (42 modules). Rode to main.
\n
> **v0.8.3 — standing & scars** (owner: *"approved for next step"*)
> Full spec in §41. Standing surfaces in the dossier (road staff,
> off the record) and gates three things morale can't buy: apology
> sincerity in storms (±8%), the leader's promo pull (−1 fatigue/
> booking for the room), and how she walks through your door. Scars:
> boiled storms shadow an idol for 8 weeks — "carrying it" mood,
> sky-photo bubble — ending in a recovery scene where the tone of
> her return is the player's call, loud or quiet, both remembered.
> Debut anniversaries every 48 weeks with café banners, memory
> retellings, and a three-voice timeline reaction. suite_043 (28
> assertions incl. a pinned-gate sincerity mechanism test and a
> deterministic leader-ease comparison). Census: anniversaries
> 40/40, scars floored 0 by the boil ruling. Numbers: battery
> 43/43, soak clean, e2e 89, lockstep 0.8.3 (43 modules). Rode to
> main.
\n
> **build 0.8.3.1 — UI pass** (owner: three layout requests, "no
> need for a version update... things I should've implemented long
> ago"; four-part build number = cache bust only, the §39 map's
> numbering is undisturbed)
> Desk gains Today | The record — the record shows promises on the
> clock, settled verdicts, and a conversation log (state.convoLog,
> capped 40, written by resolveScene and by expiry — the silences
> are kept too). Dossiers gain Profile | The file | History —
> attributes and actions on the working card, every written blurb
> on the file, the full record on history (40 entries, up from 8).
> Industry gains a Fandom sub-tab: fandom identity cards, the
> devoted (adopted accounts with their since-dates), and the
> home-crowd slice of the timeline. e2e updated to walk the tabs
> (now 90 checks); all surfaces browser-probed. Rode to main.
\n
> **v0.8.4 — the building, the boys, and the company's own names**
> (owner: *"0.8.4. also, let's find a way to get boy groups in here,
> and I'd like the option to name my groups and songs myself"*)
> Full spec in §42. Phase A closes: named poachable road managers,
> the coach on the record, exec taste, board season with growth
> claims, the once-per-career pet project, the second-lineup
> question. Boy groups end-to-end: gendered generation, male name
> pools, one-group-one-gender, gendered rival acts cast around
> their signees, and the ~370-placeholder pronoun conversion
> (fillPro kit; female output byte-identical, male career scanned
> clean — 0 strays). Naming rights: typed group names and record
> titles with uniqueness receipts. Fixture-luck repairs from the
> stream shift (rd-soft show wins, rr-steal mixed steal, mixed-room
> suites pinned to one hall) and two latent id-claim fixture bugs
> found by the male scan. Numbers: battery 44/44 (suite 044, 40
> assertions), soak clean (boys 33/40, boy acts 10/40, managers
> 40/40, board 40/40, pet 39/40), e2e 90, lockstep 0.8.4 (44
> modules). Rode to main.
\n
> **v0.9.0 — contracts & the clock** (owner: *"approved for
> 0.9.0"* — §39 Phase B opens)
> Full spec in §43. The seven-year exclusive contract, stamped at
> debut and backdated by migration; the renewal table at year five
> that turns the whole directed-acts ledger into one of four
> dispositions (devoted / professional / strained / gone), each with
> its own doors — sweeteners, fame-priced terms, held lines on a
> coin, farewells written right, and pleas that occasionally change
> the arithmetic. Departures handle every invariant: roles, rooms,
> deals, claims, desk scenes, grieving friends, and a file that
> stays open forever; the group provably continues as N through a
> full comeback cycle. The anti-immortality rule (paper runs out at
> 7.5y when the read is gone) came out of the harness's new
> long-horizon pass — 3 seeds × 380 weeks proving tables open,
> re-signs happen, and a neglect org actually loses people (it lost
> 2). Graduation to solo exists and is suite-tested; the renewal
> flow offers it in a later pass. Numbers: battery 45/45 (suite 045,
> 70 assertions — the longest yet), soak clean + long clock (10
> tables, 10 re-signs, contractStamped 40/40), e2e 90, lockstep
> 0.9.0 (45 modules). Rode to main.
\n
> **v0.9.1 — time passes** (owner: *"I just realized this... nobody
> is getting older"*)
> The calendar celebrated birthdays nobody actually had: birthday
> weeks were already hash-truth (`KP.birthWeekOf`, the celebrations,
> the subway ads) but `p.age` never incremented anywhere. Now a
> birthday adds a year — for everyone in the world, on the same
> hash-truth week the timeline celebrates. Idol notes say the turned
> age; trainees get the practice-room cake (flavor); rivals,
> prospects, and the departed age quietly, because time does. Ages
> now feed back into everything that reads them: the dating-rumor
> pool fills as members cross 19, maknae math stays live, scout
> valuations of aging leads soften. The §39 map shifts one number
> down (society becomes v0.9.2). Rulings on the way through:
> conceptPivot notes promoted to priority-high (an identity changing
> lanes is era-defining news — surfaced when the aging stream shift
> cost it its inbox seat); regionStory census re-counted as
> ever-formed rather than week-140 memory snapshot, and its floor
> lowered 10%→2% with a §18 watch item (threshold 75 rides the tail
> of the distribution — median ~71, verified unchanged against the
> v0.9.0 baseline). Long-clock guard: every founder ages exactly 7-8
> years across 380 weeks, departed or not. Numbers: battery 45/45
> (suite 038 now 64), soak clean, e2e 90, lockstep 0.9.1 (45
> modules). Rode to main.
\n
> **v0.9.2 — the files catch up** (owner: *"can we age the trainees
> and idols I have? they're all at the exact age they were when I
> signed them"*)
> v0.9.1 started the personal clock but only from that week forward
> — saves that lived seasons before it had everyone frozen at
> signing age. Migration 0.9.2 counts the birthdays each person
> already lived through (anchored to the first history entry —
> signing day, or day one in the building — with rival natives
> anchored to their act's debut, clamped to week 0) and applies them
> in one correction, announced by an HR memo owning the filing
> error. Prospects are skipped: board leads churn in weeks. The
> catch-up provably reproduces the live clock's answer exactly
> (suite 038's backfill block freezes a ridden save and diffs the
> migration against live aging). Suite 016's byte-identity fixture
> now compares everything but age, as it must. Numbers: battery
> 45/45, soak clean, e2e 90, lockstep 0.9.2 (45 modules). Rode to
> main.
\n
> **v0.9.3 — the staff read** (owner: *"I feel like it's really
> difficult to gauge personalities"*)
> Full spec in §44. Twelve systems read the personality numbers;
> zero surfaces said them — personality was consequence-only.
> KP.staffRead turns the live numbers into the three sharpest edges
> in staff language on the dossier's working card (no rng, no state
> touched, prospects excluded — character is read in the building).
> The room report names the quiet pairs (the hub-and-spoke gap the
> owner hit: three trusted pairs, all through one member, and a
> "workable" consensus nobody could explain) and the personality
> mix in words (stacked dominance, warm/cool rooms). Numbers:
> battery 45/45 (suite 039 now 58), soak clean, e2e 91, lockstep
> 0.9.3 (45 modules). Rode to main.
\n
> **v0.9.4 — the society + the home circuit** (owner: *"so society
> is next. now 0.9.4. also, I'd like you to add 'dates' to tours...
> certain venues or cities request multiple nights if sales are
> strong"*)
> Full spec in §45. The KR leg becomes a routed national circuit —
> Seoul plus every city whose room the fanbase can fill, two dates
> a week, sold-out cities earning second nights (the overseas
> letter's "second night we cannot book," answered at home). And
> the industry gets its society (§39 consult #3): waiting-room
> friendships across company lines, personality-gated; coffee
> trucks on opening weeks; public congratulations; the senior who
> stans your rookie unprompted; the debut class lined up every
> award season. New module society.js (46 total). Rulings:
> strongholdNarrativeAt 75→72 (circuit-lengthened tours cooled the
> map ~3pts — the §18 watch item's own prescription, now resolved);
> the intensity fixture pinned below the birthday-ad threshold
> (different feed content is different rng). Census first soak:
> circuits 40/40, encores 40/40, friends 37/40, trucks 14/40,
> senior stans 39/40, classes 20/40, congrats 31/40. Numbers:
> battery 46/46 (suite 046, 32 assertions), soak clean, e2e 91,
> lockstep 0.9.4 (46 modules). Rode to main.
\n
> **v0.9.5 — the year** (owner: *"0.9.5 approved"* — §39 consult #4)
> Full spec in §46. The calendar gets its shape: the January dead
> zone (−3 and a note with an opinion), the spring university
> festival circuit (annual, mid-tier fee, headliner variant — the
> pop ceiling was dead content and the fee cap carries the flavor),
> the song-of-the-summer window (+4 for bright records in season),
> and gayo December — invitation by popularity period, quiet
> Decembers on the record, and waiting-room friendships becoming
> special-stage collabs on year-end television. Above the bonsangs
> now sits ONE daesang, brutal for real: symmetric scoring plus the
> national chart's giants seated at the table (16/40 vs 31/40
> before them); the first win gets the full treatment — history on
> every file, the ambition door, a speech that names the fandom
> first — and the near-miss with a bonsang in hand doubles the snub
> ("a bonsang. Again."). Two 0-based year bugs caught: daesangWonYear
> falsy in year one (the "first" would repeat), and v0.9.4's cohort
> guard skipping year one's own debut class (38/40 after). New
> module year.js (47 total). Numbers: battery 47/47 (suite 047, 26
> assertions), soak clean (fest 40/40, gayo 40/40, daesang 16/40,
> snubbed 14/40), e2e 91, lockstep 0.9.5 (47 modules). Rode to
> main.
\n
> **v0.9.6 — the constituency + genre-bending** (owner: *"0.9.6
> approved. and I have a personal request... if I want a k-metalcore
> group, I should be able to do it... extremely high risk high
> reward... all on the table."* + §39 consult #5)
> Full spec in §47. The Genre-Bending brief is the ninth creative
> direction: under it, the lock panel opens the collision — two of
> fourteen genres, K-metalcore × trot on the record sleeve — and the
> release rolls the whole table, creativity-tilted: industry shift
> (genreShift narrative, the textbook entry), acclaimed-but-unpopular
> (the discography keeps the asterisk), the flop, or it just works.
> And the organized fandom becomes a constituency: grievances watched
> (moved centers, empty credit slots, the medical bench), LED trucks
> parked outside with the facts, three doors (concede / half-measure
> / hold) and a grudge counter with teeth — plus the company's voice
> back: café notices, fan meetings (the cake incident is canon), and
> the lightstick launch. New module constituency.js (48 total).
> Census first soak: mashes 14/40 with 4 shifts / 6 acclaims / 10
> flops, trucks 8/40, meetings 40/40, lightsticks 40/40. One UI TDZ
> bug caught by e2e (mash panel shadowing the demo selection).
> Numbers: battery 48/48 (suite 048, 37 assertions), soak clean, e2e
> 91, lockstep 0.9.6 (48 modules). Rode to main.
\n
> **build 0.9.6.1 — the standards** (owner: *"we overlooked the
> obvious genres lol. Pop, hip hop, dance... standard kpop genres to
> mash with a unique one"*; four-part build = cache bust only)
> The mash menu gains the standards — pop, hip-hop, dance, rock,
> ballad — because half the point is a standard K-pop genre colliding
> with a strange one. K-pop × metalcore is now literally on the menu
> (and suite-asserted, literally). 19 genres total. Battery 48/48,
> soak clean, e2e 91, lockstep 0.9.6.1. Rode to main.
\n
> **v0.9.7 — the credits** (owner: *"0.9.7 approved"* — §39 consult
> #8, the last Phase B release)
> Full spec in §48. The songs come from people now: a persistent
> six-producer writers' room with home lanes and track records the
> desk reads in words; three records together harden into a
> signature-sound narrative; the demo the company passed on gets
> shopped and comes back as a rival hit (the A&R meeting will be
> very quiet); members with producer minds co-write b-sides and the
> booklet says so — performer to artist, one liner note at a time;
> the timeline quotes itself inside the weekly cap; and February
> graduates the 19-year-olds in gowns. Choreographer/stylist
> poaching deferred to Phase C, on the record. Fixture repairs from
> the producer-pool stream shift: truck coins pinned (suite 048),
> the copycat reveal given its real runway (suite 030), the
> trainee-cake check made trim-tolerant (suite 038), the
> promo-vs-idle social check moved to trimmed means (suite 027 —
> spikes are heavy-tail on both sides now), the ghost fixture
> pinned past rival chart luck. New module credits.js (49 total).
> Numbers: battery 49/49 (suite 049, 27 assertions), soak clean,
> e2e 90 (one conditional lock-warning check untriggered this
> stream), lockstep 0.9.7 (49 modules). Rode to main. Phase B
> closes; Phase C — careers entire — is next, under owner-watched
> version numbers.
\n
> **build 0.9.7.1 — names somebody chose** (owner: *"the option to
> change names of solos on the tracklist. I want them to be
> memorable rather than feel generated"*; four-part build)
> `KP.renameTrack`: credited tracks (solos and units) in production
> get a rename field right on the tracklist card — 24 chars,
> uniqueness against every discography, the archive keeps receipts;
> the title track still renames on the demo board where it always
> did. Renamed tracks wear a small ✎ and the chosen name ships on
> the record, in the credit notes, and in the liner-note chips.
> Battery 49/49 (suite 049 now 33), soak clean, e2e 90, lockstep
> 0.9.7.1. Rode to main.
\n
> **v0.9.8 — the flagships** (owner: *"the game in general feels
> easy. every release is straight to #1 on the scene chart. never
> lost a head to head"*)
> Full spec in §49. Measured truth: rival acts mean-reverted to a
> ~70 popularity ceiling while active play compounds past 85 — the
> market never produced peers. Now every rival company's flagship
> PURSUES the scene ceiling (weekly investment drift), punches up
> when releasing from behind (capped — hunger, not magic), and the
> trades narrate the chase before it costs the player a week. Plus
> the daesang tenure margin from the LUMI sweep question: a
> debut-year act must be undeniable, or the envelope's debate goes
> to the body of work. Census: careers now lose head-to-heads
> (30/40) and miss #1 (38/40) while still reaching the summit
> (top-three 40/40) — contested, not capped. Battery 50/50 (suite
> 050), soak clean first-try, e2e 90, lockstep 0.9.8 (49 modules).
> Rode to main.
\n
> **build 0.9.8.1 — the born leader** (owner, after finding the
> leadership line on a week-old signee the builder passed over:
> *"they're all trainees. none of them have stages or experience, so
> why is it acting like they do?"*; four-part build)
> Caught: internal showcases feed liveExp, and the derived-leadership
> formula's live term (up to +14) let years-in-the-building outrank
> a genuinely higher leadership trait in the builder's leader pick —
> while the exec's verdict and the tour bar read the raw trait. One
> truth restored: derived leadership is now the trait steadied by
> professionalism and warmth (0.5/0.3/0.2), no live term; polish
> stays in stagePresence where it belongs. The builder, the exec,
> the tour manager, and the staff-read line now all point at the
> same person. Battery 50/50 (suite 050 now 15), soak clean, e2e
> 90, lockstep 0.9.8.1. Rode to main.
\n
> **build 0.9.8.2 — fancams need stages** (owner: *"I have trainees
> getting viral fancams all the time... fancams of what, exactly?"*;
> four-part build, same disease as 0.9.8.1)
> Pre-debut virality was real (dance covers, street-cast photos,
> showcase leaks — those notes were always coherent) but the counter
> behind it formed the fancamStar narrative ("every stage she takes
> is a camera...") and ignited literal fancam storms on people with
> no stages. Split: a viral trainee now becomes **the one to watch**
> (new narrative — "she has not debuted. The internet has decided
> that is the company's scheduling error. A debut is a deadline
> now."), and her storm is a **cover-clip wave**, not a fancam wave.
> Idols with stages keep the fancam story. suite_026's trainee
> fixture updated to the new law; the idol path proven in suite 050.
> Battery 50/50, soak clean, e2e 90, lockstep 0.9.8.2. Rode to main.
\n
> **build 0.9.8.3 — the verdict lives where the question does**
> (owner, after a sensation K-pop × metalcore debut: *"didn't see
> any of those inbox items"*; four-part build)
> The "it worked" mash verdict was the one outcome left at normal
> priority — and a sensation week is exactly when the inbox budget
> trims normals, so the player's own gamble resolved invisibly.
> Ruling: the verdict on a player-placed bet is NEVER trimmable —
> all four outcomes now high (shift stays critical), suite-asserted.
> And the release report card itself now wears the verdict chip
> ("the mash: CHANGED THE INDUSTRY / critics' shrine, public shrug /
> ate itself / it worked") so the answer sits where the question
> does. Battery 50/50, soak clean, e2e 90, lockstep 0.9.8.3. Rode
> to main.
\n
> **v0.9.9 — the founding** (owner: *"I'm not the CEO, I work below
> them... leave and start your own label. completely fresh start,
> going up against what you built. would require cash and rep"* —
> Phase C opens)
> Full spec in §50. The Desk grows a door: trust ≥70, two years
> served, an honor on the pitch deck — and a war chest liquidated
> from your daesangs, bonsangs, national #1s, trophies, and years.
> Walking through it converts the company you built into a rival
> (founderGrudge — protected from the lifecycle, hunted by the §49
> flagship physics), your groups into its acts with everything they
> earned, your idols into its idols (files forever, the ones with
> standing keep the door pass as a bookmark), and hands you a typed
> letterhead, a new investor, a fresh board, and eighteen months to
> prove it was you all along. The world clock never stops. New
> module founding.js (50 total). One lifecycle guard added: the
> founder's old house never quietly folds or merges out of the
> story. Numbers: battery 51/51 (suite 051, 32 assertions — the
> whole second act ridden 80 weeks + a new debut), soak clean, e2e
> 90, lockstep 0.9.9 (50 modules). Rode to main. Phase C is open.
\n
> **build 0.9.9.1 — the letterhead is yours** (owner, first founding
> in the wild: *"everything in the screenshot just carried over...
> I can't just take the description from HCG at the start of the
> game lol"*; four-part build)
> Three carry-overs caught: the scene card's company blurb was
> hardcoded to HCG's origin line (now `state.company.blurb`, set at
> founding to the architect's story, DATA fallback for old saves);
> the topbar chip was literally the string "HCG" in the markup since
> v0.1.0 (now rendered from `state.company.short`, and the founding
> derives a chip-sized short from the typed name); and "the
> conversation" still showed narratives about idols who crossed the
> wall (playerNarratives now excludes rival-status idols — they take
> their stories with them). Battery 51/51 (suite 051 now 35), soak
> clean, e2e 90, lockstep 0.9.9.1. Rode to main.
\n
> **v0.9.10 — the last group** (owner, on the new-career screen:
> *"it says the last group still sells but it is aging. But then you
> have no group to start with... provide an aging group at the end
> of their contracts to kind of keep it cohesive"*)
> Full spec in §51. The intro copy becomes the game: every new
> career opens with the six-year girl group the reputation was built
> on — four road-worn vocalists (23–26, vocals 66–80, liveExp 90, no
> fog), popularity 56, a #1-debut-then-slide discography, a named
> fading fandom, two trophies per stage (short of darlingAt on
> purpose), and contracts that put all four renewal folders on the
> Desk before the first debut does. Trainees stay first in the
> roster; `newGame(seed, name, {legacy: false})` lets mechanism
> suites run lean while the harness, the e2e, and new suite 052
> prove the real opening. Rulings: age census reads trainees/
> prospects only, daesang giants seat at 140, showDarling band
> flipped ceiling→floor (§18 — a kept-winning inherited act reaching
> the dynasty is design, not wallpaper). Coherence fix en route:
> the seeded promoUntil tracks the year-old last release, so the
> veterans' calendar is open on your first morning. Battery 52/52
> (suite 052, 32 assertions), soak clean (97 bands), e2e 91,
> lockstep 0.9.10 (50 modules). Rode to main.
\n
> **v0.9.11 — the second job** (owner: *"Phase C approved. let's get
> started"* — §39 item one, variety careers)
> Full spec in §52. Productions start calling for the idols the
> market wants: a fixed panel seat for the funny one (varietySkill),
> the MC mic for the poised one (stagePresence + a name the public
> knows), a drama OST for the voice (vocals ≥70). The gig pays the
> person — weekly money, follower drips, media reps that feed
> varietySkill back — and collides with the group calendar: busy
> weeks stack fatigue, the van misses tapings at a coin, and three
> misses get her quietly recast unless the company pulls her out
> first. Wrapped runs touch the variety ambition, pay the group a
> point of popularity, and stack into narratives: variety monster
> (2 panel arcs), national MC (one full run), the OST voice (2
> drops). New module gigs.js (51 total), Desk casting-call cards,
> staff flag moonlighters at comeback lock. Two knock-on rulings:
> gaffe band ceiling to 1.00 (bigger followings + more fatigue =
> more 2am incidents, by design), daesang giants 140→145 (scarcity
> holds against gig-inflated popularity — 21/40 back to 15/40).
> Battery 53/53 (suite 053, 38 assertions), soak clean (102 bands,
> all five new bands alive first try), e2e 91, lockstep 0.9.11
> (51 modules). Rode to main. Phase C: one down, three to go.
\n
> **v0.9.12 — the disappearance** (owner: *"next step approved"* —
> §39 item two, hiatus as strategy)
> Full spec in §53. Announcing the quiet is a move now: a declared
> hiatus rests the roster at double speed, hands the second job an
> empty calendar (offer bonus, zero missed tapings), and builds a
> return that lands as an event — but past six weeks of grace the
> public starts forgetting, popularity and fandom walking down
> weekly. The load-bearing ruling came from the first soak: with an
> anticipation floor below the grace window, a six-week "hiatus" was
> a free reception bonus on the natural release gap. Now anticipation
> counts ONLY the weeks past grace — every point of hype is bought
> with cooling, which is the bet the spec always described. Locking
> a record announces the return (IS COMING BACK), the release
> converts the toll into numbers (0.75/week past grace, cap 10), and
> the census reads durable stamps. New module hiatus.js (52 total),
> group-page declare button with the trade stated plainly, tour door
> blocked while gone. Rulings: secondJobStory ceiling 0.85 (the
> parked-group synergy is the thesis), daesang giants 148 — third
> step in three releases, §18 now demands era-indexing next time.
> Battery 54/54 (suite 054, 32 assertions), soak clean (105 bands),
> e2e 91, lockstep 0.9.12 (52 modules). Rode to main. Phase C: two
> down, two to go.
\n
> **build 0.9.12.1 — the pronoun sweep** (owner: *"debuting a male
> solo act refers to him as a her. can [you] just go through and
> clean that up?"*; four-part build)
> The sweep found two classes. One: person-subject lines written
> before the halls went co-ed — the solo builder ("The internet
> already knows her"), the exec's solo review ("A solo debut for
> her?"), solo chemistry, sign/keep/release buttons and the release
> modal, the plateau note, the hype directive, the breakout card,
> deal/gig declines, the memberWrote fan post, the hype-promise
> meeting callbacks — all rerouted through fillPro tokens (~20
> sites). Two, found by the sweep: CEO Kang Min-ho has been "she"
> since v0.1.0 — executives never had a gender field. Added to the
> data, stamped at newGame and at founding, healed on old saves
> without a version gate (four-part builds skip the migration
> chain), and every exec-voice line (deadline refusals, Monday
> meeting toasts, board season, the entire pet-project arc) now
> renders through KP.execP. Null-fallback pronouns and historical
> migration notes left as-is; one exec reference in an old
> migration note neutralized. Verified with a forced Kang Min-ho +
> male soloist render of every touched line. Battery 54/54, soak
> clean, e2e 91, lockstep 0.9.12.1. Rode to main.
\n
> **0.9.13 — the audit** (owner: *"stop expanding the world right
> here... full code audit: bugs, saves, aging, persistence,
> balance, code health, anything that can corrupt a long save"*)
> Full spec in §54. Four parallel review passes + a new permanent
> torture rail (tools/audit_longhaul.js: five careers to week 620
> with deep integrity/round-trip/fork/NaN checks — clean). ONE true
> brick-a-save bug found and killed: a group emptied mid-lock
> crashed the weekly loop forever; retiredWeek is now a real gate
> across nine desks. Also fixed: unhandled storage-quota throws,
> founding's id-counter desync (save corruption class) and missing
> social mint, ghost engagements on departed idols, unreleased
> credits surviving their member, the trainee-release sweep, the
> founding's post-v0.9.9 surfaces (gigs/offers/project/handles/
> narratives/orphan files), same-week door knocks, render-time rng
> peeks and the Desk's 600ms read timer, the aliased tracklist, and
> the two monotone ratchets: award tallies year-scoped (the daesang
> stops being an annuity; giants step back 148→140) and a success
> payroll (rookies cheap, institutions bill monthly) with the soak
> bot taught to tighten its belt under fiscal pressure. Aging came
> back CLEAN (no NaN, no double-aging, no under-14s, no immortal
> contracts); graduation now flags every eligible gown; prospects
> age off the board at 24. Growth measured healthy (~600 KB at year
> 13, ~a century from quota). validateState extended with the
> status-level checks whose absence hid every departure hole.
> Deferred with measurements in §18: stature-scaled production
> costs, senescence, trust saturation, rival-file compaction.
> Numbers: battery 55/55 (suite 055, 90 assertions — every audit
> bug pinned), soak clean (105 bands), longhaul clean (5×620
> weeks), e2e 91, lockstep 0.9.13 (52 modules). Rode to main.
\n
> **Phase C map amended** (owner: *"I like all three suggestions.
> fold them into the remaining Phase C plan"*) — the audit's three
> deferred findings join §39 as releases, front-loaded: the price
> of fame (stature-scaled production costs), time takes its share
> (senescence + trust drift, one release — both anti-saturation
> clocks), then the deep map, then the wardrobe department. Docs
> only; no build.
\n
> **The depth mandate** (owner: *"the game is extremely wide but it
> lacks depth when it comes to career narratives... there are so
> many more examples of things we could be doing"*) — six named
> holes written into §55 with the owner's examples preserved:
> sponsor obligations and the solo request, the transcendence
> clamor, rivalries with teeth at three tiers with fandom gasoline,
> festival season that reaches out and demands schedule surgery,
> language skills gating the overseas media room, and the standing
> clause that names the pattern (an event should ARRIVE, CLAIM
> something real, and LEAVE a mark — never just notify). §39
> re-sequenced: price of fame absorbs the sponsor's invoice, the
> gravity and the bad blood and festival season slot next, the
> tongue merges into the deep map, the audit clocks and the
> wardrobe close the phase. Docs only; no build.
\n
> **The second sitting** (owner: *"let's keep doing this rather
> than make any changes to the game... I've played a lot of this
> game and I have some ideas"*) — the consult continued both ways.
> Owner's five, canonized into §55 and the map: the service
> (military enlistment — stagger vs together, paused clocks, the
> discharge return stage), the clip (virality rewired to named
> stages, provenance forever), the rise and fall (rival eras made
> legible, collapse fallout = free-agent idols), the imprint (the
> associate label — founding machinery in reverse), and the agreed
> practice-room-years trainee pass (evaluations, the quitter, the
> aging-out clock). My pitched-unruled list parked in §55: the
> contested release loop, the catalog alive, executive succession
> + the founder's board, fansite masters, being poached yourself,
> award night attended, idol slumps, and dating & Dispatch (named
> honestly, flagged for content-law care, entirely the owner's
> call). §39 unified into a twelve-release order, the clip
> deliberately ahead of the gravity. Docs only; no build.
\n
> **All eight ruled in** (owner: *"yeah I want you to fit all of
> them into the order where they fit neatly"*) — the pitched list
> merged by shared machinery: catalog-alive into the clip (one
> release owns provenance both directions), slumps into the
> gravity (one set of trajectory rails, both directions), fansite
> masters into the bad blood (the gasoline gets faces), award
> night into festival season (the calendar attended), the job
> offer into the rise and fall (the founding's mirror), succession
> + the founder's board into time takes its share (every
> anti-saturation clock in one release); the contested release
> loop stands alone as THE TITLE FIGHT (slot 4) and dating &
> Dispatch stands alone as THE SECRET (slot 11, late on purpose).
> §39 final order: fourteen releases, nothing parked. Docs only;
> no build.
\n
> **The third sitting** (owner: *"we need a way to name
> generations... and groups should have professional rivalries as
> well beyond just when they've gone head to head"*) — two more,
> folded on arrival: named generations into the rise and fall
> (the scene's own memory — boundaries declared when the wave
> turns, every act stamped, the torch-pass narrative) and
> professional rivalries into the bad blood (formation sources
> beyond the calendar: debut class, concept, position, the award
> stolen twice). The fourteen-release count holds. Docs only;
> no build.
\n
> **v0.9.14 — the price of fame** (owner: *"well, let's start with
> 1"* — map slot 1, the depth era opens)
> Full spec in §56. Success stops being free, twice over. The
> record bills by the name on it: KP.statureCostMult prices promo
> and format at +1.2% per popularity point above 50 — one truth
> charged by planDebut, shown by the studio, estimated by both
> bots — with the 0.9.13 payroll flattened to a plain retainer.
> And sponsorship becomes a JOB: the brand books the face every
> ten weeks (kept, squeezed between schedules, or MISSED on the
> road — two misses terminate for cause with a clawback), and once
> per contract the call comes that is never just a request: the
> solo stage. Allow it and the money, the shine, and the envy all
> land — soloShines stamped for the gravity to read. Decline and
> the brand cools while she hears about the no from the brand
> manager, not from you: heldBack on the ledger the renewal table
> reads. Tuning history recorded honestly (0.02 starved the world;
> 0.012 governs it — trajectory ~25% damped at year 13, plateau
> deferred to the map's later sinks, §18). Fiscal bands
> recalibrated by ruling: the CEO reading the books IS the
> feature. Numbers: battery 56/56 (suite 056, 31 assertions),
> soak clean (110 bands, five new bands alive first try), e2e 91,
> lockstep 0.9.14 (52 modules). Rode to main. Slot 1 of fourteen.
\n
> **The fourth sitting** (owner: *"regional training schools...
> persistent and tracked, and when you or another company begins
> casting for a new group, these schools would naturally provide
> some of the auditions"*) — folded into slot 3, the practice room
> years: the same pipeline deepened at its other end. Named
> academies in the home circuit's cities with specialty lanes,
> alumni ledgers, and reputations that move with their graduates;
> audition classes submitted to every casting call, yours and the
> rivals'; scouting trips and partnerships as the player verbs.
> Founding your own academy noted for the imprint's era. Docs
> only; no build.
\n
> **The fifth sitting** (owner: *"international scouting... yea or
> nay?"* — ruled YEA) — folded into slot 10, the deep map + the
> tongue, where its enabling systems live: global audition tours
> as a costly high-fog high-ceiling scouting verb; international
> prospects carrying a home region and a native language; the
> member who IS the voice for her market while her domestic
> obligations need her Korean (the tongue inverted); the hometown
> airport when the tour finally comes. Content-law extension ruled
> at folding: xenophobia is never fan-voice content — home-region
> pride is the feed's register, and the ugly half, if touched, is
> institutional pressure the player manages. Docs only; no build.
\n
> **v0.9.15 — the clip + the catalog** (map slot 2). Owner:
> *"fancams and viral reactions come as a result of actual
> stages, not just randomly throughout a career."* Virality gets
> provenance: recordViral takes the stage it came from, the file
> stamps it, the history keeps it, the narrative names it — six
> call sites sourced, the sourceless roll demoted. And the back
> catalog wakes: resurfaced clips with real stages and ages on
> them, sleeper B-sides reverse-charting a year after their era,
> the clip→song pipeline, disbanded groups' songs charting
> anyway — with ROYALTIES either way, because the label owns the
> masters. Calibration by probe, recorded honestly: revival
> chance halved, revival pop trimmed (it was co-writing award
> season through the daesang score), the bot's sponsor-calendar
> tour gate cut 8→4 weeks (8 grounded the road and inflated
> award season from the couch), and the windfall itself was the
> fiscal fix — the catalog inflated stature bills without paying
> its own way until the money landed on the same orgs. Society
> waiting-room crash on mid-promo empty groups fixed (suite 057
> found it). Constants version-comment drift repaired; bumps now
> surgical. Numbers: battery 57/57 (suite 057, 27 assertions),
> soak clean, longhaul 5×620 clean, e2e 91, lockstep 0.9.15
> (53 modules). Rode to main. Slot 2 of fourteen.
\n
> **v0.9.16 — the practice room years + the regional schools**
> (map slot 3). Owner: *"trainees in general were where a lot of
> my thoughts were"* / *"decentralize and find talent outside of
> Seoul."* The pipeline gets addresses: six persistent named
> academies with lanes, alumni ledgers that write at the
> signature, and reputations that move when graduates debut, go
> viral, or become the it-girl — HOT schools make the trades, and
> open castings anywhere pull audition classes onto everyone's
> boards. The trip and the partnership become desk verbs; first
> look means rival scouts wait. And trainee life gets weather:
> monthly evaluation boards the trainees read before you do, the
> ace, the passed-over ace, project speculation, the resignation
> letter with three answers, and the aging-out clock with every
> ending — including the one the whole system roots for, the
> last-chance debut, which the feed and the profile writers treat
> exactly the way the real industry does. Promises are claims with
> expiry dates: a lineup that goes out without her breaks it ON
> THE SPOT. Calibration by A/B probe (the school desk's spend was
> tipping fiscal warnings — prices trimmed, bot paced); two bands
> re-ruled off their own ceilings per the flap precedent; the
> fatigue invariant taught about second jobs (its exemption list
> predated v0.9.11). Numbers: battery 58/58 (suite 058, 62
> assertions), soak clean (95 bands, eleven new — all alive round
> one), longhaul 5×620 clean, e2e 94 (three new schools checks),
> lockstep 0.9.16 (55 modules). Rode to main. Slot 3 of fourteen.
\n
> **0.9.16.1 — one train** (owner: *"one scouting trip per week.
> my scout shouldn't be able to hit every school in one week"*).
> The trip gains a global weekly gate on top of the per-school
> cooldown — one truth, read from the visitedWeek stamps the
> schools already carry; the UI rests every Trip button once the
> week's train is taken ("Next week"). The soak bot already
> traveled like a person, so every number held. Battery 58/58
> (suite 058 → 64), soak clean, e2e 94, lockstep 0.9.16.1. Rode
> to main.
\n
> **0.9.16.2 — the unread book** (owner: *"every scouting visit to
> only show a little more. full scouting after the 5th and that's
> when you get the complete read"* + gender and scouting depth on
> the profile). Scouting becomes a serial: the first report reads
> ONE domain — whatever turned heads, pinned to the first
> impression so the file grows without re-sorting — every paid
> look reads exactly one more page, and the fifth (maxObservations
> 4→5) completes the file: all five reads plus the overall
> recommendation, which until then Scout Im refuses to write
> ("ask me when I have seen all of her"). Unread pages SAY they
> are unread, on the profile chips and in the evaluators' own
> words; the board row and headline quote only written pages.
> People in the building stay fully read — fog is a scouting
> thing. Pre-read partnership leads (2 looks) now arrive with
> literally more pages, which the first-look retainer always
> deserved. The profile head gains boy/girl and the scouting
> depth ("fully scouted" at five). Battery 58/58 (suite 002 → 42),
> soak clean, e2e 94, lockstep 0.9.16.2. Rode to main.
\n
> **0.9.16.3 — the dated report** (owner rethink of the .2 ladder:
> *"roll it back to everything showing but with a question mark.
> make a targeted trip more expensive but relatively accurate on
> one trip. each compounding trip is a choice and might show
> improvement if your report is out of date"*). Everything shows
> from the first report, every band wearing a "?" until somebody
> actually goes — one look (4→12, fog front-loaded to ~40%) takes
> the question marks off in a single trip. And the report is a
> SNAPSHOT dated at the visit: the board keeps training (weekly
> trained-skill drift, lane-weighted for school kids, faster for
> the young), so the file shows what was written, not what is now
> true — a repeat look is a real choice that can reveal the
> improvement, and the profile says how old the report is. Looks
> are repeatable forever (one per person per week); signing wipes
> the dated report — the coaches watch her daily. Repairs en
> passant, both found by the louder world: the directors' one-year
> board verdict now carries priority high (it was losing the
> weekly trim), and the fatigue invariant learned the RECOVERY
> HORIZON — recovery from a stacked calendar takes ~10-12 weeks,
> and the old exemption list knew only prep/promo. Battery 58/58
> (suite 002 reworked), soak clean, e2e 94, lockstep 0.9.16.3.
> Rode to main.
\n
> **v0.9.17 — the title fight** (map slot 4). The most-repeated
> loop in the game, finally contested. Demos arrive with
> ADVOCATES worn openly on the cards: one producer campaigns per
> meeting and cools when passed twice (his good hooks go
> elsewhere — the ghost story's origin, finally mechanized); the
> exec's taste is stamped deterministically and passed at a
> counted price ("Taste is not a directive. It is, however,
> remembered."); and a member who writes sometimes puts her own
> demo against the professionals' — wilder odds, realer stakes,
> morale and the directed ledger moving on BOTH answers, her name
> riding the title line into the booklet when she wins the
> meeting. Repackages extend eras from the drawer of passed
> demos: cheaper, shorter, riding the era's heat by formula, once
> per era, albums only. The MV becomes an object: plain refunds
> and draws polite snark at the company, cinema lifts the record,
> travels the map, and bills like the act's name. Probes found
> repackages net-profitable and the fiscal band flapping inside
> its own noise across ten soaks — ceiling ruled to the tail per
> the v0.9.14 owner brief; hiatusReturned ruled off its flap.
> Numbers: battery 59/59 (suite 059, 44 assertions), soak clean
> (101 bands, six new all alive), longhaul 5×620 clean, e2e 94,
> lockstep 0.9.17 (55 modules). Rode to main. Slot 4 of fourteen.
\n
> **0.9.17.1 — the desk report and the solo's name** (owner
> playtest, two reports). One: *"new leads on the board are
> coming with a fresh read already on them. I'm never seeing the
> question marks"* — generation was rolling 0-1 free observations
> per walk-in; nobody counts as looked-at until somebody PAYS for
> a look now, so every lead arrives as a desk report wearing the
> "?" (school trips and partnerships still pre-read their files —
> that is exactly what the money bought, and those reads arrive
> DATED). Two: *"lots of group talk with solo acts... it should
> just show his stage name"* — a solo act IS the person: taking a
> stage name now renames the act (one truth; releases, charts,
> and the group page all follow), and the member-count chip reads
> "solo act", never "1 members". Fixture repairs from the removed
> generation draw recorded in-suite. Battery 59/59, soak clean,
> e2e 94, lockstep 0.9.17.1. Rode to main.
\n
> **v0.9.18 — the gravity, both directions** (map slot 5, owner:
> "let's move ahead with slot 5"). A new module (gravity.js,
> weekly 640) rails individual trajectories both ways. Up: the
> deterministic transcendence read (follower gap the spine, the
> narrative shelf, breakouts, sponsor shines) crosses 24 and
> holds four weeks, then the clamor arrives in stages — the
> trades' feature, the fandom formally splitting into camps that
> both love her, the board's Monday question, and at week ten the
> knock she rehearsed. Three answers, all with ledgers: the
> promise (one claim type shared with the exec's, 30 weeks,
> breaking it remembered), the hold (heldBack, and the resentment
> clock — which a promise on the record PAUSES, because a promise
> is an answer, not a hold), the open door (spin-out graduation).
> Any solo credit of hers dated post-clamor settles the whole
> thing and both camps claim the win. A live clamor triples the
> sponsor solo ask. Down: the slump — the nerve goes when morale,
> confidence, and a fresh wound align; stage stats damp ×0.82
> while the practice room stays whole; the quiet-era desk offers
> the shield (recovery, but the stage misses her: −3 live), the
> push, or the friend first; exits by recovery, by sixteen weeks
> of living, or by THE STAGE — a show win ends it that night.
> Identity arcs mint from counters the gig and festival systems
> already keep: festival icons (pay ×1.6), variety group (offers
> ×1.6), OST factory. Soak found the read's genre truth (every
> long career mints its biggest member; ~all settle by solo) and
> the promise-pause is what separates pacing from choice: 100% →
> 13/80 paying resentment. fiscalWarned ceiling ruled 0.65→0.75
> (measured 27/40 + 52/80 with slots 3–5's designed spending;
> poverty tail healthy, 80-seed min end-budget 2147). The
> longhaul founder now takes the collateral when trust alone
> gates by week 150 — that audit soaks the founded shape, the
> soak owns the odds. Numbers: battery 60/60 (suite 060, 37),
> soak clean (137 bands, seven new all alive or suite-held),
> longhaul 5×620 clean, e2e 94, lockstep 0.9.18 (56 modules).
> Rode to main. Slot 5 of fourteen.
\n
> **0.9.18.1 — the trainee floor gets a door** (owner playtest:
> "every rival with ~30 trainees... most have 6+ groups already
> created. it gets crowded pretty quickly for only being year 8").
> Two absences, found and filled. One: rival intake was a
> metronome — 35%/week toward the cap of 30 with NO release path,
> so every room pinned at the cap by year two and stayed. Rooms
> are now sized to a plan (next debut's cost + a prestige-scaled
> bench, ~8-12), scout at full appetite only below it, and face a
> seasonal evaluation that cuts back to the plan — purges for
> badly bloated rooms, so old saves normalize within a game year.
> A NAMED signee who never made a lineup is not exempt: below the
> bar and long-tenured, she goes with the counters, file stamped,
> wire told (median 3 named cuts per world per 140 weeks across
> five companies — one per company every two years). Two: the
> portfolio now paces the pipeline — every active act delays the
> next debut, a company at its comfort (2-5 acts by prestige)
> defers casting entirely, an overextended one prunes its coldest
> act sooner, and rival acts finally hit the same seven-year
> contract wall the player's idols live under (a finished run,
> not a fall — dignified copy, smaller prestige cost). Year-8
> worlds: 2-5 active acts and ~10 trainees per company, with
> retired runs accruing as history. The thinning then had to be
> paid for: player debut receptions jumped 61→67 in the emptier
> calendar, the national summit doubled to 19/40. Restored
> without re-crowding: a focused machine backs EVERY act with the
> flagship's hungry punch, and cycles its comebacks faster
> (×0.65) — the calendar stays contested because each act works
> harder, not because there are more of them (summit back to
> 13/40, catalog lottery to its old point, debut reception 60).
> Fallout fixed en route: the scene/national peak "superset"
> invariant was never sound (the boards decay at different rates
> BY DESIGN — demoted to a wild-desync guard); the scar guilt
> note and the friendship's birth both got trim priority (the
> louder wire ate them — growthPromise precedent); comebackNoteMin
> 64→70 (the punched era's bar for "everywhere" rises with it);
> fiscalWarned 0.75→0.85 and catalogRevived 0.75→0.85 by ruling
> with 80-seed measurements (tails healthy; the fiscal ceiling is
> on its THIRD chase — §18 says re-point it at the poverty tail
> next flap). Numbers: battery 60/60 (suite 022 +12 checks), soak
> clean (139 bands, two new), longhaul 5x620 clean, e2e 94,
> lockstep 0.9.18.1. Rode to main.
\n
> **0.9.18.2 — the conclusion of team activities** (owner playtest:
> "I'm realizing there's no way for ME to disband a group"). The
> door the rivals got in 0.9.18.1, opened from the player's side of
> the desk: KP.disbandGroup, reached from the bottom of the group
> page behind a confirmation that tells the whole truth. The GROUP
> ends; the contracts don't — members stay signed idols on their
> own calendars (gigs, deals, second jobs, renewals all continue,
> renewalRead already null-safe for the groupless), the catalog
> stays on the record and can still resurface. The record keeps
> g.finalLineup while every gate reads empty; morale −10 and a
> disbandedUs directed for everyone in it; open claims about the
> group settle void; ending an act still selling (pop ≥ 45) costs
> trust −8, priced by the exec in the statement. Guards: the road,
> a release in production, and a running era all block the door —
> let the era end before you end the act. A pre-debut project
> dissolves instead (morale −4, trainees freed the same afternoon,
> devGroup gained the retired-guard so a dissolved project can't
> block the next lineup forever). The groups page grew a Concluded
> archive; a closed chapter's page reads as a record, not a
> dashboard; the timeline grieves through the playerDisband feed
> reaction — the catalog doesn't disband and neither do they.
> Battery 60/60 (suite 010 +26 checks incl. post-disband roundtrip
> and fork), soak clean, e2e 94, lockstep 0.9.18.2. Rode to main.
\n
> **Planning sitting (post-0.9.18.2) — the mandate.** Docs only; no
> build, no version. Owner adds four items to the plan: exec-directed
> debuts (the player as executive producer — the hard directive and
> the pet project generalized into the ONLY way new acts start, with
> a pitch-upward verb preserving agency as persuasion, comebacks
> untouched, and the founding retroactively becoming the escape from
> exactly this); three-year trainee contracts (the real-world
> standard, a paper clock beside the practice room's market clock);
> the member desk (remove-but-retain, terminate with a priced buyout,
> individual hiatus with N-1 promotion); and the mid-contract walkout
> — the meeting she calls — closing the one gap in voluntary exits
> (renewal leave, the resignation letter, and the gravity's open door
> already exist and were answered from the record). Written as §61
> with a pointer at the §39 map; placement relative to slots 6-14 is
> the owner's call at next approval. Rode to main.
\n
> **v0.9.19 — the mandate** (§61 items 1/2/5; owner: "the player is
> essentially an executive producer" + "I'd like to see hype build
> around debuts and comebacks after we've announced them"). The
> chair gets its job description. New acts start when the directive
> comes down: one read-through truth (KP.openMandates) over every
> desk already issuing them — the founding objective, the hard
> directive, the pet project, the second-lineup promise — plus real
> board greenlights and the pitch YOU take upstairs, which the exec
> answers for reasons (trust, the room on paper, the books), never
> for dice, closing the boardroom calendar either way. Formation and
> projects gate on a fitting greenlight; the debut consumes it; a
> window left dark lapses at trust cost. Comebacks stay free; the
> spin-out bypasses the boardroom; the founding now reads as the
> escape from exactly this. Trainees sign the industry-standard
> three-year paper — stamped at signing, backdated by migration,
> bridged through lineups, converted at debut — and the table at the
> end of a term is real: renew and notarize the belief, watch her
> decline it herself when the math stopped working, let it run out,
> or let the unanswered table answer itself. And the wait between
> the announcement and the stage is content now: locking a record is
> a public event, teaser beats warm the members and bank buildup,
> the timeline counts down out loud, and the release cashes the
> countdown as a capped opening edge on the record (rel.anticipation
> — debut receptions median 60→65, the designed shape). Fixture
> repairs across ten suites (solo/second/boy-group formations get
> fixture greenlights; the fandom-era A/B nets out the countdown
> edge BY DESIGN; the founder's second climb pitches its own board).
> Numbers: battery 61/61 (suite 061, 54), soak clean (145 bands, six
> new, two ruled bot-dormant), longhaul 5x620 clean, e2e 94,
> lockstep 0.9.19 (57 modules — mandate.js). Rode to main. Next:
> v0.9.20 the member desk (§61 items 3/4).
\n
> **v0.9.20 — the member desk** (§61 items 3/4). Three verbs on a
> contracted member, one shared surgery (KP.lineupSurgery, extracted
> from departIdol so the departure, the termination, and the removal
> run identical group-mechanics — roles, rooms, maknae, credits, the
> left-behind). Remove from the lineup but keep the paper: she
> becomes a groupless idol on her own calendar, morale and the
> directed ledger priced, the statement saying "individual
> activities" while the fandom looks for the missing sentence.
> Terminate entirely: a buyout priced by remaining years and her
> fame, cold, with everyone who shared a dorm learning something
> about the building. The personal break: the group promotes as N−1
> through one helper (KP.onBreak) wired into every desk that books
> people — rehearsals, idol weeks, training, brand events, gig
> offers, the live stage — open-ended, rested for real, the seat
> kept. And the meeting she calls: when the grudge ledger and an
> empty tank agree, the lawyer's font lands — hear her out for real
> money, hold her to the paper and let the renewal table remember,
> or sign the release and watch her leave lighter. The unanswered
> meeting answers itself. Numbers: battery 62/62 (suite 062, 46),
> soak clean (146 bands, walkout world-driven and bot-dormant),
> longhaul 5x620 clean, e2e 94, lockstep 0.9.20. Rode to main. §61
> complete; slot 6 (the bad blood) next, on approval.
\n
> **0.9.20.1 — the name pass** (owner playtest, screenshot in hand:
> "four separate groups using the name HALO something. I'd like more
> options and to attempt to create more uniqueness"). The generator
> had ten stem words feeding a third of all rolls and checked
> uniqueness on the exact string only — HALO2, HALO6, HALO9, and
> HALO Polaris were four different names to it. Pools roughly
> tripled (20 prefixes × 22 suffixes, 44 whole names, 28 stems;
> song titles: 50 adjectives, 55 nouns, 20 verbs), and uniqueness
> now runs on the name FAMILY: every word of every act name claims
> its stem for the world, so one HALO — and one Vermilion, however
> dressed — per scene, player suggestions checked against rival
> acts too. Chasing the reshuffle turned up a real bot blindness:
> greenlight windows were burning dark in 29/40 orgs because a
> 3-girl/2-boy bench can never field a one-gender lineup — the boss
> now recruits INTO the leading hall while holding a greenlight
> (lapses 29→0, second acts 40/40). Rulings with 80-seed
> measurements: natNumberOne 0.40→0.50 (the mandate era's designed
> strength), traineeTabled floor 0.40→0.02 (the bot consumes its
> bench before terms lap; the table fires for hoarders),
> performance-cut ceiling 0.90→0.97 (one sigma off the operating
> point). Battery 62/62, soak clean, e2e 94, lockstep 0.9.20.1.
> Rode to main. Slot 6 (the bad blood + the fansite masters) is
> approved and next.
\n
> **v0.9.21 — the bad blood + the fansite masters** (map slot 6,
> owner: "slot 6 approved"). Conflict costs and the fandom
> amplifies, at three altitudes. In the room: a pair that stays in
> open conflict long enough gets a NAME — chemistry dragged beyond
> the pair score, unit credits becoming disputes, the distance the
> cameras notice — and only sustained thaw buries it. In the
> building: two own groups on one calendar split one audience,
> priced at release and litigated by two fandoms under one
> letterhead. In the scene: professional rivalries finally form
> from SOURCES — the debut class, the concept, the position, the
> award taken twice, the feud grown personal — heat up on every
> shared week, ignite fan wars, and at temperature become canon in
> the trades. And the gasoline has faces now: biased regulars
> graduate to fansite masters who fund countdowns and organize
> rooms — until a betrayal on their bias's ledger flips the
> account into the 2am closing notice, receipts aimed at the
> company, per the content law. Numbers: battery 63/63 (suite 063,
> 30), soak clean (152 bands, six new; cannibal census re-pointed
> at the habit on first soak), longhaul 5x620 clean, e2e 94,
> lockstep 0.9.21 (58 modules — badblood.js). Rode to main. Slot 7
> (festival season + award night) next, on approval.
\n
> **0.9.21.1 — the scroll lock** (owner playtest: "when I'm changing
> anything in the training screen, after I select the scroll resets
> to the top... the same in the studio"). App.render ended with an
> unconditional scroll-to-top on every re-render — every toggle,
> draft change, and selection anywhere in the app threw the player
> back to the top of the page. The fix is one signature: render now
> fingerprints WHERE the user is (tab, pushed view, every sub-tab)
> and a re-render of the SAME view restores the scroll position;
> only genuine navigation — and the existing back-stack restore —
> touches it. Covers the training screen, the studio, and every
> other instance the owner was about to find. UI only; battery
> 63/63, e2e 94, lockstep 0.9.21.1. Rode to main.
\n
> **v0.9.22 — festival season + award night** (map slot 7, owner:
> "approved for slot 7"). The calendar's events become attended.
> Five NAMED annual festivals with weeks-of-year and prestige
> tiers now reach out — a scene four weeks ahead whose body reads
> the schedule surgery out loud and whose answer costs travel up
> front, pays at the stage, and can be EATEN by a calendar that
> changed after the ink dried. Icons get the headline call at
> ×1.6 (the arc threshold doubled to match the richer circuit);
> the old auto-circuit retired with honor. And the year-end
> ceremony is played, not summarized: the seating chart arrives
> the week before with one question — who takes the microphone —
> and the night answers in that voice: the leader's steady hands,
> the breakout turning to the line behind her, the writer
> thanking the producers by name, the friend at the next table on
> their feet before the envelope opens, or the speech that stayed
> folded in a jacket pocket, one edit needed next year. Fixture
> repairs: suite 047's circuit block rewired to the invite flow;
> the e2e till topped up and its lock-note check widened to the
> title fight's producer note. Numbers: battery 64/64 (suite 064,
> 26), soak clean (157 bands, five new; two first-soak bot fixes
> — tours grounded over bookings, hiatuses held), longhaul 5x620
> clean, e2e 95, lockstep 0.9.22 (59 modules — festivals.js).
> Rode to main. Slot 8 (the service — military enlistment) next,
> on approval.

> **v0.9.23 — the service (map slot 8, §66).** Owner: slot 8
> approved. §55.7's missing chapter, shipped whole: every male
> idol carries the window (notice 26, wall 28), and the wall is
> LAW — a longhaul invariant, not a suggestion. The folder with
> the flag on it opens the industry's two answers per boy group:
> STAGGER (the line holds short-handed — every desk reads
> onBreak: N−1 stages, no bus seat, no bills to a soldier, no
> renewal tables, no clamor from a base) or TOGETHER (one joint
> date after the era closes, a service hiatus that never cools
> because the wait is loyal, grace restarting at the last gate).
> The papers per man: send him now and dread flips to a date, or
> hold to the wall and spend the runway with the goodbye still
> owed. The contract clock pauses one-for-one by advancing
> contract.start with the week — every renewal read stays honest
> for free. Discharge stamps serviceDone durable, professionalism
> +4, the gate photo; the LAST man home opens g.returnStage and a
> lock inside 24 weeks banks buildup 26 with THE RETURN on the
> wire. A trainee at the wall leaves un-debuted — the story that
> ends at the practice room door. Migration records old saves'
> past-the-wall men as served in gaps the paperwork never had
> (the age-backfill's cousin); window men get the feature
> arriving. Soak is structurally silent by age math (two bands
> assert it, §18); the teeth live in the new haul-service
> longhaul scenario (boys seeded 23–24: 4 enlisted, 4 home, 1
> return, 0 walls — the bot answers its papers). Numbers:
> battery 65/65 (suite 065, 41), soak clean (159 bands), longhaul
> 6x620 clean, e2e 95, lockstep 0.9.23 (60 modules —
> military.js). Rode to main. Slot 9 (the rise and fall + the
> offer + the generations) next, on approval.

> **v0.9.24 — the rise and fall + the offer + the generations (map
> slot 9, §67).** Owner: slot 9 approved, "with that addition" —
> rival enlistment folded in after asking whether rivals ever debut
> boy groups (they do, ~one in three; now their boys pay the tax).
> The scene got a pulse and a memory. ERAS derived from prestige
> trails and worn on the cards — imperial releases come backed,
> fading ones thin. The POWER RANKING every January: one number the
> industry argues about, deltas printed, the top seat changing
> hands written up as THE OVERTAKE in three voices (ours, theirs,
> between rivals). A starved COLLAPSE now mints a SIGNING CLASS —
> the folded house's best five hit the open market for 16 weeks,
> priced by fame, veterans with carried fandoms and opinions read
> from trust; unsigned windows close on their own. THE OFFER: an
> imperial house courts a proven operator — decline or leverage
> (accept is slot 12's build, ruled in §18). NAMED GENERATIONS:
> gen 3 on arrival, seeded mid-wave with a real gen-2 old guard
> (first-soak lesson: without one, no torch can pass — 0/40 →
> 33/40), turns on landmarks, the TORCH PASS (player veterans are
> targets too — a second longhaul lesson: the legacy act blocked
> history while being exempt from it), or the old guard simply
> gone. 4–6-year wave cadence proven at 620 weeks (1–3 turns per
> world). RIVAL SERVICE: warm acts rotate short-handed at −5, cool
> acts pause whole and return punching +8, 4–6 events per decade
> world, rival-side wall invariant in the longhaul. Fixture
> repairs: seeding rng order restored byte-identical after three
> suites flapped (gen stamped post-object); suite_033's pivot
> check moved to resolve time (the 60-message inbox horizon was
> deciding a test). Numbers: battery 66/66 (suite 066, 48), soak
> clean (166 bands, seven ruled on 40+80-seed measurement),
> longhaul 6x620 clean, e2e 95, lockstep 0.9.24 (61 modules —
> risefall.js). Rode to main. Slot 10 (the deep map + the tongue +
> the world's auditions) next, on approval.

> **0.9.24.1 — the internet finds who it finds.** Owner: "trainees
> are getting too many opportunities to go viral... a couple with
> over 2 years are around or above 200k followers and they're not
> really special." Measured true (96-week probes): 34–42 pull
> trainees sat at 117k–191k because the viral event paid a FLAT 22k
> spike and its chance clamped pull at a floor of 20. The retune:
> chance now scales with pull-SQUARED, the spike and the hype gain
> scale with pull, and the hype trickle eased (traineePerHype
> 25→18). After: unremarkable benches land mostly under 50k (some
> never found at all, which is the truth of the industry), capable
> ones 17–81k, and the 64–70 pull kids run 150–230k — exactly who
> the hype directive exists to force onto a stage. Fixture repairs
> from the stream shift: suite 064's first invite rides the icon
> call (no more 75% roll), suite 063 reads the live civilWar
> discourse instead of a trimmable note, suite 022 asserts
> convergence to the plan's NEIGHBORHOOD (the plan moves with
> prestige now that era physics move receptions). Two ceilings
> ruled with measurement: daesangWon 0.45→0.60 (23/40, 38/80 —
> hype concentration means the CEO's forced debuts are better
> castings) and conflictEndemic 0.25→0.30 (11/40, 20/80 — the band
> was sitting on its own edge). Numbers: battery 66/66, soak clean
> (166 bands), e2e 94 (the conditional lock-note check idled),
> lockstep 0.9.24.1. Rode to main. Next: the star's clock (owner:
> solo albums, the fans calling for them, the ticking clock to a
> solo career — and the return run), as v0.9.25.

> **v0.9.25 — the star's clock.** Owner: "one solo stage shouldn't
> be enough, forever... a ticking clock until she's on hiatus from
> the group for her solo career, or leaves her group entirely."
> Built on the gravity's own rails (§60): a settled clamor re-arms
> ~40 weeks later ONE RUNG BIGGER if she is still the top
> transcendence read. Rung 2 is THE ALBUM — the fans campaign
> (albumClamor discourse), she brings a handwritten tracklist to
> the knock, the promise is a claim with a date, and
> KP.releaseSoloAlbum keeps it: a real record with reception,
> revenue, chart entry, and the group's room splitting its
> attention. Rung 3 is THE CAREER, and it only settles at the
> fork: launch her (same house, originGroupId, chapter two stamped
> on the group) or hold her — heldToPaper into the same grudge
> ledger the walkout reads, so holding long enough ends with the
> lawyer's font. The return run closes the circle: the alum next
> door gets asked back within the hour of every announced date;
> one era, full member, buildup +30, the sleeve stamped forever.
> Ride-along: the third daesang-ceiling chase resolved at the
> GIANTS per the band's own rule (national bar 140→146, 62.5%→55%,
> snubs healthy). Numbers: battery 67/67 (suite 067, 30), soak
> clean (166 bands), longhaul 6x620 clean (risefall + service
> lifecycles both live), e2e 94, lockstep 0.9.25 (61 modules).
> Rode to main. Slot 10 (the deep map + the tongue + the world's
> auditions) next, on approval.

> **v0.9.26 — the portfolio (§69).** Owner: "a major company might
> only debut a new girl group once every 5 to 7 years... a flagship
> boy group, girl group, units and soloists are more in line with
> reality." The doctrine: an ESTABLISHED house (two debuted groups,
> or one at stature once the company is 3+ years old — a startup
> with one hot debut is still a startup) gets new-group greenlights
> only for doctrine reasons: the generation's opening window (96
> weeks from each turn), a flagship visibly ending (the wall, a
> service chapter), or an empty hall. Pitches outside doctrine die
> with the reason spoken and close the boardroom calendar for a
> year. When the wave turns, an established exec HANDS DOWN the
> generational directive — gender-neutral, gated on a live bench,
> and carrying the wave's own window (the 40-week default lapsed
> 27/40 careers before the widening; 0/40 after — the window was
> the whole story). Units are the valve: KP.planUnitEra, two or
> three members, a persistent named identity on the group, its own
> release event between group eras (reception from stage presence +
> talent + group heat, revenue, chart entry, fandom fed) — 40/40
> soak orgs ran one, which is the portfolio breathing. Rival debut
> intervals stretch outside the wave's window so the whole scene
> inhales at each turn together. The three doors (fresh / current /
> major starts) are specced in §69 for a later release. Numbers:
> battery 68/68 (suite 068, 22), soak clean (168 bands), longhaul
> 6x620 clean, e2e 94, lockstep 0.9.26. Rode to main. Slot 10 (the
> deep map + the tongue + the world's auditions) or the three
> doors next, on approval.

> **0.9.26.1 — the audition notice works.** Owner: "I do find I
> have trouble casting viable boy groups." Measured true: the
> prospect stream ran ~25% male, so a five-boy lineup meant signing
> every male lead unseen while girl lineups picked from triple the
> pool. The fix is demand, not a flat quota: when an open group
> greenlight is male (or gender-neutral with the boys' hall empty),
> both scouting AND the school submission slates read the casting
> notice and the stream leans male (maleCastingShare 0.60; measured
> 58% of new leads while casting, 2 seeds x 60 weeks). No notice,
> no change — the ambient stream stays as it was. Battery 68/68,
> soak clean (168 bands), lockstep 0.9.26.1. Rode to main.

> **0.9.26.2 — the receipts read like receipts.** Owner screenshot:
> the Desk's promise ledger leaked raw claim types (growthPromise,
> soloPromise) and unfilled {pos} tokens, and the exec's
> closest-to-ready answer stacked a duplicate receipt per meeting.
> Fixed: ambition labels fill their pronouns for the real person,
> label-less claim types render prose, gravity-era claims use the
> labels they already carry, and re-answering the ready question
> MOVES the date instead of stacking receipts (existing stacks
> resolve naturally as each due date passes). Battery green,
> lockstep 0.9.26.2. Rode to main.

> **v0.9.27 — the entry rung + the launch.** Owner: "I've already
> given her a solo on an album prior to the system... this idol more
> than doubles the rest of the group's follower count. it should be
> more flexible than a ladder every single time." KP.starRung: the
> clamor now ENTERS at the rung her record and dominance have
> earned — a prior solo credit skips the stage ask, a prior album
> skips to the career fork, and a star at 2x the room's median
> following opens at the album regardless of history. Dominance
> alone caps at the album on purpose: the first cut let it jump
> straight to the fork and 80% of soak orgs minted solo acts
> ("an epidemic, not flexibility"); the career entrance requires an
> album on the record. Migrated saves count their pre-system solos
> — her old album credit is her rung. Plus the proactive verb the
> question surfaced: KP.launchSoloCareer on the member desk —
> launch her BEFORE she has to ask three times: warm graduation,
> chapter two for the group, morale +8, and an openedTheDoor entry
> in the directed ledger she keeps forever. soloDebuts ceiling
> ruled 0.75→0.90 with the mechanism (soloists are standard
> portfolio under §69). Numbers: battery 68/68 (suite 067 now 40),
> soak clean (168 bands), e2e 94, lockstep 0.9.27. Rode to main.

> **v0.9.28 — the three doors (§69).** Owner: "you can start as a
> fresh label with no history, the current start with a veteran
> group but limited recent success, or a major start where the
> infrastructure is already in place." The new-career screen offers
> the choice; newGame takes opts.door and stamps state.door. THE
> FRESH LABEL: no legacy group, budget 80, reputation ~30s, the
> founding class of six and the eighteen-month directive — hunger
> the doctrine never touches. THE INHERITANCE: today's start,
> unchanged and now named (the default everywhere — old saves,
> tests, the harness). THE MAJOR: two flagships mid-era (girl and
> boy, pop 64–68, three releases each, fandoms, stamped contracts),
> four extra bench trainees, budget 400, trust 62, the founding
> objective inherited as met, the tutorial signing rail waived —
> and isEstablished TRUE from the first morning, so the §69
> doctrine reads the portfolio FULL on arrival. Stewardship as a
> starting condition. Suite 069 (23): all three shapes, doctrine
> states, the major's machine running from week one, and per-door
> determinism forks. Numbers: battery 69/69, soak clean (168
> bands), e2e 94, lockstep 0.9.28. Rode to main. Slot 10 (the deep
> map + the tongue + the world's auditions) next, on approval.

> **0.9.28.1 — each door tells its own truth.** Owner's fresh save
> opened wearing the inheritance's clothes: "vocal powerhouse" as
> the company headline, a welcome note about six years of history it
> never had, and the exec briefing about a girl-group drought that
> predates a label founded last Tuesday. Fixed at both leaks: the
> opening inbox (exec intro, directive, welcome) is door-aware —
> the fresh label gets the runway speech, the major gets the
> stewardship speech and no 18-month directive, the inheritance
> keeps its original copy — and repHeadline reads 'Unproven label'
> until any reputation lane crosses 40. The new-career quote
> varies per door to match. Battery 69/69, e2e 94, lockstep
> 0.9.28.1. Rode to main.

> **v0.9.29 — the deep map + the tongue + the world's auditions
> (map slot 10, §70).** Language colors the map: the fluent member
> is the voice abroad (tour legs ×1.18 with her name on the note),
> interpreters bill when nobody is, global audition tours mint
> prospects with home regions, native languages, higher ceilings
> and zero observations, an international's first stronghold IS
> home, the tour's arrival there fills the airport, and Korean
> trains weekly until the joke lands. Content law upheld: pride
> and the bridge only. Numbers: battery 70/70 (suite 070, 22),
> soak clean (172 bands; natNumberOne ruled 0.60 at 41/80),
> longhaul 6x620 clean, e2e 94, lockstep 0.9.29 (62 modules —
> tongue.js). Rode to main. Slot 11 (the secret — dating &
> Dispatch) next, on approval.

> **v0.9.30 — the secret (map slot 11, §72).** Dating & Dispatch
> under the FULL content law, exactly as designed: a 19+ privateNote
> sometimes deepens into a secret the player never controls and
> never sees detailed — the manager's one-sentence brief is ALL the
> company gets. The camera clock reads fame, promo weeks and time;
> a paid protect posture (cover schedules, decoy vans) buys real
> quiet. The midnight photos land as a critical scene with the
> response menu: the warm confirm (the room takes it hard, heals
> honest, and she keeps a printed copy — stoodByHer +2), the
> privacy statement (cheaper, slower), the denial (cheapest today,
> a loan against the second set of photos — madeHerHide −2 into
> the walkout's grudge ledger), or silence (which is also an
> answer). The spectrum lives in the feed, aimed at the fictional
> tabloids and the norms, never at her — and the suite LINTS the
> module's strings for the content law. Census re-points executed
> per §18's own rules: fiscalWarned → the poverty tail (0/40 end
> broke), natNumberOne rarity claim retired (band guards runaway
> at 0.75). Numbers: battery 71/71 (suite 071, 20), soak clean
> (174 bands), longhaul 6x620 clean, e2e 94, lockstep 0.9.30 (63
> modules — secret.js). Rode to main. The sagas (§71) next, then
> slot 12 (time takes its share), on approval.

> **v0.9.31 — the sagas (§71).** Owner: "Sagas approved." Birth
> certificate, not biography — sagas.js hash-plans 1-2 world
> events per save into years 2-8 (hash-only planning: unfired
> worlds stay byte-identical), fires one standard entrance each,
> then the sim takes the wheel. The launch five: the super-group
> project (a new house arrives mid-chart with an elite
> international act and opens scout interest on OUR international
> board), the global JV (the one player-decision entrance: sign =
> worldwide auditions on their money + annual classes + 25% of
> the road abroad for 4 years; decline/expire = the pact signs
> across the street, +8 prestige and a co-built act there), the
> reverse invasion (diaspora talent, Korean names kept, English
> first, the tongue running backwards, cold at home), the heir's
> money (a bankroll distorts scout intake x3, interest x2.5,
> free-agent prices x1.5 for 120 weeks, then stabilizes at
> prestige >=55 or the tap closes and collapse physics inherit),
> and the second capital (a funded region: tour revenue x1.3,
> exports x1.35, auditions half price and deeper, sunset after 5
> years). Entrances enter weekReleases at order 561 so a saga
> debut can BE the landmark that turns a generation. Injection
> ignores maxRivals - invasions do not wait for a seat. Numbers:
> battery 72/72 (suite 072, 41), soak clean (176 bands - sagaFired
> 9/40 measured vs ~31% window math, jvAnswered 2/40), longhaul
> 6x620 clean with the new every-world-invaded invariant (all five
> kinds appeared across the six scenarios), e2e 94, lockstep
> 0.9.31 (64 modules - sagas.js). Rode to main. Slot 12 (time
> takes its share) next, on approval.

> **v0.9.32 — time takes its share (§73, map slot 12).** Owner:
> "slot 12 approved." Every anti-saturation clock in one release,
> and the whole module (tenure.js, order 859) is hash-timed and
> rng-free — the battery shipped with ZERO stream drift.
> SENESCENCE (audit A4 closed): the line is 28 — training gains
> fall 12%/yr to a 0.35 floor, recovery softens 6%/yr to 0.55,
> and liveReliability gains the stage-IQ floor (+1.5/yr, cap +9):
> what the years take in bounce they pay back in floor. One
> crossing note per idol, written with care; "the veteran's pace"
> on the dossier. TRUST DRIFT (audit B4 closed): above 75, -1 per
> month toward 75 — excellence becomes the expectation; the bar
> sits ABOVE the founding gate on purpose. Measured 40/40 first
> soak = universal weather, band re-pointed to guard the floor.
> EXECUTIVE SUCCESSION: chairs have 5-7 year hash-timed eras
> (non-founded only); on the turn the ledger resets to prove-it-
> again (startTrust + 0.35x the excess, both directions), the
> exec pool widened 3->6, the new chair brings new taste (execGen
> in the hash, pre-succession worlds keep their exec's ears), a
> fresh pet-project someday, and the first-meeting scene
> (receipts +3 / clean page +1 / expiry -2). THE FOUNDER'S BOARD:
> three hash-stable seats (lead investor, industry veteran, first
> believer) seated at founding — board-season flavor, the runway
> memo below 25% of the war chest, the confidence letter above
> 2x (+2 trust). theOffer's accept path now has the machinery it
> was waiting for; still a ruled build on owner's call (S18).
> Numbers: battery 73/73 (suite 073, 35), soak clean (179 bands,
> senesceSeen 39/40 + trustDrifted 40/40 both floor-guarded with
> measurements), longhaul 6x620 clean with two new invariants
> (non-founded => >=1 succession; founded => board seated), e2e
> 94, lockstep 0.9.32 (65 modules - tenure.js). Rode to main.
> Slot 13 (the imprint - the associate label) next, on approval.

> **v0.9.33 — the holdout (§74, first half).** Owner: "I'd like
> potential trainees to have agency... they'd hold out for one of
> the powers to come knocking," sequencing delegated. The board
> can say no: top-slice talent (>=64 peak, ~top 8%) with rival
> heat >=2, minus the grateful quarter, refuses offers below her
> bar — a REAL top seat (field-scaled rank AND score >=85; a
> four-row pond has one power) or her lane at >=60 on the
> letterhead. Every decline is free, human, and names the paths:
> become bigger (the call-back — she watches the rankings and
> calls ONCE when you cross), or keep showing up (the third
> sincere visit, 6+ weeks apart, wins her — the underdog pitch
> the powers never make). Money never flips her: the premium
> (x1.4) prices the market's read, rivals below prestige 55 get
> the same no, and only the heir saga's bankroll jumps bars.
> Endings the sim owns: signed by stature/lane/courtship/
> callback (each with its own history line), lost to a power
> (40/40 soak - the powers ARE knocking), or burned by her own
> bar at the age-out ("waited for a letterhead that never
> wrote"). The e2e, tapping the hottest row like a human, hit a
> live decline and learned to sign the next kid (95 checks).
> Three band re-rules under the stream shift, each per its own
> written history: mvPlain flipped ceiling->floor (third flap,
> showDarling precedent), fusionTried 0.60->0.75 and truckParked
> 0.80->0.90 (the bot walks deeper down the board now, measured).
> holdoutMet bot-dormant, ruled into S18 with a human-play watch.
> Numbers: battery 74/74 (suite 074, 37), soak clean (182 bands),
> longhaul 6x620 clean, e2e 95, lockstep 0.9.33. Rode to main.
> The blank page (S74 second half) next, then slot 13, per the
> delegated sequencing.

> **v0.9.34 — the blank page (§74, second half).** Owner: "the
> fourth door is a go." Name your own company, empty rooms, no
> reputation — hard mode, built as the founding at week one
> without the fame. blankSeed: inherited class deleted whole,
> war chest 240 with the §73 board seated at the first tick (the
> runway memo live from day one), trust 55, signings 6, rep 25
> every lane, founded from week zero — no succession, no
> theOffer, a custom company name on the door card (default
> Paper Label). The holdout is the wall as designed: no lane, no
> rank, build from the overlooked until the ranking says
> otherwise. Suite 075 proves both halves — the sought-after say
> no AND the door is playable (founding class signed, debuted on
> the seed round, books intact). Longhaul gained haul-blank
> (7 scenarios now): 13 years from nothing, never #1, clean
> through a bursting heir saga; bots cast for the directive's
> gender across all modes. Numbers: battery 75/75 (suite 075,
> 26), soak clean (182 bands), longhaul 7x620 clean, e2e 95,
> lockstep 0.9.34. Rode to main. Slot 13 (the imprint — the
> associate label) next, on approval.

> **v0.9.35 — the network (§75).** Owner: "the board should be
> empty at game start. all of the prospects already exist, but
> you have to choose who you uncover... bigger companies already
> have the academy relationships, wide scouting networks,
> countless applicants. we should simulate that" — ruled the
> priority release. The board is what your NETWORK can see, read
> live from numbers that already exist (never stored). Boards
> open at 12/5/3/0 by door and fill through channels: applications
> (private, scaled by the name, spiked by hits, the occasional
> believer), referrals (private, half-read, the building knows
> people), washouts (rival named cuts stop vanishing — back on
> the open board with history stamped; plus the anonymous
> stream), the season (annual generated survival-show finale —
> finalists with followings and heat, public and contested),
> viral kids, school leads — and two verbs: street casting
> (cheap, always available, occasional gem) and the open call
> (turnout scales with the name: the major's line around the
> block, the blank page's folding chairs). Channel privacy is
> the game: rival scouts never see your mail, so private kids
> rarely become holdouts — the small company's honest strategy,
> exactly as planned in the sitting. Doors differentiate cleanly
> in soak (blank lives on applications+referrals). Two latent
> regressions fixed: the fiscal letter now outranks the mail
> trim; the folded speech is durable history. fiscalNoticed
> flipped ceiling->floor per its own note; rival-count invariant
> learned the saga overflow. Saves ~100KB lighter at year 13.
> Numbers: battery 76/76 (suite 076, 26; 13 suites re-pointed at
> the new world by their own rules), soak clean (187 bands),
> longhaul 7x620 clean, e2e 97 (network card + verbs asserted in
> the browser), lockstep 0.9.35 (66 modules - network.js). Rode
> to main. Slot 13 (the imprint) next, on approval.

> **0.9.35.1 — the feed knows the door.** Owner screenshot: a
> blank-page start ("JP") opened with the fan feed's "six years
> of nothing" post — the inheritance's backstory, hardcoded since
> v0.4.0's seed. The third feed opener is door-aware now: the
> inheritance keeps its six years, the fresh label gets "every
> giant has a day one", the major gets the org-chart watchers,
> and the blank page gets "legend origin story or cautionary
> tale. there is never an in-between." Same rng shape (text only),
> battery 76/76 untouched, e2e 97, lockstep 0.9.35.1. Suite 075
> pins the leak closed. Owner on the door itself: "this is
> ridiculously difficult. I love it" — the difficulty stays
> exactly where it is. Rode to main.

> **0.9.35.2 — the clip needs a letterhead (+ the fierce fix).**
> Owner screenshot: an applicant trainee at the blank-page label
> ("JP") with TWO viral clips and 43k followers in five months —
> "entirely too many viral moments for a no name label." The
> trainee viral roll now reads the same network number the board
> does: vis = 0.35 + networkRead, squared on the event chance,
> linear on the follower spike, and NOT applied to the hype gain
> (when a no-name's clip does break through, the story is "who is
> she?" — rarer, not smaller). Measured: a blank-page ace fell
> from ~2 virals/20wk to ~0/40wk; the inheritance runs ~0.8/40wk
> at 13k; a major's ace travels exactly as 0.9.24.1 measured.
> suite_014's coverage claim re-pointed BOTH WAYS (found where the
> letterhead is known 7/12; the no-name found less, asserted).
> The measurement probe also flushed a REAL latent crash: the
> major door's boy flagship carried concept 'fierce' — never a
> valid id (v0.9.28) — detonating at the office-door challenge.
> Fixed at the seed, healed by migration (any group/release
> wearing an unknown concept -> 'dark'), versionLt extended to
> 4-part compares so patch migrations actually fire, and the
> longhaul gained haul-major (8 scenarios — the door this bug hid
> in was the one door never longhauled). soloDebuts ceiling
> retired per its own note (second flap; the floor was always the
> alarm). Numbers: battery 76/76, soak clean (192 bands),
> longhaul 8x620 clean, e2e 97, lockstep 0.9.35.2. Rode to main.

> **0.9.36 — the public eye (§77).** The owner's biggest ask: *"a
> fandom and industry that remembers... just how public the whole
> industry is."* New `publiceye.js`: announcements mint priced
> expectations (rep + record + public names, four levels), the
> known trainee left off the lineup IS a story (morale, passedOver
> directed entry, careful history line, aceSnub storm aimed at the
> company's choice — never at her), debuts settle against their own
> announcement (overDelivered / underDelivered / met, narratives on
> the record), and releases land in company (house-sibling gap
> notes, same-week scene yardstick). Weekly ace-watch chatter for
> known unassigned trainees; eight new feed-reaction families. Two
> stream-shift battery repairs (suite_021 fatigue-lecture
> sharpening, suite_064 icon stamp). Battery 77/77, soak 40 clean
> (expectSet/verdictSeen floored 90%, snubSeen 24/40 measured),
> longhaul 8x620 clean, e2e 97, lockstep 0.9.36. Rode to main.

> **0.9.37 — the grind (§76 C+D+E).** The big one, by request: *"I
> want it to be HARD as a fresh label... a whole pile of bookings
> from the lowest rung of fame up... promotion becomes a game
> within the game."* fame.js: the obscurity wall — paid promo
> converts through fame, unknown labels fight a soft ceiling, and
> piercing it while unknown is a BREAKTHROUGH that moves the wall
> for good. Music shows below the fame bar do not return calls
> (show slots become radio, told out loud; the call-back is a
> milestone). bookings.js: the procedural pile (16 kinds, 3 rungs,
> town x season grammar, inversely famous), the flyer week, the
> phone-camera lottery fame cannot damp, and the campaign — five
> pushes, momentum in words, full-rate conversion under the wall,
> half above. Era desk + booking pile on the Desk. Longhaul grew
> haul-fresh + a first-debut bot: the fresh house grinded, broke
> through, and got the shows call-back at week 23, organically.
> Fixed en route: archetype ceiling overflow past 100 (latent since
> the gift table, migration 0.9.37), unknown promo tiers minting
> NaN, double-played same-week gigs, boardSeason census eviction,
> truckParked flipped to floor. Battery 78/78, soak 40 clean,
> longhaul 9x620 clean, e2e 102, lockstep 0.9.37. Rode to main.

> **0.9.38 — the table (§76 A).** *"feels a little too easy to just
> click the sign button as a brand new label."* Signing stops being
> one click: files worth arguing over counter when fame is under
> the bar — the washout wants the debut-by clause in writing, the
> worker wants the training guarantee paid up front, the
> pragmatist prices the unknown label with a signing bonus.
> Holdouts, believers, and the famous are exempt (each for its own
> fictional reason). The clause has real teeth: kept closes with a
> debut and a frame; due opens the scene — honor the paper and she
> walks free, or plead once and the next deadline is not a
> conversation. Counters surface as the table sheet; clause chips
> ride the talent rows. §78 (the person in public: channel/live
> asks + content-agnostic scandals) written to planning the same
> sitting. Battery 79/79, soak 40 clean, longhaul 9x620 clean
> (organic counters in haul-founder/blank), e2e 102, lockstep
> 0.9.38. Rode to main.

> **0.10.0 — the product (§80 findings 1+8+3).** The v0.10 money
> spine opens. product.js: the album is a product LINE — pressing
> sheet at lock (versions, pre-order gifts, run preset against the
> pre-order read, fan-sign rounds), the chodong settling at
> release week as the fandom's PUBLIC scoreboard beside reception
> (sold-out story / warehouse memo as the gamble's tails), the
> fan-sign inversion (rounds sell albums, the cut line prints, the
> album-dumping storm aims at the company), and the two publics —
> revenue decomposed into digital (the general public streams the
> song) + physical (the fandom buys the object), with skewed
> profiles minting identity narratives. Fanbase read is sublinear
> in social and damped in feedback: the first calibration
> compounded flagship chodongs x7 and tripped the soak's
> budget-runaway invariant — the governor is structural.
> Calibrated: rookie ~350 copies, flagships 10k→35k across eras,
> revenue parity at first eras. Battery 80/80, soak 40 clean,
> longhaul 9x620, e2e 103, lockstep 0.10.0. Rode to main.

> **0.10.1 — the settlement (§80 findings 2+7+14).** The money
> spine's second vertebra. money.js: jeongsan — era bills and the
> practice years on a per-group recoup ledger, the 30% share
> repaying it on paper until FIRST SETTLEMENT (a scene: warm with
> backpay, to the letter, or the unheld meeting that says the
> most), real payouts after, and the neverPaid grievance renewing
> yearly on the long grind. The quarterly books: streams tracked
> at their sites, statements every 12 weeks with
> operations-as-residual, the Desk card, and the redInk scene
> after three losing eras. The distributor: three tiers cutting
> and reaching every pressing, the courting call off a real
> chodong, the advance with vig. suite_014 rewritten after the
> quarterly notes re-phased every legacy stream. Battery 81/81,
> soak 40 clean, longhaul 9x620, e2e 103, lockstep 0.10.1. Rode
> to main.

> **0.10.2 — the person in public (§78 A+B).** WeCast and the
> scandals. broadcast.js: the live ask, the channel deck, the
> unsanctioned live the company hears about after; growth
> fame-UNdamped (the camera does not care who you are), the gaffe
> blast scaled by the public eye — candor at a no-name, a sponsor
> call at a major. scandal.js: stories named at altitude from a
> four-shape deck, severity 1-4, the response desk with the deny
> trap, the forced hiatus nobody planned, and THE CHOICE — protect
> her at real cost or release her into a four-sentence statement;
> the unknown label's story still dies on page four. Rivals draw
> the same deck. Personality prices everything — the owner's
> stated goal. Battery 82/82, soak 40 clean (mic 40/40, stories
> one per ~3-4 label-years), longhaul 9x620, e2e 103, lockstep
> 0.10.2. Rode to main.

> **0.10.3 — the recurring money (§80 findings 6+10).** commerce.js:
> paid membership priced as a sentence (warm/market/steep) with
> annual renewals, Season's Greetings every week-44, the tour merch
> table, and the fancon verb — the between-eras money, all flowing
> through the books and the settlement ledger. Squeeze 3+ commerce
> pushes into 24 weeks and the "we are not ATMs" thread organizes
> (structural fix: enrollment and the tour table count as pushes —
> first soak measured the storm unreachable at 0/40, second 31/40).
> The catalog annuity pays every shelf weekly, floored so an old
> hit never pays zero; publishing royalties follow the PERSON every
> 8 weeks, arm the ownMoney narrative at the renewal table, and
> keep arriving after departure. Battery 83/83, soak 40 clean,
> longhaul 9x620, e2e 103, lockstep 0.10.3. Rode to main.
