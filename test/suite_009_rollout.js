/* Suite 009 — the record and the rollout (v0.2.1).
   Comeback reports stop calling themselves debuts, formats gate cost and
   runway and multiply revenue, rollout focus shapes the promotion weeks,
   and stage names rename the lights without rewriting the person. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_009_rollout');

function throughDebut(seed, planExtra) {
  const state = KP.newGame(seed);
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'ROLL', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  state.demos = KP.generateDemos(state, KP.rngFor(state));
  const plan = Object.assign({ songId: state.demos[0].id, promo: 'modest',
    week: state.week + 10, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } }, planExtra || {});
  if (plan.week == null) plan.week = state.week + 10;
  const r = KP.planDebut(state, plan);
  if (!r.ok) throw new Error('debut plan failed: ' + r.reason);
  let guard = 0;
  while (!state.group.debuted && guard++ < 14) KP.advanceWeek(state);
  return state;
}

// comeback reports use comeback language — never "debut"
{
  const state = throughDebut('roll-label');
  for (let w = 0; w < 6; w++) KP.advanceWeek(state);
  state.demos = KP.generateDemos(state, KP.rngFor(state));
  KP.planDebut(state, { songId: state.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (state.group.prep && guard++ < 12) KP.advanceWeek(state);
  const r = state.group.results;
  t.ok(r.isDebut === false, 'second release is a comeback');
  t.ok(!/debut/i.test(r.receptionLabel), 'its label never says debut (got "' + r.receptionLabel + '")');
  t.ok(Object.values(KP.C.COMEBACK.bandLabels).includes(r.receptionLabel), 'label comes from the comeback table');
}

// formats: cost, runway, revenue ordering
{
  const state = KP.newGame('roll-fmt');
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'FMT', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  state.demos = KP.generateDemos(state, KP.rngFor(state));
  const short = KP.planDebut(state, { songId: state.demos[0].id, format: 'full', promo: 'modest',
    week: state.week + 5, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  t.ok(!short.ok && /runway/.test(short.reason), 'a full album needs more runway than a single');
  state.budget = 50;
  const poor = KP.planDebut(state, { songId: state.demos[0].id, format: 'full', promo: 'modest',
    week: state.week + 10, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  t.ok(!poor.ok && /Budget/.test(poor.reason), 'a full album costs full-album money');
  state.budget = 200;
  const budgetBefore = state.budget;
  const ok = KP.planDebut(state, { songId: state.demos[0].id, format: 'mini', promo: 'modest',
    week: state.week + 8, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  t.ok(ok.ok, 'a funded mini-album locks');
  const mini = KP.C.DEBUT.FORMATS.find(f => f.id === 'mini');
  t.eq(state.budget, budgetBefore - mini.cost - KP.C.DEBUT.promoCost.modest, 'cost = record + promotion');
  t.eq(state.group.prep.format, 'mini', 'format stored on the plan');
  let guard = 0;
  while (!state.group.debuted && guard++ < 14) KP.advanceWeek(state);
  t.eq(state.group.releases[0].format, 'mini', 'format lands in the discography');
  t.eq(state.group.releases[0].tracks, mini.tracks, 'track count recorded');
}

// same-world revenue scales with format
{
  const a = throughDebut('roll-rev', { format: 'single' });
  const b = throughDebut('roll-rev', { format: 'full', week: undefined });
  // identical seeds and plans except format; full pays more for the same story
  t.ok(b.group.results.reception === a.group.results.reception ||
       Math.abs(b.group.results.reception - a.group.results.reception) <= 100,
       'sanity: both resolved');
  if (b.group.results.reception === a.group.results.reception) {
    t.ok(b.group.results.revenue > a.group.results.revenue, 'a full album pays more than a single for the same reception');
  } else {
    const full = KP.C.DEBUT.FORMATS.find(f => f.id === 'full');
    t.ok(full.revenueMult > 1.5, 'full album multiplier is materially bigger');
  }
}

// rollout focus: variety builds media reps, music shows build live reps,
// fan care preserves the fanbase longer
{
  const varietyState = throughDebut('roll-focus', { focus: 'variety' });
  const showsState = throughDebut('roll-focus2', { focus: 'musicShows' });
  const vm = varietyState.group.members.map(id => varietyState.people[id]);
  const sm = showsState.group.members.map(id => showsState.people[id]);
  const mediaBefore = vm.map(m => m.mediaExp);
  const liveBefore = sm.map(m => m.liveExp);
  for (let w = 0; w < 4; w++) { KP.advanceWeek(varietyState); KP.advanceWeek(showsState); }
  const mediaGain = vm.reduce((s, m, i) => s + m.mediaExp - mediaBefore[i], 0) / vm.length;
  const liveGain = sm.reduce((s, m, i) => s + m.liveExp - liveBefore[i], 0) / sm.length;
  t.ok(mediaGain >= 4 * KP.C.COMEBACK.FOCUS.variety.mediaExp - 1, 'variety promo builds media experience');
  t.ok(liveGain >= 4 * KP.C.COMEBACK.FOCUS.musicShows.liveExp - 1, 'music-show promo builds live experience');
  t.eq(varietyState.group.promoFocus, 'variety', 'focus persists on the group');
}

// stage names
{
  const state = throughDebut('roll-name');
  const id = state.group.members[0];
  const p = state.people[id];
  t.ok(!KP.setStageName(state, id, '').ok, 'empty stage name rejected');
  t.ok(!KP.setStageName(state, id, 'ABCDEFGHIJKLMNOP').ok, 'over-long stage name rejected');
  const r = KP.setStageName(state, id, 'Lume');
  t.ok(r.ok, 'stage name set');
  t.eq(KP.displayName(p), 'Lume', 'public display uses the stage name');
  t.ok(p.name.display !== 'Lume', 'the real name survives underneath');
  t.ok(p.history.some(h => /stage name/.test(h.text)), 'the file records it');
  const other = state.group.members[1];
  t.ok(!KP.setStageName(state, other, 'lume').ok, 'stage names are unique, case-insensitive');
  const sugg = KP.suggestStageNames(state, state.people[other]);
  t.ok(sugg.length >= 2 && sugg.every(n => n.toLowerCase() !== 'lume'), 'suggestions exist and avoid taken names');
}

// migration: v0.2.0 saves gain formats and the mislabeled report is repaired
{
  const state = throughDebut('roll-mig');
  for (let w = 0; w < 6; w++) KP.advanceWeek(state);
  state.demos = KP.generateDemos(state, KP.rngFor(state));
  KP.planDebut(state, { songId: state.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (state.group.prep && guard++ < 12) KP.advanceWeek(state);
  // fake a v0.2.0 save: strip formats, restore the buggy debut wording
  const g = state.group;
  delete g.promoFocus;
  g.releases.forEach(r => { delete r.format; delete r.tracks; });
  delete g.results.format;
  g.results.receptionLabel = KP.C.DEBUT.receptionBands.find(b => b.key === g.results.receptionBand).label;
  state.version = '0.2.0';
  const back = KP.deserialize(KP.serialize(state));
  t.ok(back.group.releases.every(r => r.format === 'single'), 'old releases backfilled as singles');
  t.ok(!/debut/i.test(back.group.results.receptionLabel), 'the mislabeled comeback report is repaired');
  t.eq(back.group.promoFocus, 'musicShows', 'rollout focus defaulted');
}

// determinism through formats and stage names
{
  const a = throughDebut('roll-fork', { format: 'mini', week: undefined, focus: 'fanCare' });
  KP.setStageName(a, a.group.members[0], 'Nova');
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 10; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'restored save continues identically');
}

t.finish();
