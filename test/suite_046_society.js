/* Suite 046 — the society + the home circuit (v0.9.4).
   The industry has waiting rooms: cross-company friendships form on
   promo weeks, send coffee trucks, congratulate in public; seniors
   stan rookies; debut classes resurface at award season. And the KR
   leg is a routed national circuit whose sold-out cities earn second
   nights. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_046_society');

function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'WROOM', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  return { state, g };
}
function openCalendar(state, g) {
  state.week = Math.max(state.week,
    (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks + 1, (g.tourRestUntil || 0) + 1);
  g.lastTourWeek = -999;
}

// ---- the home circuit: routed cities, one truth ----
{
  const { state, g } = debuted('soc-route');
  g.popularity = 70;
  const route = KP.krRoute(state, g, 'halls');
  t.eq(route[0], 'seoul', 'Seoul anchors every circuit');
  t.ok(route.length >= 4, 'a hot fanbase routes deep into the country (' + route.length + ' cities)');
  g.popularity = 32;
  const thin = KP.krRoute(state, g, 'halls');
  t.ok(thin.length < route.length, 'a thin fanbase books fewer rooms');
  t.eq(thin[0], 'seoul', 'but Seoul still anchors');
  // arenas demand more than small cities can promise
  g.popularity = 70;
  const arena = KP.krRoute(state, g, 'arenas');
  t.ok(arena.length <= route.length, 'bigger rooms, shorter routing — the promoter is honest');
}

// ---- the circuit plays: dates, money, second nights ----
{
  const { state, g } = debuted('soc-circuit');
  g.popularity = 78;
  openCalendar(state, g);
  const budget0 = state.budget;
  const r = KP.planTour(state, { groupId: g.id, scale: 'halls', legs: ['kr'], pacing: 'humane', setlist: 'hits' });
  t.ok(r.ok, 'the circuit books');
  t.ok(g.tour.kr && g.tour.kr.route.length >= 5, 'the route rides in the tour state');
  const weeksExpected = Math.ceil(g.tour.kr.route.length / KP.C.TOUR.datesPerWeek);
  let weeks = 0;
  while (g.tour && weeks++ < 12) KP.advanceWeek(state);
  t.eq(weeks, weeksExpected, 'two cities a week — the circuit takes ' + weeksExpected + ' weeks, not two');
  const circuit = state.inbox.find(n => n.ind === 'tourCircuit');
  t.ok(circuit, 'the circuit wrap letter lands');
  t.ok(circuit.encores >= 1, 'a fanbase this hot earns second nights (' + circuit.encores + ')');
  t.ok(/second night/.test(circuit.text), 'and the letter says so');
  t.ok(state.inbox.some(n => n.ind === 'tourLeg' && /asked for a second night and got it/.test(n.text)),
    'the weekly report names the city that asked');
  t.ok(state.budget > budget0, 'a hot home circuit pays for itself');
  t.ok(state.week <= (g.tourRestUntil || 0), 'contractual rest still follows the road');
  t.eq(KP.validateState(state).length, 0, 'invariants hold across the circuit');
}

// ---- the soft circuit: honest rooms, no encores ----
{
  const { state, g } = debuted('soc-soft');
  // halls at pop 40: Seoul fills solidly, nothing sells out — rooms
  // matched to the fanbase, not undersized into a fake sellout
  g.popularity = 40;
  openCalendar(state, g);
  const r = KP.planTour(state, { groupId: g.id, scale: 'halls', legs: ['kr'], pacing: 'humane', setlist: 'hits' });
  t.ok(r.ok, 'right-sized rooms still book');
  let weeks = 0;
  while (g.tour && weeks++ < 12) KP.advanceWeek(state);
  const circuit = state.inbox.find(n => n.ind === 'tourCircuit');
  t.ok(circuit && circuit.encores === 0, 'nobody asks a lukewarm room for a second night');
}

// ---- the waiting room: friendships form, personality-gated ----
{
  const { state, g } = debuted('soc-friend');
  // make the room maximally friendly and the calendar busy
  g.members.forEach(id => { state.people[id].personality.warmth = 80; });
  const S = KP.C.SOCIETY;
  const oldChance = S.friendChance;
  S.friendChance = 1;
  let guard = 0;
  while (!(state.industryFriends || []).length && guard++ < 60) {
    if (!g.prep && state.week > (g.promoUntil || 0) &&
        state.week > (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks && g.demos && g.demos.length &&
        state.week > (g.tourRestUntil || 0)) {
      KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
        week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
    }
    KP.advanceWeek(state);
  }
  S.friendChance = oldChance;
  t.ok((state.industryFriends || []).length >= 1, 'a promo week made a friend across company lines');
  const f = state.industryFriends[0];
  const ours = state.people[f.a], theirs = state.people[f.b];
  t.ok(ours && g.members.includes(f.a), 'ours is ours');
  t.ok(theirs && theirs.status === 'rival', 'theirs is theirs');
  t.eq(ours.gender, theirs.gender, 'same halls, same waiting rooms');
  t.ok(ours.history.some(h => /waiting room/.test(h.text)), 'the friendship goes in the file');
  t.ok(state.inbox.some(n => n.ind === 'industryFriend'), 'and the note lands');
  t.ok(KP.friendsOf(state, f.a).length === 1, 'friendsOf reads it back');
  t.ok(KP.feedReactionFor('industryFriend') && KP.feedReactionFor('coffeeTruck') &&
    KP.feedReactionFor('seniorStan') && KP.feedReactionFor('debutClass') &&
    KP.feedReactionFor('industryCongrats'), 'every society ind answers through the registry');
}

// ---- the senior stan: once, early, remembered ----
{
  const { state, g } = debuted('soc-stan');
  const S = KP.C.SOCIETY;
  const old = S.seniorStanChance;
  S.seniorStanChance = 1;
  KP.advanceWeek(state);
  S.seniorStanChance = old;
  t.ok(g.seniorStanWeek, 'a senior noticed the rookie');
  const note = state.inbox.find(n => n.ind === 'seniorStan');
  t.ok(note && note.priority === 'high', 'a senior speaking is news, never trimmed');
  const rookie = state.people[note.personId];
  t.ok(rookie.history.some(h => /favorite rookie/.test(h.text)), 'the file remembers being chosen');
  // never twice
  const before = state.inbox.filter(n => n.ind === 'seniorStan').length;
  S.seniorStanChance = 1;
  KP.advanceWeek(state);
  S.seniorStanChance = old;
  t.eq(state.inbox.filter(n => n.ind === 'seniorStan').length, before, 'a prophecy only lands once');
}

// ---- award season: the debut class lines up ----
{
  const { state, g } = debuted('soc-class');
  // sculpt the classmate: a rival act on the same starting line (stream
  // luck used to provide one; the v0.9.5 shift taught us not to gamble)
  const mate = state.rivals[0].acts[0];
  mate.retired = false;
  mate.debutWeek = g.debutWeek;
  let guard = 0;
  while (!state.inbox.some(n => n.ind === 'debutClass') && guard++ < 120) KP.advanceWeek(state);
  const note = state.inbox.find(n => n.ind === 'debutClass');
  t.ok(note, 'award season lines the class up (needs a same-year rival debut)');
  if (note) t.ok(/debut class/.test(note.text) && note.text.includes(g.name), 'the class includes the group');
}

// ---- determinism: the society forks clean ----
{
  const { state: a } = debuted('soc-fork');
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 40; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'waiting rooms, trucks, and circuits fork clean');
}

t.finish();
