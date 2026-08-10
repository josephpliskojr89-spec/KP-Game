/* Suite 034 — the road (v0.6.8).
   Tours: a scale you can fill, legs the map has earned, pacing with a
   human cost, a setlist with a point. Every leg reports honestly —
   sold out, solid, or soft. Plus the PR desk's new file: the posting
   incident, likelier when the roster is running on fumes. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_034_tours');

function debuted(seed) {
  const state = KP.newGame(seed);
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'ROADLINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  g.demos = KP.generateDemos(state, KP.rngFor(state), g);
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  while (state.week <= (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks) KP.advanceWeek(state);
  return { state, g };
}
function ride(state, g, weeks) {
  for (let w = 0; w < weeks && g.tour; w++) KP.advanceWeek(state);
}

// ---- the rails: eligibility, gates, bills ----
{
  const { state, g } = debuted('rd-rails');
  g.popularity = 50;
  t.ok(!KP.planTour(state, { groupId: g.id, scale: 'stadiums', legs: ['kr'] }).ok, 'unknown scales are refused');
  t.ok(!KP.planTour(state, { groupId: g.id, scale: 'clubs', legs: [] }).ok, 'a tour needs legs');
  t.ok(!KP.planTour(state, { groupId: g.id, scale: 'clubs', legs: ['kr', 'kr'] }).ok, 'one leg per market');
  t.ok(!KP.planTour(state, { groupId: g.id, scale: 'clubs', legs: ['mars'] }).ok, 'no promoter operates on Mars');
  const cold = KP.planTour(state, { groupId: g.id, scale: 'arenas', legs: ['eu'] });
  t.ok(!cold.ok && /empty seats/.test(cold.reason), 'a cold region cannot book an arena — the promoter refuses');
  const before = state.budget;
  const r = KP.planTour(state, { groupId: g.id, scale: 'clubs', legs: ['kr'], pacing: 'humane', setlist: 'hits' });
  t.ok(r.ok, 'a sane booking books');
  t.eq(before - state.budget, r.cost, 'production is billed up front');
  t.ok(!KP.planTour(state, { groupId: g.id, scale: 'clubs', legs: ['kr'] }).ok, 'one road at a time');
  t.ok(!KP.planDebut(state, { groupId: g.id, songId: 'x', week: state.week + 6 }).ok,
    'the studio is closed while they tour');
}

// ---- the leg reports honestly: sold out vs soft ----
{
  const { state, g } = debuted('rd-soldout');
  g.popularity = 80;   // demand 80 vs clubs sweet spot 18 → sold out in minutes
  KP.planTour(state, { groupId: g.id, scale: 'clubs', legs: ['kr'] });
  const cash = state.budget;
  ride(state, g, KP.C.TOUR.legWeeks + 1);
  t.ok(state.inbox.some(m => /SOLD OUT in minutes/.test(m.text)), 'under-booking a hot room is narrated');
  t.ok(state.budget > cash, 'and the money is real');

  const { state: s2, g: g2 } = debuted('rd-soft');
  g2.popularity = 32;  // demand 32 vs arenas sweet spot 60 → curtained sections
  KP.regionsOf(g2);
  KP.planTour(s2, { groupId: g2.id, scale: 'arenas', legs: ['kr'] });
  const morale0 = s2.people[g2.members[0]].morale;
  ride(s2, g2, KP.C.TOUR.legWeeks + 1);
  t.ok(s2.inbox.some(m => /curtained off/.test(m.text)), 'over-booking is narrated without mercy');
  t.ok(s2.people[g2.members[0]].morale < morale0, 'and the members feel the empty seats');
}

// ---- touring grows the region — that is the point ----
{
  const { state, g } = debuted('rd-grow');
  g.popularity = 60;
  const regions = KP.regionsOf(g);
  regions.jp = 30;
  KP.planTour(state, { groupId: g.id, scale: 'clubs', legs: ['jp'] });
  ride(state, g, KP.C.TOUR.legWeeks + 1);
  t.ok(KP.regionsOf(g).jp > 30 + KP.C.TOUR.regionGainPerLeg * 0.5,
    'a leg warms its market (' + KP.regionsOf(g).jp.toFixed(1) + ')');
}

// ---- pacing is a human decision; a real leader runs the room ----
{
  const mk = (seed, pacing, leadership) => {
    const { state, g } = debuted(seed);
    g.popularity = 60;
    KP.regionsOf(g).jp = 35;   // a market warm enough for theaters
    state.people[g.roles.leader].personality.leadership = leadership;
    g.members.forEach(id => { state.people[id].fatigue = 10; });
    KP.planTour(state, { groupId: g.id, scale: 'halls', legs: ['kr', 'jp'], pacing });
    ride(state, g, KP.C.TOUR.legWeeks * 2 + 1);
    return g.members.reduce((s, id) => s + state.people[id].fatigue, 0) / g.members.length;
  };
  const punishing = mk('rd-pace', 'punishing', 20);
  const humane = mk('rd-pace', 'humane', 20);
  const led = mk('rd-pace', 'punishing', 80);
  t.ok(punishing > humane + 3, 'punishing pacing costs the humans (' +
    punishing.toFixed(0) + ' vs ' + humane.toFixed(0) + ')');
  t.ok(led < punishing, 'a leader who runs the room takes the edge off (' + led.toFixed(0) + ')');
}

// ---- the setlist has a point: new material seeds the next era ----
{
  const { state, g } = debuted('rd-setlist');
  g.popularity = 60;
  KP.planTour(state, { groupId: g.id, scale: 'clubs', legs: ['kr'], setlist: 'newMaterial' });
  ride(state, g, KP.C.TOUR.legWeeks + 1);
  t.eq(g.tourHype, KP.C.TOUR.SETLISTS.newMaterial.nextReleaseHype, 'the road tested the songs');
  t.ok(state.week <= g.tourRestUntil, 'post-tour rest is contractual');
  t.ok(!KP.planTour(state, { groupId: g.id, scale: 'clubs', legs: ['kr'] }).ok, 'no touring through the rest');
  t.eq(g.toursDone, 1, 'the tour is on the record');
}

// ---- the posting incident: tired people post carelessly ----
{
  t.ok(KP.C.DISCOURSE.KINDS.gaffe, 'the PR desk has the file');
  let seen = null;
  for (let s = 0; s < 30 && !seen; s++) {
    const { state, g } = debuted('rd-gaffe-' + s);
    g.members.forEach(id => {
      const p = state.people[id];
      p.social = 60000; p.fatigue = 85;   // famous and running on fumes
    });
    for (let w = 0; w < 6 && !seen; w++) {
      KP.advanceWeek(state);
      const d = (state.discourses || []).find(x => x.kind === 'gaffe' && x.status === 'live');
      if (d) seen = { state, d };
      g.members.forEach(id => { state.people[id].fatigue = 85; });
    }
  }
  t.ok(seen, 'a 2am post finds daylight across seeds');
  if (seen) {
    const { state, d } = seen;
    t.ok(/reads very differently in daylight/.test(KP.discourseHeadline(state, d)),
      'the headline knows the genre');
    const r = KP.respondDiscourse(state, d.id, 'apology');
    t.ok(r.ok, 'delete-and-apologize is on the menu');
  }
}

// ---- determinism: the road forks clean ----
{
  const mk = () => {
    const { state, g } = debuted('rd-fork');
    g.popularity = 60;
    KP.regionsOf(g).jp = 35;
    KP.planTour(state, { groupId: g.id, scale: 'halls', legs: ['kr', 'jp'], pacing: 'punishing', setlist: 'fanService' });
    return state;
  };
  const a = mk();
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 20; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the touring world forks clean');
}

// ---- migration: the desk announces the road ----
{
  const { state } = debuted('rd-mig');
  state.version = '0.6.7';
  const m = KP.deserialize(KP.serialize(state));
  t.ok(m.inbox.some(x => /TOURING DESK is live/.test(x.text)), 'the desk explains the road');
}

t.finish();
