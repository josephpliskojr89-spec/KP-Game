/* Suite 054 — the disappearance (v0.9.12). Not-releasing was always
   possible; announcing it is a move. A declared hiatus rests the roster
   faster and builds anticipation for the return — but past the grace
   window the public starts forgetting, and forgetting compounds. The
   return release settles the bet, to the exact point. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_054_hiatus');

function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'GHOSTED', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  // clear the calendar: promo done, rest served
  state.week = Math.max(state.week, (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks + 1);
  return { state, g };
}

// ---- the announcement: guarded like a real press release ----
{
  const { state, g } = debuted('hia-gate');
  t.ok(!KP.declareHiatus(state, 'nope').ok, 'no group, no statement');
  const und = KP.newGame('hia-und', null, { legacy: false });
  const ids = und.roster.slice(0, 5);
  KP.proposeGroup(und, 'PAPER', ids, KP.roleHints(und, ids.map(i => und.people[i])));
  t.ok(!KP.declareHiatus(und, und.groups[0].id).ok, 'an undebuted group cannot disappear — nobody would notice');
  const r = KP.declareHiatus(state, g.id);
  t.ok(r.ok, 'the statement goes out');
  t.ok(g.hiatus && g.hiatus.since === state.week, 'the clock starts');
  t.ok(!KP.declareHiatus(state, g.id).ok, 'announcing it twice is a comeback in reverse');
  t.ok(state.inbox.some(n => n.ind === 'hiatusDeclared'), 'the public hears it');
  t.ok(state.people[g.members[0]].history.some(h => /official hiatus/.test(h.text)), 'the files keep the quiet');
  t.ok(!KP.planTour(state, { groupId: g.id, scale: 'clubs', legs: ['kr'], pacing: 'humane', setlist: 'hits' }).ok,
    'a hiatus with tour dates is called a tour — blocked');
  // a group mid-prep cannot announce either
  const { state: s2, g: g2 } = debuted('hia-prep');
  s2.week = Math.max(s2.week, (g2.promoUntil || 0) + KP.C.COMEBACK.restWeeks + 1);
  g2.demos = KP.generateDemos(s2, KP.rngFor(s2), g2);
  KP.planDebut(s2, { groupId: g2.id, songId: g2.demos[0].id, promo: 'modest',
    week: s2.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  t.ok(!KP.declareHiatus(s2, g2.id).ok, 'finish the record or scrap it — not both');
}

// ---- the rest is real; the forgetting waits for the grace window ----
{
  const { state, g } = debuted('hia-rest');
  const H = KP.C.HIATUS;
  g.members.forEach(id => { state.people[id].fatigue = 60; });
  KP.declareHiatus(state, g.id);
  const pop0 = g.popularity, fan0 = (g.fandom && g.fandom.intensity) || null;
  const f0 = state.people[g.members[0]].fatigue;
  for (let w = 0; w < H.graceWeeks; w++) KP.advanceWeek(state);
  t.ok(state.people[g.members[0]].fatigue < f0 - H.graceWeeks * H.restBonus / 2,
    'the rest outpaces ordinary idleness (' + f0 + ' → ' + state.people[g.members[0]].fatigue + ')');
  t.eq(Math.round(g.popularity), Math.round(pop0), 'inside the grace window nobody forgets (' + g.popularity + ')');
  t.ok(!g.hiatusCooledEver, 'no cooling stamp yet');
  for (let w = 0; w < 6; w++) KP.advanceWeek(state);
  t.ok(g.popularity < pop0, 'past the grace window the walk down begins');
  t.ok(g.hiatusCooledEver, 'and it is stamped');
  if (fan0 != null) t.ok(g.fandom.intensity < fan0, 'the cafés cool too');
  t.ok(state.inbox.some(n => /slow walk down/.test(n.text || '')), 'the desk is told once, plainly');
}

// ---- the return: the lock is the announcement, the release is the bet ----
{
  const { state, g } = debuted('hia-return');
  const H = KP.C.HIATUS;
  KP.declareHiatus(state, g.id);
  for (let w = 0; w < 10; w++) KP.advanceWeek(state);
  g.demos = KP.generateDemos(state, KP.rngFor(state), g);
  const r = KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  t.ok(r.ok, 'the return locks');
  t.ok(!g.hiatus, 'the hiatus ends at the lock');
  t.eq(g.returnFrom.weeks, 10, 'ten weeks of absence, counted');
  t.ok(state.inbox.some(n => n.ind === 'returnAnnounced'), 'IS COMING BACK — announced');
  // the AB proof: fork, strip the stamp from one, resolve both — the
  // difference is exactly the anticipation (suite_026 dormancy pattern)
  const json = KP.serialize(state);
  const a = KP.deserialize(json), b = KP.deserialize(json);
  b.groups[0].returnFrom = null;
  [a, b].forEach(s => {
    const sg = s.groups[0];
    sg.prep.progress = 6; s.week = sg.prep.scheduledWeek;
    KP.resolveDebut(s, KP.rngFor(s), sg);
  });
  const expected = Math.min(H.anticipationCap, Math.round((10 - H.graceWeeks) * H.anticipationPerWeek));
  t.eq(a.groups[0].results.reception - b.groups[0].results.reception, expected,
    'the wait converts to exactly ' + expected + ' (' + a.groups[0].results.reception + ' vs ' + b.groups[0].results.reception + ')');
  t.ok(a.groups[0].results.publicNotes.some(n => /WAITED/.test(n)), 'and the receipts say why');
  t.eq(a.groups[0].hiatusReturns, 1, 'the return is stamped for the census');
  t.ok(!a.groups[0].returnFrom, 'the stamp is spent — one bet per disappearance');
}

// ---- the cap and the floor ----
{
  const { state, g } = debuted('hia-cap');
  const H = KP.C.HIATUS;
  // a stay inside the grace window is a schedule gap wearing a press
  // release: no toll paid, no bonus earned — the free-lunch door closed
  g.returnFrom = { weeks: H.graceWeeks };
  const shortRead = KP.hiatusReadsRelease(state, g, false);
  t.eq(shortRead.mod, 0, 'a grace-window stay earns nothing — only the weeks that cost count');
  t.ok(!g.returnFrom, 'but the stamp is still consumed');
  t.ok(!g.hiatusReturns, 'and it does not count as a return that converted');
  // a year away hits the ceiling
  g.returnFrom = { weeks: 48 };
  const longRead = KP.hiatusReadsRelease(state, g, false);
  t.eq(longRead.mod, H.anticipationCap, 'hype has a ceiling (' + H.anticipationCap + ')');
  t.ok(longRead.note, 'the words ride the number');
  // debuts never carry it
  g.returnFrom = { weeks: 20 };
  t.eq(KP.hiatusReadsRelease(state, g, true).mod, 0, 'a debut is not a return');
}

// ---- the second job loves an empty calendar ----
{
  const { state, g } = debuted('hia-gig');
  const G = KP.C.GIGS;
  const p = state.people[g.members[0]];
  p.talents.charisma.cur = 85; p.personality.warmth = 80;
  p.personality.confidence = 75; p.mediaExp = 60;
  p.social = G.minSocial + 5000;
  KP.declareHiatus(state, g.id);
  // pin every chance to zero EXCEPT the hiatus bonus: an offer arriving
  // proves the parked-group term is the one that fired
  const oldBase = G.offerBaseChance, oldNat = G.naturalBonus, oldHia = G.hiatusOfferBonus;
  G.offerBaseChance = 0; G.naturalBonus = 0; G.hiatusOfferBonus = 1;
  KP.advanceWeek(state);
  G.offerBaseChance = oldBase; G.naturalBonus = oldNat; G.hiatusOfferBonus = oldHia;
  t.ok(KP.openGigOffers(state).length === 1, 'productions call the moment the group parks');
  // and the gig runs clash-free: a hiatus group is never busy
  KP.respondGig(state, KP.openGigOffers(state)[0].id, true);
  for (let w = 0; w < 4; w++) KP.advanceWeek(state);
  const gig = KP.activeGigs(state)[0];
  t.ok(!gig || !gig.strain, 'no missed tapings on an empty calendar');
}

// ---- determinism ----
{
  const { state: a, g: ga } = debuted('hia-fork');
  KP.declareHiatus(a, ga.id);
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 30; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the quiet forks clean — absence is state, not dice');
}

t.finish();
