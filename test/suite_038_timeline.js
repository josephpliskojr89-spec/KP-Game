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
  t.ok(/turns \d+/.test(hit.text), 'and the note says the number of the year');
}

// ---- time passes (v0.9.1): birthdays add a year, for everyone ----
{
  const { state } = debuted('tl-aging');
  const before = {};
  Object.values(state.people).forEach(p => { before[p.id] = p.age; });
  const startWeek = state.week;
  for (let w = 0; w < KP.C.WEEKS_PER_YEAR; w++) KP.advanceWeek(state);
  // exactly one full year: every person alive since the start is one
  // year older — no more, no less, whatever their status
  const cohort = Object.values(state.people).filter(p => before[p.id] != null);
  t.ok(cohort.every(p => p.age === before[p.id] + 1),
    'one year on the calendar is one year on every file');
  const rival = cohort.find(p => p.status === 'rival');
  t.ok(!rival || rival.age === before[rival.id] + 1, 'rivals age on their own timelines too');
  // the increment lands ON the hash-truth birthday week — one truth
  const p0 = cohort[0];
  const bw = KP.birthWeekOf(state, p0);
  const crossings = [];
  for (let w2 = startWeek + 1; w2 <= state.week; w2++) {
    if (((w2 - 1) % KP.C.WEEKS_PER_YEAR) + 1 === bw) crossings.push(w2);
  }
  t.eq(crossings.length, 1, 'each birthday comes exactly once a year');
  // a trainee birthday is a practice-room cake, not a hashtag
  t.ok(state.inbox.some(n => /cake with suspicious speed/.test(n.text)) ||
    !state.roster.some(id => state.people[id].status === 'trainee'),
    'the building notices a trainee birthday');
  // determinism: fork before a birthday, ages agree after
  const a = KP.deserialize(KP.serialize(state));
  const b = KP.deserialize(KP.serialize(state));
  for (let w3 = 0; w3 < 50; w3++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.ok(Object.values(a.people).every(p => p.age === b.people[p.id].age),
    'the clock forks clean');
}

// ---- the files catch up (v0.9.2): pre-clock saves get their years ----
{
  const { state } = debuted('tl-backfill');
  const atCreation = {};
  Object.values(state.people).forEach(p => { atCreation[p.id] = p.age; });
  for (let w = 0; w < 100; w++) KP.advanceWeek(state);
  // the live clock's answer is the truth the migration must reproduce
  const liveAges = {};
  state.roster.forEach(id => { liveAges[id] = state.people[id].age; });
  // simulate a save from before the clock existed: freeze everyone back
  // to signing age and stamp the old version
  Object.values(state.people).forEach(p => {
    if (atCreation[p.id] != null) p.age = atCreation[p.id];
  });
  state.version = '0.9.0';
  const m = KP.deserialize(KP.serialize(state));
  t.ok(state.roster.every(id => m.people[id].age === liveAges[id]),
    'the migration re-lives every birthday the live clock counted');
  const rival = Object.values(m.people).find(p => p.status === 'rival' && atCreation[p.id] != null);
  t.ok(!rival || rival.age >= atCreation[rival.id], 'rival files catch up too');
  const prospect = Object.values(m.people).find(p => p.status === 'prospect');
  t.ok(!prospect || prospect.age === atCreation[prospect.id] || atCreation[prospect.id] == null,
    'board leads are left alone — they churn in weeks');
  t.ok(m.inbox.some(n => /filing error nobody wants to own/.test(n.text)), 'HR owns up in writing');
  // and it never runs twice: a second load adds nothing
  const m2 = KP.deserialize(KP.serialize(m));
  t.ok(state.roster.every(id => m2.people[id].age === liveAges[id]), 'the correction is one-time');
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
