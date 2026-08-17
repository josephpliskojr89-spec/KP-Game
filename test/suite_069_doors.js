/* Suite 069 — the three doors (v0.9.28, §69). Which company you
   choose to run: the fresh label, the inheritance, the major. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_069_doors');

// ---- the fresh label: no history, thin money, all hunger --------------
{
  const s = KP.newGame('door-fresh', null, { door: 'fresh' });
  t.eq(s.door, 'fresh', 'the door is stamped');
  t.eq(s.groups.length, 0, 'no legacy group — no history at all');
  t.eq(s.budget, 80, 'the money is thin');
  t.ok(!KP.isEstablished(s), 'the doctrine never touches a startup');
  t.ok(KP.openMandates(s).some(m => m.source === 'the founding directive'),
    'the eighteen-month girl group is still the job');
  t.ok(s.company.reputation.vocal <= 35, 'no reputation to lean on');
}

// ---- the inheritance: today's start, unchanged ------------------------
{
  const s = KP.newGame('door-cur', null, { door: 'current' });
  t.eq(s.door, 'current', 'stamped');
  t.eq(s.groups.filter(g => g.debuted).length, 1, 'the last group is here');
  t.ok(s.groups[0].legacy, 'and it is the legacy act');
  const s2 = KP.newGame('door-cur2');
  t.eq(s2.door, 'current', 'no door named = the inheritance (saves and tests unchanged)');
}

// ---- the major: infrastructure in place, doctrine live day one --------
{
  const s = KP.newGame('door-major', null, { door: 'major' });
  t.eq(s.door, 'major', 'stamped');
  const flags = s.groups.filter(g => g.debuted && !g.retiredWeek);
  t.eq(flags.length, 2, 'two flagships mid-era');
  t.ok(flags.some(g => g.gender === 'f') && flags.some(g => g.gender === 'm'),
    'one per hall');
  t.ok(flags.every(g => (g.popularity || 0) >= 60 && g.releases.length === 3 && g.fandom),
    'real eras behind them, real rooms around them');
  t.ok(KP.isEstablished(s), 'the doctrine is active from day one');
  t.ok(!KP.doctrineRead(s, null).open, 'and the portfolio reads FULL on arrival');
  t.eq(s.objective.status, 'met', 'the founding chapter is inherited, not owed');
  t.ok(s.trust >= 60 && s.budget >= 300, 'real money, real standing');
  t.ok(flags.every(g => g.members.every(id => s.people[id].contract)),
    'every flagship member carries a stamped contract');
  // the flagships live on the ordinary rails: a comeback can lock
  const g = flags[0];
  let guard = 0;
  while ((s.week <= (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks) && guard++ < 20) KP.advanceWeek(s);
  if (!g.demos) { const rng = KP.rngFor(s); g.demos = KP.generateDemos(s, rng, g); s.rngState = rng.state(); }
  s.budget = Math.max(s.budget, 400);
  t.ok(KP.planDebut(s, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: s.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } }).ok !== false,
    'the machine runs from the first morning');
}

// ---- determinism, all three doors -------------------------------------
{
  ['fresh', 'current', 'major'].forEach(door => {
    const a = KP.newGame('door-fork-' + door, null, { door });
    for (let w = 0; w < 20; w++) KP.advanceWeek(a);
    const b = KP.deserialize(KP.serialize(a));
    for (let w = 0; w < 20; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
    t.eq(KP.serialize(a), KP.serialize(b), 'the ' + door + ' door forks clean');
  });
}

t.finish();
