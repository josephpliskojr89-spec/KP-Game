/* Suite 006 — releasing a trainee (v0.1.1).
   A player action with rails: roster shrinks, the person leaves cleanly,
   group members and idols are protected, close friends feel it, and the
   save still round-trips. The engine itself never auto-cuts. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_006_release');

// basic release
{
  const state = KP.newGame('rel-basic');
  const id = state.roster[2];
  const before = state.roster.length;
  const r = KP.releaseTrainee(state, id);
  t.ok(r.ok, 'releasing a plain trainee succeeds');
  t.eq(state.roster.length, before - 1, 'roster shrinks by one');
  t.eq(state.people[id].status, 'released', 'status is released');
  t.ok(!state.prospects.includes(id), 'released trainee does not reappear on the board');
  t.ok(state.people[id].history.some(h => /Released/.test(h.text)), 'the file records it');
  const again = KP.releaseTrainee(state, id);
  t.ok(!again.ok, 'cannot release twice');
}

// rails: group members and idols are protected
{
  const state = KP.newGame('rel-rails');
  const ids = state.roster.slice(0, 5);
  const hints = KP.roleHints(state, ids.map(i => state.people[i]));
  KP.proposeGroup(state, 'RAILS', ids, hints);
  const inGroup = KP.releaseTrainee(state, ids[0]);
  t.ok(!inGroup.ok, 'cannot release a debut-lineup member');
  const outsider = state.roster.find(i => !ids.includes(i));
  t.ok(KP.releaseTrainee(state, outsider).ok, 'non-lineup trainees can still be released');

  // debut, then try to release an idol
  state.demos = KP.generateDemos(state, KP.rngFor(state));
  KP.planDebut(state, { songId: state.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!state.group.debuted && guard++ < 12) KP.advanceWeek(state);
  const idol = KP.releaseTrainee(state, ids[0]);
  t.ok(!idol.ok, 'cannot release a debuted idol');
}

// prospects are not releasable (they were never signed)
{
  const state = KP.newGame('rel-prospect');
  const r = KP.releaseTrainee(state, state.prospects[0]);
  t.ok(!r.ok, 'cannot release someone who is not on the roster');
}

// close friends take the release hard
{
  const state = KP.newGame('rel-morale');
  const a = state.people[state.roster[0]];
  const b = state.people[state.roster[1]];
  state.relationships[KP.pairKey(a, b)] = { score: 70, state: 'close' };
  const moraleBefore = b.morale;
  const r = KP.releaseTrainee(state, a.id);
  t.ok(r.ok && r.shaken.includes(b.name.given), 'the close friend is named in the fallout');
  t.ok(b.morale < moraleBefore, 'her morale dips');
}

// the world keeps simulating and the save round-trips after a release
{
  const state = KP.newGame('rel-save');
  KP.releaseTrainee(state, state.roster[4]);
  for (let w = 0; w < 6; w++) KP.advanceWeek(state);
  const json = KP.serialize(state);
  const back = KP.deserialize(json);
  t.eq(KP.serialize(back), json, 'save round-trips after a release');
  for (let w = 0; w < 6; w++) { KP.advanceWeek(state); KP.advanceWeek(back); }
  t.eq(KP.serialize(state), KP.serialize(back), 'restored save continues identically after a release');
}

t.finish();
