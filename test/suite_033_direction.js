/* Suite 033 — creative direction (v0.6.7).
   Owner: "choosing a concept for a group that has an effect on the
   songs pitched to them." A group commits to a brief; the producers
   pitch to it; consistency becomes identity; identity makes pivots
   news — and a pivot that lands is a reinvention. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_033_direction');

function fresh(seed) {
  const state = KP.newGame(seed);
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'BRIEFLINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  return { state, g: state.groups[0] };
}
function release(state, g, conceptId) {
  g.demos = KP.generateDemos(state, KP.rngFor(state), g);
  const demo = conceptId
    ? (g.demos.find(d => d.conceptId === conceptId) || g.demos[0])
    : g.demos[0];
  KP.planDebut(state, { groupId: g.id, songId: demo.id, promo: 'modest',
    conceptId: conceptId || demo.conceptId,
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (g.prep && guard++ < 10) KP.advanceWeek(state);
  // ride out promo + rest so the next lock is legal
  while (state.week <= (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks) KP.advanceWeek(state);
}

// ---- the brief shapes the pitch meeting ----
{
  const { state, g } = fresh('dir-pitch');
  const r = KP.setGroupConcept(state, g.id, 'dark');
  t.ok(r.ok && /producers have the brief/.test(r.note), 'setting the direction briefs the producers');
  const demos = KP.generateDemos(state, KP.rngFor(state), g);
  const inLane = demos.filter(d => d.conceptId === 'dark');
  t.ok(inLane.length >= KP.C.DIRECTION.laneSlots, 'most demos come in the lane (' + inLane.length + '/4)');
  t.ok(inLane.every(d => d.toBrief), 'and they carry the brief tag');
  t.ok(demos.some(d => d.conceptId !== 'dark'), 'the producers still push a wildcard');
  // no direction: the field is open
  const { state: s2, g: g2 } = fresh('dir-pitch');
  const openDemos = KP.generateDemos(s2, KP.rngFor(s2), g2);
  t.ok(openDemos.every(d => !d.toBrief), 'no brief, no brief tags');
}

// ---- the brief makes better records (statistical, same seeds) ----
{
  let briefSum = 0, briefN = 0, openSum = 0, openN = 0;
  for (let s = 0; s < 12; s++) {
    const { state, g } = fresh('dir-hook-' + s);
    KP.setGroupConcept(state, g.id, 'bright');
    KP.generateDemos(state, KP.rngFor(state), g).forEach(d => {
      if (d.toBrief) { briefSum += d.hook; briefN++; }
    });
    const { state: s2, g: g2 } = fresh('dir-hook-' + s);
    KP.generateDemos(s2, KP.rngFor(s2), g2).forEach(d => { openSum += d.hook; openN++; });
  }
  t.ok(briefSum / briefN > openSum / openN,
    'a clear brief sharpens the writing (' + (briefSum / briefN).toFixed(1) + ' vs ' + (openSum / openN).toFixed(1) + ')');
}

// ---- guards: no mid-production changes, no unknown concepts ----
{
  const { state, g } = fresh('dir-guards');
  t.ok(!KP.setGroupConcept(state, g.id, 'yacht rock').ok, 'no stylist has heard of that concept');
  g.demos = KP.generateDemos(state, KP.rngFor(state), g);
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  t.ok(!KP.setGroupConcept(state, g.id, 'dark').ok, 'the direction does not change mid-production');
}

// ---- consistency becomes identity ----
{
  const { state, g } = fresh('dir-identity');
  KP.setGroupConcept(state, g.id, 'dark');
  release(state, g, 'dark');
  t.ok(!KP.getNarrative(state, 'conceptIdentity', 'group', g.id), 'one era is not an identity');
  release(state, g, 'dark');
  const nar = KP.getNarrative(state, 'conceptIdentity', 'group', g.id);
  t.ok(nar, 'two eras deep, the sound IS the group');
  t.ok(KP.narrativeText(state, nar).includes('dark'), 'and the story names the lane');
  t.eq(g.conceptRun, 2, 'the streak is counted');
}

// ---- the pivot: identity makes changing lanes news ----
{
  const { state, g } = fresh('dir-pivot');
  KP.setGroupConcept(state, g.id, 'dark');
  release(state, g, 'dark');
  release(state, g, 'dark');
  const nar = KP.getNarrative(state, 'conceptIdentity', 'group', g.id);
  t.ok(nar, 'fixture: identity is canon');
  const strengthBefore = nar.strength;
  KP.setGroupConcept(state, g.id, 'bright');
  release(state, g, 'bright');
  t.ok(state.inbox.some(m => /changed lanes|pivot LANDED/.test(m.text)), 'the pivot is news');
  t.ok(nar.strength < strengthBefore, 'and it cuts the old story down (' +
    strengthBefore + ' → ' + nar.strength + ')');
  t.eq(g.conceptRun, 1, 'the new streak starts at one');
}

// ---- migration: an earned lane walks in as the brief ----
{
  const { state, g } = fresh('dir-mig');
  KP.setGroupConcept(state, g.id, 'elegant');
  release(state, g, 'elegant');
  release(state, g, 'elegant');
  delete g.concept; delete g.conceptRun;
  state.version = '0.6.6';
  const m = KP.deserialize(KP.serialize(state));
  t.eq(m.groups[0].concept, 'elegant', 'two same-lane releases infer the direction');
  t.eq(m.groups[0].conceptRun, 2, 'with the streak they earned');
  t.ok(m.inbox.some(x => /CREATIVE DIRECTION/.test(x.text)), 'the desk explains the brief');
  // a group with mixed releases walks in open
  const { state: s2, g: g2 } = fresh('dir-mig2');
  release(s2, g2, null);
  delete g2.concept; delete g2.conceptRun;
  s2.version = '0.6.6';
  const m2 = KP.deserialize(KP.serialize(s2));
  t.eq(m2.groups[0].concept, null, 'one release infers nothing — the field stays open');
}

// ---- determinism ----
{
  const mk = () => {
    const { state, g } = fresh('dir-fork');
    KP.setGroupConcept(state, g.id, 'retro');
    g.demos = KP.generateDemos(state, KP.rngFor(state), g);
    KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
      week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
    return state;
  };
  const a = mk();
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 20; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the briefed world forks clean');
}

t.finish();
