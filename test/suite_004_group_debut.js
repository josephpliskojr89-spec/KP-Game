/* Suite 004 — group formation and debut resolution.
   Formation enforces the directive, chemistry is words not meters, debut
   resolution is bounded and consequential, the public can pick a
   non-center breakout, and the deadline predicate self-heals. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_004_group_debut');

function buildGroup(state) {
  const ids = state.roster.slice(0, 5);
  const members = ids.map(id => state.people[id]);
  const hints = KP.roleHints(state, members);
  return KP.proposeGroup(state, 'TESTINE', ids, {
    leader: hints.leader, center: hints.center,
    mainVocal: hints.mainVocal, mainDancer: hints.mainDancer, mainRapper: hints.mainRapper,
  });
}

// formation rails
{
  const state = KP.newGame('grp-rails');
  const tooFew = KP.proposeGroup(state, 'X', state.roster.slice(0, 2), { leader: state.roster[0], center: state.roster[0] });
  t.ok(!tooFew.ok, 'lineup below directive minimum rejected');
  const noCenter = KP.proposeGroup(state, 'X', state.roster.slice(0, 5), { leader: state.roster[0] });
  t.ok(!noCenter.ok, 'lineup without a center rejected');
  const good = buildGroup(state);
  t.ok(good.ok, 'valid proposal accepted');
  t.ok(Array.isArray(good.review) && good.review.length > 0, 'executive reacts in words');
  const again = buildGroup(state);
  t.ok(!again.ok, 'only one group in development at a time');
  t.ok(state.group.maknae, 'maknae recorded as a fact');
}

// chemistry is bounded and observable
{
  const state = KP.newGame('grp-chem');
  for (let w = 0; w < 10; w++) KP.advanceWeek(state);
  const members = state.roster.slice(0, 5).map(id => state.people[id]);
  const chem = KP.groupChemistry(state, members);
  t.ok(chem >= 0 && chem <= 100, 'chemistry in range');
  const notes = KP.chemistryNotes(state, members);
  t.ok(notes.length >= 1 && notes.every(n => typeof n === 'string'), 'chemistry surfaces as observations');
}

// full debut cycle across seeds: bounded results, breakout exists,
// trust moves, budget pays production, reception varies across seeds
{
  const bands = {};
  let overshadowedSeen = 0, centerBreakouts = 0;
  for (let s = 0; s < 25; s++) {
    const state = KP.newGame('debut' + s);
    for (let w = 0; w < 8; w++) KP.advanceWeek(state);
    const g = buildGroup(state);
    t.ok(g.ok, 'seed ' + s + ': group formed');
    state.demos = KP.generateDemos(state, KP.rngFor(state));
    t.eq(state.demos.length, KP.C.SONG.demoCount, 'seed ' + s + ': demos generated');
    const demo = state.demos[0];
    const plan = KP.planDebut(state, {
      songId: demo.id, conceptId: demo.conceptId, promo: 'standard',
      week: state.week + 6, alloc: { vocals: 30, dance: 30, rap: 15, media: 25 },
    });
    t.ok(plan.ok, 'seed ' + s + ': debut planned');
    const trustBefore = state.trust;
    let guard = 0;
    while (!state.group.debuted && guard++ < 12) KP.advanceWeek(state);
    t.ok(state.group.debuted, 'seed ' + s + ': debut resolved on schedule');
    const r = state.group.results;
    t.ok(r.reception >= 1 && r.reception <= 100, 'seed ' + s + ': reception bounded');
    t.ok(r.performance >= 1 && r.performance <= 100, 'seed ' + s + ': performance bounded');
    t.ok(!!state.people[r.breakoutId], 'seed ' + s + ': breakout member exists');
    t.ok(state.trust !== trustBefore, 'seed ' + s + ': the executive reacted');
    t.ok(['met', 'metPoorly'].includes(state.objective.status), 'seed ' + s + ': objective resolved');
    t.ok(state.group.members.every(id => state.people[id].status === 'idol'), 'seed ' + s + ': members became idols');
    bands[r.receptionBand] = (bands[r.receptionBand] || 0) + 1;
    if (r.breakoutId === state.group.roles.center) centerBreakouts++;
    if (r.centerOvershadowed) overshadowedSeen++;
  }
  t.ok(Object.keys(bands).length >= 2, 'reception varies across seeds: ' + JSON.stringify(bands));
  t.ok(centerBreakouts > 0, 'the center sometimes is the breakout (' + centerBreakouts + '/25)');
  t.ok(centerBreakouts < 25, 'the public sometimes chooses someone else (' + (25 - centerBreakouts) + '/25)');
}

// planning rails
{
  const state = KP.newGame('debut-rails');
  buildGroup(state);
  state.demos = KP.generateDemos(state, KP.rngFor(state));
  const d = state.demos[0];
  t.ok(!KP.planDebut(state, { songId: d.id, week: state.week + 1, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } }).ok,
    'cannot debut without production runway');
  t.ok(!KP.planDebut(state, { songId: d.id, week: state.objective.deadlineWeek + 4, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } }).ok,
    'cannot schedule past the executive deadline');
  t.ok(!KP.planDebut(state, { songId: d.id, week: state.week + 6, alloc: { vocals: 90, dance: 5, rap: 4, media: 0 } }).ok,
    'allocation must total 100');
}

// missed deadline self-heals: sailing past it fires the consequence once
{
  const state = KP.newGame('deadline');
  state.objective.deadlineWeek = state.week + 2;
  const trustBefore = state.trust;
  for (let w = 0; w < 5; w++) KP.advanceWeek(state);
  t.eq(state.objective.status, 'missed', 'missed deadline detected when overdue');
  t.ok(state.trust < trustBefore, 'missing the deadline costs trust');
  const trustAfter = state.trust;
  for (let w = 0; w < 4; w++) KP.advanceWeek(state);
  t.eq(state.trust >= trustAfter - 10 && state.objective.status === 'missed', true,
    'the consequence fires once, not weekly');
}

t.finish();
