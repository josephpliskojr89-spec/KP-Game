/* Suite 007 — conflict repair (v0.1.2).
   The drift model no longer rots rooms unattended, and the sit-down is a
   real tool: costed, cooldown-gated, personality-shaped, usually helpful,
   never a guaranteed fix. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_007_mediation');

function forceConflict(state, a, b, score) {
  state.relationships[KP.pairKey(a, b)] = { score: score == null ? -50 : score, state: 'conflict' };
  return state.relationships[KP.pairKey(a, b)];
}

// basic sit-down: cost, cooldown, effect
{
  const state = KP.newGame('med-basic', null, { legacy: false });
  const a = state.people[state.roster[0]], b = state.people[state.roster[1]];
  const rel = forceConflict(state, a, b);
  const budget = state.budget;
  const r = KP.mediatePair(state, a.id, b.id);
  t.ok(r.ok, 'sit-down on a conflicted pair succeeds as an action');
  t.ok(typeof r.text === 'string' && r.text.length > 20, 'the outcome is a story, not a status code');
  t.eq(state.budget, budget - KP.C.REL.MED.cost, 'staff time costs budget');
  const again = KP.mediatePair(state, a.id, b.id);
  t.ok(!again.ok && /recently/.test(again.reason), 'cooldown blocks an immediate repeat');
  t.ok(KP.mediationCooldown(state, a.id, b.id) > 0, 'cooldown is queryable for the UI');
  // after the cooldown passes it works again
  state.week += KP.C.REL.MED.cooldownWeeks;
  rel.score = -40;
  t.ok(KP.mediatePair(state, a.id, b.id).ok, 'available again after the cooldown');
}

// rails
{
  const state = KP.newGame('med-rails', null, { legacy: false });
  const a = state.people[state.roster[0]], b = state.people[state.roster[1]];
  t.ok(!KP.mediatePair(state, a.id, b.id).ok, 'nothing to mediate on a neutral pair');
  forceConflict(state, a, b);
  state.budget = 1;
  t.ok(!KP.mediatePair(state, a.id, b.id).ok, 'needs budget');
  state.budget = 100;
  t.ok(!KP.mediatePair(state, a.id, state.prospects[0]).ok, 'both must be on the roster');
}

// distribution: sit-downs usually help, occasionally do nothing, rarely
// backfire (100 trials — an invariant band, not a seed snapshot)
{
  let improved = 0, worsened = 0;
  for (let s = 0; s < 100; s++) {
    const state = KP.newGame('med-dist' + s, null, { legacy: false });
    const a = state.people[state.roster[0]], b = state.people[state.roster[1]];
    const rel = forceConflict(state, a, b);
    const before = rel.score;
    KP.mediatePair(state, a.id, b.id);
    if (rel.score > before + 5) improved++;
    if (rel.score < before) worsened++;
  }
  t.ok(improved >= 40, 'sit-downs genuinely help more often than not (' + improved + '/100)');
  t.ok(improved <= 95, 'a sit-down is not a guaranteed fix (' + improved + '/100)');
  t.ok(worsened <= 15, 'backfires are rare (' + worsened + '/100)');
}

// drift rebalance: rooms no longer rot — conflict is the exception
{
  const counts = { negative: 0, conflict: 0, positive: 0 };
  let pairs = 0;
  for (let s = 0; s < 10; s++) {
    const state = KP.newGame('med-drift' + s, null, { legacy: false });
    state.roster.forEach(id => { state.people[id].training = { focus: ['vocals'], intensity: 'standard' }; });
    for (let w = 0; w < 40; w++) KP.advanceWeek(state);
    for (let i = 0; i < state.roster.length; i++) {
      for (let j = i + 1; j < state.roster.length; j++) {
        const rel = state.relationships[KP.pairKey(state.people[state.roster[i]], state.people[state.roster[j]])];
        if (!rel) continue;
        pairs++;
        const st = KP.relState(rel.score).key;
        if (st === 'tense' || st === 'conflict') counts.negative++;
        if (st === 'conflict') counts.conflict++;
        if (st === 'close' || st === 'friendly') counts.positive++;
      }
    }
  }
  t.ok(counts.negative / pairs <= 0.45, 'tense-or-worse is a minority of pairs (' + Math.round(100 * counts.negative / pairs) + '%)');
  t.ok(counts.conflict / pairs <= 0.15, 'open conflict is rare (' + Math.round(100 * counts.conflict / pairs) + '%)');
  t.ok(counts.negative > 0, 'friction still exists — the game did not go bland');
  t.ok(counts.positive / pairs >= 0.2, 'warmth exists too (' + Math.round(100 * counts.positive / pairs) + '%)');
}

// determinism & save: mediation state round-trips
{
  const state = KP.newGame('med-save', null, { legacy: false });
  const a = state.people[state.roster[0]], b = state.people[state.roster[1]];
  forceConflict(state, a, b);
  KP.mediatePair(state, a.id, b.id);
  const json = KP.serialize(state);
  const back = KP.deserialize(json);
  t.eq(KP.serialize(back), json, 'mediation history survives the save');
  for (let w = 0; w < 6; w++) { KP.advanceWeek(state); KP.advanceWeek(back); }
  t.eq(KP.serialize(state), KP.serialize(back), 'restored save continues identically after a sit-down');
}

t.finish();
