/* Suite 019 — the living world (v0.4.0).
   Rivals arrive with acts and keep working, the scene chart cools and
   drops, crowded weeks cost reception by formula, the company lifecycle
   respects the floor and the ceiling, the migration wakes old saves up,
   and determinism survives all of it. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_019_industry');

function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'WORLDLINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  g.demos = KP.generateDemos(state, KP.rngFor(state));
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  return state;
}

// ---- the world arrives seeded ----
{
  const state = KP.newGame('ind-seed', null, { legacy: false });
  t.ok(state.rivals.every(r => r.prestige != null && r.prestige > 0), 'every rival has prestige');
  t.ok(state.rivals.every(r => (r.acts || []).length >= 1), 'every rival already runs at least one act');
  t.ok(state.rivals.every(r => r.nextDebutWeek > state.week), 'every rival has a debut on the calendar');
  t.ok(state.rivals.every(r => r.acts.every(a => a.releases.length >= 1)), 'seeded acts have release history');
  t.ok(state.chart && state.chart.entries.length >= 1, 'the chart opens mid-story');
  t.ok(state.chart.entries.every(e => e.pos >= 1), 'seeded chart entries carry stamped positions');
  t.ok(state.feed.length >= 3, 'the feed opens mid-argument');
  t.ok(state.feed.every(p => p.handle && p.text && p.week != null && p.likes >= 0), 'feed posts are well-formed');
}

// ---- rival debuts happen, on schedule, with consequences ----
{
  const state = KP.newGame('ind-debut', null, { legacy: false });
  const rival = state.rivals[0];
  const actsBefore = rival.acts.length;
  const rosterBefore = 10;
  rival.rosterCount = rosterBefore;
  rival.nextDebutWeek = state.week + 1;
  KP.advanceWeek(state);
  t.eq(rival.acts.length, actsBefore + 1, 'the scheduled debut happened');
  const act = rival.acts[rival.acts.length - 1];
  t.ok(act.debutWeek === state.week && act.releases.length === 1, 'the new act debuted this week with a lead single');
  t.ok(rival.rosterCount < rosterBefore, 'the debut consumed trainees');
  t.ok(rival.nextDebutWeek > state.week + KP.C.INDUSTRY.debutInterval[0] - 1, 'the next debut is rescheduled out');
  t.ok(state.chart.entries.some(e => e.act === act.name), 'the debut single entered the scene chart');
  t.ok(state.inbox.some(m => m.ind === 'rivalDebut' && m.actName === act.name), 'the debut made the wire');
  t.ok((state.rivalReleasesThisWeek || 0) >= 1, 'the release counted toward the crowded-week tally');
}

// ---- comeback cycles turn ----
{
  const state = KP.newGame('ind-cycle', null, { legacy: false });
  const rival = state.rivals[0];
  const act = rival.acts[0];
  const relBefore = act.releases.length;
  act.lastReleaseWeek = state.week - act.cycleWeeks;   // due now
  KP.advanceWeek(state);
  t.eq(act.releases.length, relBefore + 1, 'a due act came back');
  t.eq(act.lastReleaseWeek, state.week, 'the cycle clock reset');
  const rel = act.releases[act.releases.length - 1];
  t.ok(rel.reception >= 1 && rel.reception <= 100, 'rival reception stays on the scale');
  t.ok(state.chart.entries.some(e => e.title === rel.title), 'the comeback entered the chart');
}

// ---- the chart cools and drops ----
{
  const state = KP.newGame('ind-chart', null, { legacy: false });
  KP.chartEnter(state, { title: 'Fading Test', act: 'TESTACT', company: 'X', isPlayer: false,
    score: 10, entered: state.week });
  KP.advanceWeek(state);
  const e1 = state.chart.entries.find(x => x.title === 'Fading Test');
  t.ok(e1 && Math.abs(e1.score - 8.8) < 0.001 && e1.weeksOn === 1, 'an entry cools by the decay factor');
  KP.advanceWeek(state);
  t.ok(!state.chart.entries.some(x => x.title === 'Fading Test'), 'a cold entry drops off the chart');
  t.ok(KP.chartPositions(state).every((e, i) => e.pos === i + 1), 'positions are stamped in score order');
}

// ---- the player release charts, and the crowd penalty is a formula ----
{
  t.eq(KP.crowdPenalty({ rivalReleasesThisWeek: 0 }), 0, 'an empty week costs nothing');
  t.eq(KP.crowdPenalty({}), 0, 'a legacy state without the field costs nothing');
  t.eq(KP.crowdPenalty({ rivalReleasesThisWeek: 2 }), 5, 'two rival releases cost 2×2.5');
  t.eq(KP.crowdPenalty({ rivalReleasesThisWeek: 10 }), KP.C.INDUSTRY.crowdPenaltyMax, 'the penalty caps');

  const state = debuted('ind-crowd');
  const g = state.groups[0];
  t.ok(state.chart.entries.some(e => e.isPlayer && e.groupId === g.id), 'the player debut entered the scene chart');
  t.ok(g.results.crowd != null, 'the report records the week it landed in');

  // fork: identical states, one facing a crowded week — reception differs
  // by exactly the penalty (crowd consumes no rng)
  const mk = () => {
    const s = KP.newGame('ind-crowd2', null, { legacy: false });
    const ids = s.roster.slice(0, 5);
    KP.proposeGroup(s, 'CROWDTEST', ids, KP.roleHints(s, ids.map(i => s.people[i])));
    const gg = s.groups[0];
    gg.demos = KP.generateDemos(s, KP.rngFor(s));
    KP.planDebut(s, { groupId: gg.id, songId: gg.demos[0].id, promo: 'modest',
      week: s.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
    gg.prep.progress = 6; s.week = gg.prep.scheduledWeek;
    return s;
  };
  const a = mk(), b = mk();
  a.rivalReleasesThisWeek = 0;
  b.rivalReleasesThisWeek = 2;
  const ra = KP.resolveDebut(a, KP.rngFor(a), a.groups[0]);
  const rb = KP.resolveDebut(b, KP.rngFor(b), b.groups[0]);
  t.eq(ra.reception - rb.reception, 5, 'a crowded week costs exactly the formula (' + ra.reception + ' vs ' + rb.reception + ')');
}

// ---- lifecycle: bounds hold, companies fall / merge / split / emerge ----
{
  const state = KP.newGame('ind-life', null, { legacy: false });
  const rng = KP.rngFor(state);
  // stage the scene: a starved third company, a weak fourth, and a giant
  const mkRival = (short, prestige, roster, acts) => ({
    name: short + ' Entertainment', short, philosophy: 'patient', blurb: 'test',
    prestige, rosterCount: roster, nextDebutWeek: 9999, interest: {}, acts, recentMoves: [],
  });
  const liveAct = () => ({ name: 'ACT' + Math.floor(rng.next() * 1e6), concept: 'bright', quality: 50,
    popularity: 40, debutWeek: 1, lastReleaseWeek: 1, cycleWeeks: 9999, releases: [], retired: false });
  state.rivals.push(mkRival('Starved', 10, 3, []));
  state.rivals.push(mkRival('Weakling', 20, 5, [liveAct()]));
  state.rivals.push(mkRival('Gigantic', 85, 22, [liveAct()]));
  let collapsed = false, merged = false, split = false, emerged = false;
  const baseShorts = new Set(state.rivals.map(r => r.short));
  for (let i = 0; i < 600; i++) {
    KP.industryLifecycle(state, rng);
    const I = KP.C.INDUSTRY;
    t.ok(state.rivals.length >= I.minRivals && state.rivals.length <= I.maxRivals + 0,
      'rival count stays within [' + I.minRivals + ',' + I.maxRivals + '] (iteration ' + i + ': ' + state.rivals.length + ')');
    if (!state.rivals.some(r => r.short === 'Starved')) collapsed = true;
    if (state.rivals.some(r => (r.blurb || '').includes('merger'))) merged = true;
    if (state.rivals.some(r => (r.blurb || '').includes('defectors'))) split = true;
    if (state.rivals.some(r => !baseShorts.has(r.short))) emerged = true;
    state.rivals.forEach(r => {
      t.ok(r.name && r.short && r.prestige != null && r.interest && r.acts && r.nextDebutWeek != null,
        'every company on the scene is fully formed (' + r.short + ')');
    });
    if (collapsed && merged && split && emerged && i > 60) break;
  }
  t.ok(collapsed, 'a starved company eventually folded');
  t.ok(merged, 'two strugglers eventually merged');
  t.ok(split, 'the giant eventually shed a faction');
  t.ok(emerged, 'fresh money eventually entered the scene');
  // >=3, not >=4: the starved company can exit via the merge (one event
  // covers two observed outcomes)
  t.ok((state.lifecycleEvents || 0) >= 3, 'lifecycle events are counted (' + state.lifecycleEvents + ')');
}

// ---- migration: a 0.3.3 save wakes up in the living world ----
{
  const old = KP.newGame('ind-mig', null, { legacy: false });
  // strip v0.4.0 state to fake the old shape
  delete old.chart; delete old.feed; delete old.lifecycleEvents;
  old.rivals.forEach(r => { delete r.prestige; delete r.acts; delete r.nextDebutWeek; });
  old.version = '0.3.3';
  const json = KP.serialize(old);
  const migrated = KP.deserialize(json);
  t.eq(migrated.version, KP.C.VERSION, 'the save is stamped forward');
  t.ok(migrated.chart && Array.isArray(migrated.chart.entries), 'the chart switched on');
  t.ok(migrated.feed.length >= 3, 'the feed switched on');
  t.ok(migrated.rivals.every(r => r.prestige != null && r.acts.length >= 1 && r.nextDebutWeek != null),
    'existing rivals gained prestige, acts and a calendar');
  t.ok(migrated.inbox.some(m => /industry desk has expanded/.test(m.text)),
    'the expansion is narrated in the fiction');
  // and the migrated world continues deterministically
  const m2 = KP.deserialize(json);
  for (let w = 0; w < 8; w++) { KP.advanceWeek(migrated); KP.advanceWeek(m2); }
  t.eq(KP.serialize(migrated), KP.serialize(m2), 'two migrations of the same save stay identical');
}

// ---- determinism: the whole living world forks clean ----
{
  const a = KP.newGame('ind-fork', null, { legacy: false });
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 30; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'chart, feed, rivals and lifecycle are all seed-stable');
}

t.finish();
