/* Suite 108 — the one market, part 1 (v0.10.42, §89 D6 + D10 + D12).
   The outside work: brand deals and the second job were the same machine
   twice — one list now (state.outside / outsideOffers), one capacity, one
   expiry, one books line, the kinds keeping their teeth. The fan event:
   the fan meeting is the fancon's free format, one clock. The money
   lines: tour merch rides the tour, the ad settlement rides the archive.
   The boards: one entry function, one opening rank. The tongue: one
   table for what a voice abroad is worth. And the migration that folds an
   old save into all of it. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_108_onemarket');

function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'ONEDESK', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  state.week = Math.max(state.week, (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks + 1);
  state.budget = 500;
  return { state, g };
}
// the books close on quarter weeks; a measurement across the close reads a
// reset ledger — step past one before measuring
function avoidClose(state) {
  const WPY = KP.C.WEEKS_PER_YEAR, Q = KP.C.BOOKS.quarterWeeks;
  let guard = 0;
  while (((state.week % WPY) + 1) % Q === 0 && guard++ < 3) KP.advanceWeek(state);
}

// ---- the one list -----------------------------------------------------------
{
  const { state, g } = debuted('om-list');
  const O = KP.C.OUTSIDE;
  t.ok(O.maxActive >= 1 && O.expiresWeeks >= 1 && KP.C.DEALS.maxActive === undefined && KP.C.GIGS.maxActive === undefined &&
    KP.C.DEALS.expiresWeeks === undefined && KP.C.GIGS.expiresWeeks === undefined, 'one capacity, one expiry — the kinds keep their teeth, the desk keeps the law');
  avoidClose(state);
  const p = state.people[g.members[0]], q = state.people[g.members[1]];
  state.outsideOffers = [
    { id: 'o1', kind: 'brand', label: 'Léore (cosmetics)', personId: p.id, lump: 10, weekly: 2, weeks: 12, expiresWeek: state.week + 3 },
    { id: 'o2', kind: 'panel', label: 'Off-Duty', personId: q.id, weeks: 10, weekly: 3, expiresWeek: state.week + 3 },
  ];
  t.eq(KP.openOutsideOffers(state).length, 2, 'two calls on one desk');
  t.ok(KP.openDealOffers(state).length === 1 && KP.openGigOffers(state).length === 1, 'the old doors are views over the one list');
  const cash = state.budget;
  t.ok(KP.respondOutside(state, 'o1', true).ok && state.budget === cash + 10, 'the brand lump lands');
  t.ok(KP.respondOutside(state, 'o2', true).ok, 'the seat is booked');
  t.eq(KP.outsideJobs(state).length, 2, 'two jobs, one list');
  t.eq(KP.outsideOf(state, p.id, 'brand').label, 'Léore (cosmetics)', 'the face knows her brand');
  t.eq(KP.gigOf(state, q.id).kind, 'panel', 'gigOf still opens onto the show job');
  t.ok(/face of/.test(KP.outsideLabel(KP.outsideOf(state, p.id))) && /panelist/.test(KP.outsideLabel(KP.gigOf(state, q.id))), 'one label function, both grammars');
  t.eq(state.inbox.concat(KP.lastTickNotes || []).filter(n => n.ind === 'outsideSigned').length, 2, 'one ind for the signing, the kind on the note');
  t.ok(KP.feedReactionFor('outsideSigned') && !KP.feedReactionFor('gigSigned'), 'the timeline answers the one ind');
  const before = state.books.cur.outside || 0;
  KP.advanceWeek(state);
  t.ok((state.books.cur.outside || 0) > before, 'the brand trickle and the taping fee land on one books line');
  t.ok(state.books.cur.deals === undefined, 'and the brand line of its own is gone');
  t.ok(!KP.quitOutside(state, 'o1').ok, 'a brand contract is not yours to pull');
  t.ok(KP.quitOutside(state, 'o2').ok && !KP.gigOf(state, q.id), 'the production can be walked away from');
  state.outsideOffers.push({ id: 'o3', kind: 'ost', label: 'Signal Garden', personId: p.id, weeks: 3, lump: 20, expiresWeek: state.week + 3 });
  const dropped = KP.outsideDrop(state, p.id);
  t.ok(dropped.length === 1 && dropped[0].kind === 'brand' && !KP.outsideOf(state, p.id) &&
    !KP.openOutsideOffers(state).some(o => o.personId === p.id), 'the drop ends her jobs and clears her calls');
}

// ---- the capacity is one number ------------------------------------------------
{
  const { state, g } = debuted('om-cap');
  const O = KP.C.OUTSIDE, D = KP.C.DEALS, G = KP.C.GIGS;
  g.members.map(id => state.people[id]).forEach(p => {
    p.talents.charisma.cur = 85; p.talents.visuals.cur = 85; p.personality.warmth = 80;
    p.personality.confidence = 75; p.mediaExp = 60; p.social = Math.max(D.minSocial, G.minSocial) + 5000;
  });
  const oldD = D.offerBaseChance, oldG = G.offerBaseChance;
  D.offerBaseChance = 1; G.offerBaseChance = 1;
  for (let w = 0; w < 6; w++) KP.advanceWeek(state);
  D.offerBaseChance = oldD; G.offerBaseChance = oldG;
  const open = KP.openOutsideOffers(state).length + KP.outsideJobs(state).length;
  t.ok(open <= O.maxActive && open >= 2, 'brand calls and show calls share one capacity (' + open + ' ≤ ' + O.maxActive + ')');
  t.ok(KP.openOutsideOffers(state).some(o => o.kind === 'brand') || KP.outsideJobs(state).some(j => j.kind === 'brand'), 'a brand called');
  t.ok(KP.openOutsideOffers(state).some(o => o.kind !== 'brand') || KP.outsideJobs(state).some(j => j.kind !== 'brand'), 'and so did a production');
}

// ---- the fan event: two formats, one clock -------------------------------------
{
  const { state, g } = debuted('om-fan');
  const M = KP.C.MERCH;
  g.fandom = { name: 'TESTERS', color: 'coral rose', intensity: 55 };
  t.ok(KP.fanEventRead(state, g.id, 'free').ok, 'the free meeting is open to a debuted room');
  g.fandom.intensity = 20;
  t.ok(!KP.fanEventRead(state, g.id, 'ticketed').ok && KP.fanEventRead(state, g.id, 'free').ok, 'an unorganized fandom gets the meeting, not the till');
  g.fandom.intensity = 55;
  g.fandomGrudge = 2;
  const cash = state.budget;
  const r = KP.holdFancon(state, g.id, 'free');
  t.ok(r.ok && cash - state.budget === M.fanMeetingCost && g.fandomGrudge < 2, 'the meeting costs, earns nothing, cools the grudge');
  t.eq(state.commerceLedger.fanMeetings, 1, 'ledgered on the one ledger');
  t.ok(state.inbox.some(n => n.ind === 'fanMeeting'), 'and told');
  t.ok(!KP.fanEventRead(state, g.id, 'ticketed').ok, 'one clock: the fans were just here');
  t.eq(g.fanEventQuietUntil, state.week + M.fanMeetingCooldown, 'the meeting sets its own quiet');
  state.week = g.fanEventQuietUntil;
  const r2 = KP.holdFancon(state, g.id, 'ticketed');
  t.ok(r2.ok && r2.revenue > 0 && g.fanEventQuietUntil === state.week + M.fanconCooldown, 'the ticketed room pays and sets the longer quiet');
  t.ok(KP.fanMeeting === undefined, 'the constituency verb is gone — one door');
}

// ---- the money lines ------------------------------------------------------------
{
  const { state, g } = debuted('om-lines');
  g.fandom = { name: 'LINERS', color: 'garnet red', intensity: 55 };
  g.popularity = Math.max(g.popularity || 0, 55);
  let guard = 0;
  while (!KP.tourEligible(state, g).ok && guard++ < 20) { KP.advanceWeek(state); g.prep = null; g.promoUntil = 0; }
  state.budget = 900;
  avoidClose(state);
  const r = KP.planTour(state, { groupId: g.id, scale: 'clubs', legs: ['kr'] });
  t.ok(r.ok, 'fixture: the tour books');
  const c0 = state.books.cur.commerce || 0, t0 = state.books.cur.tours || 0;
  KP.advanceWeek(state);
  t.eq(state.commerceLedger.tourMerch, 1, 'the table opens with the tour');
  t.ok((state.books.cur.tours || 0) > t0 && (state.books.cur.commerce || 0) === c0, 'and its money rides the tour’s line, not the fandom’s');
  // the ad settlement rides the archive line, and the statement says so
  state.adViews = KP.C.CONTENT.adViewsPerWon * 5;
  state.books.cur.outside = (state.books.cur.outside || 0) + 5;
  guard = 0;
  while (!state.books.last && guard++ < 14) KP.advanceWeek(state);
  const st = state.books.last;
  t.ok(st && st.lines.some(l => /Outside work/.test(l)), 'the statement carries the outside work line');
  t.ok(st && st.lines.some(l => /Catalog & archive/.test(l)), 'and the archive line');
  t.ok(st && !st.lines.some(l => /Brand deals|WeCast ad revenue|Appearances & gigs/.test(l)), 'the two folded lines are gone');
  t.ok((state.contentLedger.adPaid || 0) >= 1 && state.books.cur.adRevenue === undefined, 'the ad settlement paid, on the archive line');
}

// ---- the boards: one entry, one rank ----------------------------------------------
{
  const s = KP.newGame('om-boards', null, { legacy: true });
  const e = KP.chartEnter(s, { title: 'Board Test', act: 'TESTACT', company: 'X', isPlayer: false, score: 10 });
  t.ok(e && e.weeksOn === 0 && e.pos === null && e.peakPos === null && s.chart.entries.includes(e), 'chartEnter is boardEnter: a fresh entry on the scene board');
  const n = KP.nationalEnter(s, { title: 'National Test', act: 'TESTACT', company: 'X', isPlayer: false, score: 10, weeksOn: 3 });
  t.ok(n.weeksOn === 3 && s.national.entries.includes(n), 'the national door keeps weeksOn — the one difference, kept');
  const higher = s.chart.entries.filter(x => x.score > 10).length;
  t.eq(KP.boardRank(s, 'scene', 10), 1 + higher, 'the opening rank counts the higher scores — one body for both boards');
  t.eq(KP.boardRank(s, 'national', 1e9), 1, 'a record score opens at #1');
  t.ok(KP.boardEnter(s, 'scene', { title: 'Direct', act: 'T', company: 'X', isPlayer: false, score: 1 }).pos === null, 'the door takes a board name');
}

// ---- the tongue: one table -------------------------------------------------------
{
  const s = KP.newGame('om-tongue', null, { legacy: true });
  const g = s.groups[0];
  const F = KP.C.TONGUE.FACTOR;
  g.members.forEach(id => { s.people[id].nativeLang = 'Korean'; });
  t.eq(KP.tongueFactor(s, g, 'jp', 'japan'), F.japan, 'no Japanese voice: the cycle loses interviews');
  t.eq(KP.tongueFactor(s, g, 'na', 'circuit'), F.circuit, 'no English voice: half the convention warmth');
  t.eq(KP.tongueFactor(s, g, 'jp', 'tour'), 1, 'the tour leg without a voice sells at par — the interpreter is a fee, not a factor');
  s.people[g.members[0]].nativeLang = 'Japanese';
  t.eq(KP.tongueFactor(s, g, 'jp', 'tour'), F.tour, 'with a voice the leg sells like a homecoming');
  t.eq(KP.tongueFactor(s, g, 'jp', 'japan'), 1, 'and the cycle keeps its interviews');
  t.ok(KP.C.CIRCUIT.tongueDamp === undefined && KP.C.JAPAN.noVoiceDamp === undefined && KP.C.TONGUE.voiceRevenueMult === undefined, 'the three scattered constants are gone');
}

// ---- the migration: an old save folds into all of it ---------------------------
{
  const s = KP.newGame('om-migrate', null, { legacy: true });
  const g = s.groups[0];
  const p = s.people[g.members[0]];
  const json = JSON.parse(KP.serialize(s));
  json.version = '0.10.41';
  json.deals = [{ id: 'deal3', brand: 'Peau (cosmetics)', personId: p.id, lump: 10, weekly: 2, weeksLeft: 8, signedWeek: json.week - 2 }];
  json.gigs = [{ id: 'gig2', kind: 'mc', personId: p.id, show: 'Weekly Antenna', weeksLeft: 10, weekly: 4, lump: 0, signedWeek: json.week, strain: 1, weeksRun: 5 }];
  json.dealOffers = [{ id: 'deal4', brand: 'Fizzi (soft drink)', personId: p.id, lump: 8, weekly: 1, weeks: 10, expiresWeek: json.week + 3 }];
  json.gigOffers = [{ id: 'gig3', kind: 'ost', personId: p.id, show: 'Dusk Patrol', weeks: 3, lump: 20, expiresWeek: json.week + 3 }];
  json.nextDealId = 5; json.nextGigId = 4;
  json.scenes = (json.scenes || []).concat([{ id: 'scX', kind: 'sponsorSolo', personId: p.id, dealId: 'deal3', brand: 'Peau (cosmetics)', expiresWeek: json.week + 3 }]);
  json.books = { cur: { deals: 12, adRevenue: 3, catalog: 4, appearances: 2 }, curStartBudget: 100, last: null, closed: 0 };
  json.groups[0].lastFanconWeek = json.week - 10;
  json.groups[0].fanMeetingQuiet = json.week + 2;
  const m = KP.deserialize(JSON.stringify(json));
  t.ok(!m.deals && !m.gigs && !m.dealOffers && !m.gigOffers && m.nextDealId === undefined && m.nextGigId === undefined, 'the four old lists and two counters are gone');
  t.eq(m.outside.length, 2, 'two jobs on the one list');
  const brand = m.outside.find(j => j.id === 'deal3'), mc = m.outside.find(j => j.id === 'gig2');
  t.ok(brand && brand.kind === 'brand' && brand.label === 'Peau (cosmetics)' && brand.brand === undefined && brand.weeksRun === 0, 'the brand job carries kind and label');
  t.ok(mc && mc.kind === 'mc' && mc.label === 'Weekly Antenna' && mc.show === undefined && mc.strain === 1, 'the show job keeps its strain');
  t.eq(m.outsideOffers.length, 2, 'two calls on the one desk');
  t.ok(m.outsideOffers.every(o => o.label && o.kind), 'every call has a kind and a label');
  t.ok(m.nextOutsideId >= 5, 'the id counter cannot collide');
  const sc = m.scenes.find(x => x.id === 'scX');
  t.ok(sc && sc.jobId === 'deal3' && sc.dealId === undefined, 'the open solo request points at the job');
  t.ok(m.books.cur.deals === undefined && m.books.cur.outside === 12, 'the brand line folded into outside work');
  t.ok(m.books.cur.adRevenue === undefined && m.books.cur.catalog === 7, 'the ad settlement folded into the archive line');
  const mg = m.groups[0];
  t.ok(mg.lastFanconWeek === undefined && mg.fanMeetingQuiet === undefined &&
    mg.fanEventQuietUntil === Math.max(json.week - 10 + KP.C.MERCH.fanconCooldown, json.week + 2), 'one clock for the fan events');
  for (let w = 0; w < 6; w++) KP.advanceWeek(m);
  t.ok(KP.outsideJobs(m).length >= 1, 'and the migrated world runs its jobs');
}

// ---- determinism ------------------------------------------------------------------
{
  const { state: a } = debuted('om-fork');
  a.people[a.groups[0].members[0]].social = 60000;
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 40; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the one desk forks clean');
}

t.finish();
