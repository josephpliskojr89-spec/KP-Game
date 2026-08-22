/* Suite 081 — the settlement (v0.10.1, §80 findings 2+7+14).
   Jeongsan: the debt, the share, the first-settlement meeting.
   The quarterly books: streams tracked, the statement closing.
   The distributor: the cut, the courting call, the advance. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_081_money');

function world(seed, door) {
  const s = KP.newGame(seed, null, door ? { legacy: false, door } : { legacy: true });
  s.budget = 900;
  return s;
}
function era(s, g, debtAfterLock) {
  if (!g.demos) { const rng = KP.rngFor(s); g.demos = KP.generateDemos(s, rng, g); s.rngState = rng.state(); }
  const n0 = (g.releases || []).length;
  const r = KP.planDebut(s, { groupId: g.id, songId: g.demos[0].id, promo: 'standard',
    week: s.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  if (!r.ok) throw new Error('plan: ' + r.reason);
  // fixtures pin the ledger AFTER the lock — the era's own bill would
  // otherwise re-inflate the debt past the crossing under test
  if (debtAfterLock != null && g.recoup) g.recoup.debt = debtAfterLock;
  let guard = 0;
  while ((g.releases || []).length === n0 && guard++ < 15) KP.advanceWeek(s);
}

// ---- the debt accrues, the share repays it ----------------------------
{
  const s = world('mn-debt');
  const g = s.groups[0];
  era(s, g);
  t.ok(g.recoup && g.recoup.debt > 0, 'the era bills and the practice years sit on the ledger (' + Math.round(g.recoup.debt) + ')');
  t.ok(g.recoup.settledWeek == null, 'nobody is settled at debut');
  t.ok(g.debutWeek === g.releases[0].week, 'the grind clock starts at the debut');
}

// ---- the first settlement: due, fair, on the record -------------------
{
  const s = world('mn-settle');
  const g = s.groups[0];
  era(s, g);
  while (s.week <= (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks) KP.advanceWeek(s);
  s.budget = 900;
  era(s, g, 3);   // fixture: one good era from zero
  const sc = (s.scenes || []).find(x => x.kind === 'firstSettlement');
  t.ok(sc, 'the ledger crossed zero and the meeting is on the desk');
  t.ok(s.inbox.some(n => n.ind === 'settlementDue'), 'announced like the milestone it is');
  const b0 = s.budget;
  KP.resolveScene(s, sc.id, 'fair');
  t.ok(g.recoup.settledWeek != null, 'settled');
  t.eq(b0 - s.budget, KP.C.SETTLE.backpay, 'the warm check costs real backpay');
  t.ok(KP.getNarrative(s, 'firstSettlement', 'group', g.id), 'and the industry remembers the date');
  t.ok(s.people[g.members[0]].history.some(h => /FIRST SETTLEMENT/.test(h.text)), 'so do the members');
  // post-settlement: the share is PAID, real money leaves
  while (s.week <= (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks) KP.advanceWeek(s);
  s.budget = 900;
  era(s, g);
  t.ok(g.recoup.paid > 0, 'the settled era pays out (' + g.recoup.paid + ')');
  t.ok((s.books.cur.artistPay || 0) < 0 || s.books.last, 'and the books know where it went');
}

// ---- the lean settlement leaves a mark --------------------------------
{
  const s = world('mn-lean');
  const g = s.groups[0];
  era(s, g);
  while (s.week <= (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks) KP.advanceWeek(s);
  s.budget = 900;
  era(s, g, 3);
  const sc = (s.scenes || []).find(x => x.kind === 'firstSettlement');
  t.ok(sc, 'fixture: the meeting is due');
  KP.resolveScene(s, sc.id, 'lean');
  t.ok((s.people[g.members[0]].directed || []).some(d => d.kind === 'leanSettlement'),
    'to-the-letter is paid, noted, remembered');
}

// ---- the grind: never paid, on the ledger the renewal reads -----------
{
  const s = world('mn-grind');
  const g = s.groups[0];
  era(s, g);
  g.recoup.debt = 99999;   // fixture: a ledger that never crosses
  g.debutWeek = s.week + 1 - KP.C.SETTLE.grindAt;   // age === grindAt at the next tick
  KP.advanceWeek(s);
  t.ok((s.people[g.members[0]].directed || []).some(d => d.kind === 'neverPaid'),
    'working constantly, paid never — the directed ledger holds it');
  t.ok(s.inbox.some(n => n.ind === 'neverPaid'), 'and the desk hears about it yearly');
}

// ---- the quarterly books ----------------------------------------------
{
  const s = world('mn-books');
  const g = s.groups[0];
  era(s, g);
  let guard = 0;
  while (!(s.books && s.books.last) && guard++ < 14) KP.advanceWeek(s);
  const st = s.books.last;
  t.ok(st, 'the quarter closes into a statement');
  t.ok(st.lines.some(l => /Production/.test(l)), 'the era bills are a line');
  t.ok(typeof st.net === 'number' && typeof st.other === 'number', 'net and operations are computed');
  t.ok(s.inbox.some(n => n.ind === 'quarterlyBooks'), 'and the statement reaches the desk');
}

// ---- the red ledger ----------------------------------------------------
{
  const s = world('mn-red');
  const g = s.groups[0];
  era(s, g);
  g.redEras = KP.C.BOOKS.redErasAt;   // fixture: three losses on the books
  KP.advanceWeek(s);
  const sc = (s.scenes || []).find(x => x.kind === 'redInk');
  t.ok(sc, 'three red eras put the hard question on the desk');
  KP.resolveScene(s, sc.id, 'tighten');
  t.ok(g.tightBelt, 'the belt tightens the next era');
  const g2 = g;
  while (s.week <= (g2.promoUntil || 0) + KP.C.COMEBACK.restWeeks) KP.advanceWeek(s);
  s.budget = 900;
  if (!g2.demos) { const rng = KP.rngFor(s); g2.demos = KP.generateDemos(s, rng, g2); s.rngState = rng.state(); }
  const b0 = s.budget;
  KP.planDebut(s, { groupId: g2.id, songId: g2.demos[0].id, promo: 'standard',
    week: s.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  t.ok(!g2.tightBelt, 'and is spent at the next lock');
  {
    const R = KP.C.ROLLOUT;
    const defRoll = R.DEFAULT.flat().reduce((x, a) => x + (R.ACTIVITIES[a] ? R.ACTIVITIES[a].cost : 0), 0);
    const mvCost = Math.round(KP.C.MV.TIERS.standard.cost * KP.statureCostMult(g2));
    const full = KP.recordBill(g2, 'standard', 'single') + defRoll + mvCost +
      KP.pressingBill(s, g2, g2.prep.pressing) +
      ((g2.demos.find(d => d.id === g2.prep.songId) || {}).price || 0);   // the song market (v0.10.5)
    t.ok(b0 - s.budget <= Math.round(full * KP.C.BOOKS.tightBeltCut) + 1,
      'the trimmed bill charges under the full rate (' + (b0 - s.budget) + ' vs ' + full + ')');
  }
}

// ---- the distributor ---------------------------------------------------
{
  const s = world('mn-dist', 'fresh');
  const d = KP.distributorOf(s);
  t.eq(d.tier, 0, 'an unknown label starts on the regional desk');
  const cutIndie = KP.distCut(s);
  s.distributor.tier = 2;
  t.ok(KP.distCut(s) > cutIndie, 'the bigger desk keeps more of every pressing');
  s.distributor.tier = 0;
  // the courting call
  s.groups.length = 0;
  const ids = s.roster.slice(0, 5).filter(id => (s.people[id].gender || 'f') === 'f');
  KP.proposeGroup(s, 'DISTLINE', ids, KP.roleHints(s, ids.map(i => s.people[i])));
  const g = s.groups[0];
  g.lastChodong = KP.C.DIST.TIERS[1].bar + 500;
  KP.advanceWeek(s);
  const sc = (s.scenes || []).find(x => x.kind === 'distributorCall');
  t.ok(sc, 'a real chodong history earns the courting call');
  const b0 = s.budget;
  KP.resolveScene(s, sc.id, 'advance');
  t.eq(s.distributor.tier, 1, 'signed up a tier');
  t.eq(s.budget - b0, KP.C.DIST.advance, 'the advance lands as cash');
  t.ok(s.distributor.advanceOwed > KP.C.DIST.advance, 'and is owed back with the vig');
}

// ---- the practice-room invoice (v0.10.11) ------------------------------
// owner report: "I'm not seeing any debit from accounts as I advance" —
// upkeep was real but netted silently against the stipend. It is a
// tracked line now, and the first month it outruns the stipend, a letter.
{
  const s = world('mn-upkeep', 'fresh');
  t.ok(s.roster.length > 0, 'fixture: a fresh label has trainees');
  for (let w = 0; w < 5; w++) KP.advanceWeek(s);
  const monthly = Math.round(s.roster.length * KP.C.ECON.weeklyTrainingCostPerTrainee * KP.C.WEEKS_PER_MONTH);
  t.ok(s.books.cur.trainees <= -Math.min(monthly, 1), 'the trainees line shows the debit (' + s.books.cur.trainees + ')');
  if (monthly > KP.C.ECON.monthlyStipend) {
    t.ok(s.upkeepNoted === true, 'past the stipend, the accountant’s letter fires');
    const seen = (s.inbox || []).filter(n => n.ind === 'upkeepBites').length;
    for (let w = 0; w < 4; w++) KP.advanceWeek(s);
    t.eq((s.inbox || []).filter(n => n.ind === 'upkeepBites').length, seen, 'and only once');
  }
  // and the quarter closes with the line named on the statement
  while (s.week < 15) KP.advanceWeek(s);
  t.ok(s.books.last && s.books.last.lines.some(l => /Practice rooms/.test(l)),
    'the Q1 statement names the practice rooms (' + JSON.stringify((s.books.last || {}).lines) + ')');
}

// ---- determinism through the money ------------------------------------
{
  const s = world('mn-fork');
  const g = s.groups[0];
  era(s, g);
  const b = KP.deserialize(KP.serialize(s));
  for (let w = 0; w < 24; w++) { KP.advanceWeek(s); KP.advanceWeek(b); }
  t.eq(KP.serialize(s), KP.serialize(b), 'the settlement forks clean');
}

t.finish();
