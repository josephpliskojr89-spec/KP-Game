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

## §18 Watch items

Re-checked every soak; either fixed or watched, never silently tolerated.

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

