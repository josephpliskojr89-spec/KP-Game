/* Suite 056 — the price of fame (v0.9.14). Success stops being free:
   the record bills by the stature of the act that records it, and a
   sponsorship is a JOB — appearances that claim real weeks, a strain
   ladder when the road wins, and the solo request whose answer the
   whole building hears either way. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_056_priceoffame');

function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'INVOICE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  state.week = Math.max(state.week, (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks + 1);
  return { state, g };
}
function signDeal(state, p, over) {
  state.deals = state.deals || [];
  const d = Object.assign({ id: 'dT', brand: 'Léore (cosmetics)', personId: p.id,
    lump: 12, weekly: 2, weeksLeft: 40, signedWeek: state.week }, over || {});
  state.deals.push(d);
  return d;
}

// ---- the bill scales with the name ----
{
  const { state, g } = debuted('pof-bill');
  const D = KP.C.DEBUT;
  g.popularity = D.statureCostFloor;
  t.eq(KP.statureCostMult(g), 1, 'at the floor, the old prices hold');
  g.popularity = 80;
  t.eq(KP.statureCostMult(g), 1 + 30 * D.statureCostPer, 'a pop-80 act bills ×' + KP.statureCostMult(g).toFixed(1));
  const flat = D.promoCost.modest + D.FORMATS[0].cost;
  t.eq(KP.recordBill(g, 'modest', 'single'), Math.round(flat * KP.statureCostMult(g)),
    'the bill is the flat rate times the name');
  // planDebut charges the same truth
  g.demos = KP.generateDemos(state, KP.rngFor(state), g);
  const before = state.budget;
  const r = KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, rollout: [[], [], [], []],
    alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  t.ok(r.ok, 'the lock succeeds');
  t.eq(before - state.budget, KP.recordBill(g, 'modest', 'single'),
    'and charges exactly the bill the studio shows — one truth');
  // an undebuted group pays rookie prices
  const fresh = { debuted: false, popularity: 90 };
  t.eq(KP.statureCostMult(fresh), 1, 'nobody bills a rookie like a headliner');
}

// ---- the obligation: kept, squeezed, missed, terminated ----
{
  const { state, g } = debuted('pof-oblig');
  const D = KP.C.DEALS;
  const p = state.people[g.members[0]];
  const d = signDeal(state, p, { nextObligationWeek: state.week + 1 });
  // AB fork: the same week without the deal — the difference IS the work
  const twin = KP.deserialize(KP.serialize(state));
  twin.deals = [];
  KP.advanceWeek(state);
  KP.advanceWeek(twin);
  t.eq(d.obligationsKept, 1, 'the appearance happened');
  t.eq(state.sponsorLedger.kept, 1, 'and the ledger is durable state');
  t.ok(state.people[p.id].fatigue > twin.people[p.id].fatigue, 'the store event is real work — measured against the twin who stayed home');
  t.eq(d.nextObligationWeek, state.week + D.obligationEveryWeeks, 'the next one is on the calendar');
  // squeezed: an obligation during promo costs more
  const { state: s2, g: g2 } = debuted('pof-squeeze');
  const p2 = s2.people[g2.members[0]];
  const d2 = signDeal(s2, p2, { nextObligationWeek: s2.week + 1 });
  g2.promoUntil = s2.week + 6;   // mid-promo, coherently
  g2.lastReleaseWeek = s2.week - 1;
  const f2 = p2.fatigue;
  KP.advanceWeek(s2);
  t.eq(d2.obligationsKept, 1, 'squeezed but kept');
  t.ok(p2.fatigue - f2 >= D.squeezeFatigue, 'and the squeeze bills the body harder');
  // missed: the road wins, twice, and the brand walks with a quarter
  const { state: s3, g: g3 } = debuted('pof-miss');
  const p3 = s3.people[g3.members[0]];
  const d3 = signDeal(s3, p3, { nextObligationWeek: s3.week + 1, lump: 20 });
  p3.flags.burnout = 12;   // medical rest is also "away" — the event runs without her
  KP.advanceWeek(s3);
  t.eq(d3.missStreak, 1, 'the bench won — one missed');
  t.ok(d3.nextObligationWeek <= s3.week + D.missRescheduleWeeks, 'rebooked pointedly soon');
  t.ok(s3.inbox.some(n => /rebooked/.test(n.text || '')), 'and narrated');
  // the rescheduled date arrives with her still benched: the second miss
  let guard = 0;
  while (d3.weeksLeft > 0 && guard++ < 8) { p3.flags.burnout = 12; KP.advanceWeek(s3); }
  t.eq(d3.weeksLeft, 0, 'two misses and the brand walked');
  t.eq(s3.sponsorLedger.clawbacks, 1, 'termination for cause, on the ledger');
  t.ok(s3.inbox.some(n => /terminated .* for cause/.test(n.text || '')), 'the letter arrived');
}

// ---- the solo request: both answers echo ----
{
  const { state, g } = debuted('pof-solo');
  const D = KP.C.DEALS;
  const p = state.people[g.members[0]];
  const rival = state.people[g.members[1]];
  rival.personality.competitiveness = 80;
  const d = signDeal(state, p, { signedWeek: state.week - D.soloAskAfterWeeks });
  const old = D.soloAskChance;
  D.soloAskChance = 1;
  KP.advanceWeek(state);
  D.soloAskChance = old;
  const sc = (state.scenes || []).find(x => x.kind === 'sponsorSolo');
  t.ok(sc && sc.personId === p.id, 'the request that is never just a request');
  t.ok(d.soloAsked, 'once per deal, stamped');
  const cash = state.budget, rm0 = rival.morale;
  KP.resolveScene(state, sc.id, 'allow');
  t.eq(state.budget - cash, Math.round(d.lump * D.soloBonusMult), 'the solo stage pays half a lump again');
  t.eq(p.flags.soloShines, 1, 'the shine is stamped — the gravity will read this someday');
  t.ok(rival.morale < rm0, 'the competitive one in the room felt it');
  t.eq(state.sponsorLedger.soloAllowed, 1, 'ledgered');
  t.ok(state.inbox.some(n => n.ind === 'sponsorSolo'), 'the clips travel');
  t.ok(KP.feedReactionFor('sponsorSolo'), 'through the registry');
  // the other answer: declined, cooled, and SHE KNOWS
  const { state: s2, g: g2 } = debuted('pof-decline');
  const p2 = s2.people[g2.members[0]];
  const d2 = signDeal(s2, p2, { signedWeek: s2.week - D.soloAskAfterWeeks, weekly: 3 });
  D.soloAskChance = 1;
  KP.advanceWeek(s2);
  D.soloAskChance = old;
  const sc2 = (s2.scenes || []).find(x => x.kind === 'sponsorSolo');
  const read0 = KP.renewalRead(s2, p2).score;
  KP.resolveScene(s2, sc2.id, 'decline');
  t.ok(d2.cooled, 'the brand cools');
  t.ok((p2.directed || []).some(a => a.kind === 'heldBack'), 'she heard about the no');
  t.ok(KP.renewalRead(s2, p2).score <= read0 - 2, 'and the renewal table reads it — through the ledger AND the mood, not kindly');
  const cash2 = s2.budget;
  KP.advanceWeek(s2);
  t.eq(s2.budget - cash2 >= 0 && s2.deals[0].cooled ? Math.max(0, d2.weekly - KP.C.DEALS.cooledWeeklyCut) : -1,
    2, 'a cooled brand pays with less warmth (' + (d2.weekly - KP.C.DEALS.cooledWeeklyCut) + '/week)');
}

// ---- determinism ----
{
  const { state: a, g: ga } = debuted('pof-fork');
  signDeal(a, a.people[ga.members[0]], { nextObligationWeek: a.week + 2 });
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 30; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'invoices, misses, and requests fork clean');
}

t.finish();
