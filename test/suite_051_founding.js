/* Suite 051 — the founding (v0.9.9, Phase C opens). Owner: "I'm not
   the CEO, I work below them... leave and start your own label.
   completely fresh start, going up against what you built." The door
   is gated on trust and a real body of work; walking through it turns
   the company you built into the competition and hands you eighteen
   months to prove it was you all along. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_051_founding');

function maturedCareer(seed) {
  const state = KP.newGame(seed);
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'LEGACY', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  state.week = 48 * 3;
  state.trust = 80;
  state.awardHistory = [
    { year: 2, category: 'daesang', name: 'LEGACY', company: state.company.short, isPlayer: true },
    { year: 2, category: 'song', name: 'x', company: state.company.short, isPlayer: true }];
  g.trophies = { m: 8 };
  g.releases[0].nationalPeak = 1;
  g.popularity = 75;
  return { state, g };
}

// ---- the gate: trust, years, and a trophy on the pitch deck ----
{
  const state = KP.newGame('fd-gate');
  const gate = KP.foundingEligible(state);
  t.ok(!gate.ok, 'a rookie year opens nothing');
  t.ok(gate.reasons.length >= 3, 'and the reasons are named (' + gate.reasons.length + ')');
  const { state: s2 } = maturedCareer('fd-gate2');
  s2.trust = 40;
  t.ok(!KP.foundingEligible(s2).ok, 'without trust the investors do not call back');
  s2.trust = 80;
  const g2 = KP.foundingEligible(s2);
  t.ok(g2.ok, 'trust + years + honors open the door');
  t.ok(g2.warChest > KP.C.FOUNDING.seedBase, 'the war chest is the career, liquidated (' + g2.warChest + ')');
  t.ok(g2.warChest <= KP.C.FOUNDING.seedCap, 'capped — investors, not miracles');
}

// ---- the walk: everything you built becomes the competition ----
{
  const { state, g } = maturedCareer('fd-walk');
  const oldShort = state.company.short;
  const oldGroupName = g.name;
  const oldPop = Math.round(g.popularity);
  const memberIds = g.members.slice();
  const keeper = state.people[memberIds[0]];
  KP.recordDirected(state, keeper.id, 'promiseKept', 5);   // she trusted you
  t.ok(!KP.foundLabel(state, 'L').ok, 'a one-letter label is not a name');
  t.ok(!KP.foundLabel(state, oldShort).ok, 'the old name is on the old building');
  const r = KP.foundLabel(state, 'HOMEWARD');
  t.ok(r.ok, 'the papers sign');
  t.eq(state.company.name, 'HOMEWARD', 'the letterhead is yours');
  t.eq(state.budget, r.warChest, 'the war chest is the opening budget');
  t.eq(state.trust, KP.C.FOUNDING.newTrust, 'the investors believe — provisionally');
  t.eq(state.roster.length, 0, 'the roster stayed behind');
  t.eq(state.groups.length, 0, 'so did the groups');
  t.ok(state.prospects.length >= KP.C.GEN.prospectCount[0], 'the scouting board regenerates — the scene knows your name');
  const legacy = state.rivals.find(rv => rv.short === oldShort);
  t.ok(legacy && legacy.founderGrudge, 'the old company is a rival now, and it remembers');
  const act = legacy.acts.find(a => a.name === oldGroupName);
  t.ok(act, 'the group you built is their act now');
  t.eq(act.popularity, oldPop, 'with the popularity you earned it');
  t.eq(act.members.join(), memberIds.join(), 'same five people');
  t.ok(memberIds.every(id => state.people[id].status === 'rival'), 'the files flip to the other side of the wall');
  t.ok(state.people[memberIds[0]].history.some(h => /kept the door pass as a bookmark/.test(h.text)),
    'the one who trusted you keeps the door pass as a bookmark');
  t.ok(state.objective.status === 'open' && state.objective.deadlineWeek === state.week + KP.C.FOUNDING.deadlineWeeks,
    'eighteen months to prove it was you all along');
  t.ok(state.inbox.some(n => n.ind === 'founding'), 'the announcement lands');
  t.ok(KP.feedReactionFor('founding'), 'and the timeline answers through the registry');
  t.eq(KP.validateState(state).length, 0, 'the whole transformation validates');
  t.ok(!KP.foundLabel(state, 'TWICE').ok, 'you only get to walk through this door once');
  // 0.9.9.1: the letterhead is yours, not HCG's hand-me-down
  t.ok(state.company.short.length <= 9 && state.company.short === 'HOMEWARD',
    'the topbar chip fits (' + state.company.short + ')');
  t.ok(/architect of/.test(state.company.blurb), 'the company card tells YOUR story now');
  KP.recordEvidence(state, 'fancamStar', 'idol', memberIds[0]);
  t.ok(!KP.playerNarratives(state).some(n => String(n.subjectId) === String(memberIds[0])),
    'idols who crossed the wall take their stories with them');
}

// ---- the war: the world keeps running, the old house fights back ----
{
  const { state, g } = maturedCareer('fd-war');
  const oldShort = state.company.short;
  KP.foundLabel(state, 'ASCENT');
  for (let w = 0; w < 80; w++) {
    KP.advanceWeek(state);
    const errs = KP.validateState(state);
    if (errs.length) { t.ok(false, 'invariant broke wk' + state.week + ': ' + errs[0]); break; }
  }
  const legacy = state.rivals.find(rv => rv.short === oldShort);
  t.ok(legacy, 'the founder’s old house never quietly exits the story');
  t.ok(legacy.acts.some(a => (a.releases || []).some(rl => rl.week > state.week - 80)),
    'the group you built keeps releasing — against you');
  // and the new label can climb: sign, form, debut
  const pool = state.prospects.map(id => state.people[id])
    .filter(p => p && p.gender === 'f').slice(0, 4);
  pool.forEach(p => KP.signProspect(state, p.id));
  t.ok(state.roster.length >= 4, 'the second climb starts');
  KP.proposeGroup(state, 'PHOENIX', state.roster.slice(0, 4),
    KP.roleHints(state, state.roster.slice(0, 4).map(i => state.people[i])));
  const g2 = state.groups[0];
  KP.planDebut(state, { groupId: g2.id, songId: g2.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g2.debuted && guard++ < 10) KP.advanceWeek(state);
  t.ok(g2.debuted, 'the new label debuts into the world you left');
  t.eq(KP.validateState(state).length, 0, 'sound through the whole second act');
}

// ---- determinism: the founding forks clean ----
{
  const { state: a } = maturedCareer('fd-fork');
  KP.foundLabel(a, 'MIRROR');
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 40; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the second act forks clean');
}

t.finish();
