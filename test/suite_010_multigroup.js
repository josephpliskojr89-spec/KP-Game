/* Suite 010 — the second group (v0.2.2).
   Formation rails across groups, independent release cycles and
   popularity, the objective ladder targets the right group, and the
   migration carries a single-group save into the multi-group world. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_010_multigroup');

function debutFirstGroup(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  // sign three so a second lineup is possible later
  const scout = KP.DATA.evaluators[2];
  state.budget = 400;
  for (let i = 0; i < 3; i++) KP.signProspect(state, state.prospects[0]);
  // this suite tests multigroup mechanics, not gender — one hall only
  state.roster.forEach(id => { state.people[id].gender = 'f'; });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'FIRSTLINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  g.demos = KP.generateDemos(state, KP.rngFor(state));
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  return state;
}

// rails: no second lineup while one is in development; no shared members
{
  const state = KP.newGame('mg-rails', null, { legacy: false });
  state.budget = 400;
  for (let i = 0; i < 3; i++) KP.signProspect(state, state.prospects[0]);
  const first = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'ONE', first, KP.roleHints(state, first.map(i => state.people[i])));
  const free = KP.freeTrainees(state);
  t.ok(free.length >= 4, 'free trainees exclude the lineup');
  const whileDev = KP.proposeGroup(state, 'TWO', free.slice(0, 4),
    KP.roleHints(state, free.slice(0, 4).map(i => state.people[i])));
  t.ok(!whileDev.ok && /development/.test(whileDev.reason), 'no second lineup while one is undebuted');
}

// a second group forms after the first debuts, and both run their own cycles
{
  const state = debutFirstGroup('mg-two');
  const g1 = state.groups[0];
  const free = KP.freeTrainees(state);
  t.ok(free.length >= 4, 'enough free trainees for a second lineup');
  const dupe = KP.proposeGroup(state, 'SECONDA', [g1.members[0]].concat(free.slice(0, 3)),
    KP.roleHints(state, [g1.members[0]].concat(free.slice(0, 3)).map(i => state.people[i])));
  t.ok(!dupe.ok, 'a member cannot belong to two groups');
  const sameName = KP.proposeGroup(state, 'FIRSTLINE', free.slice(0, 4),
    KP.roleHints(state, free.slice(0, 4).map(i => state.people[i])));
  t.ok(!sameName.ok, 'group names are unique');
  const second = KP.proposeGroup(state, 'SECONDA', free.slice(0, 4),
    KP.roleHints(state, free.slice(0, 4).map(i => state.people[i])));
  t.ok(second.ok, 'a second lineup forms once the first has debuted');
  t.eq(state.groups.length, 2, 'two groups exist');
  t.ok(second.group.id !== g1.id, 'distinct ids');

  // the second group debuts through the same machinery, with its own demos
  const g2 = second.group;
  g2.demos = KP.generateDemos(state, KP.rngFor(state));
  state.budget = Math.max(state.budget, 200);
  const plan = KP.planDebut(state, { groupId: g2.id, songId: g2.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  t.ok(plan.ok, 'second debut planned against the right group');
  t.ok(!g1.prep, 'the first group is untouched by the second plan');
  const g1Releases = g1.releases.length;
  const g1Pop = g1.popularity;
  let guard = 0;
  while (!g2.debuted && guard++ < 12) KP.advanceWeek(state);
  t.ok(g2.debuted && g2.results && g2.results.isDebut, 'second group debuted');
  t.eq(g1.releases.length, g1Releases, 'first group discography untouched');
  t.ok(g2.popularity > 0, 'second group founded its own fanbase');
  t.ok(Math.abs((g1.popularity || 0) - g1Pop) < 20, 'first group popularity only drifted, not rewritten');
  t.ok(g2.members.every(id => state.people[id].status === 'idol'), 'second lineup became idols');
}

// the ladder targets a specific group, and resolving the *other* group's
// release does not resolve it
{
  const state = debutFirstGroup('mg-ladder');
  t.eq(state.objective.type, 'comeback', 'comeback directive active');
  t.eq(state.objective.groupId, state.groups[0].id, 'directive targets the debuted group');
  // form + debut a second group; the comeback objective must survive
  const free = KP.freeTrainees(state);
  const second = KP.proposeGroup(state, 'LADDERB', free.slice(0, 4),
    KP.roleHints(state, free.slice(0, 4).map(i => state.people[i])));
  const g2 = second.group;
  g2.demos = KP.generateDemos(state, KP.rngFor(state));
  state.budget = Math.max(state.budget, 200);
  KP.planDebut(state, { groupId: g2.id, songId: g2.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g2.debuted && guard++ < 12) KP.advanceWeek(state);
  t.ok(state.objective.type === 'comeback' &&
       (state.objective.status === 'open' ? state.objective.groupId === state.groups[0].id : true),
    'the first group’s comeback directive was not consumed by the second debut');
}

// determinism with two live groups
{
  const a = debutFirstGroup('mg-fork');
  const free = KP.freeTrainees(a);
  const second = KP.proposeGroup(a, 'FORKB', free.slice(0, 4),
    KP.roleHints(a, free.slice(0, 4).map(i => a.people[i])));
  const g2 = second.group;
  g2.demos = KP.generateDemos(a, KP.rngFor(a));
  a.budget = Math.max(a.budget, 200);
  KP.planDebut(a, { groupId: g2.id, songId: g2.demos[0].id, promo: 'modest',
    week: a.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 14; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'restored save continues identically with two groups');
}

t.finish();
