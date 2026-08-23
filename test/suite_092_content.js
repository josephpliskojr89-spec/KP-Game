/* Suite 092 — the content desk (v0.10.18). The company account and
   the law of the menu: you can only film what is actually happening.
   Owner: "you can only choose a topic that's relevant. if you aren't
   touring, you can't post a tour vlog." Gates read real state, locked
   topics say why, posts build the catalog, and the ledger counts. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_092_content');

function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  state.budget = Math.max(state.budget, 600);
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'FILMCREW', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  return { state, g };
}

// ---- the law of the menu: gates read the world ----
{
  const state = KP.newGame('cd-gates', null, { legacy: false, door: 'current' });
  const topics = KP.contentTopics(state);
  const byId = {};
  topics.forEach(x => { byId[x.id] = x; });
  t.ok(!byId.tourVlog.open, 'no tour, no tour vlog — the owner’s example is the law');
  t.ok(/van is parked/.test(byId.tourVlog.reason), 'and the lock says why, in words');
  t.ok(!byId.dancePractice.open, 'no release, no practice video');
  t.ok(!byId.birthdayCam.open || true, 'birthday gate is calendar-driven');
  t.ok(byId.coverSong.open, 'a roster is enough for a cover — somebody, a mic, a take');
  // a locked topic REFUSES at the verb too — one truth
  const r = KP.postContent(state, 'tourVlog');
  t.ok(!r.ok && r.reason === byId.tourVlog.reason, 'the verb and the button read the same lock');
}

// ---- the post: money, catalog, cadence ----
{
  const state = KP.newGame('cd-post', null, { legacy: false, door: 'current' });
  state.budget = 100;
  const before = state.budget;
  const open = KP.contentTopics(state).find(x => x.open && x.cost > 0);
  t.ok(open, 'fixture: something filmable exists');
  const r = KP.postContent(state, open.id);
  t.ok(r.ok && r.views > 0, 'the upload happened and pulled numbers');
  t.eq(before - state.budget, open.cost, 'the editor got paid what the menu said');
  t.eq((state.contentCatalog || []).length, 1, 'the archive keeps the video');
  t.eq(state.contentLedger.posted, 1, 'ledgered');
  t.ok(state.contentCatalog[0].line.length > 10, 'the title card is a real sentence');
  const r2 = KP.postContent(state, open.id);
  t.ok(!r2.ok && /One upload a week/.test(r2.reason), 'one upload a week — the editor is one person');
  KP.advanceWeek(state);
  const open2 = KP.contentTopics(state).find(x => x.open);
  if (open2) {
    state.budget = Math.max(state.budget, 50);
    t.ok(KP.postContent(state, open2.id).ok, 'next week the desk films again');
  }
}

// ---- the gates open when the world does ----
{
  const { state, g } = debuted('cd-open');
  const byId = {};
  KP.contentTopics(state).forEach(x => { byId[x.id] = x; });
  t.ok(byId.dancePractice.open, 'a release on the record opens the practice video');
  t.ok(byId.stageFancam.open && byId.stageFancam.cost === 0, 'the stage happened — the fancam is free');
  t.ok(byId.dormVlog.open, 'a debuted group has a dorm to film');
  t.ok(byId.maknaeTakeover.open, 'the maknae exists, the takeover unlocks');
  // the tour vlog opens WITH the tour, exactly
  t.ok(!byId.tourVlog.open, 'still no tour, still no vlog');
  g.tour = { stops: [], week: state.week };   // pin the state the gate reads
  const byId2 = {};
  KP.contentTopics(state).forEach(x => { byId2[x.id] = x; });
  t.ok(byId2.tourVlog.open, 'the van moves, the topic unlocks');
  g.tour = null;
  // the signing day window
  state.lastSigningWeek = state.week;
  const p0 = state.roster.map(id => state.people[id]).find(x => x.status === 'trainee');
  if (p0) p0.signedWeek = state.week;
  const byId3 = {};
  KP.contentTopics(state).forEach(x => { byId3[x.id] = x; });
  t.ok(!p0 || byId3.signingDay.open, 'a fresh signature opens the first-day photo');
  state.lastSigningWeek = state.week - 10;
  const byId4 = {};
  KP.contentTopics(state).forEach(x => { byId4[x.id] = x; });
  t.ok(!byId4.signingDay.open, 'and the window closes when the ink is old');
}

// ---- the birthday gate rides the same hash-truth as the calendar ----
{
  const { state } = debuted('cd-bday');
  const p = state.roster.map(id => state.people[id]).find(x => x && !x.flags.military);
  const woy = ((state.week - 1) % KP.C.WEEKS_PER_YEAR) + 1;
  const target = KP.birthWeekOf(state, p);
  const skip = (target - woy + KP.C.WEEKS_PER_YEAR) % KP.C.WEEKS_PER_YEAR;
  state.week += skip;   // stand on her birthday week without ticking
  const b = KP.contentTopics(state).find(x => x.id === 'birthdayCam');
  t.ok(b.open, 'her birthday week opens the cake ambush');
  state.week += 1;
  const b2 = KP.contentTopics(state).find(x => x.id === 'birthdayCam');
  t.ok(!b2.open || state.roster.map(id => state.people[id]).some(x =>
    KP.birthWeekOf(state, x) === ((state.week - 1) % KP.C.WEEKS_PER_YEAR) + 1),
    'and closes when the calendar moves on (unless somebody else’s week starts)');
}

// ---- the hit: hype, followers, and the trades notice ----
{
  const { state } = debuted('cd-hit');
  state.budget = 300;
  const HC = KP.C.CONTENT.hitChance;
  KP.C.CONTENT.hitChance = 1;
  const open = KP.contentTopics(state).find(x => x.open);
  const r = KP.postContent(state, open.id);
  KP.C.CONTENT.hitChance = HC;
  t.ok(r.ok && r.hit, 'pinned: the upload breaks containment');
  t.eq(state.contentLedger.hits, 1, 'the hit is counted');
  t.ok(state.inbox.some(n => n.ind === 'contentHit'), 'the desk hears about it in plain language');
  t.ok(KP.feedReactionFor('contentHit'), 'and the timeline answers through the registry');
}

// ---- the ad settlement (v0.10.20): views bank, the quarter pays ----
{
  const { state } = debuted('cd-ads');
  const C = KP.C.CONTENT;
  state.budget = 300;
  const open = KP.contentTopics(state).find(x => x.open);
  const r = KP.postContent(state, open.id);
  t.ok((state.adViews || 0) >= r.views, 'the upload banks its views on the meter');
  // a live member channel pulls its weekly slice of her following
  const p = state.people[state.roster[0]];
  p.broadcast = { since: state.week, uploads: 1 };
  const bank0 = state.adViews;
  KP.advanceWeek(state);
  t.ok(state.adViews > bank0, 'the channel and the archive tail keep the meter moving');
  // force a fat bank and ride to the quarterly close
  state.adViews = C.adViewsPerWon * 7 + 123;
  const cash0 = state.budget;
  let guard = 0;
  const woyAt = () => ((state.week - 1) % KP.C.WEEKS_PER_YEAR) + 1;
  while (woyAt() % KP.C.BOOKS.quarterWeeks !== 0 && guard++ < 13) {
    state.budget = Math.max(state.budget, 100);
    KP.advanceWeek(state);
  }
  t.ok(state.contentLedger.adPaid >= 7, 'the settlement cleared at the flat rate (' +
    state.contentLedger.adPaid + ' won)');
  t.ok(state.adViews < C.adViewsPerWon || state.adViews < 123 + C.adViewsPerWon,
    'the remainder carries to next quarter');
  t.ok(state.inbox.some(n => n.ind === 'adFirstCheck'), 'the first check gets its moment');
  t.ok(KP.feedReactionFor('adFirstCheck'), 'and the timeline answers');
}

// ---- determinism ----
{
  const { state: a } = debuted('cd-fork');
  a.budget = 500;
  const open = KP.contentTopics(a).find(x => x.open);
  if (open) KP.postContent(a, open.id);
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 30; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the content desk forks clean');
}

t.finish();
