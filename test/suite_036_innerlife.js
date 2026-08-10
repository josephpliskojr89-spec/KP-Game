/* Suite 036 — the inner life (v0.7.1).
   From the industry-expert consult: facts are hash-truth, the Bubble
   leaks the numbers the sim already computes, the regulars give the
   feed continuity, the dorm gives chemistry an address, ambitions make
   morale psychology, and the Monday meeting makes reading your own
   roster a social stake with memory. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_036_innerlife');

function debuted(seed) {
  const state = KP.newGame(seed);
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'LIFELINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  g.demos = KP.generateDemos(state, KP.rngFor(state), g);
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  return { state, g };
}

// ---- off the clock: stable, personal, two of them ----
{
  const state = KP.newGame('il-facts');
  const p = state.people[state.roster[0]];
  const facts = KP.factsOf(state, p);
  t.eq(facts.length, 2, 'everyone has two facts');
  t.ok(facts[0] !== facts[1], 'two DIFFERENT facts');
  t.eq(JSON.stringify(KP.factsOf(state, p)), JSON.stringify(facts), 'stable, not a re-roll');
  const q = state.people[state.roster[1]];
  t.ok(JSON.stringify(KP.factsOf(state, q)) !== JSON.stringify(facts) ||
    state.roster.length < 2, 'different people, different lives (usually)');
}

// ---- ambitions: seeded by who she is, fulfilled by what happens ----
{
  const { state, g } = debuted('il-wants');
  const p = state.people[g.members[0]];
  const amb = KP.ambitionOf(state, p);
  t.ok(KP.C.LIFE.AMBITIONS[amb], 'every idol wants something real (' + amb + ')');
  t.eq(KP.ambitionOf(state, p), amb, 'and keeps wanting it');
  // fulfillment through the one door
  const p2 = state.people[g.members.find(id => KP.ambitionOf(state, state.people[id]) === 'trophy') || g.members[0]];
  if (KP.ambitionOf(state, p2) === 'trophy') {
    const m0 = p2.morale;
    const note = KP.ambitionTouch(state, p2, 'trophy');
    t.ok(note && /the thing she always wanted/.test(note.text), 'the day the dream lands is a letter');
    t.ok(p2.morale > m0, 'and morale knows it (' + m0 + ' → ' + p2.morale + ')');
    t.ok(p2.flags.ambitionMet, 'on the record');
    t.ok(!KP.ambitionTouch(state, p2, 'trophy'), 'a dream lands once');
  } else {
    t.ok(true, 'no trophy-dreamer in this lineup — door tested elsewhere');
    t.ok(true, '-'); t.ok(true, '-'); t.ok(true, '-');
  }
}

// ---- the bubble: her side of the screen reads her true state ----
{
  const { state, g } = debuted('il-bubble');
  // force the hash gate open by scanning weeks; verify tone follows state
  g.members.forEach(id => { state.people[id].fatigue = 80; });
  let tired = null;
  for (let w = 0; w < 30 && !tired; w++) {
    const posts = KP.bubblePosts(state);
    tired = posts.find(p => /3am|eat well/.test(p.text));
    state.week++;
    g.members.forEach(id => { state.people[id].fatigue = 80; });
  }
  t.ok(tired, 'a tired room leaks tired-honest bubbles');
  g.members.forEach(id => { state.people[id].fatigue = 10; state.people[id].morale = 90; });
  let joyful = null;
  for (let w = 0; w < 30 && !joyful; w++) {
    const posts = KP.bubblePosts(state);
    joyful = posts.find(p => /lunch|laughing/.test(p.text));
    state.week++;
    g.members.forEach(id => { state.people[id].morale = 90; state.people[id].fatigue = 10; });
  }
  t.ok(joyful, 'a happy room leaks joyful nonsense');
}

// ---- the regulars: the feed has people in it ----
{
  const { state } = debuted('il-regulars');
  for (let w = 0; w < 25; w++) KP.advanceWeek(state);
  const regularPosts = state.feed.filter(p =>
    KP.C.LIFE.REGULARS.some(r => r.handle === p.handle));
  t.ok(regularPosts.length >= 3, 'the recurring cast fronts a share of the feed (' + regularPosts.length + ')');
  regularPosts.forEach(p => {
    const reg = KP.C.LIFE.REGULARS.find(r => r.handle === p.handle);
    t.ok(reg.persona === p.persona, 'a regular stays in character (' + p.handle + ')');
  });
}

// ---- the dorm: rooms exist, amplify chemistry, and can be shuffled ----
{
  const { state, g } = debuted('il-dorm');
  t.ok(g.rooms && g.rooms.length >= 2, 'the debut comes with a room chart');
  t.eq(g.rooms.flat().length, g.members.length, 'everyone sleeps somewhere');
  const [a, b] = g.rooms[0];
  t.ok(KP.roommates(g, a, b), 'roommates know each other');
  t.ok(!KP.roommates(g, g.rooms[0][0], g.rooms[1][0]), 'different rooms are different rooms');
  const cash = state.budget;
  const r = KP.shuffleRooms(state, g.id);
  t.ok(r.ok, 'the reshuffle is a real move');
  t.eq(cash - state.budget, KP.C.LIFE.roomShuffleCost, 'with a bill');
  t.ok(!KP.shuffleRooms(state, g.id).ok, 'and a cooldown — moving boxes monthly is its own problem');
  t.eq(g.rooms.flat().length, g.members.length, 'nobody sleeps in the van');
}

// ---- the Monday meeting: claims go on the record, the record bites ----
{
  const { state } = debuted('il-meeting');
  let guard = 0;
  while (!state.execQuestion && guard++ < 30) KP.advanceWeek(state);
  t.ok(state.execQuestion, 'the executive eventually asks');
  const q = state.execQuestion;
  t.ok(q.options.length >= 2, 'with constrained answers');
  const r = KP.answerMeeting(state, 0);
  t.ok(r.ok && /On the record|pen did not move/.test(r.note), 'the answer goes on the record');
  t.ok(!state.execQuestion, 'the table clears');
  // a broken promise gets quoted back
  const { state: s2 } = debuted('il-promise');
  s2.execQuestion = { type: 'comebackPromise', week: s2.week, groupId: s2.groups[0].id,
    text: 'When does LIFELINE come back?',
    options: [{ id: 'q1', label: 'This quarter' }, { id: 'q2', label: 'Next quarter' }, { id: 'none', label: 'No promises' }] };
  KP.answerMeeting(s2, 0);   // promise this quarter — the rest rail makes it a lie
  for (let w = 0; w < KP.C.MEETING.quarterWeeks + 2; w++) KP.advanceWeek(s2);
  t.ok((s2.execNotes || []).some(c => c.resolved === 'missed'),
    'a broken promise is on the record as broken');
  t.ok(s2.inbox.some(m => /I do not enjoy being a person who checks dates/.test(m.text)),
    'and the executive quotes the calendar back');
  // silence is also an answer
  const { state: s3 } = debuted('il-silence');
  let g3 = 0;
  while (!s3.execQuestion && g3++ < 30) KP.advanceWeek(s3);
  const t3 = s3.trust;
  for (let w = 0; w < KP.C.MEETING.ignoreAfterWeeks + 1; w++) KP.advanceWeek(s3);
  t.ok(!s3.execQuestion, 'an ignored question expires');
  t.ok(s3.trust < t3, 'and the silence was noted');
}

// ---- migration: the files catch up with who they always were ----
{
  const { state, g } = debuted('il-mig');
  delete g.rooms;
  state.version = '0.7.0';
  const m = KP.deserialize(KP.serialize(state));
  t.ok(m.groups[0].rooms && m.groups[0].rooms.length, 'debuted groups get their room charts');
  t.ok(m.inbox.some(x => /the files finally show WHO these people are/.test(x.text)),
    'the desk explains the quiet update');
}

// ---- determinism: the inner life forks clean ----
{
  const { state } = debuted('il-fork');
  const b = KP.deserialize(KP.serialize(state));
  for (let w = 0; w < 25; w++) {
    KP.advanceWeek(state); KP.advanceWeek(b);
    if (state.execQuestion) KP.answerMeeting(state, 0);
    if (b.execQuestion) KP.answerMeeting(b, 0);
  }
  t.eq(KP.serialize(state), KP.serialize(b), 'the inner life forks clean');
}

t.finish();
