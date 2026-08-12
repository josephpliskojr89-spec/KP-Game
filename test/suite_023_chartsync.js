/* Suite 023 — one chart (v0.4.4).
   The peak position in a discography IS the scene chart's tracked peak:
   a song that tops the chart records #1, the record updates while the
   entry lives and freezes when it drops, and the migration reconciles
   old contradictory archives. Owner-reported: "#1 on the chart but the
   discography says peaked #41." Never again. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_023_chartsync');

function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'SYNCLINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  g.demos = KP.generateDemos(state, KP.rngFor(state));
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  return state;
}

// ---- the record matches the chart, from day one ----
{
  const state = debuted('cs-match');
  const g = state.groups[0];
  const entry = state.chart.entries.find(e => e.isPlayer && e.groupId === g.id);
  t.ok(entry, 'the release is on the scene chart');
  t.eq(g.results.chartPeak, entry.peakPos, 'the report peak IS the chart peak');
  t.eq(g.releases[0].chartPeak, entry.peakPos, 'the discography peak IS the chart peak');
  t.eq(g.results.chartWeeks, entry.weeksOn + 1, 'weeks charting is real time on the chart');
  // and the specific owner bug: whoever tops the chart records #1
  const top = KP.chartPositions(state)[0];
  if (top.isPlayer) {
    const tg = KP.groupById(state, top.groupId);
    t.eq((tg.releases.find(r => r.week === top.entered) || {}).chartPeak, 1,
      'the #1 song says #1 in its discography');
  }
}

// ---- a chart-topper records #1, and the peak survives the slide ----
{
  const state = debuted('cs-top');
  const g = state.groups[0];
  // force the entry to the summit, then let it decay under rival traffic
  const entry = state.chart.entries.find(e => e.isPlayer && e.groupId === g.id);
  entry.score = 120;   // tops the chart, cools off within the window
  KP.chartStamp(state);
  t.eq(entry.pos, 1, 'fixture: the song tops the chart');
  t.eq(g.releases[0].chartPeak, 1, 'the discography says #1');
  let dropped = false;
  for (let w = 0; w < 35 && !dropped; w++) {
    KP.advanceWeek(state);
    dropped = !state.chart.entries.some(e => e.isPlayer && e.entered === entry.entered);
  }
  t.ok(dropped, 'the entry eventually cooled off the chart');
  t.eq(g.releases[0].chartPeak, 1, 'the peak froze at #1 — history does not decay');
  t.ok(g.releases[0].chartWeeks >= 2, 'weeks-on-chart accumulated while it lived (' + g.releases[0].chartWeeks + ')');
}

// ---- migration: the owner's exact bug, repaired ----
{
  const old = debuted('cs-mig');
  const g = old.groups[0];
  const entry = old.chart.entries.find(e => e.isPlayer && e.groupId === g.id);
  entry.peakPos = 1; entry.pos = 1;
  g.releases[0].chartPeak = 41;            // the legacy formula's contradiction
  g.results.chartPeak = 41;
  // plus a long-dead release with no surviving entry
  g.releases.unshift({ week: 2, songTitle: 'Ghost Single', conceptId: 'bright',
    reception: 70, receptionBand: 'strong', chartPeak: 38, chartWeeks: 5,
    isDebut: false, format: 'single', tracks: 2 });
  old.version = '0.4.3';
  const json = KP.serialize(old);
  const m = KP.deserialize(json);
  const mg = m.groups[0];
  t.eq(mg.releases[1].chartPeak, 1, 'the #1 song finally says #1');
  t.eq(mg.results.chartPeak, 1, 'the stored report agrees');
  const ghost = mg.releases[0];
  t.ok(ghost.chartPeak >= 1 && ghost.chartPeak <= 40, 'dead records land on a plausible scene-chart scale (' + ghost.chartPeak + ')');
  t.ok(ghost.chartPeak <= 3, 'a reception-70 single reads like the hit it was (' + ghost.chartPeak + ')');
  t.ok(m.inbox.some(x => /reconciled the chart archives/.test(x.text)), 'the data team says so');
  const m2 = KP.deserialize(json);
  for (let w = 0; w < 8; w++) { KP.advanceWeek(m); KP.advanceWeek(m2); }
  t.eq(KP.serialize(m), KP.serialize(m2), 'the reconciled world stays deterministic');
}

// ---- consistency invariant: no release ever contradicts a live entry ----
{
  const state = debuted('cs-invariant');
  for (let w = 0; w < 40; w++) {
    KP.advanceWeek(state);
    state.chart.entries.forEach(e => {
      if (!e.isPlayer || e.peakPos == null) return;
      const g = KP.groupById(state, e.groupId);
      const rel = g && (g.releases || []).find(r => r.week === e.entered);
      if (rel) t.ok(rel.chartPeak === e.peakPos,
        'week ' + state.week + ': discography (' + rel.chartPeak + ') agrees with the chart (' + e.peakPos + ')');
    });
  }
}

// ---- determinism ----
{
  const a = debuted('cs-fork');
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 20; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'one chart, one truth, two identical forks');
}

t.finish();
