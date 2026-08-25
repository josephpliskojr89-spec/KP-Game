/* Suite 093 — the runway (v0.10.19, §85). Financing, the Rescene
   path: the pitch priced on observables only, the three-poison term
   sheet (board seat / revenue share / covenant-as-claim), the
   mother-fund windows, and the failure that follows you. Money is a
   bridge, not a rescue. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_093_finance');

function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  state.budget = Math.max(state.budget, 600);
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'RUNWAY', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  return { state, g };
}
function getSheet(state) {
  let guard = 0;
  while (guard++ < 8) {
    state.financing = state.financing || {};
    state.financing.lastPitchWeek = -999;
    state.budget = Math.max(state.budget, 100);
    const pr = KP.pitchFinancing(state);
    if (!pr.ok) return null;
    KP.advanceWeek(state);
    const sc = (state.scenes || []).find(x => x.kind === 'termSheet');
    if (sc) return sc;
  }
  return null;
}

// ---- the read: observables only, and the grind moves it ----
{
  const { state } = debuted('fn-read');
  const r0 = KP.financeRead(state);
  t.ok(r0.score >= 0 && r0.score <= 1, 'the read is a share of believable');
  // the archive is collateral (§85 D): content moves the pricing
  state.contentLedger = { posted: 40, hits: 2, views: KP.C.FINANCE.catalogViewsFull };
  const r1 = KP.financeRead(state);
  t.ok(r1.score > r0.score, 'the archive raises the read — the grind is an asset');
  // "the channels can pay off" (owner): a live member channel prices in
  const p = state.people[state.roster[0]];
  p.broadcast = { since: state.week, uploads: 10 };
  const r2 = KP.financeRead(state);
  t.ok(r2.score > r1.score, 'a personal channel raises the read');
  t.ok(r2.words.some(w => /personal channel/.test(w)), 'and the memo says so in words');
}

// ---- the pass: a nothing label gets told so ----
{
  const state = KP.newGame('fn-pass', null, { legacy: false, door: 'blank' });
  state.budget = 50;
  const r = KP.pitchFinancing(state);
  t.ok(r.ok, 'anyone can print a deck');
  t.ok(!KP.pitchFinancing(state).ok, 'one pitch in the air at a time');
  KP.advanceWeek(state);
  const sheet = (state.scenes || []).find(x => x.kind === 'termSheet');
  const passed = state.inbox.some(n => n.ind === 'fundPass');
  t.ok(sheet || passed, 'the fund answers either way — a pass is an answer');
  if (passed) {
    t.eq(state.financeLedger.passes, 1, 'the pass is ledgered');
    t.ok(!KP.pitchFinancing(state).ok, 'and the cooldown holds — the funds remember the deck');
  }
}

// ---- the term sheet: the door is the default, the poisons are priced ----
{
  const { state } = debuted('fn-sheet');
  const sc = getSheet(state);
  t.ok(sc, 'a real label gets a real sheet');
  if (sc) {
    t.ok(KP.sceneKinds().includes('termSheet'), 'the sheet is a registered scene');
    t.ok(sc.offers.covenant > sc.offers.board && sc.offers.board > sc.offers.rev,
      'harder hands pay more: covenant > board > revenue share');
    const b0 = state.budget;
    KP.resolveScene(state, sc.id, 'walk');
    t.eq(state.budget, b0, 'walking is free');
    t.eq(state.financeLedger.walked, 1, 'and ledgered');
    t.ok(!KP.pitchFinancing(state).ok, 'the cooldown runs from the walk');
  }
}

// ---- the covenant: a real claim, kept and missed ----
{
  const { state, g } = debuted('fn-cov');
  const sc = getSheet(state);
  t.ok(sc, 'fixture: the sheet arrived');
  if (sc) {
    const b0 = state.budget;
    KP.resolveScene(state, sc.id, 'covenant');
    t.eq(state.budget - b0, sc.offers.covenant, 'the biggest number on the table wired in');
    const c = (state.claims || []).find(x => !x.resolved && x.type === 'financeCovenant');
    t.ok(c && c.target === 'chart', 'a debuted label covenants a chart line');
    t.ok(/covenant/.test(c.label), 'the receipt reads like a receipt');
    t.ok(!!KP.financingBusy(state), 'one hand on the label at a time');
    // fork A: keep it — pin a charting release
    const a = KP.deserialize(KP.serialize(state));
    const ga = a.groups[0];
    const trustA = a.trust;
    ga.releases.push({ week: a.week, songTitle: 'Proof', conceptId: 'bright',
      reception: 70, receptionBand: 'strong', chartPeak: 5, chartWeeks: 4,
      nationalPeak: 8, nationalWeeks: 4, isDebut: false, format: 'single', tracks: 1, tracklist: [] });
    KP.advanceWeek(a);
    const ca = a.claims.find(x => x.type === 'financeCovenant');
    t.eq(ca.resolved, 'kept', 'the milestone landed — KEPT');
    t.ok(a.trust > trustA, 'kept covenants buy face');
    t.eq((a.financing || {}).reputation, 1, 'and re-price the next round');
    // v0.10.23 (the hostile audit): a kept covenant is not free money —
    // the conversion clause wakes a light share, and the funds want a
    // full cycle before the next check
    t.ok(a.financing.revShare && a.financing.revShare.pct === KP.C.FINANCE.covenantKeptSharePct,
      'the conversion clause wakes: a kept won carries the fund’s upside');
    t.ok(a.financing.coolUntil > a.week, 'and the next round waits a full cycle');
    t.ok(!KP.pitchFinancing(a).ok, 'so the pitch is refused while the share runs');
    // fork B: miss it — the window closes
    const b = KP.deserialize(KP.serialize(state));
    const cb = b.claims.find(x => x.type === 'financeCovenant');
    cb.byWeek = b.week - 1;
    const trustB = b.trust;
    b.budget = 0; // the clawback can only take what exists — pin the debt visible
    KP.advanceWeek(b);
    t.eq(b.claims.find(x => x.type === 'financeCovenant').resolved, 'missed', 'the clock ran out — MISSED');
    t.ok(b.trust < trustB, 'a miss costs face');
    t.ok(b.financing.burned, 'and follows you into every future round');
    // v0.10.23: the wire was an advance — a miss books it as debt
    t.eq(b.financing.debt, sc.offers.covenant, 'the clawback books the whole wire as owed');
    t.ok(!KP.pitchFinancing(b).ok, 'and nobody finances a label that owes the last fund money');
    t.ok(b.inbox.some(n => n.ind === 'covenantMissed'), 'the fund updated the spreadsheet, audibly');
  }
}

// ---- the revenue share: the toll on the closing quarter ----
{
  const { state } = debuted('fn-rev');
  const sc = getSheet(state);
  t.ok(sc, 'fixture: the sheet arrived');
  if (sc) {
    KP.resolveScene(state, sc.id, 'revshare');
    t.ok(state.financing.revShare && state.financing.revShare.pct === KP.C.FINANCE.revSharePct,
      'the toll is set at the signature');
    let guard = 0;
    while ((state.financeLedger.investorPaid || 0) === 0 && guard++ < 30) {
      state.budget = Math.max(state.budget, 200);
      KP.advanceWeek(state);
    }
    t.ok(state.financeLedger.investorPaid > 0, 'the fund takes its line off the gross (' +
      state.financeLedger.investorPaid + ')');
  }
}

// ---- the board seat: twice the questions, twice the cost of a miss ----
{
  const { state } = debuted('fn-board');
  const sc = getSheet(state);
  t.ok(sc, 'fixture: the sheet arrived');
  if (sc) {
    KP.resolveScene(state, sc.id, 'board');
    t.ok(KP.boardSeatActive(state), 'the chair is filled');
    // the cadence halves while the seat is held
    state.scenes = (state.scenes || []).filter(x => x.kind !== 'execQuestion');
    state.nextMeetingWeek = state.week;
    KP.advanceWeek(state);
    const gap = state.nextMeetingWeek - state.week;
    t.ok(gap <= Math.ceil(KP.C.MEETING.everyWeeks / 2),
      'the Monday meetings come twice as often (' + gap + ' weeks apart)');
  }
}

// ---- the window: a world fact, deterministic per year ----
{
  const a = KP.newGame('fn-window', null, { legacy: false });
  const b = KP.newGame('fn-window', null, { legacy: false });
  t.eq(KP.fundWindowOpen(a), KP.fundWindowOpen(b), 'the mother-fund is the same weather for the same world');
}

// ---- determinism ----
{
  const { state: a } = debuted('fn-fork');
  const sc = getSheet(a);
  if (sc) KP.resolveScene(a, sc.id, 'revshare');
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 30; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the runway forks clean');
}

t.finish();
