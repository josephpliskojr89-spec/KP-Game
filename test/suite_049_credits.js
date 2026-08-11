/* Suite 049 — the credits (v0.9.7). The names behind the songs become
   people: a persistent producer pool with home lanes and visible track
   records; repeat collaboration hardens into a signature sound; the
   rejected demo comes back as a rival hit; members who reach for a pen
   get their names in the booklet; the timeline quotes itself; and
   February belongs to the graduation gowns. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_049_credits');

function debuted(seed) {
  const state = KP.newGame(seed);
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'BYLINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  return { state, g };
}
function release(state, g, format) {
  state.week = Math.max(state.week, (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks + 1, (g.tourRestUntil || 0) + 1);
  g.lastTourWeek = g.lastTourWeek || -999;
  g.demos = KP.generateDemos(state, KP.rngFor(state), g);
  const r = KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    format: format || 'single', week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  if (!r.ok) throw new Error('fixture release failed: ' + r.reason);
  let guard = 0;
  while (g.prep && guard++ < 12) KP.advanceWeek(state);
}

// ---- the pool: persistent, named, laned ----
{
  const { state } = debuted('cr-pool');
  const pool = KP.producersOf(state);
  t.eq(pool.length, KP.C.CREDITS.producerCount, 'the writers’ room has ' + pool.length + ' names');
  t.eq(new Set(pool.map(p => p.name)).size, pool.length, 'every name distinct');
  t.ok(pool.every(p => KP.conceptById(p.lane)), 'every producer has a home lane');
  const again = KP.deserialize(KP.serialize(state));
  t.eq(JSON.stringify(KP.producersOf(again)), JSON.stringify(pool), 'the pool survives the save');
}

// ---- the track record: works ledger + signature sound ----
{
  const { state, g } = debuted('cr-sig');
  const rel0 = g.releases[0];
  t.ok(rel0.producerId, 'the release carries its producer');
  const pr = KP.producerById(state, rel0.producerId);
  t.eq(pr.works.length, 1, 'and the producer keeps the receipt');
  t.ok(['unproven', 'cold streak', 'workmanlike', 'reliable', 'in demand'].includes(KP.producerHeat(pr)),
    'the track record reads in words (' + KP.producerHeat(pr) + ')');
  // sculpt a repeat collaboration: same producer, three records
  const target = pr.id;
  for (let i = 0; i < 2; i++) {
    release(state, g);
    const rel = g.releases[g.releases.length - 1];
    // pin the collaboration — the mechanism under test is the narrative,
    // not the pitch lottery
    if (rel.producerId !== target) {
      pr.works.push({ week: state.week, title: rel.songTitle, reception: rel.reception, groupId: g.id });
    }
  }
  const together = pr.works.filter(w => w.groupId === g.id).length;
  t.ok(together >= KP.C.CREDITS.signatureAt, 'fixture: three records together');
  // the narrative forms on the next release ledger pass
  KP.recordEvidence(state, 'signatureSound', 'group', g.id, { producer: pr.name });
  const nar = KP.getNarrative(state, 'signatureSound', 'group', g.id);
  t.ok(nar, 'a signature sound is canon');
  t.ok(KP.narrativeText(state, nar).includes(pr.name), 'and it names the producer');
}

// ---- the ghost: rejected, shopped, resurfaced ----
{
  const { state, g } = debuted('cr-ghost');
  state.ghostDemos = [];
  release(state, g);   // lock harvests the best rejected demo
  // force a harvest regardless of hook luck: sculpt then re-lock
  if (!state.ghostDemos.length) {
    state.week = Math.max(state.week, (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks + 1);
    g.demos = KP.generateDemos(state, KP.rngFor(state), g);
    g.demos.slice(1).forEach(d => { d.hook = 80; });
    KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
      week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
    KP.advanceWeek(state);
  }
  t.ok(state.ghostDemos.length >= 1, 'the demo left on the table got shopped');
  const gh = state.ghostDemos[0];
  t.ok(gh.title && gh.producer && gh.groupName === 'BYLINE', 'the ghost knows where it came from');
  // age it, hand the world a rival hit, pin the coin
  gh.week = state.week - KP.C.CREDITS.ghostAgeWeeks - 1;
  const C = KP.C.CREDITS;
  const oldChance = C.ghostChance, oldHitAt = C.ghostHitAt;
  C.ghostChance = 1;
  C.ghostHitAt = 1;   // pinned: the mechanism is the resurfacing, not
                      // whether this stream's rivals charted hot enough
  let told = false, guard = 0;
  while (!told && guard++ < 30) {
    KP.advanceWeek(state);
    told = state.inbox.some(n => n.ind === 'ghostDemo');
  }
  C.ghostChance = oldChance; C.ghostHitAt = oldHitAt;
  t.ok(told, 'the ghost story gets told (needs any rival release inside 30 weeks)');
  t.ok(state.inbox.find(n => n.ind === 'ghostDemo').text.includes('passed on'),
    'and it stings exactly right');
}

// ---- the pen: members write, the booklet says so ----
{
  const { state, g } = debuted('cr-pen');
  // make the whole room writers and the pen certain
  g.members.forEach(id => { state.people[id].personality.creativity = 90; });
  const C = KP.C.CREDITS;
  const old = C.writeChance;
  C.writeChance = 1;
  release(state, g, 'mini');
  C.writeChance = old;
  const rel = g.releases[g.releases.length - 1];
  const penned = (rel.tracklist || []).filter(tk => tk.writtenBy);
  t.ok(penned.length >= 1, 'a member reached for the pen');
  t.ok(penned.length <= C.writeCapPerRecord, 'capped — a record, not a mixtape');
  const writer = state.people[penned[0].writtenBy];
  t.ok(g.members.includes(writer.id), 'the writer is in the room');
  t.eq(writer.flags.writerCredits, penned.filter(tk => tk.writtenBy === writer.id).length,
    'the pen count is on the file');
  t.ok(writer.history.some(h => /First songwriting credit/.test(h.text)), 'the first credit is history');
  t.ok(state.inbox.some(n => n.ind === 'memberWrote'), 'and the booklet gets read out loud');
  t.ok(KP.feedReactionFor('memberWrote') && KP.feedReactionFor('ghostDemo') && KP.feedReactionFor('graduation'),
    'every credits ind answers through the registry');
}

// ---- the quote chain: the timeline talks to itself ----
{
  const state = KP.newGame('cr-quote');
  const F = KP.C.FEED;
  const old = F.quoteChance;
  F.quoteChance = 1;
  for (let w = 0; w < 6; w++) KP.advanceWeek(state);
  F.quoteChance = old;
  const quotes = state.feed.filter(p => p.quotes);
  t.ok(quotes.length >= 3, 'the quote-posts ride (' + quotes.length + ' in 6 weeks)');
  t.ok(quotes.every(q => state.feed.some(p => p.handle === q.quotes)),
    'every quote points at a real post');
}

// ---- the gowns: February graduations ----
{
  const { state, g } = debuted('cr-grad');
  const p = state.people[g.members[0]];
  p.age = 19;
  delete p.flags.gradNoted;
  let guard = 0;
  while (((state.week - 1) % KP.C.WEEKS_PER_YEAR) + 1 !== 5 && guard++ < 60) KP.advanceWeek(state);
  p.age = 19;   // re-pin: a birthday on the ride would age her past the gown
  KP.advanceWeek(state);
  t.ok(p.flags.gradNoted, 'the gown photo happened');
  t.ok(p.history.some(h => /Graduated high school/.test(h.text)), 'and the file keeps it');
  t.ok(state.inbox.some(n => n.ind === 'graduation'), 'the whole internet behaves for a day');
}

// ---- determinism ----
{
  const { state: a, g: ga } = debuted('cr-fork');
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 40; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'pools, ghosts, pens, and quotes fork clean');
}

t.finish();
