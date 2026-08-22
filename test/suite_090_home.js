/* Suite 090 — the regional founding (v0.10.10, §76 B). Found away
   from Seoul: cheaper everything, the home rooms that book their own
   at a local premium, Seoul's gravity on the applicant pipeline, and
   a longer road to the capital circuit. The last item on the §81
   roadmap. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_090_home');

// ---- the founding: the city is decided once ----------------------------
{
  const s = KP.newGame('hm-found', null, { legacy: false, door: 'fresh', homeCity: 'busan' });
  t.eq(s.homeCity, 'busan', 'the lease is signed where the founding said');
  t.ok(KP.isRegionalHouse(s), 'and the house reads as regional');
  t.eq(KP.homeCityLabel(s), 'Busan', 'by name');
  t.ok(s.inbox.some(n => n.ind === 'regionalFounding'), 'the founding note tells the trade honestly');
}
{
  const s = KP.newGame('hm-seoul', null, { legacy: false, door: 'fresh' });
  t.eq(s.homeCity, 'seoul', 'Seoul is the default');
  t.ok(!s.inbox.some(n => n.ind === 'regionalFounding'), 'and needs no explaining');
  const bad = KP.newGame('hm-bad', null, { legacy: false, door: 'fresh', homeCity: 'gotham' });
  t.eq(bad.homeCity, 'seoul', 'an unknown city falls back to the capital');
}

// ---- cheaper everything ------------------------------------------------
{
  const a = KP.newGame('hm-cost', null, { legacy: false, door: 'fresh', homeCity: 'daegu' });
  const b = KP.newGame('hm-cost', null, { legacy: false, door: 'fresh' });
  const pa = a.people[Object.keys(a.people)[0]], pb = b.people[Object.keys(b.people)[0]];
  t.ok(KP.signCost(a, pa) < KP.signCost(b, pb),
    'the same signature costs less here (' + KP.signCost(a, pa) + ' vs ' + KP.signCost(b, pb) + ')');
  // the atlas (v0.10.12): the rate is the CITY's now, not one flat number
  t.eq(KP.homeCostMult(a), KP.C.HOME.CITIES.daegu.costMult, 'the whole bill runs at the city’s rate');
  t.eq(KP.homeNetMult(a), KP.C.HOME.CITIES.daegu.networkDamp, 'and Seoul’s gravity thins the mail');
}

// ---- the atlas (v0.10.12, §82 A): every address is a different trade ---
{
  const mk = c => KP.newGame('hm-atlas-' + c, null, { legacy: false, door: 'fresh', homeCity: c });
  const daegu = mk('daegu'), incheon = mk('incheon'), busan = mk('busan');
  t.ok(KP.homeCostMult(daegu) < KP.homeCostMult(busan) && KP.homeCostMult(busan) < KP.homeCostMult(incheon),
    'the discount ladder: daegu < busan < incheon (' + KP.homeCostMult(daegu) + ' < ' +
    KP.homeCostMult(busan) + ' < ' + KP.homeCostMult(incheon) + ')');
  t.ok(KP.homeGateLift(daegu) > KP.homeGateLift(busan) && KP.homeGateLift(busan) > KP.homeGateLift(incheon),
    'and the remoteness ladder runs the other way');
  t.eq(KP.homeCommute(incheon), KP.C.HOME.CITIES.incheon.commute, 'incheon pays the train');
  t.eq(KP.homeCommute(daegu), 0, 'daegu does not — it simply is not going');
  t.ok((daegu.inbox || []).some(n => n.ind === 'regionalFounding' && /deep discount/.test(n.text)),
    'the founding letter says THIS city’s trade out loud');
  // the arts city: gwangju's academy opens with a name
  const gw = mk('gwangju');
  const sch = gw.schools.find(x => x.cityId === 'gwangju');
  t.ok(sch.rep >= KP.C.SCHOOLS.startRep[0] + KP.C.HOME.CITIES.gwangju.schoolRep,
    'the gwangju academy opens with the head start (' + sch.rep + ')');
  // the local school is a walk, not a train — and the BUTTON reads the
  // same truth the verb bills (v0.10.13.1: the card showed 10, billed 2)
  t.eq(KP.schoolTripCost(gw, sch), KP.C.HOME.homeTripCost, 'one truth: the home trip price helper');
  t.eq(KP.schoolTripCost(gw, gw.schools.find(x => x.cityId !== 'gwangju')), KP.C.SCHOOLS.tripCost,
    'and the away price stays the train fare');
  const b0 = gw.budget;
  const r = KP.scoutingTrip(gw, sch.id);
  t.ok(r.ok && b0 - gw.budget === KP.C.HOME.homeTripCost, 'the home school bills lunch money (' + (b0 - gw.budget) + ')');
  t.ok(/walked to/.test(r.note.text), 'and the note walks');
  KP.advanceWeek(gw);
  const away = gw.schools.find(x => x.cityId !== 'gwangju');
  const b1 = gw.budget;
  t.ok(KP.scoutingTrip(gw, away.id).ok && b1 - gw.budget === KP.C.SCHOOLS.tripCost,
    'the away school still bills the train');
  // a Seoul house pays no commute and gets no discount anywhere
  const se = KP.newGame('hm-atlas-se', null, { legacy: false, door: 'fresh' });
  t.ok(KP.homeCostMult(se) === 1 && KP.homeCommute(se) === 0 && KP.homeGateLift(se) === 0,
    'Seoul is the baseline on every axis');
}

// ---- the longer road to the capital circuit ----------------------------
{
  const s = KP.newGame('hm-gate', null, { legacy: false, door: 'fresh', homeCity: 'busan' });
  const fame = KP.fameRead(s);
  const SB = KP.C.FAME.showBar;
  // pin the bar just under this world's fame: Seoul would be open,
  // the regional lift keeps the broadcast circuit a drive away
  KP.C.FAME.showBar = fame - 0.01;
  const closedHere = !KP.showsOpen(s);
  s.homeCity = 'seoul';
  const openInSeoul = KP.showsOpen(s);
  KP.C.FAME.showBar = SB;
  t.ok(closedHere && openInSeoul, 'the same fame opens Seoul’s doors and not this town’s road to them');
}

// ---- the home rooms book their own -------------------------------------
{
  const s = KP.newGame('hm-pile', null, { legacy: false, door: 'fresh', homeCity: 'busan' });
  s.budget = 900;
  const ids = s.roster.slice(0, 5);
  KP.proposeGroup(s, 'HOMETOWN', ids, KP.roleHints(s, ids.map(i => s.people[i])));
  const g = s.groups[0];
  let guard = 0;
  while (!g.demos && guard++ < 5) KP.advanceWeek(s);
  KP.planDebut(s, { groupId: g.id, songId: g.demos[0].id, promo: 'modest', week: s.week + 6,
    alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  // the atlas (v0.10.12): the pile reads the CITY profile now — pin that
  const HC = KP.C.HOME.CITIES.busan.pileChance;
  KP.C.HOME.CITIES.busan.pileChance = 1;   // pin: every minted row comes from home
  for (let i = 0; i < 8; i++) KP.advanceWeek(s);
  KP.C.HOME.CITIES.busan.pileChance = HC;
  const home = KP.openBookings(s).filter(o => o.home);
  t.ok(home.length >= 1, 'the home town takes its share of the pile');
  t.ok(home.every(o => o.town === 'Busan'), 'by name, on every card');
}

// ---- determinism --------------------------------------------------------
{
  const a = KP.newGame('hm-fork', null, { legacy: false, door: 'fresh', homeCity: 'gwangju' });
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 30; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the regional founding forks clean');
}

t.finish();
