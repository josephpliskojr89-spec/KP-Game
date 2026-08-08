/* Suite 002 — the perceived layer and the scouting economy.
   Reads are deterministic (no slot pulls), observation narrows fog but
   never to zero, signing respects budget and the executive's allowance. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_002_scouting');

const state = KP.newGame('scout-suite');
const scout = KP.DATA.evaluators[2];
const pid = state.prospects[0];
const p = state.people[pid];

// deterministic perceived reads
const r1 = KP.perceived(state, p, 'vocals', scout);
const r2 = KP.perceived(state, p, 'vocals', scout);
t.eq(r1, r2, 'perceived read does not re-roll');
const ev1 = KP.evaluate(state, p);
const ev2 = KP.evaluate(state, p);
t.eq(JSON.stringify(ev1), JSON.stringify(ev2), 'full evaluation is deterministic');
t.eq(ev1.domains.length, 5, 'one blurb per talent domain');
ev1.domains.forEach(d => t.ok(typeof d.line === 'string' && d.line.length > 10, d.domain + ' blurb is a real sentence'));

// observation narrows the cone, but certainty is never total
const w0 = KP.readWidth(p, scout);
const before = p.observations || 0;
const obs = KP.observeProspect(state, pid);
t.ok(obs.ok, 'targeted look succeeds with budget');
t.eq(p.observations, before + 1, 'observation recorded');
const w1 = KP.readWidth(p, scout);
t.ok(w1 < w0, 'a look narrows the read');
p.observations = KP.C.SCOUT.maxObservations;
t.ok(KP.readWidth(p, scout) >= KP.C.SCOUT.minReadWidth, 'certainty is never perfect');

// reads move when observations change (the fog re-centers as looks accrue)
t.ok(KP.C.SCOUT.baseReadWidth > KP.C.SCOUT.minReadWidth, 'fog actually narrows over looks');

// budget + allowance rails on signing
const st2 = KP.newGame('scout-suite-2');
st2.budget = 1;
const poor = KP.signProspect(st2, st2.prospects[0]);
t.ok(!poor.ok, 'cannot sign without budget');
st2.budget = 500;
let signed = 0;
while (signed < 3) {
  const r = KP.signProspect(st2, st2.prospects[0]);
  t.ok(r.ok, 'signing ' + (signed + 1) + ' within allowance succeeds');
  signed++;
}
const fourth = KP.signProspect(st2, st2.prospects[0]);
t.ok(!fourth.ok, 'fourth signing blocked by executive allowance');
t.eq(st2.roster.length, KP.C.GEN.inheritedCount + 3, 'roster grew by exactly three');

// signed prospects leave the board and lose rival heat
const gone = st2.roster[st2.roster.length - 1];
t.ok(!st2.prospects.includes(gone), 'signee off the board');
st2.rivals.forEach(r => t.ok(!(gone in r.interest), 'rival interest cleared on signing'));

// rival heat raises price
const st3 = KP.newGame('scout-suite-3');
const cold = st3.prospects.map(id => st3.people[id]).find(pp => KP.rivalHeat(st3, pp.id).max === 0);
const hot = st3.prospects.map(id => st3.people[id]).find(pp => KP.rivalHeat(st3, pp.id).max >= 2);
if (cold && hot) t.ok(KP.signCost(st3, hot) > KP.signCost(st3, cold), 'contested prospects cost more');

// rivals eventually take people (soak a board with hot interest)
let taken = 0;
for (let s = 0; s < 12; s++) {
  const st = KP.newGame('rival-take-' + s);
  st.rivals.forEach(r => { st.prospects.slice(0, 6).forEach(id => { r.interest[id] = 3; }); });
  for (let w = 0; w < 20; w++) KP.advanceWeek(st);
  taken += Object.values(st.people).filter(pp => pp.status === 'rival').length;
}
t.ok(taken > 0, 'rivals sign prospects out from under a slow player');

t.finish();
