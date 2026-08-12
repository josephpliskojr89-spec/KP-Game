/* Suite 018 — role editing after formation (v0.3.3).
   Rails hold, pre-debut shuffles are quiet, post-debut center changes
   cost the people involved, questionable picks anger the public,
   overshadow corrections win it over, and determinism survives. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_018_roles');

function formed(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'ROLELINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  return state;
}
function debuted(seed) {
  const state = formed(seed);
  const g = state.groups[0];
  g.demos = KP.generateDemos(state, KP.rngFor(state));
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  return state;
}

// rails
{
  const state = formed('rl-rails');
  const g = state.groups[0];
  t.ok(!KP.setGroupRoles(state, g.id, { leader: g.roles.leader }).ok, 'a lineup needs a center');
  t.ok(!KP.setGroupRoles(state, g.id, { leader: g.roles.leader, center: state.roster[5] }).ok, 'roles go to members only');
  t.ok(!KP.setGroupRoles(state, g.id, Object.assign({}, g.roles)).ok, 'a no-op change is refused');
  // solo rejection
  const st2 = KP.newGame('rl-solo', null, { legacy: false });
  const solo = KP.proposeGroup(st2, 'SOLOR', [st2.roster[0]], {});
  t.ok(!KP.setGroupRoles(st2, solo.group.id, { leader: st2.roster[0], center: st2.roster[0] }).ok,
    'solos have one of everything already');
}

// pre-debut: quiet adjustment, human cost only
{
  const state = formed('rl-pre');
  const g = state.groups[0];
  const oldCenter = state.people[g.roles.center];
  const newCenterId = g.members.find(id => id !== g.roles.center);
  const moraleBefore = oldCenter.morale;
  const r = KP.setGroupRoles(state, g.id, Object.assign({}, g.roles, { center: newCenterId }));
  t.ok(r.ok && r.centerChanged, 'pre-debut center change applies');
  t.eq(g.roles.center, newCenterId, 'the role moved');
  t.ok(oldCenter.morale < moraleBefore, 'losing the center seat stings even in rehearsal');
  t.ok(g.centerHistory.length === 2, 'center history remembers');
  t.ok(r.notes.every(n => n.kind !== 'public'), 'no public blowback before a debut');
  t.ok(oldCenter.history.some(h => /Lost the center/.test(h.text)), 'her file remembers');
}

// post-debut, questionable: the public pushes back
{
  const state = debuted('rl-bad');
  const g = state.groups[0];
  const oldCenter = state.people[g.roles.center];
  // pick the member with the weakest pull — a questionable center
  const weakest = g.members.map(id => state.people[id])
    .filter(p => p.id !== g.roles.center)
    .sort((a, b) => KP.derived(a).centerPull - KP.derived(b).centerPull)[0];
  // force the gap to be unambiguous
  weakest.talents.charisma.cur = Math.max(5, oldCenter.talents.charisma.cur - 30);
  weakest.talents.visuals.cur = Math.max(5, oldCenter.talents.visuals.cur - 30);
  const popBefore = g.popularity;
  const relBefore = (state.relationships[KP.pairKey(oldCenter, weakest)] || { score: 0 }).score;
  const r = KP.setGroupRoles(state, g.id, Object.assign({}, g.roles, { center: weakest.id }));
  t.ok(r.ok, 'the questionable change is allowed — consequences are the rail');
  t.ok(g.popularity < popBefore, 'the fanbase cools (' + popBefore + ' → ' + g.popularity + ')');
  t.ok(r.notes.some(n => n.urgent && /what the company is thinking/.test(n.text)), 'the blowback is narrated');
  t.ok(state.inbox.some(m => /what the company is thinking/.test(m.text)), 'and lands in the inbox');
  const rel = state.relationships[KP.pairKey(oldCenter, weakest)];
  t.ok(rel && rel.score <= relBefore - KP.C.GROUP.ROLECHANGE.strain + 0.001,
    'the two centers feel it between themselves (' + relBefore + ' → ' + rel.score + ')');
}

// post-debut, correcting an overshadow: the public approves
{
  const state = debuted('rl-good');
  const g = state.groups[0];
  // force the overshadow scenario
  const breakoutId = g.members.find(id => id !== g.roles.center);
  g.results.centerOvershadowed = true;
  g.results.breakoutId = breakoutId;
  const popBefore = g.popularity;
  const r = KP.setGroupRoles(state, g.id, Object.assign({}, g.roles, { center: breakoutId }));
  t.ok(r.ok, 'giving the public its center applies');
  t.ok(g.popularity > popBefore, 'the fanbase warms (' + popBefore + ' → ' + g.popularity + ')');
  t.ok(r.notes.some(n => /takes full credit/.test(n.text)), 'the approval is narrated');
}

// non-center role change post-debut: no public reaction
{
  const state = debuted('rl-quietrole');
  const g = state.groups[0];
  const newVocal = g.members.find(id => id !== g.roles.mainVocal);
  const r = KP.setGroupRoles(state, g.id, Object.assign({}, g.roles, { mainVocal: newVocal }));
  t.ok(r.ok && !r.centerChanged, 'main vocal reassignment applies');
  t.ok(r.notes.length === 0, 'no PR story for an internal role shuffle');
}

// determinism
{
  const a = debuted('rl-fork');
  const ga = a.groups[0];
  KP.setGroupRoles(a, ga.id, Object.assign({}, ga.roles, { center: ga.members.find(id => id !== ga.roles.center) }));
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 10; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'restored save continues identically after a role change');
}

t.finish();
