/* Suite 042 — the office door (v0.8.2).
   §37's unanimous #1, built: idols initiate scenes toward the player
   — request, confession, challenge, and the ambition ask that mints
   a promise on HER ledger. Plus the persona teeth: the spotlight
   follows drama pressure, and some moments put the call on the desk. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_042_door');

function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'KNOCK', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  // keep the exec off the desk so the door tests read clean
  state.nextMeetingWeek = 900;
  (state.scenes || []).length = 0;
  return { state, g };
}
function calm(state) {
  // nobody else knocks: rested, content, resilient where it matters
  state.roster.forEach(id => {
    const p = state.people[id];
    p.fatigue = 20; p.morale = 60; p.personality.resilience = 70;
    p.flags.ambitionMet = p.flags.ambitionMet || 1;   // no surprise asks
  });
}
function doorScene(state) {
  // the one door (v0.10.30): any person scene the queue opened
  return (state.scenes || []).find(sc => KP.isKnockKind(sc.kind)) || null;
}
function rideToKnock(state, maxWeeks) {
  let guard = 0;
  while (!doorScene(state) && guard++ < (maxWeeks || 30)) KP.advanceWeek(state);
  return doorScene(state);
}

// ---- the ask: she has rehearsed this ----
{
  const { state, g } = debuted('door-ask');
  calm(state);
  const her = state.people[g.members[0]];
  delete her.flags.ambitionMet;                       // she still wants it
  g.debutWeek = state.week - KP.C.DOOR.askAfterWeeks; // and it has been long enough
  const sc = rideToKnock(state, 30);
  t.ok(sc && sc.kind === 'idolAsk' && sc.personId === her.id, 'the one still waiting is the one who knocks');
  t.ok((state.scenes || []).filter(x => x.kind === 'idolAsk').length === 1, 'the door card on the Desk IS the letter (§89 B: no announcement note)');
  const def = KP.sceneDef('idolAsk');
  t.ok(/plan for her/.test(def.body(state, sc)), 'the body says the quiet part');
  // the promise mints a claim on HER ledger
  const r = KP.resolveScene(state, sc.id, 'promise');
  t.ok(r.ok && /HER calendar/.test(r.toast), 'the promise is made to her face');
  // the solo ask is ONE claim (v0.10.30, §89 D2): a 'solo' ambition mints
  // the gravity ladder's soloPromise; every other ambition keeps its own
  const solo = KP.ambitionOf(state, her) === 'solo';
  const claim = (state.claims || []).find(c => c.type === (solo ? 'soloPromise' : 'ambitionPromise'));
  t.ok(claim && claim.subject.kind === 'idol' && claim.subject.id === her.id, 'and the receipt is hers');
  t.ok((her.directed || []).some(d => d.kind === 'ambitionPromised' && d.w > 0), 'she remembers being promised');
  // kept: the ambition lands inside the window
  if (solo) her.soloDisc = [{ week: state.week + 1, title: 'x' }]; else her.flags.ambitionMet = state.week;
  KP.advanceWeek(state);
  t.eq(claim.resolved, 'met', 'delivering resolves the promise');
  t.ok(state.inbox.concat(KP.lastTickNotes || []).some(n => /Thank you for meaning it|It is on the record/.test(n.text)), 'and she says so, in the doorway');
  t.ok((her.directed || []).some(d => d.kind === 'promiseKept'), 'kept promises go on the ledger');
}

// ---- the broken promise: she quotes the date back ----
{
  const { state, g } = debuted('door-break');
  calm(state);
  const her = state.people[g.members[1]];
  delete her.flags.ambitionMet;
  g.debutWeek = state.week - KP.C.DOOR.askAfterWeeks;
  const sc = rideToKnock(state, 30);
  t.ok(sc && sc.personId === her.id, 'fixture: she asks');
  KP.resolveScene(state, sc.id, 'promise');
  const claim = (state.claims || []).find(c => c.type === 'ambitionPromise' || c.type === 'soloPromise');
  claim.byWeek = state.week;                          // the year is up
  const moraleBefore = her.morale;
  KP.advanceWeek(state);
  t.eq(claim.resolved, 'missed', 'the window closes');
  t.ok(state.inbox.concat(KP.lastTickNotes || []).some(n => /It has been a year since|came and went without a solo/.test(n.text)), 'she quotes the date back');
  t.ok(her.morale < moraleBefore, 'and it costs her (' + (moraleBefore - her.morale) + ')');
  t.ok((her.directed || []).some(d => d.kind === 'promiseBroken' && d.w < 0), 'broken promises scar the ledger');
}

// ---- honesty and deflection are different answers ----
{
  const { state, g } = debuted('door-honest');
  calm(state);
  const her = state.people[g.members[2]];
  delete her.flags.ambitionMet;
  g.debutWeek = state.week - KP.C.DOOR.askAfterWeeks;
  const sc = rideToKnock(state, 30);
  t.ok(sc, 'fixture: the knock');
  const r = KP.resolveScene(state, sc.id, 'honest');
  t.ok(r.ok && /filing it, not dropping it/.test(r.toast), 'honesty is filed, not dropped');
  t.ok((her.directed || []).some(d => d.kind === 'honestAnswer' && d.w > 0), 'and respected on the ledger');
  t.eq((state.claims || []).filter(c => c.type === 'ambitionPromise').length, 0, 'no claim minted — no promise made');
}

// ---- the request: running on fumes, asking for a week ----
{
  const { state, g } = debuted('door-breather');
  calm(state);
  const her = state.people[g.members[0]];
  her.fatigue = 75;
  // folded into the extra hour's drained ask (v0.10.30, §89 D1)
  let sc = null, guardB = 0;
  while (!sc && guardB++ < 20) { her.fatigue = 75; KP.advanceWeek(state); sc = doorScene(state); }
  t.ok(sc && sc.kind === 'frictionExtraHour' && sc.variant === 'drained' && sc.personId === her.id, 'the tired one asks for the lighter week');
  const fatigueAt = her.fatigue;
  const r = KP.resolveScene(state, sc.id, 'lighten');
  t.ok(r.ok && /lighter week/.test(r.toast), 'granting it reads like relief');
  t.ok(her.fatigue < fatigueAt, 'and IS relief (' + fatigueAt + '→' + her.fatigue + ')');
  t.ok((her.directed || []).some(d => d.kind === 'heardHer'), 'granted rest is remembered');
}

// ---- the confession: the resilient one, struggling quietly ----
{
  const { state, g } = debuted('door-confess');
  calm(state);
  const her = state.people[g.members[1]];
  her.morale = 30; her.personality.resilience = 75;   // too tough for the staff scan, tough enough to knock
  // folded into the quiet no (v0.10.30, §89 D1): resilience brings her to the door
  let sc = null, guardC = 0;
  while (!sc && guardC++ < 20) { her.morale = 30; KP.advanceWeek(state); sc = doorScene(state); }
  t.ok(sc && sc.kind === 'frictionQuietNo' && sc.personId === her.id, 'the tough one brings it to you herself');
  const r = KP.resolveScene(state, sc.id, 'ask');
  t.ok(r.ok && /You asked/.test(r.toast), 'asking is the answer she needed');
  t.ok((her.directed || []).some(d => d.kind === 'heardHer'), 'being heard goes on the ledger');
}

// ---- the challenge: she is not wrong, which is the inconvenient part ----
{
  const { state, g } = debuted('door-challenge');
  calm(state);
  KP.setGroupConcept(state, g.id, KP.C.CONCEPTS[0].id);
  const her = state.people[g.members[2]];
  her.personality.confidence = 70;
  KP.C.CONCEPTS[0].weights && Object.keys(her.talents).forEach(d => {});   // fit forced below
  // force a bad personal fit for the group's lane
  const concept = KP.conceptById(g.concept);
  Object.keys(concept.weights).forEach(d => { her.talents[d].cur = 20; });
  const sc = rideToKnock(state, 20);
  t.ok(sc && sc.topic === 'challenge', 'the confident misfit says so to your face');
  t.ok(/does not fit HER/.test(KP.sceneDef('idolDoor').body(state, sc)), 'and the scene names the real problem');
  const r = KP.resolveScene(state, sc.id, 'retool');
  t.ok(r.ok && /her notes/.test(r.toast), 'sending the producers back in carries her notes');
  t.eq(g.demos, null, 'the next pitch meeting starts over');
}

// ---- silence: she stops waiting, and it costs ----
{
  const { state, g } = debuted('door-silence');
  calm(state);
  const her = state.people[g.members[0]];
  let sc = null, guardS = 0;
  state.knockLedger = null; delete her.flags.knockWeek;
  g.roles = g.roles || {}; g.roles.leader = her.id;   // her own fatigue must not hand the leader a carry call that outranks her ask
  while (!sc && guardS++ < 40) {
    her.fatigue = 92;
    // her own other knocks (a clip call, say) get answered too — the fixture is about THIS ask
    (state.scenes || []).slice().forEach(x => { if (x.kind !== 'frictionExtraHour') { const def = KP.sceneDef(x.kind); if (def) KP.resolveScene(state, x.id, def.options(state, x)[0].id); } });
    KP.advanceWeek(state);
    sc = (state.scenes || []).find(x => x.kind === 'frictionExtraHour' && x.personId === her.id) || null;
  }
  t.ok(sc && sc.kind === 'frictionExtraHour' && sc.personId === her.id, 'fixture: a knock (the folded ask)');
  for (let w = 0; w < KP.C.DOOR.expireWeeks + 1; w++) KP.advanceWeek(state);
  t.ok(!doorScene(state), 'the unanswered scene expires');
  t.ok(state.inbox.concat(KP.lastTickNotes || []).some(n => /stopped waiting|That word is doing a lot of work/.test(n.text)), 'and the silence is narrated');
  t.ok((her.directed || []).some(d => d.kind === 'leftWaiting' && d.w < 0),
    'waiting for nothing goes on the ledger as YOURS — the wound the rest week cannot heal');
}

// ---- pacing: a knock is memorable, not a mailbox ----
{
  const { state, g } = debuted('door-pacing');
  calm(state);
  const her = state.people[g.members[0]];
  // v0.10.14 stream shift: pin the exhaustion through the ride — the
  // fixture's claim needs a knock, and recovery was un-knocking her
  let sc = null, guardK = 0;
  while (!sc && guardK++ < 40) { her.fatigue = 90; KP.advanceWeek(state); sc = doorScene(state); }
  t.ok(sc && sc.personId === her.id, 'fixture: she knocked');
  KP.resolveScene(state, sc.id, KP.sceneDef(sc.kind).options(state, sc)[0].id);
  her.fatigue = 90;                                    // still exhausted
  let second = null;
  for (let w = 0; w < KP.C.KNOCK.personGapWeeks - 2 && !second; w++) {
    her.fatigue = 90;
    KP.advanceWeek(state);
    second = doorScene(state);
    if (second && second.personId !== her.id) { KP.resolveScene(state, second.id, KP.sceneDef(second.kind).options(state, second)[0].id); second = null; }
  }
  t.ok(!second, 'she does not knock twice a month — the per-person gap holds');
}

// ---- voices: the door opens seven different ways ----
{
  const { state, g } = debuted('door-voices');
  const a = state.people[g.members[0]], b = state.people[g.members[1]];
  a.personality.dominance = 75; a.personality.confidence = 70;            // blunt
  b.personality.dominance = 30; b.personality.warmth = 70;
  b.personality.confidence = 40; b.personality.professionalism = 40;
  b.personality.creativity = 40; b.personality.workEthic = 40;            // softspoken
  const scA = { kind: 'idolAsk', personId: a.id };
  const scB = { kind: 'idolAsk', personId: b.id };
  const def = KP.sceneDef('idolAsk');
  t.ok(def.body(state, scA) !== def.body(state, scB), 'two people, two ways of opening your door');
  t.ok(/knocks once and is already sitting/.test(def.body(state, scA)), 'the blunt one does not wait');
}

// ---- the pressure spotlight: the fire gets featured ----
{
  const { state } = debuted('door-pressure');
  calm(state);
  state.knockLedger = { asked: 0, byKind: {}, lastWeek: 900 };   // isolate the spotlight (the one door stays shut)
  const target = state.people[state.roster[3]];
  target.fatigue = 80; target.morale = 60; target.personality.workEthic = 75;
  target.flags.spotWeek = -99;
  let featured = null;
  for (let w = 0; w < 3 && !featured; w++) {
    target.fatigue = 80;
    KP.advanceWeek(state);
    featured = (state.spotlight || []).find(m => m.week === state.week && m.personId === target.id);   // the spotlight surface (v0.10.29)
  }
  t.ok(featured, 'the person on fire is featured within weeks, not when the rota says so');
}

// ---- momentChoice: the call lands on the desk, or resolves without you --
// (v0.10.30: warmthGlue left — the steadying does its work; the leader's
// carry is the moment that puts the call on the desk here)
function carryFixture(seed) {
  const { state, g } = debuted(seed);
  calm(state);
  const leader = state.people[g.members[0]];
  g.roles = g.roles || {}; g.roles.leader = leader.id;
  leader.personality.leadership = 80; leader.flags.spotWeek = -99;
  const tired = state.people[g.members[1]];
  let sc = null;
  for (let w = 0; w < 60 && !sc; w++) {
    tired.fatigue = 92; leader.morale = 60; leader.fatigue = 20; leader.flags.spotWeek = -99;   // the week's recovery must leave her over 70 at the spotlight
    // keep the desk clear of other knocks so the call is the pick
    (state.scenes || []).slice().forEach(x => {
      if (x.kind !== 'momentChoice') { const def = KP.sceneDef(x.kind); if (def) KP.resolveScene(state, x.id, def.options(state, x)[0].id); }
    });
    KP.advanceWeek(state);
    sc = (state.scenes || []).find(x => x.kind === 'momentChoice' && x.momentKey === 'leaderCarry');
  }
  return { state, g, leader, sc };
}
{
  const { state, leader, sc } = carryFixture('door-choice');
  t.ok(sc, 'the leader’s carry becomes a call on YOUR desk — through the one door');
  t.ok((state.spotlight || []).some(m => m.choice && m.personId === leader.id), 'the spotlight marks the call as on the Desk (§89 B: the card is the announcement)');
  t.ok((state.knockLedger || {}).byKind.momentChoice >= 1, 'the queue ledgered the pick');
  const r = KP.resolveScene(state, sc.id, 'file');
  t.ok(r.ok && /in writing/.test(r.toast), 'putting it in her file is a real answer');
  t.ok((leader.directed || []).some(d => d.kind === 'carrySeen'), 'you SAW her — the ledger says so');

  // the expiry fallback: unanswered, the week moves on
  const { state: s2, sc: sc2 } = carryFixture('door-choice-exp');
  t.ok(sc2, 'fixture: a second call');
  for (let w = 0; w < 3; w++) KP.advanceWeek(s2);
  t.ok(!(s2.scenes || []).some(x => x.kind === 'momentChoice'), 'the unanswered call expires');
  // the silence is on the conversation record, not a letter (v0.10.29, §89 C)
  t.ok((s2.convoLog || []).some(c => c.kind === 'momentChoice' && c.answer === '(went unanswered)'), 'with the office\'s silence on the record');
}

// ---- migration: the door is announced ----
{
  const { state } = debuted('door-mig');
  state.version = '0.8.1';
  const m = KP.deserialize(KP.serialize(state));
  t.ok(m.inbox.some(n => /girls know your door opens now/.test(n.text)), 'the road manager says the quiet part');
}

// ---- determinism: knocks pending, promises open, the door forks clean --
{
  const { state, g } = debuted('door-fork');
  const her = state.people[g.members[0]];
  delete her.flags.ambitionMet;
  g.debutWeek = state.week - KP.C.DOOR.askAfterWeeks;
  const b = KP.deserialize(KP.serialize(state));
  for (let w = 0; w < 30; w++) { KP.advanceWeek(state); KP.advanceWeek(b); }
  t.eq(KP.serialize(state), KP.serialize(b), 'the door forks clean, knocks and all');
}

t.finish();
