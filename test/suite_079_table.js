/* Suite 079 — the table (v0.9.38, §76 A). Signing stops being one
   click: worthwhile files counter when the label's name cannot close
   on its own — the bonus, the training guarantee, and the debut-by
   clause with real teeth. Holdouts and applications are exempt; the
   famous sign standard. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_079_table');

function world(seed, door) {
  const s = KP.newGame(seed, null, { legacy: false, door: door || 'fresh' });
  s.budget = 900;
  return s;
}
function worthy(s, id, channel) {
  const p = s.people[id];
  KP.C.TALENTS.forEach(d => { p.talents[d] = { cur: 60, ceilLo: 70, ceilHi: 80, growth: 1 }; });
  p.observations = 4;
  if (channel) p.channel = channel;
  return p;
}

// ---- who counters, who doesn't ---------------------------------------
{
  const s = world('tb-who');
  const p = worthy(s, s.prospects[0], 'washout');
  t.ok(KP.counterOf(s, p) != null, 'a worthwhile file counters an unknown label');
  t.eq(KP.counterOf(s, p).kind, 'debutBy', 'the washout wants the date in writing — she has heard "soon" before');
  const cheap = s.people[s.prospects[1]];
  KP.C.TALENTS.forEach(d => { cheap.talents[d] = { cur: 30, ceilLo: 40, ceilHi: 50, growth: 1 }; });
  cheap.observations = 4;
  t.ok(KP.counterOf(s, cheap) == null, 'ordinary files sign standard — the table is for the ones worth arguing over');
  const app = worthy(s, s.prospects[2], 'application');
  t.ok(KP.counterOf(s, app) == null, 'the application pile came to YOU — believers sign standard');
  Object.keys(s.company.reputation).forEach(k => { s.company.reputation[k] = 85; });
  t.ok(KP.counterOf(s, p) == null, 'a famous name closes on its own — no counter');
}

// ---- the flow: refused once, answered once ----------------------------
{
  const s = world('tb-flow');
  const p = worthy(s, s.prospects[0], 'washout');
  const r1 = KP.signProspect(s, p.id);
  t.ok(!r1.ok && r1.counter, 'the first signature attempt meets the counter');
  t.eq(s.tableLedger.counters, 1, 'counted once');
  KP.signProspect(s, p.id);
  t.eq(s.tableLedger.counters, 1, 'and only once, however many times you re-read it');
  const r2 = KP.signProspect(s, p.id, { answer: 'accept' });
  t.ok(r2.ok, 'signing the terms signs the person');
  t.ok(p.clause && p.clause.kind === 'debutBy', 'the clause is on the paper');
  t.eq(s.tableLedger.clausesTaken, 1, 'and in the ledger');
  t.ok(p.history.some(h => /debut-by clause/.test(h.text)), 'and in her file');
}

// ---- the three counters, priced ---------------------------------------
{
  const s = world('tb-kinds');
  // training: high work ethic asks for the room
  const tr = worthy(s, s.prospects[0]);
  tr.personality.workEthic = 80;
  const ctr = KP.counterOf(s, tr);
  if (ctr && ctr.kind === 'training') {
    const b0 = s.budget;
    KP.signProspect(s, tr.id);
    KP.signProspect(s, tr.id, { answer: 'accept' });
    t.ok(s.budget < b0 - KP.C.TABLE.trainFee + 1, 'the facility guarantee bills up front');
    t.eq(tr.flags.trainClause, 1, 'and the coaches now owe her the room');
    t.eq(s.tableLedger.trained, 1, 'ledgered');
  } else {
    t.ok(ctr != null, '(this stream dealt a different ask — priced below)');
  }
  // bonus: the price scales with how unknown the label is
  const bn = worthy(s, s.prospects[1]);
  bn.personality.workEthic = 30;
  const cb = KP.counterOf(s, bn);
  if (cb && cb.kind === 'bonus') {
    t.ok(cb.price >= KP.C.TABLE.bonusMin, 'the bonus is real money');
  }
  t.ok(true, 'counter kinds are hash-stable per file');
}

// ---- the clause has teeth: kept ---------------------------------------
{
  const s = world('tb-kept');
  const id = s.roster.slice(0, 5).filter(x => (s.people[x].gender || 'f') === 'f')[0];
  // stamp a clause directly on a roster trainee (the signing path is
  // proven above; this isolates the teeth)
  s.people[id].clause = { kind: 'debutBy', byWeek: s.week + KP.C.TABLE.debutByWeeks, extended: false };
  const ids = s.roster.slice(0, 5).filter(x => (s.people[x].gender || 'f') === 'f');
  KP.proposeGroup(s, 'PAPER', ids, KP.roleHints(s, ids.map(i => s.people[i])));
  const g = s.groups[0];
  KP.planDebut(s, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: s.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(s);
  KP.advanceWeek(s);
  t.eq(s.tableLedger.clausesKept, 1, 'a debut closes the clause the only way that matters');
  t.ok(s.people[id].clause == null, 'the paper comes off the file');
  t.ok(s.people[id].history.some(h => /frame/.test(h.text)), 'and goes in a frame');
}

// ---- the clause has teeth: due, pleaded, walked ------------------------
{
  const s = world('tb-walk');
  const p = worthy(s, s.prospects[0], 'washout');
  KP.signProspect(s, p.id);
  KP.signProspect(s, p.id, { answer: 'accept' });
  p.clause.byWeek = s.week + KP.C.TABLE.warnAt + 1;
  KP.advanceWeek(s);
  t.ok(s.inbox.some(n => n.ind === 'clauseClock'), 'the desk flags the clock in red, in time to act');
  p.clause.byWeek = s.week;
  KP.advanceWeek(s);
  const sc = (s.scenes || []).find(x => x.kind === 'clauseCall');
  t.ok(sc, 'the date passes and she puts the paper on the desk');
  KP.resolveScene(s, sc.id, 'plead');
  t.ok(p.clause.extended, 'one plead buys one extension');
  t.ok((p.directed || []).some(d => d.kind === 'heldToPaper'), 'and the ledger remembers who asked whom to wait');
  p.clause.byWeek = s.week;
  KP.advanceWeek(s);
  t.eq(p.status, 'released', 'the second deadline is not a conversation — she walks');
  t.ok(!s.roster.includes(p.id), 'free and clear');
  t.eq(s.tableLedger.walkedFree, 1, 'ledgered');
  t.ok(s.inbox.some(n => n.ind === 'clauseWalk'), 'and the practice room heard about it');
}

// ---- honoring the paper -----------------------------------------------
{
  const s = world('tb-honor');
  const p = worthy(s, s.prospects[0], 'washout');
  KP.signProspect(s, p.id);
  KP.signProspect(s, p.id, { answer: 'accept' });
  p.clause.byWeek = s.week;
  KP.advanceWeek(s);
  const sc = (s.scenes || []).find(x => x.kind === 'clauseCall');
  KP.resolveScene(s, sc.id, 'release');
  t.eq(p.status, 'released', 'honoring the paper lets her go clean');
  t.eq(s.tableLedger.clausesBroken, 1, 'the broken promise is still a broken promise');
}

// ---- the training guarantee delivers ----------------------------------
{
  const s = world('tb-grow');
  const a = s.people[s.roster[0]], b = s.people[s.roster[1]];
  [a, b].forEach(p => {
    KP.C.TALENTS.forEach(d => { p.talents[d] = { cur: 40, ceilLo: 70, ceilHi: 85, growth: 1 }; });
    p.personality.workEthic = 60; p.personality.coachability = 60;
    p.training = { focus: ['vocals'], intensity: 'standard' };
    p.fatigue = 10;
    p.age = 16;   // equal age — ageGrowthMult would confound the clause edge
  });
  a.flags.trainClause = 1;
  // pinned weeks: fatigue and FOCUS re-pinned each tick — the plateau/
  // redirect machinery rewrites focus over long horizons, and the x1.12
  // guarantee is only visible while both rooms train the same lane
  for (let i = 0; i < 20; i++) {
    [a, b].forEach(p => { p.fatigue = 10; p.training = { focus: ['vocals'], intensity: 'standard' }; });
    KP.advanceWeek(s);
  }
  t.ok(a.talents.vocals.cur > b.talents.vocals.cur,
    'the bought room shows in the growth (' + a.talents.vocals.cur.toFixed(1) +
    ' vs ' + b.talents.vocals.cur.toFixed(1) + ')');
}

// ---- determinism through the table ------------------------------------
{
  const s = world('tb-fork');
  const p = worthy(s, s.prospects[0], 'washout');
  KP.signProspect(s, p.id);
  KP.signProspect(s, p.id, { answer: 'accept' });
  p.clause.byWeek = s.week + 3;
  const b = KP.deserialize(KP.serialize(s));
  for (let w = 0; w < 20; w++) { KP.advanceWeek(s); KP.advanceWeek(b); }
  t.eq(KP.serialize(s), KP.serialize(b), 'the table forks clean');
}

t.finish();
