/* Suite 020 — the fan feed (v0.4.0).
   The feed is curated (weekly cap, total cap), reacts to what actually
   happened, notices hyped trainees, and — a hard content law from the
   founding brief — is never cruel: snark aims at songs, styling and
   companies, NEVER at bodies; no harassment; crushes stay wholesome. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_020_feed');

function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'FEEDLINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  g.demos = KP.generateDemos(state, KP.rngFor(state));
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  return state;
}

// ---- the feed reacts to a player release, by name ----
{
  const state = debuted('feed-release');
  const g = state.groups[0];
  const song = g.results.songTitle;
  t.eq(g.results.week, state.week, 'fixture: the debut resolved this week');
  const fresh = state.feed.filter(p => p.week === state.week);
  t.ok(fresh.length >= 1, 'the fans posted on release day');
  t.ok(fresh.some(p => p.text.includes(g.name) || p.text.includes(song)),
    'a release-day post names the group or the song');
}

// ---- caps: a digest, not a firehose ----
{
  const state = debuted('feed-caps');
  for (let w = 0; w < 120; w++) {
    KP.advanceWeek(state);
    t.ok(state.feed.length <= KP.C.FEED.maxPosts,
      'total cap holds (week ' + state.week + ': ' + state.feed.length + ')');
    const thisWeek = state.feed.filter(p => p.week === state.week).length;
    t.ok(thisWeek <= KP.C.FEED.weeklyMax,
      'weekly cap holds (week ' + state.week + ': ' + thisWeek + ')');
  }
  t.ok(state.feed.length >= 25, 'after 120 weeks the feed is full of life (' + state.feed.length + ')');
  for (let i = 1; i < state.feed.length; i++) {
    t.ok(state.feed[i - 1].week >= state.feed[i].week, 'the feed reads newest-first');
  }
}

// ---- the feed notices a hyped trainee ----
{
  const state = KP.newGame('feed-hype', null, { legacy: false });
  const p = state.people[state.roster[2]];
  p.hype = 85;
  let noticed = false;
  for (let w = 0; w < 30 && !noticed; w++) {
    KP.advanceWeek(state);
    noticed = state.feed.some(post =>
      post.text.includes(KP.displayName(p)) || /the trainee in/.test(post.text));
  }
  t.ok(noticed, 'within a season, the fans are asking about her');
}

// ---- content law: never cruel, never about bodies (negative law) ----
{
  const banned = /\b(fat|skinny|ugly|weight|diet|body|bodies|anorexi\w*|whore|slut|bitch|kill herself|kys)\b/i;
  let scanned = 0;
  for (let s = 0; s < 6; s++) {
    const state = debuted('feed-law-' + s);
    for (let w = 0; w < 60; w++) {
      KP.advanceWeek(state);
      state.feed.filter(p => p.week === state.week).forEach(p => {
        scanned++;
        t.ok(!banned.test(p.text), 'a post crossed the content law: "' + p.text + '"');
      });
    }
  }
  t.ok(scanned >= 100, 'the negative law scanned a real sample (' + scanned + ' posts)');
}

// ---- determinism: the feed is written once, never re-rolled ----
{
  const a = debuted('feed-fork');
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 15; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(JSON.stringify(a.feed), JSON.stringify(b.feed), 'forked feeds stay word-for-word identical');
}

t.finish();
