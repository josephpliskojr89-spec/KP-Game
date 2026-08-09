/* Suite 028 — the discourse (v0.6.2).
   Storms ignite from real events, feed themselves, fade when minor and
   boil over with consequences when ignored hot; the response menu is
   constrained per kind, one response per storm, personality shifts the
   odds, legal threats can Streisand, and the whole thing forks clean. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_028_discourse');

function debuted(seed) {
  const state = KP.newGame(seed);
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'STORMLINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  g.demos = KP.generateDemos(state, KP.rngFor(state));
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  return state;
}
// fixtures start hermetic: the debut ride can ignite organic storms
function clean(state) {
  state.discourses = (state.discourses || []).filter(d => d.status !== 'live');
}
function ignite(state, kind, subjectType, subjectId, groupId) {
  const rng = KP.rngFor(state);
  const n = KP.igniteDiscourse(state, rng, kind, subjectType, subjectId, groupId);
  state.rngState = rng.state();
  return n;
}

// ---- ignition: dedupe, cap, PR note ----
{
  const state = debuted('dc-ignite');
  clean(state);
  const g = state.groups[0];
  const p = state.people[g.members[0]];
  const note = ignite(state, 'exhausted', 'idol', p.id, g.id);
  t.ok(note && /PR flag/.test(note.text) && note.urgent, 'ignition lands a PR flag, urgent');
  t.eq(KP.liveDiscourses(state).length, 1, 'one storm live');
  t.ok(ignite(state, 'exhausted', 'idol', p.id, g.id) === null, 'no duplicate storm for the same subject');
  ignite(state, 'styling', 'group', g.id, g.id);
  t.ok(ignite(state, 'dating', 'idol', g.members[1], g.id) === null,
    'the internet can only care about ' + KP.C.DISCOURSE.maxLive + ' things at once');
}

// ---- the burn: fade and boil ----
{
  const state = debuted('dc-burn');
  clean(state);
  const g = state.groups[0];
  ignite(state, 'fancam', 'idol', g.members[0], g.id);
  const d = KP.liveDiscourses(state)[0];
  d.heat = 17;   // positive storms only decay — this one is done soon
  let guard = 0;
  while (d.status === 'live' && guard++ < 12) KP.advanceWeek(state);
  t.eq(d.status, 'faded', 'a minor wave fades on its own — ignoring was correct');

  const state2 = debuted('dc-boil');
  clean(state2);
  const g2 = state2.groups[0];
  g2.promoUntil = 0; g2.promoGrace = 0;   // hermetic: no promo pop gains muddying the boil cost
  ignite(state2, 'exhausted', 'idol', g2.members[0], g2.id);
  const d2 = KP.liveDiscourses(state2)[0];
  d2.heat = 84;
  const popBefore = g2.popularity;
  const moraleBefore = state2.people[g2.members[0]].morale;
  let guard2 = 0;
  while (d2.status === 'live' && guard2++ < 10) KP.advanceWeek(state2);
  t.eq(d2.status, 'boiled', 'an ignored hot storm boils over');
  t.ok(g2.popularity < popBefore, 'the group pays (' + popBefore + ' → ' + g2.popularity + ')');
  t.ok(state2.people[g2.members[0]].morale < moraleBefore, 'so does she');
  t.ok(state2.inbox.some(m => /boiled over/.test(m.text)), 'and the desk says so');
}

// ---- the response menu is constrained, once, and costs ----
{
  const state = debuted('dc-menu');
  clean(state);
  const g = state.groups[0];
  ignite(state, 'dating', 'idol', g.members[0], g.id);
  const d = KP.liveDiscourses(state)[0];
  t.ok(!KP.respondDiscourse(state, d.id, 'meme').ok, 'you cannot meme a dating rumor — not on the menu');
  t.ok(!KP.respondDiscourse(state, 'd999', 'statement').ok, 'unknown storm refused');
  const budgetBefore = state.budget;
  const r = KP.respondDiscourse(state, d.id, 'statement');
  t.ok(r.ok, 'a legal menu action goes through');
  t.eq(state.budget, budgetBefore - KP.C.DISCOURSE.statementCost, 'PR hours are billable');
  t.ok(!KP.respondDiscourse(state, d.id, 'legal').ok, 'the company speaks once');
  t.ok(state.feed.length && state.feed[0].persona, 'the response instantly becomes a feed post with a persona');
}

// ---- outcomes vary across worlds; legal can Streisand ----
{
  let success = 0, miss = 0, backfire = 0, resolved = 0;
  for (let s = 0; s < 30; s++) {
    const state = debuted('dc-odds-' + s);
    clean(state);
    const g = state.groups[0];
    ignite(state, 'dating', 'idol', g.members[0], g.id);
    const d = KP.liveDiscourses(state)[0];
    const r = KP.respondDiscourse(state, d.id, 'legal');
    if (r.outcome === 'success') { success++; if (d.status === 'resolved') resolved++; }
    else if (r.outcome === 'backfire') { backfire++; t.ok(d.heat >= 60, 'Streisand heats the storm'); }
    else miss++;
  }
  t.ok(success >= 5, 'legal letters often work quietly (' + success + '/30)');
  t.ok(backfire >= 2, 'and sometimes Streisand (' + backfire + '/30)');
  t.eq(success, resolved, 'success means the story is over');
}

// ---- livestream costs her energy; positive waves convert ----
{
  const state = debuted('dc-wave');
  clean(state);
  const g = state.groups[0];
  const p = state.people[g.members[0]];
  ignite(state, 'fancam', 'idol', p.id, g.id);
  const d = KP.liveDiscourses(state)[0];
  const fatigueBefore = p.fatigue;
  const socialBefore = KP.socialOf(state, p);
  const r = KP.respondDiscourse(state, d.id, 'livestream');
  t.ok(r.ok, 'riding the wave is allowed');
  t.ok(p.fatigue > fatigueBefore, 'two hours live costs real energy');
  if (r.outcome === 'success') {
    t.ok(p.social > socialBefore, 'a ridden wave converts into followers');
  }
}

// ---- exhausted trigger: run them hot in promo and the internet notices ----
{
  const state = debuted('dc-tired');
  const g = state.groups[0];
  g.promoUntil = state.week + 200;   // pin them in promotion
  let ignited = false;
  for (let w = 0; w < 90 && !ignited; w++) {
    state.discourses = (state.discourses || []).filter(d => d.kind === 'exhausted' || d.status !== 'live');
    g.members.forEach(id => { state.people[id].fatigue = 92; });
    KP.advanceWeek(state);
    ignited = (state.discourses || []).some(d => d.kind === 'exhausted');
  }
  t.ok(ignited, 'running them into the ground starts the "she looks exhausted" storm');
}

// ---- determinism: storms and responses fork clean ----
{
  const a = debuted('dc-fork');
  clean(a);
  const ga = a.groups[0];
  ignite(a, 'styling', 'group', ga.id, ga.id);
  KP.respondDiscourse(a, KP.liveDiscourses(a)[0].id, 'meme');
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 20; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the storming world forks clean');
}

// ---- migration: the PR desk announces itself ----
{
  const old = debuted('dc-mig');
  delete old.discourses; delete old.nextDiscourseId;
  old.version = '0.6.1';
  const m = KP.deserialize(KP.serialize(old));
  t.ok(m.inbox.some(x => /PR desk is live/.test(x.text)), 'the desk introduces the job');
  t.ok(Array.isArray(m.discourses), 'the storm ledger exists');
}

t.finish();
