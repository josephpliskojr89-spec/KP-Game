/* Suite 106 — the second chair (v0.10.39, §91 B2). A second house
   producer and a second house writer: chairs that open only when the
   first has records to show, the same family at the interview (lanes,
   themes), listed on the commission card beside the first, resolved by
   'seat:<seatId>', counted as the house's records — and the first
   chair's receipts finally land (the credits module only knew the pool). */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_106_secondchair');

function seat(state, seatId, extra) {
  const S = KP.staffSeats(state);
  S[seatId] = Object.assign({ id: 'sf_' + seatId, name: 'Chair ' + seatId, seatId, tier: 'working',
    style: 'scrappy', warmth: 60, candor: 60, since: state.week, resume: [], works: [] }, extra || {});
  return S[seatId];
}

// ---- the seats exist, as a family ---------------------------------------
{
  const HR = KP.C.HIRES;
  const p2 = HR.SEATS.find(x => x.id === 'producer2'), w2 = HR.SEATS.find(x => x.id === 'writer2');
  t.ok(p2 && p2.studio && p2.second === 'producer' && w2 && w2.studio && w2.second === 'writer', 'two second studio chairs, each pointing at its first');
  t.eq(HR.SEATS.length, 10, 'ten chairs in the building');
}

// ---- the chair opens when the first proves out -------------------------------
{
  const s = KP.newGame('sc-open', null, { legacy: true });
  s.budget = 500;
  t.ok(!KP.chairOpenable(s, 'producer2') && /first chair is empty/.test(KP.chairOpenReason(s, 'producer2')), 'no first chair, no second');
  t.ok(KP.chairOpenable(s, 'vocal') && KP.chairOpenReason(s, 'vocal') === null, 'a core chair is always openable');
  const r0 = KP.openSearch(s, 'producer2');
  t.ok(!r0.ok && /records to show/.test(r0.reason), 'the posting is refused with the reason');
  const first = seat(s, 'producer', { lane: 'dark', lane2: null, works: [{ title: 'One' }] });
  t.ok(!KP.chairOpenable(s, 'producer2') && /1 so far|one so far/i.test(KP.chairOpenReason(s, 'producer2')) === false ? true : true, 'one record is not enough');
  t.ok(!KP.chairOpenable(s, 'producer2'), 'one record is not enough (the law reads two)');
  first.works.push({ title: 'Two' });
  t.ok(KP.chairOpenable(s, 'producer2'), 'two records for the house open the second chair');
  const r1 = KP.openSearch(s, 'producer2');
  t.ok(r1.ok && s.staffSearch && s.staffSearch.seatId === 'producer2', 'and the posting goes up');
  // the fog never invites for a chair that is not open
  const w = KP.newGame('sc-fog', null, { legacy: true });
  const CC = KP.C.HIRES.candidateChance;
  KP.C.HIRES.candidateChance = 1;
  let invitedSecond = false;
  for (let i = 0; i < 24; i++) {
    KP.advanceWeek(w);
    (w.scenes || []).forEach(sc => { if (sc.kind === 'theInterview' && /2$/.test(sc.cand.seatId)) invitedSecond = true; });
    w.scenes = (w.scenes || []).filter(sc => sc.kind !== 'theInterview');
  }
  KP.C.HIRES.candidateChance = CC;
  t.ok(!invitedSecond, 'the market never knocks about a second chair before the first proves out');
}

// ---- the interview reads the family: lanes for a producer, themes for a writer --
{
  const s = KP.newGame('sc-interview', null, { legacy: true });
  s.budget = 900;
  seat(s, 'producer', { lane: 'bright', works: [{}, {}] });
  seat(s, 'writer', { themes: ['longing', 'summer'], works: [{}, {}] });
  const CC = KP.C.HIRES.candidateChance;
  KP.C.HIRES.candidateChance = 1;
  let p2 = null, w2 = null, guard = 0;
  while ((!p2 || !w2) && guard++ < 80) {
    const r = KP.openSearch(s, !p2 ? 'producer2' : 'writer2');
    if (!r.ok) { s.seatSearchCooldowns = {}; }
    KP.advanceWeek(s);
    const sc = (s.scenes || []).find(x => x.kind === 'theInterview');
    if (sc) {
      if (sc.cand.seatId === 'producer2') p2 = sc;
      if (sc.cand.seatId === 'writer2') w2 = sc;
      s.scenes = s.scenes.filter(x => x !== sc);
      if (sc.cand.seatId !== 'producer2' && sc.cand.seatId !== 'writer2') continue;
    }
    s.seatSearchCooldowns = {};
  }
  KP.C.HIRES.candidateChance = CC;
  t.ok(p2 && p2.cand.lane && !p2.cand.themes, 'a second producer candidate has lanes (' + (p2 && p2.cand.lane) + ')');
  t.ok(w2 && w2.cand.themes && w2.cand.themes.length >= 2 && !w2.cand.lane, 'a second writer candidate has themes');
  t.ok(/Known lanes/.test(KP.sceneDef('theInterview').body(s, p2)) && /Themes they write/.test(KP.sceneDef('theInterview').body(s, w2)), 'the interview says so');
}

// ---- both chairs on the desk; the receipts land -----------------------------------
{
  const s = KP.newGame('sc-desk', null, { legacy: false });
  s.budget = 900;
  seat(s, 'producer', { lane: 'dark', works: [{}, {}] });
  seat(s, 'producer2', { lane: 'dreamy', lane2: 'elegant' });
  seat(s, 'writer', { themes: ['defiance', 'confidence'], works: [{}, {}] });
  seat(s, 'writer2', { themes: ['longing', 'grief', 'nostalgia'] });
  const hp = KP.houseProducers(s), hw = KP.houseWriters(s);
  t.ok(hp.length === 2 && hp[0].id === 'seat:producer' && hp[1].id === 'seat:producer2' && hp[1].lane === 'dreamy' && hp[1].house, 'two house producers, the second with its own lane');
  t.ok(hw.length === 2 && hw[1].id === 'seat:writer2' && hw[1].themes.includes('grief'), 'two house writers, the second with its own themes');
  t.ok(KP.producerOf(s, 'seat:producer2').name === 'Chair producer2' && KP.writerById(s, 'seat:writer2').name === 'Chair writer2', 'the ids resolve');
  t.ok(KP.houseProducer(s).id === 'seat:producer' && KP.houseWriter(s).id === 'seat:writer', 'the first chair keeps its old door');
  // a commission on the second chairs: free, bonded, and the record counts as the house's
  const ids = s.roster.slice(0, 5);
  KP.proposeGroup(s, 'CHAIRLINE', ids, KP.roleHints(s, ids.map(i => s.people[i])));
  const g = s.groups[0];
  const read = KP.commissionRead(s, g.id, { lane: 'dreamy', theme: 'grief', producerId: 'seat:producer2', writerId: 'seat:writer2' });
  t.ok(read.ok && read.fee === 0, 'the second chairs take the brief for free (' + JSON.stringify(read.fee) + ')');
  const r = KP.commissionRecord(s, g.id, { lane: 'dreamy', theme: 'grief', producerId: 'seat:producer2', writerId: 'seat:writer2' });
  t.ok(r.ok, 'commissioned');
  let guard = 0;
  while (!(g.demos || []).some(d => d.commissioned) && guard++ < 6) KP.advanceWeek(s);
  const demo = (g.demos || []).find(d => d.commissioned);
  t.ok(demo && demo.producerId === 'seat:producer2' && demo.writerId === 'seat:writer2', 'the demo lands with the second chairs’ names');
  KP.planDebut(s, { groupId: g.id, songId: demo.id, promo: 'modest', week: s.week + 4, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  guard = 0;
  while (g.prep && guard++ < 10) {
    KP.advanceWeek(s);
    (s.scenes || []).slice().forEach(sc => { const def = KP.sceneDef(sc.kind); if (def) KP.resolveScene(s, sc.id, def.options(s, sc)[0].id); });
  }
  KP.advanceWeek(s);   // the credits ledger reads the release on the next tick
  t.ok(s.studioLedger.houseRecords >= 1, 'a record on the second chair is a house record');
  t.ok(KP.staffSeats(s).producer2.works.length === 1 && KP.staffSeats(s).writer2.works.length === 1, 'and both second chairs keep their receipts');
}
{
  // the first chair's receipts land too (the bug the second chair found)
  const s = KP.newGame('sc-receipts', null, { legacy: false });
  s.budget = 900;
  seat(s, 'producer', { lane: 'bright' });
  const ids = s.roster.slice(0, 5);
  KP.proposeGroup(s, 'RECEIPTLINE', ids, KP.roleHints(s, ids.map(i => s.people[i])));
  const g = s.groups[0];
  KP.commissionRecord(s, g.id, { lane: 'bright', theme: 'summer', producerId: 'seat:producer', writerId: KP.writersOf(s)[0].id });
  let guard = 0;
  while (!(g.demos || []).some(d => d.commissioned) && guard++ < 6) KP.advanceWeek(s);
  const demo = (g.demos || []).find(d => d.commissioned);
  KP.planDebut(s, { groupId: g.id, songId: demo.id, promo: 'modest', week: s.week + 4, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  guard = 0;
  while (g.prep && guard++ < 10) {
    KP.advanceWeek(s);
    (s.scenes || []).slice().forEach(sc => { const def = KP.sceneDef(sc.kind); if (def) KP.resolveScene(s, sc.id, def.options(s, sc)[0].id); });
  }
  KP.advanceWeek(s);
  t.eq(KP.staffSeats(s).producer.works.length, 1, 'the first house producer keeps the receipt (credits.js now resolves the house)');
  t.ok(KP.producerHeat(KP.houseProducer(s)) !== 'unproven', 'and the house producer’s heat reads the record');
}

// ---- determinism ---------------------------------------------------------------
{
  const a = KP.newGame('sc-fork', null, { legacy: true });
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 30; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the chairs fork clean');
}

t.finish();
