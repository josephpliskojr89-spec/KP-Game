/* Suite 029 — the rollout desk (v0.6.3).
   Promotion is slotted choices with bills: two bookings a week, costs
   at lock, distinct payoffs per activity, fan signs buying afterglow,
   specials making stories, and a feed that never goes quiet again. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_029_rolloutdesk');

function ready(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'ROLLDESK', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  g.demos = KP.generateDemos(state, KP.rngFor(state));
  return { state, g };
}
function planWith(state, g, rollout) {
  return KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 },
    rollout });
}
function rideToDebut(state, g) {
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
}

// ---- the rails: slots, unknown bookings, bills ----
{
  const { state, g } = ready('rd-rails');
  t.ok(!planWith(state, g, [['countdown'], ['countdown']]).ok, 'the plan covers all four weeks');
  t.ok(!planWith(state, g, [['countdown', 'variety', 'radio'], [], [], []]).ok,
    'two bookings a week is the ceiling');
  t.ok(!planWith(state, g, [['tokyoDome'], [], [], []]).ok, 'nobody can book Mars');
  const budgetBefore = state.budget;
  const R = KP.C.ROLLOUT;
  const plan = [['countdown', 'challenge'], ['variety'], ['fanSign'], []];
  const planCost = R.ACTIVITIES.countdown.cost + R.ACTIVITIES.challenge.cost +
    R.ACTIVITIES.variety.cost + R.ACTIVITIES.fanSign.cost;
  t.ok(planWith(state, g, plan).ok, 'a legal plan locks');
  t.eq(budgetBefore - state.budget,
    KP.C.DEBUT.promoCost.modest + KP.C.DEBUT.FORMATS[0].cost + planCost,
    'the rollout is billed at lock, per booking');
  t.ok(planWith(state, g, plan).ok === false, 'a release is already locked');
}

// ---- omitting the plan gets the staff suggestion ----
{
  const { state, g } = ready('rd-default');
  t.ok(planWith(state, g, undefined).ok, 'no plan = staff default');
  t.eq(JSON.stringify(g.prep.rollout), JSON.stringify(KP.C.ROLLOUT.DEFAULT), 'and it IS the staff default');
  rideToDebut(state, g);
  t.ok(g.rollout && g.rollout.length === KP.C.ROLLOUT.weeks, 'the plan rides into promotion at release');
}

// ---- activities pay differently: shows build stages, rest breathes ----
{
  const mk = (rollout, seed) => {
    const { state, g } = ready(seed);
    planWith(state, g, rollout);
    rideToDebut(state, g);
    const m0 = state.people[g.members[0]];
    const base = { live: m0.liveExp, media: m0.mediaExp, fatigue: m0.fatigue, pop: g.popularity };
    for (let w = 0; w < KP.C.ROLLOUT.weeks; w++) KP.advanceWeek(state);
    return { state, g, m0, base };
  };
  const shows = mk([['countdown', 'countdown'], ['countdown', 'countdown'], ['countdown', 'countdown'], ['countdown', 'countdown']], 'rd-shows');
  const rests = mk([['rest'], ['rest'], ['rest'], ['rest']], 'rd-rests');
  t.ok(shows.m0.liveExp - shows.base.live > rests.m0.liveExp - rests.base.live + 10,
    'a music-show month builds live reps a rest month cannot');
  t.ok(shows.g.popularity - shows.base.pop > rests.g.popularity - rests.base.pop,
    'and more popularity');
  t.ok(rests.m0.fatigue < shows.m0.fatigue, 'a rest month costs less of the humans (' +
    Math.round(rests.m0.fatigue) + ' vs ' + Math.round(shows.m0.fatigue) + ')');
  const variety = mk([['variety', 'variety'], ['variety', 'variety'], ['variety', 'variety'], ['variety', 'variety']], 'rd-var');
  t.ok(variety.m0.mediaExp - variety.base.media > shows.m0.mediaExp - shows.base.media,
    'a variety month builds faces instead');
}

// ---- fan signs buy afterglow ----
{
  const { state, g } = ready('rd-grace');
  planWith(state, g, [['fanSign'], ['fanSign'], ['fanSign'], ['fanSign']]);
  rideToDebut(state, g);
  t.eq(g.promoGrace, 4 * KP.C.ROLLOUT.ACTIVITIES.fanSign.gracePerWeek,
    'four fan-sign weeks stretch the afterglow (' + g.promoGrace + ' weeks)');
}

// ---- specials: the encore moment exists and makes a story ----
{
  let encoreSeen = false, challengeSeen = false;
  for (let s = 0; s < 30 && !(encoreSeen && challengeSeen); s++) {
    const { state, g } = ready('rd-special-' + s);
    g.members.forEach(id => { state.people[id].talents.vocals.cur = 80; });
    planWith(state, g, [['countdown', 'challenge'], ['countdown', 'challenge'],
      ['countdown', 'challenge'], ['countdown', 'challenge']]);
    rideToDebut(state, g);
    for (let w = 0; w < KP.C.ROLLOUT.weeks; w++) KP.advanceWeek(state);
    if (state.inbox.some(m => /murdered the vocal/.test(m.text))) encoreSeen = true;
    if (state.inbox.some(m => /broke containment/.test(m.text))) challengeSeen = true;
  }
  t.ok(encoreSeen, 'the encore moment fires across seeds — the Gaya clip is real');
  t.ok(challengeSeen, 'the challenge goes viral across seeds');
}

// ---- the feed never goes quiet (owner: "1 or 2 posts a week") ----
{
  const state = KP.newGame('rd-volume', null, { legacy: false });
  let minWeek = 99;
  for (let w = 0; w < 40; w++) {
    KP.advanceWeek(state);
    const thisWeek = state.feed.filter(p => p.week === state.week).length;
    minWeek = Math.min(minWeek, thisWeek);
    t.ok(thisWeek <= KP.C.FEED.weeklyMax, 'weekly cap holds (' + thisWeek + ')');
  }
  t.ok(minWeek >= KP.C.FEED.weeklyMin,
    'EVERY week posts at least ' + KP.C.FEED.weeklyMin + ' (worst week: ' + minWeek + ')');
}

// ---- migration: old focus becomes a plan in the same spirit ----
{
  const { state, g } = ready('rd-mig');
  planWith(state, g, undefined);
  rideToDebut(state, g);
  delete g.rollout; delete g.promoGrace;
  g.promoFocus = 'fanCare';
  delete state.groups[0].prep;
  state.version = '0.6.2';
  const m = KP.deserialize(KP.serialize(state));
  const mg = m.groups[0];
  t.ok(mg.rollout && mg.rollout.every(wk => wk.includes('fanSign')), 'fanCare converts to fan-sign weeks');
  t.eq(mg.promoGrace, 8, 'and keeps its afterglow');
  t.ok(m.inbox.some(x => /rollout desk is open/.test(x.text)), 'the desk announces the job');
}

// ---- determinism ----
{
  const { state, g } = ready('rd-fork');
  planWith(state, g, [['countdown', 'fanSign'], ['challenge'], ['variety', 'radio'], ['rest']]);
  rideToDebut(state, g);
  const b = KP.deserialize(KP.serialize(state));
  for (let w = 0; w < 15; w++) { KP.advanceWeek(state); KP.advanceWeek(b); }
  t.eq(KP.serialize(state), KP.serialize(b), 'the planned rollout forks clean');
}

t.finish();
