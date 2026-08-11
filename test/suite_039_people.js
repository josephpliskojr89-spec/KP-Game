/* Suite 039 — the people (v0.7.4).
   Every idol gets a stable VOICE derived from her personality, a weekly
   MOOD read off her real numbers, and the spotlight turns state into
   one or two specific scenes per week. Effects stay tiny (presence,
   not power); public moments echo on the timeline through the kernel. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_039_people');

// direct handle on the registered phase — the suite drives it by hand
// to make the hash-rotating spotlight land where the test needs it
const personhood = KP.weeklyPipeline([]).find(p => p.name === 'personhood');
t.ok(personhood, 'the personhood phase is registered on kernel rails');

function debuted(seed) {
  const state = KP.newGame(seed);
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'PERSONS', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  return { state, g };
}
function runSpotlight(state) {
  const inbox = [];
  const roster = state.roster.map(id => state.people[id]);
  personhood.fn(state, KP.rngFor(state), inbox, roster, KP.groups(state));
  return inbox;
}

// ---- the voice: derived from who she is, stable forever ----
{
  const mk = (traits) => ({ id: 'px', personality: Object.assign({
    dominance: 50, confidence: 50, warmth: 50, professionalism: 50,
    creativity: 50, workEthic: 50, coachability: 50, resilience: 50,
    competitiveness: 50, leadership: 50 }, traits) });
  const s = { seed: 'voice-fixture' };
  t.eq(KP.voiceOf(s, mk({ dominance: 70, confidence: 62 })), 'blunt', 'dominant + confident talks bluntly');
  t.eq(KP.voiceOf(s, mk({ warmth: 70, confidence: 58 })), 'sunshine', 'warm + confident is sunshine');
  t.eq(KP.voiceOf(s, mk({ professionalism: 68, warmth: 40 })), 'deadpan', 'professional + cool runs deadpan');
  t.eq(KP.voiceOf(s, mk({ creativity: 70, professionalism: 45 })), 'gremlin', 'creative chaos is a gremlin');
  t.eq(KP.voiceOf(s, mk({ dominance: 35, warmth: 60 })), 'softspoken', 'gentle + warm speaks softly');
  t.eq(KP.voiceOf(s, mk({ workEthic: 70, coachability: 60 })), 'earnest', 'the workhorse answers earnestly');
  const plain = mk({});
  const v1 = KP.voiceOf(s, plain);
  t.ok(KP.VOICES[v1], 'a middle-of-everything person still gets a real voice (' + v1 + ')');
  t.eq(KP.voiceOf(s, plain), v1, 'and it never changes');
}

// ---- voices vary across a real roster ----
{
  const state = KP.newGame('people-variety');
  const voices = new Set(state.roster.map(id => KP.voiceOf(state, state.people[id])));
  t.ok(voices.size >= 2, 'a roster is not a choir — ' + voices.size + ' distinct voices');
}

// ---- the mood: her week in one honest word ----
{
  const mk = (o) => Object.assign({ fatigue: 20, morale: 55, flags: {} }, o);
  t.eq(KP.moodOf(mk({ flags: { burnout: 2 } })), 'benched', 'burnout reads benched');
  t.eq(KP.moodOf(mk({ fatigue: 80 })), 'running on fumes', 'deep fatigue reads on the card');
  t.eq(KP.moodOf(mk({ morale: 80, fatigue: 30 })), 'glowing', 'high morale + rest glows');
  t.eq(KP.moodOf(mk({ morale: 30 })), 'quietly off', 'low morale reads quietly off');
  t.eq(KP.moodOf(mk({ fatigue: 60 })), 'worn', 'mid fatigue reads worn');
  t.eq(KP.moodOf(mk({})), 'steady', 'an ordinary week reads steady');
}

// ---- presence: the spotlight lands every single week ----
{
  const { state } = debuted('people-weekly');
  const seen = new Set();
  for (let w = 0; w < state.roster.length; w++) {
    KP.advanceWeek(state);
    const notes = state.inbox.filter(n => n.week === state.week && n.moment);
    t.ok(notes.length >= 1, 'week ' + state.week + ' has a person in it');
    notes.forEach(n => seen.add(n.personId));
  }
  t.ok(seen.size >= Math.min(state.roster.length, 4),
    'the spotlight rotates — ' + seen.size + ' different people featured');
}

// ---- quietWeek: the staff scan catches whoever is going quiet ----
{
  const { state } = debuted('people-quiet');
  state.roster.forEach(id => {
    const p = state.people[id];
    p.morale = 30; p.personality.resilience = 40;
  });
  const worst = state.people[state.roster[2]];
  worst.morale = 18;
  const notes = runSpotlight(state).filter(n => n.moment === 'quietWeek');
  t.eq(notes.length, 1, 'one flag per week, not a chorus of nagging');
  t.eq(notes[0].personId, worst.id, 'and it names the one doing worst');
  t.eq(notes[0].priority, 'high', 'a warning survives the trim — "before it becomes a number"');
  t.ok(/quieter than usual/.test(notes[0].text), 'the staff say it carefully');
  // the cooldown: concern, not nagging
  state.week++;
  const again = runSpotlight(state).filter(n => n.moment === 'quietWeek');
  t.ok(!again.some(n => n.personId === worst.id), 'the same girl is not re-flagged the next week');
  state.week += 10;
  const later = runSpotlight(state).filter(n => n.moment === 'quietWeek');
  t.ok(later.length === 1, 'but if it is STILL true ten weeks on, the staff say it again');
}

// ---- the moments read real state: the workhorse at 1am ----
{
  const { state } = debuted('people-afterhours');
  state.roster.forEach(id => {
    const p = state.people[id];
    p.fatigue = 62; p.morale = 60; p.personality.workEthic = 70;
  });
  const kinds = new Set();
  for (let w = 0; w < 40; w++) {
    state.week++;
    runSpotlight(state).forEach(n => kinds.add(n.moment));
  }
  t.ok(kinds.has('afterHours'), 'the tired workhorse gets logged out of the building at 1am');
  t.ok(kinds.has('voiceMoment'), 'and ordinary weeks still speak in her voice');
}

// ---- warmthGlue: the warm one quietly fixes a cold room ----
// v0.8.2: glue normally puts a CHOICE on the desk (suite_042 owns that
// path). Holding another choice open forces the classic fallback —
// the week resolves itself, effect and all, exactly as before.
function blockChoices(state) {
  KP.openScene(state, { kind: 'momentChoice', momentKey: 'leaderCarry',
    personId: state.roster[0], expiresWeek: state.week + 999 });
}
function freshSpots(state) {
  state.roster.forEach(id => { state.people[id].flags.spotWeek = -99; });
}
{
  const { state, g } = debuted('people-glue');
  blockChoices(state);
  state.roster.forEach(id => {
    const p = state.people[id];
    p.morale = 60; p.fatigue = 20; p.personality.warmth = 75;
  });
  const a = state.people[g.members[0]], b = state.people[g.members[1]];
  const key = KP.pairKey(a, b);
  state.relationships[key] = { score: -20, state: 'tense' };
  let glued = null;
  for (let w = 0; w < 40 && !glued; w++) {
    state.week++;
    freshSpots(state);
    state.relationships[key].score = -20;          // re-arm each probe
    glued = runSpotlight(state).find(n => n.moment === 'warmthGlue');
  }
  t.ok(glued, 'the warm member notices the cold air');
  t.eq(state.relationships[key].score, -18, 'and the food run actually helps (+2)');
}

// ---- competitiveSting: a lost battle sits badly, then stops sitting ----
{
  const { state, g } = debuted('people-sting');
  blockChoices(state);
  g.members.forEach(id => {
    const p = state.people[id];
    p.morale = 60; p.fatigue = 20; p.personality.competitiveness = 75;
  });
  g.results = g.results || {};
  g.results.battle = { actId: 'x1', actName: 'AURORA VEIL', company: 'Rival House', won: false, wins: 0, losses: 1 };
  g.lastReleaseWeek = state.week;
  let sting = null;
  const before = {};
  g.members.forEach(id => { before[id] = state.people[id].morale; });
  for (let w = 0; w < 4 && !sting; w++) {
    state.week++;
    freshSpots(state);
    sting = runSpotlight(state).find(n => n.moment === 'competitiveSting');
  }
  t.ok(sting, 'losing the shared week gets rewatched');
  t.eq(state.people[sting.personId].morale, before[sting.personId] - 1, 'and it costs one point of morale');
  // months later the tape goes back on the shelf
  g.lastReleaseWeek = state.week - 10;
  let late = null;
  for (let w = 0; w < 20 && !late; w++) {
    state.week++;
    freshSpots(state);
    late = runSpotlight(state).find(n => n.moment === 'competitiveSting');
  }
  t.ok(!late, 'an old loss stops firing — the sting is about THIS week');
}

// ---- the public/private line: trainee weeks stay desk notes ----
{
  const state = KP.newGame('people-private');
  const notes = [];
  for (let w = 0; w < 8; w++) { state.week++; notes.push(...runSpotlight(state)); }
  t.ok(notes.length >= 8, 'trainees get their weeks told too');
  t.ok(notes.every(n => n.ind === undefined), 'but none of it reaches the public timeline');
  t.ok(notes.some(n => /practice|evaluation|coach|trainee|rubric|notebook/.test(n.text)),
    'and the scenes are practice-room scenes, not fan calls');
}

// ---- idols echo on the timeline through the kernel registry ----
{
  t.ok(KP.feedReactionFor('personMoment'), 'personMoment renders through the registry, not the frozen chain');
  const { state, g } = debuted('people-echo');
  let pub = null;
  for (let w = 0; w < 30 && !pub; w++) {
    KP.advanceWeek(state);
    pub = state.inbox.find(n => n.week === state.week && n.ind === 'personMoment');
  }
  t.ok(pub, 'a debuted idol has public moments');
  const out = KP.feedReactionFor('personMoment')(state, pub, KP.rngFor(state));
  t.ok(out && out.persona && /she is exactly who|quality of life/.test(out.text),
    'and the fans answer in their own register');
}

// ---- migration: the staff memo lands once ----
{
  const { state } = debuted('people-mig');
  state.version = '0.7.3';
  const m = KP.deserialize(KP.serialize(state));
  t.ok(m.inbox.some(x => /that goes in the file/.test(x.text)), 'the unsigned staff memo explains the change');
}

// ---- determinism: the people fork clean ----
{
  const { state: a } = debuted('people-fork');
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 25; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the people fork clean');
}

t.finish();
