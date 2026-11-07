/* Suite 115 — the wiring (v0.11.5, §96 recommendation 1). Owner: "start
   with the wiring." The depth that existed and could not be reached or
   read, made reachable and honest: the solo door at the cold renewal
   table (and the return run behind it), the reads rendered, the free
   answers given their cost, the landing letter critical and first, the
   evaluation sheet's priority ladder, the warehouse memo and the restock
   door, the repackage's letter sent and marked, the reveal slips banded. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_115_wiring');

// ---- the solo door at the cold table, and the return run behind it ---------------
{
  const state = KP.newGame('wire-grad', null, { legacy: true });
  const g = state.groups.find(x => x.debuted && x.members.length >= 2);
  t.ok(!!g, 'the legacy door opens with a debuted lineup');
  g.members.forEach(id => { const q = state.people[id]; q.social = 20000; q.contract = q.contract || { start: 1, term: 1 }; });
  const star = state.people[g.members[0]];
  const other = state.people[g.members[1]];
  t.ok(!KP.graduateOpen(state, other), 'one of the room has no solo door');
  star.social = 400000; star.soloDisc = [{ week: 1, title: 'x' }];
  t.ok(KP.starRung(state, g, star) >= KP.C.CONTRACT.graduateRungMin && KP.graduateOpen(state, star), 'a star at rung 2 has the door');
  star.morale = 20; star.flags.ambitionMet = false;
  for (let i = 0; i < 6; i++) KP.recordDirected(state, star.id, 'heldBack');
  t.eq(KP.renewalRead(state, star).band, 'gone', 'the table reads cold');
  state.budget = 500;
  KP.openScene(state, { kind: 'renewal', personId: star.id, expiresWeek: state.week + 3 });
  const sc = state.scenes.find(x => x.kind === 'renewal');
  const def = KP.sceneDef('renewal');
  const ids = def.options(state, sc).map(o => o.id);
  t.ok(ids[0] === 'farewell' && ids.includes('graduate'), 'the solo door is on the cold table, never the default (' + ids.join(',') + ')');
  t.ok(/marquee/.test(def.body(state, sc)), 'and the body names it');
  state.budget = KP.C.CONTRACT.graduateCost - 1;
  t.ok(!def.options(state, sc).some(o => o.id === 'graduate'), 'the table never offers what the account cannot cover');
  state.budget = 500;
  const b0 = state.budget, n0 = state.groups.length, m0 = g.members.length, mo = other.morale;
  const r = KP.resolveScene(state, sc.id, 'graduate');
  t.ok(r.ok !== false && b0 - state.budget === KP.C.CONTRACT.graduateCost, 'the solo paper bills the bonus');
  const solo = state.groups.find(x => x.type === 'solo' && x.originGroupId === g.id);
  t.ok(state.groups.length === n0 + 1 && solo && solo.members[0] === star.id && g.members.length === m0 - 1, 'she leaves the lineup and stays in the building as a solo act');
  t.ok(star.contract.start === state.week && star.contract.term === 2, 'on a fresh seven');
  t.ok(other.morale === mo - KP.C.CONTRACT.graduateRoomMorale, 'the room pays for losing its star');
  t.ok(state.inbox.some(n => n.ind === 'graduatedSolo'), 'and the building hears it');
  t.ok((star.directed || []).some(d => d.kind === 'openedTheDoor'), 'the door she did not have to push is on her ledger');
  t.eq(KP.validateState(state).length, 0, 'the validator is clean after the door');
  // the return run was unreachable before v0.11.5: it needs a solo act with originGroupId
  state.budget = 9000;
  let opened = false;
  for (let w = 0; w < 40 && !opened; w++) {
    KP.advanceWeek(state); state.budget = Math.max(state.budget, 9000);
    if (!g.prep && g.demos && g.demos.length) KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest' });
    opened = (state.scenes || []).some(x => x.kind === 'returnRun' && x.personId === star.id);
  }
  t.ok(opened, 'the alum’s return run opens when her old group locks an era');
}

t.finish();
