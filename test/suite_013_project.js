/* Suite 013 — the project (v0.2.5).
   A provisional lineup the building knows about: rails on opening, the
   hopefuls push harder and self-direct toward what the project seeks,
   locked members steady, finalizing clears it (dropping a locked member
   hurts), shelving disappoints, and determinism holds. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_013_project');

// rails
{
  const state = KP.newGame('prj-rails', null, { legacy: false });
  t.ok(!KP.openProject(state, [], []).ok, 'a project needs at least one locked member');
  t.ok(!KP.openProject(state, state.roster.slice(0, 4), []).ok, 'a full lineup is a proposal, not a project');
  t.ok(!KP.openProject(state, [state.prospects[0]], []).ok, 'locked members must be signed trainees');
  const r = KP.openProject(state, state.roster.slice(0, 2), ['rap', 'dance']);
  t.ok(r.ok, 'a 2-locked project with sought domains opens');
  t.ok(!KP.openProject(state, [state.roster[3]], []).ok, 'one project at a time');
  t.eq(state.project.seeking.length, 2, 'sought domains recorded');
  // announcement lands on the next advance, once
  KP.advanceWeek(state);
  t.ok(state.inbox.some(m => /Word is out about the new group project/.test(m.text)), 'the building hears about it');
  const announcements = () => state.inbox.filter(m => /Word is out/.test(m.text)).length;
  const before = announcements();
  KP.advanceWeek(state);
  t.eq(announcements(), before, 'the announcement fires once');
}

// hopefuls push: same seed with and without a project, hopefuls gain more
{
  const mkState = (withProject) => {
    const s = KP.newGame('prj-drive', null, { legacy: false });
    if (withProject) KP.openProject(s, s.roster.slice(0, 2), ['rap']);
    // identical player plans everywhere: one focus slot used
    s.roster.forEach(id => { s.people[id].training = { focus: ['vocals'], intensity: 'standard' }; });
    for (let w = 0; w < 12; w++) KP.advanceWeek(s);
    return s;
  };
  const withP = mkState(true);
  const without = mkState(false);
  const hopefulIds = withP.roster.slice(2);
  // sought domain fills the spare focus slot: rap grows for hopefuls only with a project
  let rapWith = 0, rapWithout = 0;
  hopefulIds.forEach(id => {
    rapWith += withP.people[id].talents.rap.cur - without.people[id].talents.rap.cur;
    rapWithout += 0;
  });
  t.ok(rapWith > 2, 'hopefuls self-direct toward the sought domain (+' + rapWith.toFixed(1) + ' rap total vs control)');
  // locked members do not get the drive multiplier on their own plan
  const lockedDelta = withP.roster.slice(0, 2).reduce((sum, id) =>
    sum + withP.people[id].talents.rap.cur - without.people[id].talents.rap.cur, 0);
  t.ok(Math.abs(lockedDelta) < 2.5, 'locked members are not drafted into the scramble (Δ' + lockedDelta.toFixed(1) + ')');
}

// player-set focus wins: a hopeful with two chosen foci is not overridden
{
  const state = KP.newGame('prj-override', null, { legacy: false });
  KP.openProject(state, state.roster.slice(0, 2), ['rap']);
  const p = state.people[state.roster[3]];
  p.training = { focus: ['vocals', 'dance'], intensity: 'standard' };
  const rapBefore = p.talents.rap.cur;
  for (let w = 0; w < 10; w++) KP.advanceWeek(state);
  t.ok(p.talents.rap.cur - rapBefore < 3, 'a full player plan leaves no room for self-direction');
}

// finalizing: project clears; a locked member left out takes it hard
{
  const state = KP.newGame('prj-final', null, { legacy: false });
  KP.openProject(state, state.roster.slice(0, 3), []);
  const dropped = state.people[state.roster[2]];
  const moraleBefore = dropped.morale;
  const ids = [state.roster[0], state.roster[1], state.roster[3], state.roster[4], state.roster[5]];
  const r = KP.proposeGroup(state, 'FINALINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  t.ok(r.ok, 'finalizing over an open project works');
  t.ok(!state.project, 'the project became the group');
  t.ok(dropped.morale < moraleBefore, 'the dropped locked member took it hard');
  t.ok(dropped.history.some(h => /left out of the final lineup/.test(h.text)), 'her file remembers');
}

// shelving disappoints the hopefuls
{
  const state = KP.newGame('prj-shelve', null, { legacy: false });
  KP.openProject(state, state.roster.slice(0, 2), []);
  const hopeful = state.people[state.roster[4]];
  const moraleBefore = hopeful.morale;
  const r = KP.cancelProject(state);
  t.ok(r.ok && r.disappointed > 0, 'shelving reports the disappointed');
  t.ok(hopeful.morale < moraleBefore, 'hopefuls feel the shelving');
  t.ok(!state.project, 'project gone');
}

// no project during group development
{
  const state = KP.newGame('prj-dev', null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'DEVLINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  t.ok(!KP.openProject(state, [state.roster[5]], []).ok, 'no project while a group is in development');
}

// save + determinism
{
  const a = KP.newGame('prj-fork', null, { legacy: false });
  KP.openProject(a, a.roster.slice(0, 2), ['dance']);
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 12; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'restored save continues identically with an open project');
}

t.finish();
