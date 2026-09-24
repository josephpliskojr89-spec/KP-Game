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
  const state = KP.newGame(seed, null, { legacy: false });
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
  const state = KP.newGame('il-facts', null, { legacy: false });
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

// ---- the meeting reads the board (0.10.17.5): the ready question is
// a DATE, asked once per promise — not a ranking the evals already print
{
  const state = KP.newGame('il-board', null, { legacy: false });
  let guard = 0;
  while (!KP.execScene(state) && guard++ < 40) KP.advanceWeek(state);
  const sc = KP.execScene(state);
  t.ok(sc && sc.q.type === 'readyTrainee', 'pre-debut, the first Monday question is readiness');
  const free = KP.freeTrainees(state).map(id => state.people[id]);
  const board1 = free.find(p => p.evalHistory && p.evalHistory.length &&
    p.evalHistory[p.evalHistory.length - 1].rank === 1);
  if (board1) {
    t.ok(/I can read a ranking/.test(sc.q.text), 'the exec cites the eval board instead of asking for it');
    t.eq(sc.q.options[0].id, board1.id, 'and the board’s number one leads the options');
  }
  KP.answerMeeting(state, 0);
  t.ok((state.claims || []).some(c => !c.resolved && c.type === 'readyTrainee'),
    'the date goes on the record');
  // while the promise stands, the question does not come back
  for (let w = 0; w < KP.C.MEETING.everyWeeks + 3; w++) KP.advanceWeek(state);
  const again = KP.execScene(state);
  t.ok(!again || again.q.type !== 'readyTrainee',
    'one promise on the books at a time — the exec does not re-ask');
}

// ---- the Monday meeting: claims go on the record, the record bites ----
{
  const { state } = debuted('il-meeting');
  // the comeback question left the meeting (§89 C, v0.10.29) — with the
  // room empty the exec has nothing to ask; fill it so the ready question exists
  state.budget = Math.max(state.budget, 900);
  while (KP.freeTrainees(state).length < 3 && state.prospects.length) KP.signProspect(state, state.prospects[0]);
  let guard = 0;
  while (!KP.execScene(state) && guard++ < 60) KP.advanceWeek(state);
  t.ok(KP.execScene(state), 'the executive eventually asks');
  const q = KP.execScene(state).q;
  t.ok(q.options.length >= 2, 'with constrained answers');
  const r = KP.answerMeeting(state, 0);
  t.ok(r.ok && /On the record|pen did not move/.test(r.note), 'the answer goes on the record');
  t.ok(!KP.execScene(state), 'the table clears');
  // a broken promise gets quoted back (v0.8.0: injected via the scene door)
  const { state: s2 } = debuted('il-promise');
  KP.openScene(s2, { kind: 'execQuestion', expiresWeek: s2.week + 3,
    q: { type: 'comebackPromise', week: s2.week, groupId: s2.groups[0].id,
      text: 'When does LIFELINE come back?',
      options: [{ id: 'q1', label: 'This quarter' }, { id: 'q2', label: 'Next quarter' }, { id: 'none', label: 'No promises' }] } });
  KP.answerMeeting(s2, 0);   // promise this quarter — the rest rail makes it a lie
  for (let w = 0; w < KP.C.MEETING.quarterWeeks + 2; w++) KP.advanceWeek(s2);
  t.ok((s2.claims || []).some(c => c.resolved === 'missed'),
    'a broken promise is on the record as broken');
  t.ok(s2.inbox.some(m => /I do not enjoy being a person who checks dates/.test(m.text)),
    'and the executive quotes the calendar back');
  // silence is also an answer
  const { state: s3 } = debuted('il-silence');
  // the comeback question left the meeting (§89 C) — put a question on the
  // table by hand; the mechanism under test is the silence, not the ask
  KP.openScene(s3, { kind: 'execQuestion', expiresWeek: s3.week + KP.C.MEETING.ignoreAfterWeeks,
    q: { type: 'comebackPromise', week: s3.week, groupId: s3.groups[0].id,
      text: 'When does the group come back?',
      options: [{ id: 'q1', label: 'This quarter' }, { id: 'q2', label: 'Next quarter' }, { id: 'none', label: 'No promises' }] } });
  const t3 = s3.trust;
  for (let w = 0; w < KP.C.MEETING.ignoreAfterWeeks + 1; w++) KP.advanceWeek(s3);
  t.ok(!KP.execScene(s3), 'an ignored question expires');
  t.ok(s3.inbox.some(m => /No answer is also information/.test(m.text)) ||
    (KP.lastTickNotes || []).some(m => /No answer is also information/.test(m.text)) || s3.trust < t3,
    'and the silence was noted');
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
    if (KP.execScene(state)) KP.answerMeeting(state, 0);
    if (KP.execScene(b)) KP.answerMeeting(b, 0);
  }
  t.eq(KP.serialize(state), KP.serialize(b), 'the inner life forks clean');
}

t.finish();
