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
