/* Suite 008 — the comeback loop (v0.2.0).
   The objective ladder never leaves the player idle, comebacks plan and
   resolve through the same release machinery, popularity compounds and
   cools, charts are bounded, idols recover after promotion, and the
   v0.1.x → v0.2.0 migration repairs live saves. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_008_comeback');

function throughDebut(seed) {
  const state = KP.newGame(seed);
  const ids = state.roster.slice(0, 5);
  const hints = KP.roleHints(state, ids.map(i => state.people[i]));
  KP.proposeGroup(state, 'CYCLE', ids, hints);
  state.demos = KP.generateDemos(state, KP.rngFor(state));
  KP.planDebut(state, { songId: state.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!state.groups[0].debuted && guard++ < 12) KP.advanceWeek(state);
  return state;
}

// the ladder: debut resolution immediately issues a comeback directive
{
  const state = throughDebut('cb-ladder');
  t.eq(state.objective.type, 'comeback', 'a comeback directive is active after the debut');
  t.eq(state.objective.status, 'open', 'the new directive is open');
  t.ok(state.objective.targetReception >= 40 && state.objective.targetReception <= 82, 'target is bounded');
  t.ok(state.objective.deadlineWeek > state.week, 'the deadline is ahead');
  t.ok(state.objectiveHistory.length === 1 && state.objectiveHistory[0].type === 'debutGirlGroup', 'the debut objective is archived');
  t.ok(state.inbox.some(m => m.kind === 'executive' && /reinvestment/.test(m.text)), 'the directive arrives as a letter with a grant');
  t.ok(state.demos === null, 'the old demos are cleared for a fresh cycle');
  t.ok(state.groups[0].releases.length === 1 && state.groups[0].releases[0].isDebut, 'discography holds the debut');
  t.ok(state.groups[0].popularity > 0, 'the debut founded a fanbase');
  t.ok(state.groups[0].results.chartPeak >= 1 && state.groups[0].results.chartPeak <= 100, 'chart peak bounded');
}

// a full comeback cycle: plan, resolve, compound
{
  const state = throughDebut('cb-cycle');
  // ride out promotion, then plan the comeback
  for (let w = 0; w < 6; w++) KP.advanceWeek(state);
  const rng = KP.rngFor(state);
  state.demos = KP.generateDemos(state, rng);
  state.rngState = rng.state();
  const plan = KP.planDebut(state, { songId: state.demos[0].id, promo: 'standard',
    week: state.week + 6, alloc: { vocals: 30, dance: 30, rap: 10, media: 30 } });
  t.ok(plan.ok, 'comeback planning succeeds through the same studio path');
  let popBeforeResolve = null;
  let guard = 0;
  while (state.groups[0].prep && guard++ < 12) {
    popBeforeResolve = state.groups[0].popularity;
    KP.advanceWeek(state);
  }
  t.eq(state.groups[0].releases.length, 2, 'discography holds two releases');
  t.ok(!state.groups[0].releases[1].isDebut, 'the second release is a comeback');
  t.ok(state.groups[0].results.isDebut === false, 'latest report is a comeback report');
  // invariant, not a snapshot: the compounding formula itself
  const r2 = state.groups[0].results.reception;
  t.eq(state.groups[0].popularity,
    Math.max(0, Math.min(100, Math.round(popBeforeResolve * 0.55 + r2 * 0.55))),
    'popularity compounded by the comeback formula');
  t.ok(['met', 'metPoorly'].includes(state.objectiveHistory[1] ? state.objectiveHistory[1].status : state.objective.status) ||
       state.objective.type === 'comeback', 'the comeback objective resolved or a successor was issued');
  // after resolution, the ladder continues
  KP.advanceWeek(state);
  t.eq(state.objective.status, 'open', 'a fresh directive is open after the comeback');
}

// idols recover once promotion ends (the v0.1.x fatigue bug is dead)
{
  const state = throughDebut('cb-fatigue');
  const members = state.groups[0].members.map(id => state.people[id]);
  members.forEach(m => { m.fatigue = 80; });
  // sail past the promotion window with no prep
  for (let w = 0; w < 10; w++) KP.advanceWeek(state);
  members.forEach(m => {
    t.ok(m.fatigue < 60, m.id + ' recovered after promotion (fatigue ' + Math.round(m.fatigue) + ')');
  });
}

// popularity cools when the group sits idle too long
{
  const state = throughDebut('cb-decay');
  for (let w = 0; w < 6; w++) KP.advanceWeek(state);
  const popAfterPromo = state.groups[0].popularity;
  for (let w = 0; w < 20; w++) KP.advanceWeek(state);
  t.ok(state.groups[0].popularity < popAfterPromo, 'momentum dies in the room between releases');
}

// comeback deadline miss: gentler penalty, ladder continues
{
  const state = throughDebut('cb-miss');
  state.objective.deadlineWeek = state.week + 1;
  const trustBefore = state.trust;
  for (let w = 0; w < 4; w++) KP.advanceWeek(state);
  t.ok(state.trust < trustBefore, 'missing a comeback window costs trust');
  t.ok(state.trust >= trustBefore + KP.C.COMEBACK.missedDeadlinePenalty - 1, 'but less than missing the debut');
  t.eq(state.objective.status, 'open', 'the executive issues one more window');
  t.ok(state.objectiveHistory.some(o => o.status === 'missed'), 'the miss is on the record');
}

// migration: a v0.1.x post-debut save (single-group shape) gains the
// comeback fields, the fatigue repair, and the multi-group shape
{
  const state = throughDebut('cb-migrate');
  // fake a genuine old save: single group on state.group, no v0.2.x fields
  const g = state.groups[0];
  delete g.releases; delete g.popularity; delete g.lastReleaseWeek; delete g.promoUntil;
  delete g.results.isDebut; delete g.results.chartPeak; delete g.results.chartWeeks;
  delete g.id; delete g.demos;
  state.group = g;
  delete state.groups; delete state.nextGroupId;
  delete state.objectiveHistory;
  state.objective = { type: 'debutGirlGroup', text: 'x', status: 'met', deadlineWeek: 72 };
  g.members.forEach(id => { state.people[id].fatigue = 95; });
  state.version = '0.1.2';
  const back = KP.deserialize(KP.serialize(state));
  t.eq(back.version, KP.C.VERSION, 'migrated save stamped forward');
  t.ok(!back.group && back.groups.length === 1 && back.groups[0].id, 'single group moved into groups[] with an id');
  const bg = back.groups[0];
  t.ok(bg.releases && bg.releases.length === 1, 'discography backfilled from results');
  t.ok(bg.popularity > 0, 'popularity backfilled');
  t.ok(bg.members.every(id => back.people[id].fatigue <= 60), 'pegged idol fatigue repaired');
  t.ok(back.inbox.some(m => /finally slept/.test(m.text)), 'the repair is narrated in the fiction');
  KP.advanceWeek(back);
  t.eq(back.objective.type, 'comeback', 'the ladder self-heals: a directive is issued on the next advance');
  t.eq(back.objective.groupId, bg.id, 'the directive knows which group it concerns');
}

// determinism through a full comeback cycle
{
  const a = throughDebut('cb-fork');
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 16; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'restored save continues identically through the loop');
}

t.finish();
