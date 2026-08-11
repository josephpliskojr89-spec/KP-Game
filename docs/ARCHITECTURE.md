# Architecture — the Living Industry foundation (v0.7.2)

An audit of state, simulation systems, UI rendering, persistence, and
event generation, commissioned before the Living Industry era. The
framework stays what it is — framework-free classic scripts under one
`KP` namespace, vm-loadable for tests — because nothing about the
scale ahead requires more than discipline. What it does require is the
discipline being *structural* instead of remembered. Every finding
below is backed by a bug this project actually shipped and fixed.

## The audit

**1. The weekly tick was a god function.** `advanceWeek` grew to 26
hand-numbered sections whose order was maintained by comment
convention (`5a2`, `5b-pre`, `8d3`). Every ordering bug in the
project's history lived here or in its releases-side twin: prestige
captured after the update that consumed it (v0.6.1), `weekReleases`
reset timing (v0.6.4), the recurring version-bump fork tell. Adding a
system meant editing the driver — coupling every new feature to the
oldest file.
→ **Fixed:** the tick is now an explicit named pipeline
(`CORE_PHASES` in sim.js — same code, same order, real names) driven
through `KP.weeklyPipeline`. New systems call
`KP.registerWeekly(name, order, fn)` and never touch the driver.

**2. Notes had two lifecycles.** Weekly systems *returned* notes for
the tick to stamp and trim; player actions *pushed* directly to the
inbox with hand-copied stamping code (four sites). Urgency was a
boolean, and the trim was `slice(N + urgentCount)` over arrival
order. This cost us: a null note crashed the feed (v0.6.8 tour
virals), and two real letters were silently trimmed by louder weeks
(v0.6.5 dormancy/boil letters under show-win mail; v0.7.1 100k
milestones).
→ **Fixed:** one bus. `KP.note(state, spec)` is the only immediate
path (validated — malformed notes throw at the source, not in the
feed). The weekly trim is `KP.trimWeekNotes` with priorities:
`critical` / `high` (never trimmed) / `normal` / `flavor` (first to
go). `urgent: true` maps to `high` for legacy senders.

**3. Feed reactions were a 34-branch if-chain on magic strings.** A
typo'd `ind` produced silence, not an error; every event-emitting
system had to edit `industry.js`.
→ **Fixed:** `KP.onFeedEvent(ind, fn)` registry, consulted first;
duplicate registration throws. The existing chain is FROZEN legacy —
new inds must register. (Migrating the 34 branches into the registry
is mechanical debt, tracked, not urgent.)

**4. Render was not pure.** The studio view generated demos during
render — drawing rng and writing `state.rngState` — meaning a player
who opened the Studio had a different world than one who didn't. This
is the exact bug class fixed for social minting in v0.6.3, and it had
crept back in through a different door.
→ **Fixed and promoted to law:** rng draws happen in exactly two
places — the weekly tick and player actions. Demos are generated at
`proposeGroup` (action) and restocked by the tick when a calendar
reopens or a brief changes; the view renders "the producers are
writing" if it ever catches the gap. No view mutates state, ever.

**5. State had no invariant checker.** Corruption surfaced as a
distant NaN, diagnosed by serialize-diffing (the v0.6.3 fork hunt
took a bisect script).
→ **Fixed:** `KP.validateState(state)` — ghosts, NaNs, room-chart
partitions, deal references — run by the harness EVERY WEEK of every
soak seed as a hard guard.

**6. Persistence is sound; left alone.** Append-only versioned
migrations, forward-only stamps, guarded import, save-size telemetry,
and the serialize-fork determinism suite are the strongest part of
the codebase. The kernel adds nothing here because nothing was
needed. Save size (~190KB at 140 weeks vs ~5MB quota) leaves years of
headroom; the hash-first pattern (§28 strongholds, §32 facts) is the
standing answer to state growth.

## The laws (enforced, not remembered)

1. **Rng in tick and actions only.** Never render. Hash channels
   (`KP.hash01`) for observer-safe derived values.
2. **One truth per visible number** (v0.4.4). Derived views compute;
   they do not copy.
3. **All notes through the bus.** Return them from weekly passes or
   `KP.note` them from actions. Malformed notes throw.
4. **Extend via registries** — weekly phases, feed reactions —
   never by editing drivers or frozen chains.
5. **Determinism is suite-property #1.** Every system ships a
   serialize-fork test; the battery is the court of appeal.
6. **Conversations through the stage door** (v0.8.0). Anything that
   waits on the player's answer is a registered scene
   (`KP.registerScene` → `openScene` → the Desk rail → `resolveScene`);
   any promise checked later is a registered claim with a subject
   (`KP.registerClaim`/`openClaim`). New conversations never add
   bespoke cards, state slots, or dispatcher cases.
7. **Player-directed acts through one door** (v0.8.0).
   `KP.recordDirected` is the only write path for "she remembers what
   YOU did"; standing (`KP.standingOf`) is derived with a half-life,
   never stored, spoken in words never meters.

## Adding a Living Industry system (the recipe)

1. Constants block in `constants.js` (numbers live nowhere else).
2. One module in `js/engine/`, registered in `index.html`, `sw.js`,
   `test/load_engine.js` (lockstep tool counts modules — it will
   catch you).
3. Weekly behavior: `KP.registerWeekly(name, order, fn)` — pick an
   order between existing phases (see `CORE_PHASES`); notes are
   returned by pushing into the shared `inbox` param.
4. Feed presence: emit notes with a fresh `ind`, register the
   reaction via `KP.onFeedEvent`.
5. Player decisions: constrained-choice cards (the war-card pattern),
   engine functions returning `{ok, reason|note}`, `KP.note` for
   immediate letters.
6. Memory: one `KP.recordEvidence` key + `narrativeText` +
   `formationLine` + a feed-map line.
7. Migration: append to `save.js`, narrated in-fiction. Bump the
   version FIRST when testing (the fork tell).
8. Verification: a suite with a fork test, harness census bands
   (alive-band lo/hi — extinction and flood are both alarms), bot
   policy if the system needs playing.
9. Bible: a § spec + an append-only ledger entry. Balance measured,
   not hoped.

## What was deliberately NOT built

- No framework, no build step, no TypeScript — the vm-loadable
  classic-script property is load-bearing for the whole test
  battery.
- No event-sourcing/undo — saves are snapshots; determinism makes
  replay unnecessary.
- No full migration of the frozen feed chain — mechanical debt with
  a registry lid on it.

# Audit II — can this chassis carry the whole industry? (post-§37)

Owner: "if we're going to implement the whole damn industry, I need
to know if the way the game is currently being built can support it,
before we do anything else." Audited against the §37 roadmap
(reciprocity arc, contracts, standing, society layer, shaped year,
staff, producers). Every claim below was verified against the code,
not assumed.

## What already carries the load (verified green)

1. **The kernel registries scale.** Two releases (v0.7.3, v0.7.4)
   shipped entire systems as registered phases + registered feed
   reactions with zero driver edits. Society, seasons, staff, and
   producer systems are more of the same shape.
2. **The claim ledger is data, not closures.** `execNotes` entries
   are plain objects with a `type` field; predicates dispatch on
   type inside `meetingWeek`. Nothing about the SHAPE is
   exec-specific — idol promises and renewal terms serialize the
   same way. The self-healing predicate pattern is the proven chassis
   for every promise the §37 arc needs.
3. **The people store is already industry-wide.** Rival idols are
   real people in `state.people` (18 at newGame); `pairKey` and
   `state.relationships` are global, not roster-scoped. Cross-company
   friendships need a driver phase, not a schema change.
4. **Departure invariants are already named as code.**
   `releaseTrainee` proves the removal path (roster splice, friend
   shock); `KP.validateState` names every invariant a member
   departure must maintain (room partition, ghost checks, deal
   references). Contracts are work, not risk.
5. **Headroom is wide.** 173 KB save at week 140 against a ~5 MB
   budget; 117 people retained without deletion; the 140-week soak
   holds 66 census bands with weekly validation.

## What does NOT hold (the honest part)

**F1 — there is no scene primitive, and the roadmap is made of
scenes.** The game has 8+ bespoke interactive surfaces (exec
question, storm response, clash hold/slip, deal desk, naming vote,
mediation, track credit sheet, tour desk) — each with its own state
slot, its own Desk/Studio card, and its own dispatcher cases in a
66-case switch. The §37 roadmap adds ~10 more (office door, ambition
ask, renewal negotiation, fan truck, staff poach, moment hinges…).
Hand-wiring each is the same coupling the v0.7.2 audit killed in the
weekly tick — reborn on the interaction side. REQUIRED: a pending-
decisions queue on state, a `KP.registerScene(kind, {options,
resolve})` registry, ONE Desk rail that renders any pending scene,
and ONE dispatcher path. The meeting/claim flow becomes its first
migrated customer, proving it the way sim.js proved the pipeline.

**F2 — the claim ledger must be de-exec-ed.** Generalize
`state.execNotes` to a claims store with a subject
(`exec | idol | fandom | staff`), predicates dispatched through a
registry instead of inline in `meetingWeek`. Mechanical, migratable,
append-only.

**F3 — no substrate for "she remembers what YOU did."**
`p.history` records but nothing reads it back. Standing needs ONE
door (`KP.recordDirected(state, personId, kind, weight)` — same
one-door discipline as `recordViral`) so every future system writes
player-directed acts through a single truth and standing is derived,
never double-counted.

**F4 (minor) — annual tentpoles are a convention, not a gap.**
Seasonal texture rides `registerWeekly` + week-of-year math as
awards already do; document the pattern, no new kernel.

## The real scaling constraint (not code)

Content, not architecture: scenes × 7 voices × options is a text
matrix that grows multiplicatively. Mitigation (proven in
persona.js): option TEXT stays voice-neutral; per-voice opener/close
lines carry the personality. Budget prose per scene accordingly.

## Verdict

The chassis holds. One foundation release is required before the
reciprocity arc — scenes registry + claims generalization + the
directed-acts door (F1–F3 are one coherent release, the interaction
twin of v0.7.2). Build features on top of that, never before it.
