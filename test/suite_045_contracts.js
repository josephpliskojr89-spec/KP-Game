/* Suite 045 — contracts & the clock (v0.9.0). The longest suite of
   the §39 plan, because departures touch every invariant: the seven-
   year shape, renewal tables that read the whole ledger, four
   dispositions with different doors, departures (warm and cold) that
   leave rooms partitioned and roles filled, careers that continue as
   four, graduation into solo management, and files that stay open
   forever. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_045_contracts');

function debuted(seed, n) {
  const state = KP.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, n || 5);
  KP.proposeGroup(state, 'TERM', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  state.nextMeetingWeek = 900;
  state.doorQuietUntil = 900;
  (state.scenes || []).length = 0;
  return { state, g };
}
function rideToTable(state, maxWeeks) {
  let sc = null, guard = 0;
  while (!sc && guard++ < (maxWeeks || 12)) {
    KP.advanceWeek(state);
    sc = (state.scenes || []).find(x => x.kind === 'renewal');
  }
  return sc;
}
function windowFor(state, p) {
  p.contract.start = state.week - KP.C.CONTRACT.renewalAtYears * KP.C.WEEKS_PER_YEAR;
}
// ledger sculptors — the read is the mechanism under test
function makeDevoted(state, p) {
  p.flags.ambitionMet = 1;
  p.morale = 70;
  p.directed = [{ week: state.week, kind: 'promiseKept', w: 3 },
    { week: state.week, kind: 'sweetened', w: 3 }];
}
function makeNeglected(state, p) {
  delete p.flags.ambitionMet;
  p.morale = 30;
  p.directed = [{ week: state.week, kind: 'promiseBroken', w: -4 },
    { week: state.week, kind: 'leftWaiting', w: -2 },
    { week: state.week, kind: 'leftWaiting', w: -2 },
    { week: state.week, kind: 'deflected', w: -2 }];
}
// lighter neglect — cold but not past saving: lands in (−5, 0)
function makeStrained(state, p) {
  delete p.flags.ambitionMet;
  p.morale = 45;
  p.directed = [{ week: state.week, kind: 'leftWaiting', w: -1 }];
}

// ---- the clock: stamped at debut, readable in years ----
{
  const { state, g } = debuted('ct-clock');
  const p = state.people[g.members[0]];
  t.ok(p.contract && p.contract.years === 7, 'seven years, from debut');
  t.eq(p.contract.start, g.debutWeek, 'the clock starts on the debut stage');
  t.eq(KP.contractYear(state, p), 1, 'year one');
  state.week = p.contract.start + 3 * 48 + 1;
  t.eq(KP.contractYear(state, p), 4, 'year four, four years later');
}

// ---- the read: the ledger decides the table ----
{
  const { state, g } = debuted('ct-read');
  const a = state.people[g.members[0]], b = state.people[g.members[1]];
  makeDevoted(state, a);
  makeNeglected(state, b);
  t.eq(KP.renewalRead(state, a).band, 'devoted', 'a fed career reads devoted');
  const bBand = KP.renewalRead(state, b).band;
  t.ok(bBand === 'strained' || bBand === 'gone', 'a starved one reads ' + bBand);
  b.directed.push({ week: state.week, kind: 'promiseBroken', w: -4 },
    { week: state.week, kind: 'promiseBroken', w: -4 });
  t.eq(KP.renewalRead(state, b).band, 'gone', 'enough broken promises and the arithmetic finishes');
  // leverage prices the signature
  a.social = 350000;
  t.ok(KP.renewalRead(state, a).fame >= 2, 'fame is leverage at the table');
}

// ---- the window opens at five, one table at a time ----
{
  const { state, g } = debuted('ct-window');
  g.members.forEach(id => windowFor(state, state.people[id]));
  const sc = rideToTable(state);
  t.ok(sc, 'the folder goes up at year five');
  t.ok(state.inbox.some(n => /folder nobody rushes to open/.test(n.text)), 'and the desk letter lands');
  t.eq((state.scenes || []).filter(x => x.kind === 'renewal').length, 1, 'one conversation at a time');
}

// ---- devoted: the ceremony ----
{
  const { state, g } = debuted('ct-devoted');
  const p = state.people[g.members[0]];
  makeDevoted(state, p);
  windowFor(state, p);
  const sc = rideToTable(state);
  t.ok(sc && sc.personId === p.id, 'fixture: her table');
  const opts = KP.sceneDef('renewal').options(state, sc);
  t.ok(opts.some(o => o.id === 'sweeten'), 'the devoted table offers the sweetener');
  const termBefore = p.contract.term;
  const cash = state.budget;
  const r = KP.resolveScene(state, sc.id, 'sweeten');
  t.ok(r.ok && /signing anyway/.test(r.toast), 'she was signing anyway — the sweetener was for the years');
  t.eq(cash - state.budget, KP.C.CONTRACT.sweetenCost, 'and it cost real money');
  t.eq(p.contract.term, termBefore + 1, 'a new term begins');
  t.ok(state.week - p.contract.start < 5, 'with a fresh clock');
  t.ok((p.directed || []).some(d => d.kind === 'sweetened' && d.w > 0), 'remembered on the ledger');
  t.ok(state.inbox.some(n => n.ind === 'renewed'), 'the fandom exhales in real time');
  t.ok(KP.feedReactionFor('renewed'), 'through the registry');
}

// ---- professional: leverage prices the signature ----
{
  const { state, g } = debuted('ct-pro');
  const p = state.people[g.members[0]];
  p.morale = 55; p.directed = []; p.flags.ambitionMet = 1;   // solidly professional
  p.social = 400000;                                          // famous — fame 2
  windowFor(state, p);
  const sc = rideToTable(state);
  p.morale = 55; p.directed = [];   // re-pin: the ride drifts morale — the
                                    // mechanism under test is the pricing
  const read = KP.renewalRead(state, p);
  t.eq(read.band, 'professional', 'fixture: professional');
  const opts = KP.sceneDef('renewal').options(state, sc);
  const termsOpt = opts.find(o => o.id === 'terms');
  const expected = KP.C.CONTRACT.termsCostBase + read.fame * KP.C.CONTRACT.termsCostPerFame;
  t.ok(termsOpt.label.includes(String(expected)), 'the price on the table reads her leverage (' + expected + ')');
  const cash = state.budget;
  KP.resolveScene(state, sc.id, 'terms');
  t.eq(cash - state.budget, expected, 'and is charged in full');
  t.ok(p.contract.term === 2, 'the colleague signs');
}

// ---- strained: holding the line is a coin ----
{
  const C = KP.C.CONTRACT;
  const old = C.holdLeaveChance;
  C.holdLeaveChance = 1;   // mechanism: the coin lands tails
  const { state, g } = debuted('ct-hold');
  const p = state.people[g.members[0]];
  makeStrained(state, p);
  windowFor(state, p);
  const sc = rideToTable(state);
  // re-pin: weeks passed on the ride, and the ambition system re-stamps
  // ambitionMet at debut — this table is about the one it never fed
  p.morale = 45;
  delete p.flags.ambitionMet;
  t.eq(KP.renewalRead(state, p).band, 'strained', 'fixture: strained');
  const r = KP.resolveScene(state, sc.id, 'hold');
  C.holdLeaveChance = old;
  t.ok(r.ok && /seventh year has a date on it/.test(r.toast), 'she will honor the term — and then go');
  t.ok(p.contract.leaving && p.contract.leaveMode === 'cold', 'the leaving flag is set, cold');
}

// ---- gone: the farewell written right ----
{
  const { state, g } = debuted('ct-farewell');
  const p = state.people[g.members[0]];
  makeNeglected(state, p);
  p.directed.push({ week: state.week, kind: 'promiseBroken', w: -4 },
    { week: state.week, kind: 'promiseBroken', w: -4 });
  windowFor(state, p);
  const sc = rideToTable(state);
  t.eq(KP.renewalRead(state, p).band, 'gone', 'fixture: gone');
  const r = KP.resolveScene(state, sc.id, 'farewell');
  t.ok(r.ok && /farewell lap/.test(r.toast), 'the seventh year becomes a farewell lap');
  t.ok(p.contract.leaving && p.contract.leaveMode === 'warm', 'warm, on her terms');
  t.ok((p.directed || []).some(d => d.kind === 'endingHonored'), 'and honoring it is remembered');
}

// ---- the plead: rarely, the arithmetic changes ----
{
  const C = KP.C.CONTRACT;
  const old = C.changeMindChance;
  C.changeMindChance = 1;
  const { state, g } = debuted('ct-plead');
  const p = state.people[g.members[0]];
  makeNeglected(state, p);
  p.directed.push({ week: state.week, kind: 'promiseBroken', w: -4 },
    { week: state.week, kind: 'promiseBroken', w: -4 });
  windowFor(state, p);
  const sc = rideToTable(state);
  const r = KP.resolveScene(state, sc.id, 'plead');
  C.changeMindChance = old;
  t.ok(r.ok && /Nobody in the building will ever know/.test(r.toast), 'some saves happen in rooms with no cameras');
  t.eq(p.contract.term, 2, 'she signed');
  t.ok(!p.contract.leaving, 'and stays');
}

// ---- the departure: every invariant, warm ----
{
  const { state, g } = debuted('ct-depart');
  const p = state.people[g.members[1]];
  const wasLeader = g.roles.leader === p.id;
  g.roles.center = p.id;   // make it hard: she is the center
  state.deals = [{ id: 'dl1', personId: p.id, brand: 'Lumière', weekly: 2, weeks: 10 }];
  KP.openClaim(state, { type: 'ambitionPromise', subject: { kind: 'idol', id: p.id },
    personId: p.id, ambition: 'solo', byWeek: state.week + 40 });
  // a close friend will grieve
  const friend = state.people[g.members[2]];
  state.relationships[KP.pairKey(p, friend)] = { score: 80, state: 'close' };
  p.contract.leaving = true; p.contract.leaveMode = 'warm';
  p.contract.start = state.week - 7 * 48;
  let guard = 0;
  while (p.status === 'idol' && guard++ < 6) KP.advanceWeek(state);
  t.eq(p.status, 'departed', 'the seventh year ends');
  t.ok(!state.roster.includes(p.id) && !g.members.includes(p.id), 'off the roster, out of the lineup');
  t.ok(state.people[p.id], 'the file stays open forever');
  t.eq(g.members.length, 4, 'the group continues as four');
  t.ok(g.members.includes(g.roles.center), 'the center was reassigned inside the lineup');
  t.ok(Object.values(g.roles).every(id => g.members.includes(id)), 'every role held by a current member');
  t.eq(g.rooms.flat().sort().join(), g.members.slice().sort().join(), 'the room chart re-partitions');
  t.eq((state.deals || []).length, 0, 'her deals wound down');
  t.ok((state.claims || []).every(c => c.subject.id !== p.id || c.resolved === 'void'), 'her open promises settle void');
  // grief lands as a ledger entry — end-state morale is confounded by the
  // same week's release results, so the durable record is the assertion
  t.ok((friend.directed || []).some(d => d.kind === 'friendDeparted'), 'her closest friend carries it on the ledger');
  t.ok(state.inbox.some(n => n.ind === 'contractEnd' && /handwriting/.test(n.text)), 'the goodbye letter is everything the fandom needed');
  t.ok(state.inbox.some(n => /continues as 4/.test(n.text)), 'and the continuing is narrated');
  t.eq(KP.validateState(state).length, 0, 'the validator signs off on the whole thing');

  // the group RELEASES as four — the career continues
  let guard2 = 0;
  while (state.week <= Math.max((g.promoUntil || 0) + KP.C.COMEBACK.restWeeks, g.tourRestUntil || 0) && guard2++ < 30) KP.advanceWeek(state);
  guard2 = 0;
  while (!g.demos && guard2++ < 10) KP.advanceWeek(state);
  state.budget = Math.max(state.budget, 600);   // the practice-room invoice (v0.10.11) drains the long ride
  const plan = KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  t.ok(plan.ok, 'the comeback locks as four');
  const wk0 = state.week;
  guard2 = 0;
  while ((!g.results || g.results.week < wk0) && guard2++ < 12) KP.advanceWeek(state);
  t.ok(g.results && g.results.week >= wk0, 'and the release lands');
  t.eq(KP.validateState(state).length, 0, 'still sound after a full post-departure cycle');
}

// ---- the last one out turns off the lights (v0.10.12 regression) -------
// found by the longhaul invariant: a lineup emptied by its final
// departure kept stale role ids on the retired group forever
{
  const s = KP.newGame('ct-lights', null, { legacy: true });
  const g = s.groups[0];
  // walk every member out through the same surgery the clock uses
  const ids = g.members.slice();
  ids.forEach(id => {
    const p = s.people[id];
    KP.lineupSurgery(s, g, p, true, () => {});
  });
  t.eq(g.members.length, 0, 'fixture: the lineup emptied');
  t.eq(Object.keys(g.roles || {}).length, 0, 'and no role points at anyone who left');
}

// ---- the cold departure reads colder ----
{
  const { state, g } = debuted('ct-cold');
  const p = state.people[g.members[0]];
  // direct call for the exact-arithmetic check — weekly popularity drift
  // would blur the hit if we rode the clock here (the clock path is proven
  // by the warm block above)
  const popBefore = g.popularity = 60;
  KP.departIdol(state, p.id, 'cold', state.inbox);
  t.eq(p.status, 'departed', 'she goes');
  t.eq(popBefore - g.popularity, KP.C.CONTRACT.departPopHitCold, 'a cold goodbye costs the room more');
  t.ok(state.inbox.some(n => n.ind === 'contractEnd' && /three sentences/.test(n.text)),
    'the statement was three sentences, and the fandom read everything they did not say');
}

// ---- graduation: same building, new door ----
{
  const { state, g } = debuted('ct-grad');
  const p = state.people[g.members[0]];
  const r = KP.graduateToSolo(state, p.id);
  t.ok(r.ok, 'the graduation door opens');
  t.eq(p.status, 'idol', 'she never left the company');
  t.ok(!g.members.includes(p.id), 'but she left the lineup');
  const solo = state.groups.find(x => x.type === 'solo' && x.members[0] === p.id);
  t.ok(solo && !solo.debuted, 'a solo act exists, waiting for its debut');
  t.eq(KP.validateState(state).length, 0, 'invariants hold through graduation');
  let guard = 0;
  while (!solo.demos && guard++ < 10) KP.advanceWeek(state);
  const plan = KP.planDebut(state, { groupId: solo.id, songId: solo.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  t.ok(plan.ok, 'and the solo debut is plannable');
}

// ---- the table ignored: legal takes the folder back down ----
{
  const { state, g } = debuted('ct-ignore');
  const p = state.people[g.members[0]];
  windowFor(state, p);
  const sc = rideToTable(state);
  t.ok(sc, 'fixture: the table');
  for (let w = 0; w < 4; w++) KP.advanceWeek(state);
  t.ok((p.directed || []).some(d => d.kind === 'tableLeftWaiting' && d.w < 0),
    'people always notice the folder');
  t.ok(state.inbox.some(n => /colder temperature/.test(n.text)), 'the table comes back colder');
}

// ---- the paper runs out: ignoring the table is not immortality ----
{
  const { state, g } = debuted('ct-lapse');
  const p = state.people[g.members[0]];
  makeNeglected(state, p);
  p.directed.push({ week: state.week, kind: 'promiseBroken', w: -4 },
    { week: state.week, kind: 'promiseBroken', w: -4 });
  t.eq(KP.renewalRead(state, p).band, 'gone', 'fixture: gone, and half a year past the seventh');
  p.contract.start = state.week - Math.ceil(7.5 * KP.C.WEEKS_PER_YEAR) - 1;
  KP.advanceWeek(state);
  t.eq(p.status, 'departed', 'she left without the meeting — the silence was the answer');
  t.eq(p.flags.departMode, 'cold', 'cold, because it was');
  t.ok((state.scenes || []).every(sc => sc.personId !== p.id), 'her name comes off the desk with her');
  t.eq(KP.validateState(state).length, 0, 'invariants hold through the lapse');
}

// ---- migration + determinism ----
{
  const { state, g } = debuted('ct-mig');
  g.members.forEach(id => { delete state.people[id].contract; });
  state.version = '0.8.4';
  const m = KP.deserialize(KP.serialize(state));
  const p2 = m.people[m.groups[0].members[0]];
  t.ok(p2.contract && p2.contract.start === m.groups[0].debutWeek, 'existing idols get their sevens backdated to debut');
  t.ok(m.inbox.some(n => /Every quiet week just started counting/.test(n.text)), 'and the memo lands the weight');

  const { state: a, g: ga } = debuted('ct-fork');
  ga.members.forEach(id => windowFor(a, a.people[id]));
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 30; w++) {
    KP.advanceWeek(a); KP.advanceWeek(b);
    [a, b].forEach(s2 => {
      const scn = (s2.scenes || []).find(x => x.kind === 'renewal');
      if (scn) KP.resolveScene(s2, scn.id, KP.sceneDef('renewal').options(s2, scn)[0].id);
    });
  }
  t.eq(KP.serialize(a), KP.serialize(b), 'the clock forks clean, tables and all');
}

t.finish();
