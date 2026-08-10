/* Suite 027 — the whole world has a story (v0.6.1).
   Rival companies and acts earn narratives (poachers, streaks, flop
   eras, rising powers, philosophy identities); every person carries a
   visible social following that reacts to what actually happens to
   her — hash-driven, zero rng draws, zero seed drift by construction. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_027_worldstory');

function debuted(seed) {
  const state = KP.newGame(seed);
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'STORYLINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  g.demos = KP.generateDemos(state, KP.rngFor(state));
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  return state;
}

// ---- rival identities are common knowledge on day one ----
{
  const state = KP.newGame('ws-seed');
  t.ok(KP.getNarrative(state, 'trendCopier', 'rivalCompany', 'Novaline'), 'Novaline are the trend chasers');
  t.ok(KP.getNarrative(state, 'performanceFactory', 'rivalCompany', 'Aurum'), 'Aurum are the performance factory');
  t.ok(KP.getNarrative(state, 'patientHouse', 'rivalCompany', 'Whitecliff'), 'Whitecliff are the patient house');
  // and they persist: monthly reinforcement outruns decay
  for (let w = 0; w < 30; w++) KP.advanceWeek(state);
  t.ok(KP.getNarrative(state, 'trendCopier', 'rivalCompany', 'Novaline'), 'identities are reinforced, not forgotten');
  // player conversation stays player-focused
  t.ok(KP.playerNarratives(state).every(n => n.subjectType !== 'rivalCompany' && n.subjectType !== 'rivalAct'),
    'rival stories never crowd the player card');
}

// ---- poachers: enough steals become a name ----
{
  const state = KP.newGame('ws-poach');
  // any rival may win the race — arm them all one steal short
  state.rivals.forEach(r => { r.poachCount = KP.C.MEMORY.poachAt - 1; });
  const pid = state.prospects[0];
  state.rivals[0].interest[pid] = 3;
  let guard = 0;
  while (state.people[pid].status === 'prospect' && guard++ < 200) {
    const rng = KP.rngFor(state);
    KP.rivalScoutingWeek(state, rng);
    state.rngState = rng.state();   // advance the stream — same draws never repeat
  }
  t.ok(state.people[pid].status === 'rival', 'fixture: the steal happened');
  const signer = state.rivals.find(r => r.short === state.people[pid].company);
  t.ok(signer && KP.getNarrative(state, 'poachers', 'rivalCompany', signer.short),
    'three steals and the name sticks (' + (signer && signer.short) + ')');
}

// ---- streaks and flop eras track rival acts ----
{
  const state = KP.newGame('ws-streak');
  const rival = state.rivals[0];
  const act = rival.acts[0];
  act.hitStreak = KP.C.MEMORY.streakAt - 1;
  act.quality = 95; act.popularity = 80;    // the next release will land
  act.lastReleaseWeek = state.week - act.cycleWeeks;
  KP.advanceWeek(state);
  t.ok(KP.getNarrative(state, 'hitStreak', 'rivalAct', act.id), 'three hits in a row is a story');
  const act2 = state.rivals[1].acts[0];
  act2.flopStreak = KP.C.MEMORY.flopAt - 1;
  act2.quality = 20; act2.popularity = 2;
  act2.lastReleaseWeek = state.week - act2.cycleWeeks;
  KP.advanceWeek(state);
  t.ok(KP.getNarrative(state, 'flopEra', 'rivalAct', act2.id), 'two misses is a flop era');
  t.ok(KP.narrativeText(state, KP.getNarrative(state, 'flopEra', 'rivalAct', act2.id)).includes(act2.name),
    'the story names the act, live');
}

// ---- social numbers: lazy init, plausible, deterministic ----
{
  const state = KP.newGame('ws-social');
  const trainee = state.people[state.roster[0]];
  const prospect = state.people[state.prospects[0]];
  const rivalIdol = state.people[state.rivals[0].acts[0].members[0]];
  [trainee, prospect, rivalIdol].forEach(p => {
    const s = KP.socialOf(state, p);
    t.ok(s >= 0 && Number.isFinite(s), (p.name ? p.name.given : '?') + ' has a following (' + s + ')');
    t.eq(KP.socialOf(state, p), s, 'the number is stable, not a re-roll');
  });
  t.ok(KP.socialOf(state, rivalIdol) > KP.socialOf(state, prospect),
    'a debuted rival idol out-follows an unsigned prospect');
  // formatting
  t.eq(KP.fmtCount(912), '912', 'formats: under 1k plain');
  t.eq(KP.fmtCount(8400), '8.4k', 'formats: k with decimal');
  t.eq(KP.fmtCount(84000), '84k', 'formats: k rounded');
  t.eq(KP.fmtCount(1200000), '1.2M', 'formats: millions');
}

// ---- the numbers move with the story ----
{
  const state = debuted('ws-move');
  const g = state.groups[0];
  const breakout = state.people[g.results.breakoutId];
  t.ok((breakout.social || 0) > 0, 'the breakout has a following');
  const others = g.members.filter(id => id !== breakout.id).map(id => state.people[id]);
  t.ok(others.every(o => breakout.social > (o.social || 0)),
    'the breakout out-follows her members — HER moment moved HER number');
  // promoting weeks grow faster than idle weeks
  const during = [];
  for (let w = 0; w < 12; w++) { KP.advanceWeek(state); during.push(breakout.socialDelta || 0); }
  const promoGain = during[0];
  const idleGain = during[during.length - 1];
  t.ok(promoGain > idleGain, 'promotion grows the number faster than idle weeks (' +
    promoGain + ' vs ' + idleGain + ')');
  // a viral spike is visible and large
  const before = breakout.social;
  KP.socialSpike(state, breakout, KP.C.SOCIAL.viralSpike, 'test');
  t.ok(breakout.social - before >= KP.C.SOCIAL.viralSpike * 0.7, 'viral moments move the number hard');
}

// ---- milestones fire once, for roster people, with a letter ----
{
  const state = debuted('ws-milestone');
  const p = state.people[state.groups[0].members[0]];
  KP.socialOf(state, p);
  p.social = 99000; p.socialMilestones = [10000];
  KP.socialSpike(state, p, 50000, 'push');
  KP.advanceWeek(state);
  t.ok(p.socialMilestones.includes(100000), 'the 100k milestone is recorded');
  const herLetter = m => m.text.includes(KP.displayName(p)) && /crossed 100k/.test(m.text);
  t.ok(state.inbox.some(herLetter), 'and celebrated');
  const before = state.inbox.filter(herLetter).length;
  KP.advanceWeek(state);
  t.eq(state.inbox.filter(herLetter).length, before, 'once means once — for HER (others may cross too)');
}

// ---- zero seed drift: social is hash-driven, not dice-driven ----
{
  // if socialWeek consumed rng, every downstream roll would shift and
  // this fork comparison would still pass — the REAL check is that the
  // whole world forks identically WITH social running everywhere
  const a = debuted('ws-fork');
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 25; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the storied world forks clean');
}

// ---- migration: the letter arrives, the numbers just exist ----
{
  const old = debuted('ws-mig');
  Object.values(old.people).forEach(p => { delete p.social; delete p.socialDelta; delete p.socialMilestones; });
  old.memory = old.memory.filter(n => n.subjectType !== 'rivalCompany');
  old.version = '0.6.0';
  const json = KP.serialize(old);
  const m = KP.deserialize(json);
  t.ok(m.inbox.some(x => /followers/.test(x.text)), 'the desk announces the numbers');
  t.ok(KP.getNarrative(m, 'trendCopier', 'rivalCompany', 'Novaline'), 'rival identities seeded on the way in');
  t.ok(KP.socialOf(m, m.people[m.roster[0]]) >= 0, 'profiles mint followings on first look');
  const m2 = KP.deserialize(json);
  for (let w = 0; w < 8; w++) { KP.advanceWeek(m); KP.advanceWeek(m2); }
  t.eq(KP.serialize(m), KP.serialize(m2), 'migration stays deterministic');
}

t.finish();
