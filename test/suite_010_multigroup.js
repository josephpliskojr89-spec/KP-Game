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
  // the holdout can say no (v0.9.33) and the opening batch is small
  // (v0.9.35) — walk the board like a real scout would
  let signedN = 0;
  for (const pid of state.prospects.slice()) {
    if (signedN >= 3) break;
    if (KP.signProspect(state, pid).ok) signedN++;
  }
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
  KP.openMandate(state, { kind: 'group', source: 'fixture greenlight' });
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
  KP.openMandate(state, { kind: 'group', source: 'fixture greenlight' });
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
  KP.openMandate(a, { kind: 'group', source: 'fixture greenlight' });
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

// ---- the conclusion of team activities (0.9.18.2) ----------------------
// the player's own disband door: the chapter closes, the people stay
{
  const state = debutFirstGroup('mg-disband');
  const g = state.groups[0];
  const memberIds = g.members.slice();
  const morale0 = state.people[memberIds[0]].morale;
  g.popularity = 60;   // a selling act — the board prices the ending
  const trust0 = state.trust;
  // guards first: the road and the era both block the door
  g.tour = { startWeek: state.week };
  t.ok(!KP.disbandGroup(state, g.id).ok, 'the road blocks the door');
  g.tour = null;
  g.promoUntil = state.week + 2;
  t.ok(!KP.disbandGroup(state, g.id).ok, 'a running era blocks the door');
  g.promoUntil = 0;
  KP.openClaim(state, { type: 'comebackPromise', subject: { kind: 'exec' },
    groupId: g.id, byWeek: state.week + 10 });
  const r = KP.disbandGroup(state, g.id);
  t.ok(r.ok, 'the statement goes out');
  t.ok(g.retiredWeek === state.week, 'the chapter closes on the record');
  t.eq(g.members.length, 0, 'every gate reads empty from here');
  t.eq(g.finalLineup.length, memberIds.length, 'but the record keeps the lineup');
  memberIds.forEach(id => {
    const p = state.people[id];
    t.eq(p.status, 'idol', 'the contracts do not end with the group: ' + id);
    t.ok(p.history.some(h => /concluded team activities/.test(h.text)), 'her file says what happened');
    t.ok((p.directed || []).some(d => d.kind === 'disbandedUs'), 'and she remembers whose call it was');
  });
  t.ok(state.people[memberIds[0]].morale < morale0, 'ending it costs the people in it');
  t.ok(state.trust < trust0, 'ending a selling act costs the board’s trust');
  t.ok(state.claims.some(c => c.groupId === g.id && c.resolved === 'void'),
    'promises about a dead group settle void');
  t.ok(state.inbox.some(n => n.ind === 'playerDisband'), 'the statement reaches the wire');
  t.ok(KP.feedReactionFor('playerDisband'), 'and the timeline knows how to grieve');
  t.ok(!KP.disbandGroup(state, g.id).ok, 'a closed chapter stays closed');
  // the week after: nothing crashes, nobody schedules the dead
  KP.advanceWeek(state);
  t.ok(!g.prep && !g.tour && !g.hiatus, 'the calendar stays empty');
  // and the ending survives the save file
  const json = KP.serialize(state);
  t.eq(KP.serialize(KP.deserialize(json)), json, 'the closed chapter round-trips');
  const f1 = KP.deserialize(json), f2 = KP.deserialize(json);
  for (let w = 0; w < 12; w++) { KP.advanceWeek(f1); KP.advanceWeek(f2); }
  t.eq(KP.serialize(f1), KP.serialize(f2), 'and forks clean with groupless idols on the roster');
}

// dissolving a pre-debut project frees the room for the next lineup
{
  const state = KP.newGame('mg-dissolve', null, { legacy: false });
  const ids = state.roster.slice(0, 4);
  KP.proposeGroup(state, 'EPHEMERA', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  t.ok(KP.devGroup(state), 'fixture: a group in development');
  const r = KP.disbandGroup(state, g.id);
  t.ok(r.ok, 'the project dissolves');
  t.ok(!KP.devGroup(state), 'the dissolved project no longer blocks the next lineup');
  ids.forEach(id => {
    t.eq(state.people[id].status, 'trainee', 'the trainees are still trainees');
    t.ok(KP.freeTrainees(state).includes(id), 'and free for the next project');
  });
  t.ok(state.people[ids[0]].history.some(h => /dissolved before the stage/.test(h.text)),
    'the file carries it');
}

t.finish();
