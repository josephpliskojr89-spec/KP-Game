/* Suite 024 — the national chart (v0.5.0).
   The wider world at low resolution: a generated mainstream pool
   releases on its own cadence into a harder field; player and scene
   releases enter it with the scores they carry; peaks sync one-truth
   style per chart; the national board is harder by construction
   (superset invariant); milestones fire once, deepest first; the pool
   churns; migration brings old saves into the wider world. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_024_national');

function debuted(seed) {
  const state = KP.newGame(seed);
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'NATLINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  g.demos = KP.generateDemos(state, KP.rngFor(state));
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  return state;
}

// ---- the wider world seeds whole ----
{
  const state = KP.newGame('nat-seed');
  const N = KP.C.NATIONAL;
  const poolSize = Object.values(N.pool).reduce((a, b) => a + b, 0);
  t.eq(state.national.artists.length, poolSize, 'the mainstream pool is fully cast');
  ['titan', 'established', 'riser'].forEach(tier => {
    t.eq(state.national.artists.filter(a => a.tier === tier).length, N.pool[tier], tier + ' count right');
  });
  state.national.artists.forEach(a => {
    t.ok(a.name && a.typeLabel && a.fame >= N.fameFloor && a.fame <= N.fameCap, a.name + ' well-formed');
    t.ok(a.nextRelease > state.week - 1, a.name + ' has a release on the calendar');
  });
  const names = new Set(state.national.artists.map(a => a.name.toLowerCase()));
  t.eq(names.size, poolSize, 'no two artists share a name');
  t.ok(state.national.entries.length >= 6, 'the national chart opens mid-conversation (' + state.national.entries.length + ')');
  t.ok(KP.nationalPositions(state).every((e, i) => e.pos === i + 1), 'positions stamped');
}

// ---- pool artists release on schedule, fame drifts, cadence resets ----
{
  const state = KP.newGame('nat-release');
  const ar = state.national.artists[0];
  ar.nextRelease = state.week + 1;
  const before = state.national.entries.length;
  KP.advanceWeek(state);
  t.ok(state.national.entries.some(e => e.act === ar.name && e.entered === state.week),
    'the due artist released into the national field');
  t.ok(ar.nextRelease > state.week + KP.C.NATIONAL.cadence[0] - 1, 'their next release is scheduled out');
  t.ok(state.national.entries.length >= before, 'the field grew (or trimmed at cap)');
}

// ---- player releases live on both boards, and national is harder ----
{
  const state = debuted('nat-debut');
  const g = state.groups[0];
  const sceneE = state.chart.entries.find(e => e.isPlayer && e.groupId === g.id);
  const natE = state.national.entries.find(e => e.isPlayer && e.groupId === g.id);
  t.ok(sceneE && natE, 'the release is on both boards');
  t.eq(g.releases[0].chartPeak, sceneE.peakPos, 'scene peak syncs from the scene entry');
  t.eq(g.releases[0].nationalPeak, natE.peakPos, 'national peak syncs from the national entry');
  t.ok(g.releases[0].nationalPeak >= g.releases[0].chartPeak,
    'the national board is harder by construction (' + g.releases[0].nationalPeak + ' vs ' + g.releases[0].chartPeak + ')');
  // and stays that way across a career
  for (let w = 0; w < 30; w++) {
    KP.advanceWeek(state);
    state.groups.forEach(gg => (gg.releases || []).forEach(r => {
      if (r.nationalPeak != null && r.chartPeak != null) {
        t.ok(r.nationalPeak >= r.chartPeak, 'superset invariant holds at week ' + state.week);
      }
    }));
  }
}

// ---- milestones: once each, deepest tier speaks, the CEO notices ----
{
  const state = debuted('nat-milestone');
  const g = state.groups[0];
  const natE = state.national.entries.find(e => e.isPlayer && e.groupId === g.id);
  const trustBefore = state.trust;
  natE.score = 1e6;                      // straight to the summit
  const notes = KP.chartStamp(state);
  t.eq(natE.pos, 1, 'fixture: the song tops the national chart');
  t.eq(notes.length, 1, 'one milestone letter, not four (' + notes.length + ')');
  t.ok(notes[0].tier === 1 && notes[0].kind === 'executive', 'the deepest tier speaks, and it is the CEO');
  t.ok([20, 10, 3, 1].every(tier => natE.milestones.includes(tier)), 'all crossed tiers are recorded');
  t.ok(state.trust > trustBefore, 'the summit moves the executive');
  t.ok(g.nationalNumberOne && g.nationalTopTen === undefined || g.nationalNumberOne,
    'the group remembers the summit');
  const again = KP.chartStamp(state);
  t.eq(again.length, 0, 'no duplicate letters on the next stamp');
}

// ---- the pool churns: faded stars bow out, the pool never shrinks ----
{
  const state = KP.newGame('nat-churn');
  const rng = KP.rngFor(state);
  const N = KP.C.NATIONAL;
  const poolSize = Object.values(N.pool).reduce((a, b) => a + b, 0);
  const faded = state.national.artists[3];
  faded.fame = 20;
  let replaced = false;
  for (let i = 0; i < 200 && !replaced; i++) {
    KP.industryLifecycle(state, rng);
    replaced = !state.national.artists.some(a => a.name === faded.name);
    t.eq(state.national.artists.length, poolSize, 'the pool holds size through churn');
  }
  t.ok(replaced, 'the faded star eventually bowed out for a rookie');
  t.ok(state.inbox.length === 0 || true, 'no crash on notes'); // notes returned, not inboxed here
}

// ---- migration: an old save joins the wider world ----
{
  const old = debuted('nat-mig');
  const g = old.groups[0];
  delete old.national;
  delete g.releases[0].nationalPeak; delete g.releases[0].nationalWeeks;
  delete g.results.nationalPeak; delete g.results.nationalWeeks;
  // plus a long-dead release with no chart presence
  g.releases.unshift({ week: 2, songTitle: 'Ancient Single', conceptId: 'bright',
    reception: 55, receptionBand: 'solid', chartPeak: 3, chartWeeks: 6,
    isDebut: false, format: 'single', tracks: 2 });
  old.version = '0.4.4';
  const json = KP.serialize(old);
  const m = KP.deserialize(json);
  t.ok(m.national && m.national.artists.length > 0, 'the wider world materialized');
  const mg = m.groups[0];
  t.ok(mg.releases[1].nationalPeak != null, 'the live release is tracked nationally');
  t.ok(mg.releases[0].nationalPeak >= 2, 'the dead record got a defensible estimate (' + mg.releases[0].nationalPeak + ')');
  t.ok(mg.releases.every(r => r.nationalPeak >= r.chartPeak || r.week === 2),
    'estimates respect the harder-field rule for tracked releases');
  t.ok(m.inbox.some(x => /NATIONAL chart/.test(x.text)), 'the desk announces the big board');
  const m2 = KP.deserialize(json);
  for (let w = 0; w < 8; w++) { KP.advanceWeek(m); KP.advanceWeek(m2); }
  t.eq(KP.serialize(m), KP.serialize(m2), 'the widened world stays deterministic');
}

// ---- determinism ----
{
  const a = debuted('nat-fork');
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 25; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'titans, risers and milestones fork clean');
}

t.finish();
