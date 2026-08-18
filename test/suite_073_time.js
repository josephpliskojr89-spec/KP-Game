/* Suite 073 — time takes its share (v0.9.32, §39 slot 12). The four
   anti-saturation clocks: senescence (age bites and pays back), trust
   drift (excellence becomes the expectation), executive succession
   (prove it again), and the founder's board. The module is hash-timed
   and rng-free — determinism is structural, and asserted anyway. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_073_time');

const S = () => KP.C.TIME;

// ---- senescence: the three quiet multipliers --------------------------
{
  t.eq(KP.ageGrowthMult({ age: 22 }), 1, 'a 22-year-old trains at full curve');
  t.ok(KP.ageGrowthMult({ age: 30 }) < 1, 'a 30-year-old does not');
  t.eq(KP.ageGrowthMult({ age: 40 }), S().SENESCE.growthFloor, 'the curve floors, never zeroes');
  t.ok(KP.ageRecoveryMult({ age: 33 }) < 1 &&
       KP.ageRecoveryMult({ age: 33 }) >= S().SENESCE.recoveryFloor, 'recovery softens to a floor');
  t.eq(KP.stageIQ({ age: 24 }), 0, 'no stage-IQ bonus before the line');
  t.ok(KP.stageIQ({ age: 33 }) > 0 && KP.stageIQ({ age: 45 }) === S().SENESCE.stageIQCap,
    'what the years take in bounce they pay back in floor — capped');
}

// ---- the crossing note, once, with care -------------------------------
{
  const state = KP.newGame('tt-note', null, { legacy: true });
  const g = state.groups[0];
  const p = state.people[g.members[0]];
  p.age = S().SENESCE.at;
  KP.advanceWeek(state);
  t.ok(p.flags.senesceNoted, 'the line is crossed once');
  t.eq(state.timeLedger.senesced, 1, 'ledgered');
  const note = state.inbox.find(n => n.personId === p.id && /rebuilt/.test(n.text));
  t.ok(note, 'the trainer rebuilds the week');
  t.ok(/professional|veteran/i.test(note.text), 'written with care — a pro, not a decline');
  const led0 = state.timeLedger.senesced;
  KP.advanceWeek(state);
  t.eq(state.timeLedger.senesced, led0, 'once means once');
  // the derived floor is real: same file, older, steadier
  const young = KP.derived(Object.assign({}, p, { age: 22 }));
  const vet = KP.derived(Object.assign({}, p, { age: 33 }));
  t.ok(vet.liveReliability > young.liveReliability, 'the veteran never misses on a tired night');
}

// ---- trust drift: the bar rises with the trust ------------------------
{
  const state = KP.newGame('tt-drift', null, { legacy: true });
  state.trust = 95;
  for (let w = 0; w < 20; w++) KP.advanceWeek(state);
  t.ok(state.trust < 95, 'devotion above the bar decays');
  t.ok(state.timeLedger.driftWeeks >= 4, 'monthly, on schedule');
  t.ok(state.driftNoted, 'and the exec says the quiet part once');
  const atBar = KP.newGame('tt-drift2', null, { legacy: true });
  atBar.trust = S().DRIFT.above;
  for (let w = 0; w < 9; w++) KP.advanceWeek(atBar);
  t.ok(atBar.trust >= S().DRIFT.above - 1 || !((atBar.timeLedger || {}).driftWeeks),
    'at the bar, the clock is quiet — the founding gate stays winnable');
}

// ---- succession: the record transfers, the devotion does not ----------
{
  const state = KP.newGame('tt-succ', null, { legacy: true });
  for (let w = 0; w < 100; w++) KP.advanceWeek(state);
  const oldName = state.executive.name;
  const oldTaste = KP.execTaste(state);
  state.executive.since = state.week - 500;
  state.trust = 90;
  state.petProjectDone = true;
  KP.advanceWeek(state);
  t.ok(state.executive.name !== oldName, 'the chair changes hands');
  t.eq(state.execGen, 1, 'the era counter turns');
  // other systems may nick trust in the same untended week; the claim
  // is the SHAPE — from 90, the reset lands in the prove-again zone,
  // far below where the devotion stood
  t.ok(state.trust >= 50 && state.trust <= 70, 'prove it again: the devotion does not transfer (' +
    state.trust + ')');
  t.ok(!state.petProjectDone, 'the new chair brings its own someday');
  t.ok(state.inbox.some(n => n.ind === 'execFarewell'), 'the farewell is written');
  const sc = (state.scenes || []).find(x => x.kind === 'newChair');
  t.ok(sc, 'the first meeting is on the Desk');
  const t0 = state.trust;
  KP.resolveScene(state, sc.id, 'receipts');
  t.eq(state.trust, KP.clamp(t0 + 3, 0, 100), 'the record moves her where charm never would');
  t.eq(state.timeLedger.successions, 1, 'ledgered');
  t.eq(state.timeLedger.receipts, 1, 'the receipts, counted');
  // taste is the NEW chair's — hash keyed by generation, stable per era
  t.eq(KP.execTaste(state), KP.execTaste(state), 'taste stays hash-truth');
  t.ok(typeof oldTaste === 'string', 'and the old ear is on the record');
}

// ---- the founder's board ----------------------------------------------
{
  const state = KP.newGame('tt-board', null, { legacy: true });
  for (let w = 0; w < 8; w++) KP.advanceWeek(state);
  state.founded = { week: state.week, from: 'Novaline', warChest: 300 };
  state.budget = 50;   // burning the chest
  KP.advanceWeek(state);
  t.ok(state.board && state.board.seats.length === 3, 'three seats, three reasons to be in the room');
  t.ok(state.board.seats.some(s => s.role === 'lead investor') &&
       state.board.seats.some(s => s.role === 'first believer'), 'the money and the believer');
  t.ok(state.board.burnNoted, 'the runway memo lands');
  t.eq(state.timeLedger.boardMemos, 1, 'ledgered');
  const tr0 = state.trust;
  state.budget = 700;  // more than doubled
  KP.advanceWeek(state);
  t.ok(state.board.proudNoted, 'the confidence letter');
  t.eq(state.trust, KP.clamp(tr0 + S().BOARD.proudTrust, 0, 100), 'and the money believes');
  // the founder cannot be succeeded out of their own chair
  state.executive.since = state.week - 600;
  KP.advanceWeek(state);
  t.ok(!state.execGen, 'no succession in a founded house — the board is the pressure layer');
}

// ---- determinism through a succession ---------------------------------
{
  const state = KP.newGame('tt-fork', null, { legacy: true });
  for (let w = 0; w < 96; w++) KP.advanceWeek(state);
  state.executive.since = state.week - 400;
  const b = KP.deserialize(KP.serialize(state));
  for (let w = 0; w < 12; w++) { KP.advanceWeek(state); KP.advanceWeek(b); }
  t.eq(KP.serialize(state), KP.serialize(b), 'the clocks fork clean — the module is rng-free');
}

t.finish();
