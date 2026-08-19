/* Suite 002 — the perceived layer and the scouting economy.
   Reads are deterministic (no slot pulls), observation narrows fog but
   never to zero, signing respects budget and the executive's allowance. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_002_scouting');

const state = KP.newGame('scout-suite', null, { legacy: false });
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

// ---- the dated report (0.9.16.3): everything shows, wearing a "?" ----
{
  const st = KP.newGame('scout-dated', null, { legacy: false });
  // 0.9.17.1 (owner report): every walk-in starts as a desk report —
  // nobody arrives pre-looked; the "?" is the default state of the board
  t.ok(st.prospects.every(id => !(st.people[id].observations > 0)),
    'no lead on the opening board arrives with a free look');
  for (let w = 0; w < 8; w++) KP.advanceWeek(st);
  const walkedIn = st.prospects.map(id => st.people[id])
    .filter(p => !p.schoolId || !(p.observations > 0));
  t.ok(walkedIn.every(p => (p.observations > 0) === !!(p.reads)),
    'a lead with looks has a DATED read; a lead without has neither');
  const q = st.people[st.prospects.find(id => !(st.people[id].observations > 0))];
  const e0 = KP.evaluate(st, q);
  t.eq(e0.domains.length, 5, 'everything shows from the first report');
  t.ok(e0.domains.every(d => d.band && d.uncertain), 'every band wears the question mark');
  t.ok(typeof e0.recommendation === 'string', 'the desk still ventures a recommendation');
  // one expensive look: the question marks come off
  st.budget = 100;
  const b0 = st.budget;
  const r = KP.observeProspect(st, q.id);
  t.ok(r.ok && st.budget === b0 - KP.C.SCOUT.observeCost, 'a real trip costs real money (' + KP.C.SCOUT.observeCost + ')');
  const e1 = KP.evaluate(st, q);
  t.ok(e1.domains.every(d => !d.uncertain), 'one trip, relatively accurate — the "?" comes off');
  t.ok(e1.domains.every(d => d.confident), 'and the reads are confident, not just brave');
  t.ok(q.reads && q.reads.week === st.week, 'the report is DATED at the visit');
  t.ok(!KP.observeProspect(st, q.id).ok, 'a second look the same week buys nothing new');
  // the stale report: the board keeps training, the file does not know
  const readBefore = KP.reportRead(st, q, 'vocals');
  q.talents.vocals.cur = Math.min(q.talents.vocals.ceilLo - 1, q.talents.vocals.cur + 12);
  t.eq(KP.reportRead(st, q, 'vocals'), readBefore, 'the file shows what was WRITTEN, not what is now true');
  st.week += 6;
  const r2 = KP.observeProspect(st, q.id);
  t.ok(r2.ok, 'a repeat trip is always a choice');
  t.ok(KP.reportRead(st, q, 'vocals') > readBefore, 'and the fresh read shows the improvement');
  // the board actually trains: run weeks, trained skills drift up
  const st2 = KP.newGame('scout-drift', null, { legacy: false });
  const before = st2.prospects.map(id => {
    const p2 = st2.people[id];
    return p2.talents.vocals.cur + p2.talents.dance.cur + p2.talents.rap.cur;
  });
  const ids0 = st2.prospects.slice();
  for (let w = 0; w < 16; w++) KP.advanceWeek(st2);
  const grew = ids0.filter((id, i) => {
    const p2 = st2.people[id];
    return p2 && p2.status === 'prospect' &&
      p2.talents.vocals.cur + p2.talents.dance.cur + p2.talents.rap.cur > before[i];
  });
  // the network (v0.9.35): the opening board is a handful now, and a
  // small board gets picked clean by rivals — the claim is that the
  // SURVIVORS kept training, not a quota sized for the old crowd
  const survivors = ids0.filter(id => st2.people[id] && st2.people[id].status === 'prospect');
  t.ok(grew.length >= Math.max(1, survivors.length - 1),
    'the academies kept training while the desk read old reports (' + grew.length + '/' + survivors.length + ' survivors grew)');
  // people in the building are never behind a dated report
  const tr = st.people[st.roster[0]];
  const eTr = KP.evaluate(st, tr);
  t.ok(eTr.domains.every(d => !d.uncertain), 'a trainee file has no question marks');
}

// budget + allowance rails on signing
const st2 = KP.newGame('scout-suite-2', null, { legacy: false });
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
const st3 = KP.newGame('scout-suite-3', null, { legacy: false });
const cold = st3.prospects.map(id => st3.people[id]).find(pp => KP.rivalHeat(st3, pp.id).max === 0);
const hot = st3.prospects.map(id => st3.people[id]).find(pp => KP.rivalHeat(st3, pp.id).max >= 2);
if (cold && hot) t.ok(KP.signCost(st3, hot) > KP.signCost(st3, cold), 'contested prospects cost more');

// rivals eventually take people (soak a board with hot interest)
let taken = 0;
for (let s = 0; s < 12; s++) {
  const st = KP.newGame('rival-take-' + s, null, { legacy: false });
  st.rivals.forEach(r => { st.prospects.slice(0, 6).forEach(id => { r.interest[id] = 3; }); });
  for (let w = 0; w < 20; w++) KP.advanceWeek(st);
  taken += Object.values(st.people).filter(pp => pp.status === 'rival').length;
}
t.ok(taken > 0, 'rivals sign prospects out from under a slow player');

t.finish();
