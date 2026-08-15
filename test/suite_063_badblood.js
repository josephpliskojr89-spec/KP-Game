/* Suite 063 — the bad blood + the fansite masters (v0.9.21, map slot 6).
   §55.3: conflict must COST and the fandom must amplify — in-group,
   in-company, in-scene. §55.13: rivalries form from SOURCES beyond the
   shared week. And the gasoline gets faces: funding power, closeness,
   turn risk. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_063_badblood');

function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  state.budget = 600;
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'THORNFIELD', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  return { state, g };
}
function pairKey(a, b) { return a.id < b.id ? a.id + '~' + b.id : b.id + '~' + a.id; }
function forceConflict(state, a, b) {
  state.relationships = state.relationships || {};
  state.relationships[pairKey(a, b)] = Object.assign(
    state.relationships[pairKey(a, b)] || {}, { score: -60 });
  return state.relationships[pairKey(a, b)];
}

// ---- tier 1: the in-group rivalry -------------------------------------
{
  const { state, g } = debuted('bb-ingroup');
  const a = state.people[g.members[0]], b = state.people[g.members[1]];
  const rel = forceConflict(state, a, b);
  const B = KP.C.BADBLOOD;
  const oldChance = B.rivalryChance;
  B.rivalryChance = 1;
  let guard = 0;
  while (!rel.rivalry && guard++ < B.coldWeeksToRivalry + 4) {
    rel.score = -60;   // hold the pair cold against weekly drift
    KP.advanceWeek(state);
  }
  B.rivalryChance = oldChance;
  t.ok(rel.rivalry, 'the cold streak hardens into a NAME');
  t.eq(state.badBloodLedger.inGroup, 1, 'ledgered');
  t.ok(a.history.some(h => /got a name nobody says out loud/.test(h.text)), 'both files carry it');
  t.ok(state.inbox.some(n => /RIVALS now, inside one lineup/.test(n.text)), 'the staff say it plainly');
  // the felt effect: the named rivalry drags chemistry beyond the score
  const chemWith = KP.groupChemistry(state, g.members.map(id => state.people[id]));
  delete rel.rivalry;
  const chemWithout = KP.groupChemistry(state, g.members.map(id => state.people[id]));
  rel.rivalry = { since: state.week };
  t.ok(chemWith < chemWithout, 'a named rivalry costs the stage (' + chemWith + ' < ' + chemWithout + ')');
  // the hatchet: sustained recovery buries it
  rel.score = 10;
  for (let w = 0; w < KP.C.BADBLOOD.buryWeeks + 2 && rel.rivalry; w++) {
    rel.score = 10;
    KP.advanceWeek(state);
  }
  t.ok(!rel.rivalry, 'the hatchet buries with sustained thaw');
  t.eq(state.badBloodLedger.buried, 1, 'and the burial is ledgered');
}

// ---- tier 2: the in-company cannibalization ---------------------------
{
  const { state, g } = debuted('bb-cannibal');
  // a second group mid-promo while the first releases
  KP.openMandate(state, { kind: 'group', source: 'fixture' });
  const spare = state.prospects.slice(0, 4).map(id => state.people[id]);
  spare.forEach(p => { p.status = 'trainee'; p.gender = state.people[g.members[0]].gender;
    p.traineeContract = { start: state.week, years: 3, term: 1 };
    state.roster.push(p.id); });
  state.prospects = state.prospects.filter(id => !spare.some(p => p.id === id));
  const r2 = KP.proposeGroup(state, 'UNDERCARD', spare.map(p => p.id), KP.roleHints(state, spare));
  t.ok(r2.ok, 'fixture: the second lineup');
  const g2 = r2.group;
  g2.debuted = true; g2.debutWeek = state.week; g2.popularity = 40;
  g2.lastReleaseWeek = state.week - 1; g2.promoUntil = state.week + 3;
  g.lastReleaseWeek = state.week - 1; g.promoUntil = state.week + 3;
  const B = KP.C.BADBLOOD;
  const oldChance = B.civilWarChance;
  B.civilWarChance = 1;
  KP.advanceWeek(state);
  B.civilWarChance = oldChance;
  t.ok(state.badBloodLedger.cannibal >= 1, 'one calendar, two own groups — priced');
  t.ok(state.inbox.some(n => /stopped pretending to be one family/.test(n.text)),
    'and both fandoms noticed whose calendar it is');
}

// ---- tier 3: the professional rivalry, from a source ------------------
{
  const { state, g } = debuted('bb-scene');
  g.popularity = 60;
  // stage a rival act in OUR debut class with matching weight
  const rival = state.rivals[0];
  const act = rival.acts.find(a => !a.retired) || rival.acts[0];
  act.retired = false;
  act.debutWeek = g.debutWeek;   // same cohort
  act.popularity = 58;
  const B = KP.C.BADBLOOD;
  const oldForm = B.formChance;
  B.formChance = 1;
  KP.advanceWeek(state);
  B.formChance = oldForm;
  const riv = KP.sceneRivalries(state, g.id)[0];
  t.ok(riv, 'the coverage found its angle');
  t.eq(riv.source, 'class', 'the debut class is the road in — not the calendar');
  t.ok(state.inbox.some(n => n.ind === 'rivalryNamed'), 'the wire names it');
  t.ok(KP.feedReactionFor('rivalryNamed'), 'the timeline has a franchise');
  t.ok(KP.sceneRivalries(state, g.id).length <= KP.C.BADBLOOD.maxSceneRivalries,
    'rivalries stay countable');
  // the war: a shared release week ignites and the rivalry remembers
  const heat0 = riv.heat;
  act.lastReleaseWeek = state.week + 1;
  g.lastReleaseWeek = state.week + 1;
  const oldWar = B.fanWarChance;
  B.fanWarChance = 1;
  KP.advanceWeek(state);
  B.fanWarChance = oldWar;
  t.ok(riv.heat > heat0, 'the clash heats the rivalry (' + riv.heat + ' from ' + heat0 + ')');
  t.ok(state.badBloodLedger.fanWars >= 1, 'the fan war is ledgered');
  t.ok((state.discourses || []).some(d => d.kind === 'fanWar'), 'and trending');
  // ride the heat to the NAME
  riv.heat = KP.C.BADBLOOD.namedAt + 5;
  act.lastReleaseWeek = state.week + 1;
  g.lastReleaseWeek = state.week + 1;
  KP.advanceWeek(state);
  t.ok(KP.getNarrative(state, 'archRivals', 'group', g.id), 'hot enough, the trades make it canon');
}

// ---- the fansite masters ----------------------------------------------
{
  const { state, g } = debuted('bb-master');
  const p = state.people[g.members[0]];
  p.social = 40000;
  state.feedCast = { PetalArchive: { biasId: p.id, since: state.week - KP.C.FANSITE.masterTenure - 2 } };
  KP.advanceWeek(state);
  const c = state.feedCast.PetalArchive;
  t.ok(c.master, 'the biased regular graduates to master');
  t.eq(state.badBloodLedger.masters, 1, 'ledgered');
  t.ok(state.inbox.some(n => n.ind === 'masterMinted'), 'the fandom gains a load-bearing wall');
  // the funding: a master banks the countdown
  while (state.week <= (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks) KP.advanceWeek(state);
  g.demos = KP.generateDemos(state, KP.rngFor(state));
  state.budget = Math.max(state.budget, 400);
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 5, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.prep.masterFunded && g.prep && guard++ < 6) KP.advanceWeek(state);
  t.ok(g.prep && g.prep.masterFunded, 'the master funds the era');
  t.ok(state.inbox.some(n => /subway station/.test(n.text)), 'faster than the marketing budget');
  // the turn: a betrayal trigger flips the account
  KP.recordDirected(state, p.id, 'heldToPaper', -2);
  const F = KP.C.FANSITE;
  const oldTurn = F.turnChance;
  F.turnChance = 1;
  KP.advanceWeek(state);
  F.turnChance = oldTurn;
  t.ok(c.master.turned, 'the closing notice posts at 2am');
  t.ok(!c.biasId, 'the account closes; the person was never the target');
  t.eq(state.badBloodLedger.turns, 1, 'ledgered');
  t.ok((state.discourses || []).some(d => d.kind === 'masterTurn'), 'the receipts trend');
  t.ok(state.inbox.some(n => /She deserved better than this building/.test(n.text)),
    'aimed at the company, per the content law');
}

// ---- determinism ------------------------------------------------------
{
  const { state: a, g } = debuted('bb-fork');
  forceConflict(a, a.people[g.members[0]], a.people[g.members[1]]);
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 30; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'rivalries, wars, and masters fork clean');
}

t.finish();
