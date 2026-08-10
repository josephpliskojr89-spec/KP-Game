/* Suite 038 — the timeline (v0.7.3).
   The feed becomes something you check weekly: regulars with biases
   (adopted at viral moments, quietly dropped after scandals), selca
   days, hash-birthday weeks, livestream clips — all through the
   kernel's registries, zero edits to the drivers. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_038_timeline');

function debuted(seed) {
  const state = KP.newGame(seed);
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'TIMELINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  return { state, g };
}

// ---- regulars develop biases at viral moments ----
{
  const { state, g } = debuted('tl-bias');
  const p = state.people[g.members[0]];
  t.eq(Object.keys(state.feedCast || {}).length, 0, 'the cast starts unattached — taste is earned');
  KP.recordViral(state, p);
  const adopters = KP.biasFor(state, p.id);
  t.ok(adopters.length >= 1, 'a viral moment gets her adopted (' + adopters.join(', ') + ')');
  const before = adopters.slice();
  KP.recordViral(state, p);
  t.ok(KP.biasFor(state, p.id).length >= before.length, 'more moments, more devotion');
  // biased regulars post about her
  let biasPost = null;
  for (let w = 0; w < 20 && !biasPost; w++) {
    biasPost = KP.lifePosts(state).find(x => x.handle === adopters[0]);
    state.week++;
  }
  t.ok(biasPost, 'the adopted account posts about its person');
  t.ok(/daily reminder|thinking about/.test(biasPost.text), 'in its own recognizable voice');
}

// ---- heartbreak: a boiled storm loses her the account ----
{
  const { state, g } = debuted('tl-breakup');
  const p = state.people[g.members[0]];
  KP.recordViral(state, p);
  const adopters = KP.biasFor(state, p.id);
  t.ok(adopters.length >= 1, 'fixture: adopted');
  state.discourses = state.discourses || [];
  state.discourses.push({ id: 'dB', kind: 'gaffe', subjectType: 'idol', subjectId: p.id,
    groupId: g.id, week: state.week + 1, heat: 90, negative: true, status: 'boiled', responded: false });
  KP.advanceWeek(state);
  t.eq(KP.biasFor(state, p.id).length, 0, 'the scandal costs her the account');
  t.ok(state.inbox.some(m => /taking a step back from/.test(m.text)) ||
       state.feed.some(x => /stepping back/.test(x.text)), 'and the quiet post is worse than a thread');
}

// ---- selca day: monthly, industry law ----
{
  const { state } = debuted('tl-selca');
  let seen = 0;
  for (let w = 0; w < 12; w++) {
    KP.advanceWeek(state);
    seen += state.feed.filter(x => /SELCA DAY/.test(x.text) && x.week === state.week).length;
  }
  t.ok(seen >= 2, 'selca day comes around monthly (' + seen + ' in 12 weeks)');
}

// ---- birthdays: hash-derived, celebrated, morale-real ----
{
  const { state, g } = debuted('tl-bday');
  // find the member whose birthday week comes soonest and ride to it
  let hit = null;
  for (let w = 0; w < 50 && !hit; w++) {
    KP.advanceWeek(state);
    hit = state.inbox.find(m => /birthday week/.test(m.text));
  }
  t.ok(hit, 'a birthday week arrives inside a year');
  t.ok(state.feed.some(x => /BIRTHDAY|birthday/.test(x.text)), 'and the timeline shows up for it');
}

// ---- volume: the feed is worth checking weekly, still capped ----
{
  const state = KP.newGame('tl-volume');
  let minWeek = 99;
  for (let w = 0; w < 40; w++) {
    KP.advanceWeek(state);
    const n = state.feed.filter(p => p.week === state.week).length;
    minWeek = Math.min(minWeek, n);
    t.ok(n <= KP.C.FEED.weeklyMax, 'cap holds (' + n + ')');
  }
  t.ok(minWeek >= KP.C.FEED.weeklyMin, 'every week clears the raised floor (worst: ' + minWeek + ')');
}

// ---- kernel dogfood: the new inds are registered, not chained ----
{
  ['idolBirthday', 'liveClip', 'biasBreakup'].forEach(ind => {
    t.ok(KP.feedReactionFor(ind), ind + ' renders through the registry');
  });
}

// ---- migration + determinism ----
{
  const { state } = debuted('tl-mig');
  delete state.feedCast;
  state.version = '0.7.2';
  const m = KP.deserialize(KP.serialize(state));
  t.ok(m.feedCast && typeof m.feedCast === 'object', 'the cast ledger opens');
  t.ok(m.inbox.some(x => /recurring fan accounts now pick FAVORITES/.test(x.text)), 'the desk explains the timeline');

  const { state: a } = debuted('tl-fork');
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 30; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the timeline forks clean');
}

t.finish();
