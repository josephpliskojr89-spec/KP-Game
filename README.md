# K-Pop Agency Manager

A mobile-first career management simulation set inside a fictional Korean
entertainment company. You are an A&R Manager with a boss, a budget, a
deadline — and a roster of procedurally generated people you will never
fully know. Scout, sign, train, assemble, debut. The public decides the
rest.

**No Overall rating exists.** Talent is communicated through evaluator
blurbs — *"Natural vocalist. Just don't ask her to dance."* — read through
a fog that narrows with observation but never lifts.

## Play

Static site, no build step. Serve the repo root and open it on a phone
(or a ~390px viewport):

```bash
npx http-server .   # or: python3 -m http.server
```

Installable as a PWA; autosaves every week advance.

## Develop

The design doc is `docs/BIBLE.md` — the code implements it. The founding
brief is `docs/DESIGN_BRIEF.md`; the process is `docs/DEVELOPMENT_ENGINE.md`.

The ship ritual, in order:

```bash
node tools/run_battery.js                             # test battery (accreting suites)
node tools/harness.js 40                              # headless soak + observatory census
NODE_PATH=$(npm root -g) node test/e2e_walkthrough.js # real-browser full-career walkthrough
node tools/version_lockstep.js                        # version agreement checker
```

All four must be green before a push. Every release appends a note to the
Bible's status ledger.

## Layout

```
js/engine/   pure simulation (KP namespace, vm-testable, all tuning in constants.js)
js/ui/       screens; render state, forward intents, own no simulation logic
test/        battery suites + e2e walkthrough
tools/       battery runner, soak harness, lockstep checker
docs/        BIBLE.md (living spec + ledger), founding brief, process doc
```
