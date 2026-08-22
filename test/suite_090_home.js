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
  t.eq(KP.homeCostMult(a), KP.C.HOME.costMult, 'the whole bill runs at the regional rate');
  t.eq(KP.homeNetMult(a), KP.C.HOME.networkDamp, 'and Seoul’s gravity thins the mail');
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
  const HC = KP.C.HOME.homeChance;
  KP.C.HOME.homeChance = 1;   // pin: every minted row comes from home
  for (let i = 0; i < 8; i++) KP.advanceWeek(s);
  KP.C.HOME.homeChance = HC;
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
