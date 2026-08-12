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
  return (state.scenes || []).find(sc => sc.kind === 'idolAsk' || sc.kind === 'idolDoor') || null;
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
  t.ok(state.inbox.some(n => /asked for a minute of your time/.test(n.text)), 'the desk letter lands at high priority');
  const def = KP.sceneDef('idolAsk');
  t.ok(/plan for her/.test(def.body(state, sc)), 'the body says the quiet part');
  // the promise mints a claim on HER ledger
  const r = KP.resolveScene(state, sc.id, 'promise');
  t.ok(r.ok && /HER calendar/.test(r.toast), 'the promise is made to her face');
  const claim = (state.claims || []).find(c => c.type === 'ambitionPromise');
  t.ok(claim && claim.subject.kind === 'idol' && claim.subject.id === her.id, 'and the receipt is hers');
  t.ok((her.directed || []).some(d => d.kind === 'ambitionPromised' && d.w > 0), 'she remembers being promised');
  // kept: the ambition lands inside the window
  her.flags.ambitionMet = state.week;
  KP.advanceWeek(state);
  t.eq(claim.resolved, 'met', 'delivering resolves the promise');
  t.ok(state.inbox.some(n => /Thank you for meaning it/.test(n.text)), 'and she says so, in the doorway');
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
  const claim = (state.claims || []).find(c => c.type === 'ambitionPromise');
  claim.byWeek = state.week;                          // the year is up
  const moraleBefore = her.morale;
  KP.advanceWeek(state);
  t.eq(claim.resolved, 'missed', 'the window closes');
  t.ok(state.inbox.some(n => /It has been a year since/.test(n.text)), 'she quotes the date back');
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
  const sc = rideToKnock(state, 20);
  t.ok(sc && sc.kind === 'idolDoor' && sc.topic === 'breather', 'the tired one asks for a real week');
  const fatigueAt = her.fatigue;
  const r = KP.resolveScene(state, sc.id, 'grant');
  t.ok(r.ok && /slept fourteen hours/.test(r.toast), 'granting it reads like relief');
  t.ok(her.fatigue < fatigueAt, 'and IS relief (' + fatigueAt + '→' + her.fatigue + ')');
  t.ok((her.directed || []).some(d => d.kind === 'breatherGranted'), 'granted rest is remembered');
}

// ---- the confession: the resilient one, struggling quietly ----
{
  const { state, g } = debuted('door-confess');
  calm(state);
  const her = state.people[g.members[1]];
  her.morale = 30; her.personality.resilience = 75;   // too tough for the staff scan, tough enough to knock
  const sc = rideToKnock(state, 20);
  t.ok(sc && sc.topic === 'confession', 'the tough one brings it to you herself');
  const r = KP.resolveScene(state, sc.id, 'lighten');
  t.ok(r.ok && /quiet help/.test(r.toast), 'quiet help is the answer she needed');
  t.ok((her.directed || []).some(d => d.kind === 'listened'), 'being heard goes on the ledger');
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
  her.fatigue = 75;
  const sc = rideToKnock(state, 20);
  t.ok(sc, 'fixture: a knock');
  for (let w = 0; w < KP.C.DOOR.expireWeeks + 1; w++) KP.advanceWeek(state);
  t.ok(!doorScene(state), 'the unanswered scene expires');
  t.ok(state.inbox.some(n => /stopped waiting|That word is doing a lot of work/.test(n.text)), 'and the silence is narrated');
  t.ok((her.directed || []).some(d => d.kind === 'leftWaiting' && d.w < 0),
    'waiting for nothing goes on the ledger as YOURS — the wound the rest week cannot heal');
}

// ---- pacing: a knock is memorable, not a mailbox ----
{
  const { state, g } = debuted('door-pacing');
  calm(state);
  const her = state.people[g.members[0]];
  her.fatigue = 90;
  const sc = rideToKnock(state, 20);
  t.ok(sc && sc.personId === her.id, 'fixture: she knocked');
  KP.resolveScene(state, sc.id, 'decline');
  her.fatigue = 90;                                    // still exhausted
  let second = null;
  for (let w = 0; w < KP.C.DOOR.personCooldownWeeks - 4 && !second; w++) {
    her.fatigue = 90;
    KP.advanceWeek(state);
    second = doorScene(state);
    if (second && second.personId !== her.id) { KP.resolveScene(state, second.id, KP.sceneDef(second.kind).options(state, second)[0].id); second = null; }
  }
  t.ok(!second, 'she does not knock twice a season — the cooldown holds');
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
  state.doorQuietUntil = 900;                          // isolate the spotlight
  const target = state.people[state.roster[3]];
  target.fatigue = 80; target.morale = 60; target.personality.workEthic = 75;
  target.flags.spotWeek = -99;
  let featured = null;
  for (let w = 0; w < 3 && !featured; w++) {
    target.fatigue = 80;
    KP.advanceWeek(state);
    featured = state.inbox.find(n => n.week === state.week && n.moment && n.personId === target.id);
  }
  t.ok(featured, 'the person on fire is featured within weeks, not when the rota says so');
}

// ---- momentChoice: the call lands on the desk, or resolves without you --
{
  const { state, g } = debuted('door-choice');
  calm(state);
  state.doorQuietUntil = 900;
  const warm = state.people[g.members[0]];
  warm.personality.warmth = 80; warm.flags.spotWeek = -99;
  const a = state.people[g.members[1]], b = state.people[g.members[2]];
  const key = KP.pairKey(a, b);
  let sc = null;
  for (let w = 0; w < 12 && !sc; w++) {
    state.relationships[key] = { score: -30, state: 'tense' };
    warm.morale = 60; warm.fatigue = 20;
    KP.advanceWeek(state);
    sc = (state.scenes || []).find(x => x.kind === 'momentChoice' && x.momentKey === 'warmthGlue');
  }
  t.ok(sc, 'the food-run diplomacy becomes a call on YOUR desk');
  t.ok(state.inbox.some(n => n.choice && /The call is on the Desk/.test(n.text)), 'the note says where the call lives');
  state.relationships[key] = { score: -30, state: 'tense' };
  const scPerson = state.people[sc.personId];
  const r = KP.resolveScene(state, sc.id, 'quiet');
  t.ok(r.ok && /holding that room together/.test(r.toast), 'letting her work is a real answer');
  t.eq(state.relationships[key].score, -28, 'and her diplomacy still lands (+2)');
  t.ok((scPerson.directed || []).some(d => d.kind === 'glueSeen'), 'you SAW her — the ledger says so');

  // the expiry fallback: unanswered, the week resolves the old way
  const { state: s2, g: g2 } = debuted('door-choice-exp');
  calm(s2);
  s2.doorQuietUntil = 900;
  const warm2 = s2.people[g2.members[0]];
  warm2.personality.warmth = 80; warm2.flags.spotWeek = -99;
  const key2 = KP.pairKey(s2.people[g2.members[1]], s2.people[g2.members[2]]);
  let sc2 = null;
  for (let w = 0; w < 12 && !sc2; w++) {
    s2.relationships[key2] = { score: -30, state: 'tense' };
    warm2.morale = 60; warm2.fatigue = 20;
    KP.advanceWeek(s2);
    sc2 = (s2.scenes || []).find(x => x.kind === 'momentChoice');
  }
  t.ok(sc2, 'fixture: a second call');
  s2.relationships[key2] = { score: -30, state: 'tense' };
  for (let w = 0; w < 3; w++) KP.advanceWeek(s2);
  t.ok(!(s2.scenes || []).some(x => x.kind === 'momentChoice'), 'the unanswered call expires');
  t.ok(s2.relationships[key2].score > -30, 'and the moment resolved itself the old way');
  t.ok(s2.inbox.some(n => /the way these things do when the office stays quiet/.test(n.text)), 'with the office\'s silence on the record');
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
