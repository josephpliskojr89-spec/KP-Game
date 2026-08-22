/* Suite 085 — the song market (v0.10.5, §80 finding 11). Demos cost
   money and have other suitors: asking prices ride the era bill, hot
   hooks circulate on a dated window rivals buy through (feeding the
   ghost-demo drawer), the song camp is the spend verb, and producers
   with records made here show this room their best. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_085_market');

function world(seed) {
  const s = KP.newGame(seed, null, { legacy: true });
  s.budget = 900;
  const g = s.groups[0];
  let guard = 0;
  while (!g.demos && guard++ < 15) KP.advanceWeek(s);
  return { s, g };
}

// ---- the prices: the formula is public ---------------------------------
{
  const { s, g } = world('mkt-price');
  const MK = KP.C.MARKET;
  t.ok(g.demos.length >= 3, 'fixture: a sheet exists');
  g.demos.forEach(d => {
    if (d.writtenBy) { t.eq(d.price, 0, 'a member’s own demo is hers'); return; }
    const pr = d.producerId && KP.producerById(s, d.producerId);
    const heat = pr ? KP.producerHeat(pr) : 'unproven';
    const want = Math.max(0, Math.round((d.hook - MK.priceFloorHook) * MK.pricePerHook * (MK.heatMult[heat] || 1)));
    t.eq(d.price, want, 'asking price = hook past the floor × the producer’s heat (' + d.hook + ' → ' + d.price + ')');
  });
  t.ok(g.demos.filter(d => !d.writtenBy && d.hook >= MK.circulatingAt)
    .every(d => d.circUntil === undefined || d.circUntil > s.week - 20), 'hot hooks carry the clock');
}

// ---- the window: sit past it and the market moves ----------------------
{
  const { s, g } = world('mkt-window');
  const hot = g.demos.find(d => !d.writtenBy);
  hot.hook = 80; hot.circUntil = s.week - 1; hot.price = 25;
  const BC = KP.C.MARKET.buyChance;
  KP.C.MARKET.buyChance = 1;
  KP.advanceWeek(s);
  KP.C.MARKET.buyChance = BC;
  t.ok(!g.demos.some(d => d.title === hot.title), 'the window closed and the demo came off the desk');
  t.ok((s.ghostDemos || []).some(x => x.title === hot.title), 'into the ghost drawer — the A&R story is loaded');
  t.ok(s.inbox.some(n => n.ind === 'demoSold'), 'and the desk hears exactly whose checkbook was faster');
  t.eq(s.marketLedger.lost, 1, 'ledgered');
}
{
  // the locked record is off the market; a member's demo never sells
  const { s, g } = world('mkt-locked');
  const mine = g.demos.find(d => !d.writtenBy);
  mine.hook = 80; mine.circUntil = s.week - 1;
  KP.planDebut(s, { groupId: g.id, songId: mine.id, promo: 'modest', week: s.week + 6,
    alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  const BC = KP.C.MARKET.buyChance;
  KP.C.MARKET.buyChance = 1;
  KP.advanceWeek(s);
  KP.C.MARKET.buyChance = BC;
  t.ok(g.demos.some(d => d.title === mine.title), 'a locked record cannot be bought out from under its era');
}

// ---- the bill: the asking price rides it -------------------------------
{
  const { s, g } = world('mkt-bill');
  const pick = g.demos.filter(d => !d.writtenBy).reduce((a, b) => (b.price || 0) > (a.price || 0) ? b : a);
  pick.price = 30;
  const fork = KP.deserialize(KP.serialize(s));
  fork.groups[0].demos.find(d => d.id === pick.id).price = 0;
  const spend = (st) => {
    const before = st.budget;
    const r = KP.planDebut(st, { groupId: st.groups[0].id, songId: pick.id, promo: 'modest',
      week: st.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
    return r.ok ? before - st.budget : null;
  };
  const paid = spend(s), free = spend(fork);
  t.ok(paid != null && free != null, 'fixture: both plans lock');
  t.eq(paid - free, 30, 'the asking price is a line on the era bill');
}

// ---- the camp: the spend verb ------------------------------------------
{
  const { s, g } = world('mkt-camp');
  const MK = KP.C.MARKET;
  s.budget = 10;
  t.ok(!KP.holdSongCamp(s, g.id).ok, 'flights and studios bill up front');
  s.budget = 900;
  const r = KP.holdSongCamp(s, g.id);
  t.ok(r.ok, 'the camp convenes');
  t.ok(g.demos.length >= KP.C.SONG.demoCount + MK.campDemos, 'a deeper sheet than a cold cycle (' + r.count + ' demos)');
  t.eq(s.marketLedger.camps, 1, 'ledgered');
  t.ok(!KP.holdSongCamp(s, g.id).ok, 'camps are occasions, not furniture');
  KP.planDebut(s, { groupId: g.id, songId: g.demos[0].id, promo: 'modest', week: s.week + 6,
    alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  g.lastCampWeek = -999;
  t.ok(!KP.holdSongCamp(s, g.id).ok, 'a locked record closes the camp — it writes for the NEXT one');
}

// ---- the bond: records made here open the good drawer ------------------
{
  const { s, g } = world('mkt-bond');
  const MK = KP.C.MARKET;
  KP.producersOf(s).forEach(pr => {
    pr.works = [{ week: 1, title: 'A', reception: 60, groupId: g.id },
                { week: 2, title: 'B', reception: 62, groupId: g.id }];
  });
  g.demos = null;
  let guard = 0;
  while (!g.demos && guard++ < 5) KP.advanceWeek(s);
  const pro = g.demos.filter(d => !d.writtenBy);
  t.ok(pro.length && pro.every(d => d.bonded), 'every house regular shows this room his best');
  t.ok((s.marketLedger || {}).bondsSeen >= 1, 'the census sees the relationship working');
}

// ---- determinism -------------------------------------------------------
{
  const a = KP.newGame('mkt-fork2', null, { legacy: true });
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 30; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the song market forks clean');
}

t.finish();
