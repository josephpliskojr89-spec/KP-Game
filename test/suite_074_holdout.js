/* Suite 074 — the holdout (v0.9.33, §74). The recruit with agency:
   the top slice of talent WITH a hot market says no below her bar,
   every no names the paths past it, money alone never flips her,
   and the sim owns every ending — the call-back, the courtship,
   the power across the street, the age-out that never got the call. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_074_holdout');

const H = () => KP.C.HOLDOUT;

// pick a board prospect the grateful-hash does NOT excuse, and make
// her the market's: real ceiling above the talent bar, rivals circling
function makeHoldout(state, opts) {
  let p = null;
  for (const id of state.prospects) {
    const c = state.people[id];
    const grateful = KP.hash01([state.seed, c.id, 'grateful'].join('|')) < H().gratefulShare;
    if (grateful === !!(opts && opts.grateful)) { p = c; break; }
  }
  p.talents.dance = { cur: 70, ceilLo: 82, ceilHi: 90, growth: 1 };
  p.talents.vocals.cur = 40;
  state.rivals[0].interest[p.id] = 2;
  return p;
}
function world(seed) {
  const state = KP.newGame(seed, null, { legacy: true });
  state.budget = 600;
  return state;
}

// ---- the no: human, free, and it names the paths ----------------------
{
  const state = world('hx-no');
  const p = makeHoldout(state);
  t.ok(KP.holdoutOf(state, p), 'the top slice with a hot market knows what she is worth');
  t.eq(KP.holdoutBar(state, p), null, 'an unproven letterhead is below her bar');
  const b0 = state.budget;
  const r = KP.signProspect(state, p.id);
  t.ok(!r.ok && r.holdout, 'she says no');
  t.eq(state.budget, b0, 'and no budget moves on a no');
  t.ok(/waiting for one of the powers/.test(r.reason), 'with her whole future in her voice');
  t.ok(/keep coming back/.test(r.reason), 'and the no names the paths');
  t.eq(p.holdout.visits, 1, 'the visit is remembered');
  t.eq(state.holdoutLedger.declined, 1, 'ledgered');
  // a rapid re-offer is not a second visit
  const r2 = KP.signProspect(state, p.id);
  t.ok(!r2.ok && p.holdout.visits === 1, 'sincerity needs air between visits');
}

// ---- the grateful minority sign anyway --------------------------------
{
  const state = world('hx-grateful');
  const p = makeHoldout(state, { grateful: true });
  t.ok(!KP.holdoutOf(state, p), 'some kids just want the door that opened');
  t.ok(KP.signProspect(state, p.id).ok, 'and they sign at the first offer');
}

// ---- the premium: the market's read is priced in ----------------------
{
  const state = world('hx-price');
  const p = makeHoldout(state);
  const E = KP.C.ECON;
  const base = E.signCostBase + 2 * E.signCostPerHeat;
  t.eq(KP.signCost(state, p), Math.round(base * H().premium),
    'the market says she can wait, and the price says so');
}

// ---- the courtship: the third sincere visit wins her ------------------
{
  const state = world('hx-court');
  const p = makeHoldout(state);
  KP.signProspect(state, p.id);
  state.week += H().visitGapWeeks;
  const r2 = KP.signProspect(state, p.id);
  t.ok(!r2.ok && /bar moves/.test(r2.reason), 'the second visit lands differently');
  state.week += H().visitGapWeeks;
  const r3 = KP.signProspect(state, p.id);
  t.ok(r3.ok && r3.holdPath === 'courtship', 'the label that kept showing up wins her');
  t.ok(p.history.some(h => /third visit won/.test(h.text)), 'the file remembers why');
  t.eq(state.holdoutLedger.signedCourtship, 1, 'ledgered');
  t.ok(!p.holdout, 'the holding is over');
}

// ---- the lane: a letterhead that means what she does ------------------
{
  const state = world('hx-lane');
  const p = makeHoldout(state);
  state.company.reputation.performance = H().laneRep + 5;
  t.eq(KP.holdoutBar(state, p), 'lane', 'her lane at real height clears the bar');
  const r = KP.signProspect(state, p.id);
  t.ok(r.ok && r.holdPath === 'lane', 'and she signs');
  // the current door's vocal house gets the vocal prodigies by design
  const s2 = world('hx-lane2');
  const q = makeHoldout(s2);
  q.talents.vocals = { cur: 72, ceilLo: 84, ceilHi: 92, growth: 1 };
  q.talents.dance.cur = 40;
  t.eq(KP.holdoutBar(s2, q), 'lane', 'the six-year vocal house is unmistakably about what she does');
}

// ---- stature: a top seat with a REAL score ----------------------------
{
  const state = world('hx-power');
  const p = makeHoldout(state);
  t.eq(KP.holdoutBar(state, p), null, 'rank 1 of a four-row pond is not a power');
  const g = state.groups[0];
  g.debuted = true;
  g.popularity = 80;
  state.trust = 80;
  const me = KP.powerRankingNow(state).find(r => r.isPlayer);
  t.ok(me.rank === 1 && me.score >= H().powerScore, 'a real seat has a real score');
  t.eq(KP.holdoutBar(state, p), 'stature', 'now the letterhead IS a power');
  t.ok(KP.signProspect(state, p.id).ok, 'and she signs the day it became one');
}

// ---- the call-back ----------------------------------------------------
{
  const state = world('hx-call');
  const p = makeHoldout(state);
  KP.signProspect(state, p.id);   // the visit she will remember
  state.company.reputation.performance = H().laneRep + 10;
  KP.advanceWeek(state);
  t.ok(p.holdout.callback, 'she watches the rankings like everyone else');
  t.ok(state.inbox.some(n => /called the office/.test(n.text)), 'and SHE calls, once');
  t.eq(state.holdoutLedger.callbacks, 1, 'ledgered');
  const r = KP.signProspect(state, p.id);
  t.ok(r.ok && r.holdPath === 'callback', 'the recruit who held out decided you became one');
}

// ---- she refuses the small houses too — only the bankroll jumps -------
{
  const state = world('hx-rival');
  const p = makeHoldout(state);
  state.rivals.forEach(r => { r.prestige = 30; });
  state.rivals[0].interest[p.id] = 3;
  for (let w = 0; w < 25; w++) KP.advanceWeek(state);
  t.eq(p.status, 'prospect', 'twenty-five hot weeks and the small houses got the same no we did');
  // the heir's money is the exception the sagas ruled
  state.rivals[0].bankroll = { since: state.week, until: state.week + 100 };
  let guard = 0;
  while (p.status === 'prospect' && guard++ < 80) KP.advanceWeek(state);
  t.eq(p.status, 'rival', 'stupid offers jump bars the player cannot');
}

// ---- lost to a power, and the board says so ---------------------------
{
  const state = world('hx-lost');
  const p = makeHoldout(state);
  KP.signProspect(state, p.id);   // we met her first
  state.rivals[0].prestige = 70;
  state.rivals[0].interest[p.id] = 3;
  let guard = 0;
  while (p.status === 'prospect' && guard++ < 80) KP.advanceWeek(state);
  t.eq(p.status, 'rival', 'the power came knocking');
  t.eq(state.holdoutLedger.lostToPowers, 1, 'ledgered');
  t.ok(p.history.some(h => /off our board/.test(h.text)), 'off the board, honestly');
}

// ---- burned by her own bar --------------------------------------------
{
  const state = world('hx-burn');
  const p = makeHoldout(state);
  KP.signProspect(state, p.id);
  state.rivals.forEach(r => { r.prestige = 30; delete r.interest[p.id]; });
  state.rivals[0].interest[p.id] = 2;   // heat stays; the powers never call
  p.age = KP.C.SCOUT.prospectAgeOut;
  KP.advanceWeek(state);
  t.ok(!state.people[p.id], 'aged past the market, still waiting');
  t.eq(state.holdoutLedger.agedWaiting, 1, 'the board is honest about what waiting costs');
  t.ok(state.inbox.some(n => /letterhead that never wrote/.test(n.text)), 'and says so');
}

// ---- determinism through a courtship ----------------------------------
{
  const state = world('hx-fork');
  const p = makeHoldout(state);
  KP.signProspect(state, p.id);
  const b = KP.deserialize(KP.serialize(state));
  for (let w = 0; w < 20; w++) { KP.advanceWeek(state); KP.advanceWeek(b); }
  t.eq(KP.serialize(state), KP.serialize(b), 'agency forks clean');
}

t.finish();
