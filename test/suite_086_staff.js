/* Suite 086 — the staff (v0.10.6, §79). The second fog: six seats
   with hash-stable hidden truth that quietly multiply their systems.
   The player reads personality (true, not skill), the résumé (true,
   selection-biased), and reputation (the price, imperfectly
   correlated). The fog NEVER lifts — no number, no reveal, ever. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_086_staff');

function world(seed, door) {
  const s = KP.newGame(seed, null, door ? { legacy: false, door } : { legacy: true });
  s.budget = 900;
  KP.advanceWeek(s);
  return s;
}
function pinInterview(s) {
  const CC = KP.C.HIRES.candidateChance;
  KP.C.HIRES.candidateChance = 1;
  let sc = null, guard = 0;
  while (!sc && guard++ < 8) { KP.advanceWeek(s); sc = (s.scenes || []).find(x => x.kind === 'theInterview'); }
  KP.C.HIRES.candidateChance = CC;
  return sc;
}

// ---- the founding hires: the incumbent trio become somebody ------------
{
  const s = world('sf-seats');
  const S = s.seats;
  t.ok(S.vocal && S.dance && S.perf && S.scout, 'the incumbents hold their chairs');
  t.ok(!S.anr && !S.marketing, 'A&R and marketing start empty — the first hires the fog invites');
  t.eq(KP.seatMult(s, 'anr'), 1, 'an empty chair is the baseline, exactly');
  const m = KP.seatMult(s, 'vocal');
  t.ok(m >= 0.85 && m <= 1.18, 'a filled chair moves the room inside the hidden range (' + m.toFixed(3) + ')');
}

// ---- the fog law: the truth never serializes, never prints -------------
{
  const s = world('sf-fog');
  t.ok(!JSON.stringify(s.seats).includes('apt'), 'no aptitude in the save — the truth is computed, never stored');
  const st = s.seats.vocal;
  const before = KP.staffTruth(s, st).apt;
  const back = KP.deserialize(KP.serialize(s));
  t.eq(KP.staffTruth(back, back.seats.vocal).apt, before, 'and it survives the round trip unchanged — hash-stable');
  // the interview body carries surfaces only
  const sc = pinInterview(s);
  t.ok(sc, 'fixture: a candidate takes the meeting');
  const body = KP.sceneDef('theInterview').body(s, sc);
  t.ok(/résumé says where they were/.test(body), 'the résumé disclaimer is printed with the résumé');
  t.ok(!/aptitude|multiplier/.test(body), 'no skill signal in the room');
}

// ---- the hire and the pass ---------------------------------------------
{
  const s = world('sf-hire');
  const sc = pinInterview(s);
  const b0 = s.budget;
  KP.resolveScene(s, sc.id, 'hire');
  t.eq(b0 - s.budget, KP.C.HIRES.hireCost[sc.cand.tier], 'the fee is the reputation, priced');
  t.eq(s.seats[sc.cand.seatId].name, sc.cand.name, 'the chair is theirs');
  t.eq(s.staffLedger2.hires, 1, 'ledgered');
}
{
  const s = world('sf-pass');
  const sc = pinInterview(s);
  const seatBefore = s.seats[sc.cand.seatId] ? s.seats[sc.cand.seatId].name : null;
  KP.resolveScene(s, sc.id, 'pass');
  const seatAfter = s.seats[sc.cand.seatId] ? s.seats[sc.cand.seatId].name : null;
  t.eq(seatAfter, seatBefore, 'passing leaves the chair as it was');
  t.eq(s.staffLedger2.passes, 1, 'ledgered');
}

// ---- who takes the meeting: fame gates the tiers -----------------------
{
  const s = world('sf-gate', 'fresh');
  const seen = new Set();
  for (let i = 0; i < 6; i++) {
    const sc = pinInterview(s);
    if (!sc) break;
    seen.add(sc.cand.tier);
    KP.resolveScene(s, sc.id, 'pass');
  }
  t.ok(!seen.has('known') && !seen.has('a name'),
    'names do not take meetings at a label nobody has heard of (' + [...seen].join(', ') + ')');
}

// ---- mesh: the style against YOUR setup, same person -------------------
{
  const s = world('sf-mesh');
  const mk = (style) => {
    const fork = KP.deserialize(KP.serialize(s));
    fork.seats.anr = { id: 'sfMESH', name: 'Test Person', seatId: 'anr', tier: 'working',
      style, warmth: 50, candor: 50, since: 1, resume: [] };
    return KP.seatMult(fork, 'anr');
  };
  // one debuted group = not a big machine; same hidden truth, two styles
  const grind = mk('bigMachine');
  const fit = mk('scrappy');
  t.ok(fit > grind, 'the scrappy one punches above the machine-builder in a one-room label (' +
    fit.toFixed(3) + ' > ' + grind.toFixed(3) + ')');
}

// ---- the teeth: the seat moves the system, silently --------------------
{
  // the coach's room is the TRAINING room — a fresh label's trainees
  const s = world('sf-teeth', 'fresh');
  // find an id whose hash-truth is strong for the vocal chair, and one
  // weak (working tier truth spans ~0.20–0.80 after the off-seat damp)
  let strongId = null, weakId = null;
  for (let i = 0; i < 800 && (!strongId || !weakId); i++) {
    const probe = { id: 'sfP' + i, seatId: 'vocal', tier: 'working', style: 'nurturer' };
    const apt = KP.staffTruth(s, probe).apt;
    if (apt > 0.72 && !strongId) strongId = 'sfP' + i;
    if (apt < 0.24 && !weakId) weakId = 'sfP' + i;
  }
  t.ok(strongId && weakId, 'fixture: the hash space holds a genius and a dud');
  const run = (id) => {
    const fork = KP.deserialize(KP.serialize(s));
    fork.seats.vocal = { id, name: 'X', seatId: 'vocal', tier: 'working',
      style: 'nurturer', warmth: 50, candor: 50, since: 1, resume: [] };
    const pid = fork.roster.find(x => fork.people[x] && fork.people[x].status === 'trainee');
    const p = fork.people[pid];
    p.training = { focus: ['vocals'], intensity: 'standard' };
    p.fatigue = 0;
    p.talents.vocals.cur = 30;   // room to grow — the ceiling stays far
    const v0 = p.talents.vocals.cur;
    for (let w = 0; w < 12; w++) KP.advanceWeek(fork);
    return fork.people[p.id].talents.vocals.cur - v0;
  };
  const gStrong = run(strongId), gWeak = run(weakId);
  t.ok(gStrong > gWeak, 'the genius coach grows the room faster — and no screen ever says so (' +
    gStrong.toFixed(1) + ' vs ' + gWeak.toFixed(1) + ')');
}

// ---- results build names; names get calls ------------------------------
{
  const s = world('sf-rep');
  const g = s.groups[0];
  g.results = g.results || {};
  g.results.week = s.week; g.results.reception = 80;
  const RC = KP.C.HIRES.repRiseChance;
  KP.C.HIRES.repRiseChance = 1;
  KP.advanceWeek(s);
  KP.C.HIRES.repRiseChance = RC;
  t.ok(s.staffLedger2.repRises >= 1, 'a hit era polishes the seats’ names');
  t.ok(KP.C.HIRES.REP_TIERS.indexOf(s.seats.vocal.tier) >= 2 ||
       Object.keys(s.seats).some(k => s.seats[k] && KP.C.HIRES.REP_TIERS.indexOf(s.seats[k].tier) >= 2),
    'somebody in the building is “known” now');
  const PC = KP.C.HIRES.poachChance;
  KP.C.HIRES.poachChance = 1;
  let sp = null, guard = 0;
  while (!sp && guard++ < 8) { KP.advanceWeek(s); sp = (s.scenes || []).find(x => x.kind === 'seatPoach'); }
  KP.C.HIRES.poachChance = PC;
  t.ok(sp, 'and the phone rings — the industry reads credits');
  const name = s.seats[sp.seatId].name;
  KP.resolveScene(s, sp.id, 'raise');
  t.eq(s.seats[sp.seatId].name, name, 'the raise keeps the chair');
  t.eq(s.staffLedger2.raises, 1, 'ledgered');
}
{
  // the other door: the chair empties
  const s = world('sf-walk');
  s.seats.perf.tier = 'known';
  const PC = KP.C.HIRES.poachChance;
  KP.C.HIRES.poachChance = 1;
  let sp = null, guard = 0;
  while (!sp && guard++ < 8) { KP.advanceWeek(s); sp = (s.scenes || []).find(x => x.kind === 'seatPoach'); }
  KP.C.HIRES.poachChance = PC;
  t.ok(sp, 'fixture: the call comes');
  KP.resolveScene(s, sp.id, 'walk');
  t.ok(!s.seats[sp.seatId], 'wishing them well opens the chair');
  t.eq(KP.seatMult(s, sp.seatId), 1, 'and the room returns to baseline — was that a loss? the fog holds');
}

// ---- the help wanted (v0.10.11): act on the market ---------------------
{
  const s = world('sf-post');
  s.scenes = (s.scenes || []).filter(sc => sc.kind !== 'theInterview');
  t.ok(!KP.openSearch(s, 'nosuch').ok, 'no posting for a chair the building does not have');
  const b0 = s.budget;
  const r = KP.openSearch(s, 'anr');
  t.ok(r.ok, 'the posting goes up');
  t.eq(b0 - s.budget, KP.C.HIRES.searchCost, 'recruiters bill up front');
  t.ok(s.books.cur.signings <= -KP.C.HIRES.searchCost, 'and the fee is a signings line, not a residual');
  t.ok(!KP.openSearch(s, 'vocal').ok, 'one search at a time');
  t.eq(s.staffLedger2.searches, 1, 'ledgered');
  // the guarantee: no rng pin needed — the posting IS the meeting
  KP.advanceWeek(s);
  const sc = (s.scenes || []).find(x => x.kind === 'theInterview');
  t.ok(sc && sc.cand.seatId === 'anr', 'somebody answers the posting within the week, for THAT chair');
  t.ok(!s.staffSearch, 'the posting is consumed by the meeting');
  t.ok((s.inbox || []).some(n => n.ind === 'interviewSet' && /answering the posting/.test(n.text)),
    'the letter says they came for the ad');
  KP.resolveScene(s, sc.id, 'pass');
  t.ok(!KP.openSearch(s, 'anr').ok, 'the same chair cannot be re-posted while the first ad is warm');
  t.ok(KP.openSearch(s, 'marketing').ok, 'a different chair can');
}

// ---- the firing (v0.10.11): severance, trust, the fog ------------------
{
  const s = world('sf-fire');
  t.ok(!KP.releaseSeat(s, 'anr').ok, 'an open chair has nobody to let go');
  s.seats.dance = { id: 'sfFIRE1', name: 'Byun Yeo-reum', tier: 'known', seatId: 'dance',
    style: 'drill', warmth: 50, candor: 50, since: 1, resume: [] };
  // a poach call pending on the same chair must not outlive the firing
  s.scenes = s.scenes || [];
  KP.openScene(s, { kind: 'seatPoach', seatId: 'dance', rivalName: 'Aozora Records', expiresWeek: s.week + 3 });
  const t0 = s.trust, b0 = s.budget;
  const rr = KP.releaseSeat(s, 'dance');
  t.ok(rr.ok, 'the goodbye is clean');
  t.eq(rr.severance, Math.round(KP.C.HIRES.hireCost.known * KP.C.HIRES.severanceMult),
    'severance is half the reputation price');
  t.eq(b0 - s.budget, rr.severance, 'and it leaves the account');
  t.ok(!s.seats.dance, 'the chair opens');
  t.eq(KP.seatMult(s, 'dance'), 1, 'the room returns to baseline');
  t.eq(s.trust, t0 - 1, 'letting a KNOWN name go raises boardroom eyebrows');
  t.ok(!s.scenes.some(x => x.kind === 'seatPoach' && x.seatId === 'dance'),
    'the rival’s offer dies with the chair');
  t.eq(s.staffLedger2.fired, 1, 'ledgered');
  // below the trades' radar, no trust cost
  s.seats.marketing = { id: 'sfFIRE2', name: 'Gil Sang-cheol', tier: 'unknown', seatId: 'marketing',
    style: 'drill', warmth: 50, candor: 50, since: 1, resume: [] };
  const t1 = s.trust;
  const rr2 = KP.releaseSeat(s, 'marketing');
  t.ok(rr2.ok && rr2.severance === KP.C.HIRES.severanceMin, 'an unknown gets the floor severance');
  t.eq(s.trust, t1, 'and nobody outside the building notices');
}

// ---- determinism -------------------------------------------------------
{
  const a = KP.newGame('sf-fork', null, { legacy: true });
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 30; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the staff forks clean');
}

t.finish();
