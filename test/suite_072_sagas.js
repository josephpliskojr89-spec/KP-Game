/* Suite 072 — the sagas (v0.9.31, §71). Birth certificate, not
   biography: each saga is one standard entrance script, then the sim
   takes the wheel. Forced-fire coverage for all five entrances, the
   deck's determinism, and the market distortions the invasions bring. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_072_sagas');

function world(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  state.budget = 1200;
  KP.advanceWeek(state);   // the world plans its deck at the first tick
  return state;
}
function fire(state, kind, nameIdx) {
  const rng = KP.rngFor(state);
  KP.fireSaga(state, rng, { kind, nameIdx: nameIdx || 0 });
  state.rngState = rng.state();
}

// ---- the deck: hash-planned, deterministic, years 2–8 -----------------
{
  const a = world('sg-deck');
  const b = world('sg-deck');
  t.eq(JSON.stringify(a.sagas.plan), JSON.stringify(b.sagas.plan), 'same seed, same deck');
  t.ok(a.sagas.plan.length >= 1 && a.sagas.plan.length <= 2, 'one saga, occasionally two');
  a.sagas.plan.forEach(e => {
    t.ok(e.week >= KP.C.SAGA.firstWindow[0] && e.week <= KP.C.SAGA.latestWeek,
      'timed into years 2–8 (' + e.kind + ' @ ' + e.week + ')');
  });
}

// ---- the super-group project ------------------------------------------
{
  const state = world('sg-super');
  const before = state.rivals.length;
  // an international prospect on our board, for the courting
  const intl = state.prospects.map(id => state.people[id])[0];
  intl.origin = 'jp';
  fire(state, 'superGroup');
  t.eq(state.rivals.length, before + 1, 'a new house arrives');
  const rival = state.rivals[state.rivals.length - 1];
  const act = rival.acts[0];
  t.ok(act && act.members.length === KP.C.SAGA.SUPER.size, 'with an elite act, fully cast');
  const members = act.members.map(id => state.people[id]);
  t.ok(members.every(m => m.origin && m.nativeLang), 'an international lineup, regions on file');
  t.ok(act.releases.length === 1 && act.popularity > 0, 'the debut single is already out');
  t.ok((state.chart.entries || []).some(e => e.company === rival.short), 'and on the chart');
  t.ok((state.weekReleases || []).some(w => w.company === rival.short),
    'counted in the week the generation math reads');
  t.eq(rival.interest[intl.id], KP.C.SAGA.SUPER.courtInterest,
    'their scouts open on OUR international board on the way in');
  t.eq(state.sagaLedger.superGroup, 1, 'ledgered');
  // then: physics. The act lives under the same weekly machinery.
  for (let w = 0; w < 30; w++) KP.advanceWeek(state);
  t.ok(rival.acts[0].releases.length >= 1, 'and the sim takes the wheel');
}

// ---- the global joint venture: your desk first ------------------------
{
  const state = world('sg-jv');
  fire(state, 'globalJV');
  const sc = (state.scenes || []).find(x => x.kind === 'globalJV');
  t.ok(sc, 'the term sheet lands on the Desk');
  const board0 = state.prospects.length;
  KP.resolveScene(state, sc.id, 'sign');
  t.ok(state.jv && state.jv.partner === sc.company, 'signed: the pact is real');
  t.ok(state.prospects.length > board0, 'the first worldwide class lands with it');
  t.eq(state.sagaLedger.jvSigned, 1, 'ledgered');
  // their money: the audition circuit bills nothing while the pact runs
  const b0 = state.budget;
  const r = KP.fundAudition(state, 'jp');
  t.ok(r.ok && state.budget === b0, 'worldwide auditions on their money');
  // the annual class, on schedule
  const led0 = state.sagaLedger.jvClasses;
  for (let w = 0; w < KP.C.SAGA.JV.classEvery + 2; w++) KP.advanceWeek(state);
  t.ok(state.sagaLedger.jvClasses > led0, 'an audition class a year, per the pact');
}

// ---- decline, and it signs across the street --------------------------
{
  const state = world('sg-jv2');
  fire(state, 'globalJV');
  const sc = (state.scenes || []).find(x => x.kind === 'globalJV');
  const top = state.rivals.slice().sort((a, b) => b.prestige - a.prestige)[0];
  const p0 = top.prestige;
  const acts0 = top.acts.length;
  KP.resolveScene(state, sc.id, 'decline');
  t.ok(!state.jv, 'declined: no pact');
  t.ok(top.prestige > p0, 'the partner across the street cashes the prestige');
  t.eq(state.sagaLedger.jvDeclined, 1, 'ledgered');
  for (let w = 0; w < KP.C.SAGA.JV.declineActWeeks + 2; w++) KP.advanceWeek(state);
  t.ok(top.acts.length > acts0, 'and the co-built act debuts there');
  const jvAct = top.acts[top.acts.length - 1];
  t.ok(jvAct.members.map(id => state.people[id]).every(m => m.origin),
    'built from the worldwide sweep');
}

// ---- the reverse invasion ---------------------------------------------
{
  const state = world('sg-inv');
  fire(state, 'reverseInvasion');
  const rival = state.rivals[state.rivals.length - 1];
  const act = rival.acts[0];
  const members = act.members.map(id => state.people[id]);
  t.ok(members.every(m => m.origin === 'na' && m.nativeLang === 'English'),
    'diaspora talent: home region abroad, first language English');
  t.ok(members.every(m => KP.koOf(m) >= KP.C.SAGA.INVASION.koRange[0]),
    'heritage speakers — the tongue runs backwards from mid-sentence');
  t.ok(members.every(m => /^[A-Z]/.test(m.name.family)), 'Korean names kept');
  t.eq(state.sagaLedger.reverseInvasion, 1, 'ledgered');
}

// ---- the heir's money: distortion while the tap is open ---------------
{
  const state = world('sg-heir');
  // a free agent to price, before and during
  const fa = state.prospects.map(id => state.people[id])[0];
  const cost0 = KP.freeAgentCost(state, fa);
  fire(state, 'heirMoney');
  const rival = state.rivals[state.rivals.length - 1];
  t.ok(rival.bankroll && rival.bankroll.until > state.week, 'the tap is open');
  t.ok(KP.freeAgentCost(state, fa) > cost0, 'every price on the market reprices');
  // the ending belongs to the gambles: force the miss and close the tap
  rival.prestige = 30;
  rival.bankroll.until = state.week + 1;
  KP.advanceWeek(state);
  KP.advanceWeek(state);
  t.ok(!rival.bankroll, 'the runway ends');
  t.eq(state.sagaLedger.heirBurst, 1, 'the tap closes on a miss');
  t.eq(KP.freeAgentCost(state, fa), cost0, 'and the market drifts back');
  t.ok(rival.rosterCount <= KP.C.SAGA.HEIR.burstRoster, 'the room empties');
}

// ---- the second capital -----------------------------------------------
{
  const state = world('sg-cap');
  fire(state, 'secondCapital');
  const cap = state.secondCapital;
  t.ok(cap && cap.region && cap.until > state.week, 'the fund opens, for years');
  const A = KP.C.TONGUE.AUDITION;
  const b0 = state.budget;
  const r = KP.fundAudition(state, cap.region);
  t.ok(r.ok, 'the subsidized circuit runs');
  t.eq(b0 - state.budget, Math.round(A.cost * KP.C.SAGA.CAPITAL.auditionDiscount),
    'at half the bill');
  t.ok(r.minted >= A.minted[0] + KP.C.SAGA.CAPITAL.extraMinted, 'and mints deeper classes');
  t.eq(state.sagaLedger.secondCapital, 1, 'ledgered');
}

// ---- content law: generated fiction only ------------------------------
{
  const src = require('fs').readFileSync(__dirname + '/../js/engine/sagas.js', 'utf8') +
    JSON.stringify(KP.C.SAGA);
  t.ok(!/\bXG\b|Katseye|HYBE|\bSM Ent|JYP|YG Ent|Dispatch/i.test(src),
    'nothing borrows a real name');
}

// ---- determinism through an entrance ----------------------------------
{
  const state = world('sg-fork');
  state.sagas.plan[0].week = state.week + 3;   // pull the saga into reach
  const b = KP.deserialize(KP.serialize(state));
  for (let w = 0; w < 20; w++) { KP.advanceWeek(state); KP.advanceWeek(b); }
  t.eq(KP.serialize(state), KP.serialize(b), 'invasions fork clean');
}

t.finish();
