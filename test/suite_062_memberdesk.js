/* Suite 062 — the member desk (v0.9.20). §61 items 3/4: three verbs on
   a contracted member — remove from the lineup but keep the paper,
   terminate at a priced buyout, grant a personal break the group
   promotes through — and the meeting SHE calls when the grudge ledger
   and an empty tank agree. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_062_memberdesk');

function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  state.budget = 600;
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'PENTAGRAM', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  while (state.week <= (g.promoUntil || 0)) KP.advanceWeek(state);
  return { state, g };
}

// ---- remove from the lineup, keep the contract ------------------------
{
  const { state, g } = debuted('mdk-remove');
  const p = state.people[g.members[0]];
  const mate = state.people[g.members[1]];
  const size0 = g.members.length;
  // guards: the road and the era block lineup surgery
  g.tour = { startWeek: state.week };
  t.ok(!KP.removeFromLineup(state, g.id, p.id).ok, 'not from a tour bus');
  g.tour = null;
  const morale0 = p.morale, mateMorale0 = mate.morale;
  const r = KP.removeFromLineup(state, g.id, p.id);
  t.ok(r.ok, 'the statement goes out');
  t.ok(!g.members.includes(p.id) && g.members.length === size0 - 1, 'the lineup is N-1');
  t.eq(p.status, 'idol', 'the contract survives the seat');
  t.ok(!KP.groupOf(state, p.id), 'she is on her own calendar now');
  t.ok(p.morale < morale0, 'it costs her');
  t.ok((p.directed || []).some(d => d.kind === 'cutFromLineup'), 'and she remembers whose decision it was');
  t.ok(mate.morale < mateMorale0, 'the room watched the seat empty');
  t.ok(Object.values(g.roles).every(id => !id || g.members.includes(id)), 'roles reassigned to members only');
  t.ok(state.inbox.some(n => n.ind === 'lineupChange'), 'the wire carries it');
  t.ok(KP.feedReactionFor('lineupChange'), 'and the timeline has opinions');
  // a two-member group refuses the third cut
  while (g.members.length > 2) KP.removeFromLineup(state, g.id, g.members[0]);
  t.ok(!KP.removeFromLineup(state, g.id, g.members[0]).ok, 'below two is a different conversation');
}

// ---- the buyout: terminate entirely, priced by what remains -----------
{
  const { state, g } = debuted('mdk-terminate');
  const p = state.people[g.members[0]];
  const mates = g.members.slice(1);
  const cost = KP.terminationCost(state, p);
  const T = KP.C.MEMBER_DESK.TERMINATE;
  const yearsLeft = KP.C.CONTRACT.years - KP.contractYear(state, p);
  t.eq(cost, T.base + yearsLeft * T.perYear + KP.renewalRead(state, p).fame * T.perFame,
    'the buyout prices the remaining years and the name (' + cost + ')');
  state.budget = cost - 10;
  t.ok(!KP.terminateContract(state, p.id).ok, 'the budget gate is real');
  state.budget = cost + 100;
  const r = KP.terminateContract(state, p.id);
  t.ok(r.ok && r.cost === cost, 'the buyout clears');
  t.eq(state.budget, 100, 'and the books show it');
  t.eq(p.status, 'departed', 'she is out of the building');
  t.ok(p.history.some(h => /terminated/i.test(h.text)), 'the file says how');
  mates.forEach(id => t.ok((state.people[id].directed || []).some(d => d.kind === 'watchedTermination'),
    'the dorm learned something: ' + id));
  t.ok(state.inbox.some(n => n.ind === 'terminated'), 'the wire is legally immaculate');
  t.ok(KP.feedReactionFor('terminated'), 'the timeline reads between the lines');
}

// ---- the personal break: the group promotes as N-1 --------------------
{
  const { state, g } = debuted('mdk-break');
  const p = state.people[g.members[0]];
  // guards: solos and the groupless rest differently
  const dec = KP.declareMemberBreak(state, p.id);
  t.ok(dec.ok, 'the break is granted');
  t.ok(p.flags.personalHiatus, 'the flag is real');
  t.ok(!KP.declareMemberBreak(state, p.id).ok, 'one break at a time');
  t.eq(KP.moodOf(p), 'on a break', 'the staff word says it');
  t.ok(state.inbox.some(n => n.ind === 'memberBreak'), 'the fandom keeps the seat');
  p.fatigue = 70;
  const fat0 = p.fatigue;
  for (let w = 0; w < 4; w++) KP.advanceWeek(state);
  t.ok(p.fatigue < fat0, 'the rest is real (' + Math.round(p.fatigue) + ' from ' + fat0 + ')');
  t.ok(p.flags.personalHiatus, 'and open-ended — nobody rushes her');
  const end = KP.endMemberBreak(state, p.id);
  t.ok(end.ok && !p.flags.personalHiatus, 'the return is hers to schedule');
  t.ok(p.history.some(h => /personal break/.test(h.text)), 'the file keeps both dates');
  t.ok(state.inbox.some(n => n.ind === 'memberReturn'), 'one coffee cup photo');
}

// ---- the meeting she calls --------------------------------------------
{
  const { state, g } = debuted('mdk-walkout');
  const p = state.people[g.members[0]];
  KP.recordDirected(state, p.id, 'promiseBroken', -4);
  KP.recordDirected(state, p.id, 'promiseBroken', -4);
  KP.recordDirected(state, p.id, 'heldBack', -2);
  p.morale = 28;
  const W = KP.C.MEMBER_DESK.WALKOUT;
  const oldChance = W.chance;
  W.chance = 1;
  let sc = null, guard = 0;
  while (!sc && guard++ < 8) {
    // keep her desk clear so the walkout can land
    (state.scenes || []).slice().forEach(x => {
      if (x.kind !== 'walkOut') {
        const def = KP.sceneDef(x.kind);
        if (def) KP.resolveScene(state, x.id, def.options(state, x)[0].id);
      }
    });
    p.morale = Math.min(p.morale, 28);
    KP.advanceWeek(state);
    sc = (state.scenes || []).find(x => x.kind === 'walkOut');
  }
  W.chance = oldChance;
  t.ok(sc, 'the lawyer’s font reaches the desk');
  t.ok(state.inbox.some(n => /wants out/i.test(n.text)), 'and everyone knows what it means');
  // fork A: hear her out
  const a = KP.deserialize(KP.serialize(state));
  a.budget = 500;
  const budget0 = a.budget;
  KP.resolveScene(a, a.scenes.find(x => x.kind === 'walkOut').id, 'negotiate');
  const ap = a.people[p.id];
  t.ok(a.budget < budget0, 'hearing her out costs real money');
  t.ok((ap.directed || []).some(d => d.kind === 'heardOut'), 'and she remembers being heard');
  t.eq(ap.status, 'idol', 'she stays');
  // fork B: the paper wins
  const b = KP.deserialize(KP.serialize(state));
  KP.resolveScene(b, b.scenes.find(x => x.kind === 'walkOut').id, 'hold');
  const bp = b.people[p.id];
  t.ok((bp.directed || []).some(d => d.kind === 'heldToPaper'), 'the renewal table will remember this meeting');
  t.eq(bp.status, 'idol', 'she stays, technically');
  // fork C: let her go
  const c = KP.deserialize(KP.serialize(state));
  KP.resolveScene(c, c.scenes.find(x => x.kind === 'walkOut').id, 'release');
  t.eq(c.people[p.id].status, 'departed', 'released at her request');
  t.ok(c.people[p.id].history.some(h => /cheaper than the fight/.test(h.text)), 'the goodbye was quiet');
  // fork D: the unanswered meeting
  const d = KP.deserialize(KP.serialize(state));
  for (let w = 0; w < 5; w++) KP.advanceWeek(d);
  t.ok(!(d.scenes || []).some(x => x.kind === 'walkOut'), 'the meeting expired');
  t.ok((d.people[p.id].directed || []).some(x => x.kind === 'leftWaiting'), 'not answering is also an answer');
}

// ---- determinism ------------------------------------------------------
{
  const { state: a } = debuted('mdk-fork');
  const p = a.people[a.groups[0].members[0]];
  KP.declareMemberBreak(a, p.id);
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 25; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the desk’s verbs fork clean');
}

t.finish();
