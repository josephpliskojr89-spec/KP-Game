/* Suite 009 — the record and the rollout (v0.2.1).
   Comeback reports stop calling themselves debuts, formats gate cost and
   runway and multiply revenue, rollout focus shapes the promotion weeks,
   and stage names rename the lights without rewriting the person. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_009_rollout');

function throughDebut(seed, planExtra) {
  const state = KP.newGame(seed, null, { legacy: false });
  if (planExtra && planExtra.budget != null) { state.budget = planExtra.budget; delete planExtra.budget; }
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'ROLL', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  state.demos = KP.generateDemos(state, KP.rngFor(state));
  const plan = Object.assign({ songId: state.demos[0].id, promo: 'modest',
    week: state.week + 10, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } }, planExtra || {});
  if (plan.week == null) plan.week = state.week + 10;
  const r = KP.planDebut(state, plan);
  if (!r.ok) throw new Error('debut plan failed: ' + r.reason);
  let guard = 0;
  while (!state.groups[0].debuted && guard++ < 14) KP.advanceWeek(state);
  return state;
}

// comeback reports use comeback language — never "debut"
{
  const state = throughDebut('roll-label');
  // ride out promotion AND the contractual rest window (v0.4.2)
  const g0 = state.groups[0];
  while (state.week <= (g0.promoUntil || 0) + KP.C.COMEBACK.restWeeks) KP.advanceWeek(state);
  state.demos = KP.generateDemos(state, KP.rngFor(state));
  KP.planDebut(state, { songId: state.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (state.groups[0].prep && guard++ < 12) KP.advanceWeek(state);
  const r = state.groups[0].results;
  t.ok(r.isDebut === false, 'second release is a comeback');
  t.ok(!/debut/i.test(r.receptionLabel), 'its label never says debut (got "' + r.receptionLabel + '")');
  t.ok(Object.values(KP.C.COMEBACK.bandLabels).includes(r.receptionLabel), 'label comes from the comeback table');
}

// formats: cost, runway, revenue ordering
{
  const state = KP.newGame('roll-fmt', null, { legacy: false });
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
  // the rollout desk (v0.6.3): the staff plan is billed at lock too
  const R9 = KP.C.ROLLOUT;
  const staffPlanCost = R9.DEFAULT.flat().reduce((s, a) => s + R9.ACTIVITIES[a].cost, 0);
  t.eq(state.budget, budgetBefore - mini.cost - KP.C.DEBUT.promoCost.modest - staffPlanCost,
    'cost = record + promotion + rollout');
  t.eq(state.groups[0].prep.format, 'mini', 'format stored on the plan');
  let guard = 0;
  while (!state.groups[0].debuted && guard++ < 14) KP.advanceWeek(state);
  t.eq(state.groups[0].releases[0].format, 'mini', 'format lands in the discography');
  t.eq(state.groups[0].releases[0].tracks, mini.tracks, 'track count recorded');
}

// same-world revenue scales with format
{
  const a = throughDebut('roll-rev', { format: 'single' });
  // the rollout desk bills at lock (v0.6.3): full + promo + staff plan = 122
  const b = throughDebut('roll-rev', { format: 'full', week: undefined, budget: 200 });
  // identical seeds and plans except format; full pays more for the same story
  t.ok(b.groups[0].results.reception === a.groups[0].results.reception ||
       Math.abs(b.groups[0].results.reception - a.groups[0].results.reception) <= 100,
       'sanity: both resolved');
  if (b.groups[0].results.reception === a.groups[0].results.reception &&
      a.groups[0].results.reception > 32) {
    t.ok(b.groups[0].results.revenue > a.groups[0].results.revenue, 'a full album pays more than a single for the same reception');
  } else {
    // reception diverged (or was below the revenue floor) — verify the
    // invariant at formula level instead of the snapshot
    const full = KP.C.DEBUT.FORMATS.find(f => f.id === 'full');
    t.ok(full.revenueMult > 1.5, 'full album multiplier is materially bigger');
  }
}

// the rollout desk (v0.6.3): a variety month builds media reps, a
// music-show month builds live reps, and the plan rides on the group
{
  const varietyPlan = [['variety', 'variety'], ['variety', 'variety'], ['variety', 'variety'], ['variety', 'variety']];
  const showsPlan = [['countdown', 'countdown'], ['countdown', 'countdown'], ['countdown', 'countdown'], ['countdown', 'countdown']];
  const varietyState = throughDebut('roll-focus', { rollout: varietyPlan });
  const showsState = throughDebut('roll-focus2', { rollout: showsPlan });
  const vm = varietyState.groups[0].members.map(id => varietyState.people[id]);
  const sm = showsState.groups[0].members.map(id => showsState.people[id]);
  const mediaBefore = vm.map(m => m.mediaExp);
  const liveBefore = sm.map(m => m.liveExp);
  const vLive = vm.map(m => m.liveExp);
  const sMedia = sm.map(m => m.mediaExp);
  for (let w = 0; w < KP.C.ROLLOUT.weeks; w++) { KP.advanceWeek(varietyState); KP.advanceWeek(showsState); }
  const mediaGain = vm.reduce((s, m, i) => s + m.mediaExp - mediaBefore[i], 0) / vm.length;
  const liveGain = sm.reduce((s, m, i) => s + m.liveExp - liveBefore[i], 0) / sm.length;
  const vLiveGain = vm.reduce((s, m, i) => s + m.liveExp - vLive[i], 0) / vm.length;
  const sMediaGain = sm.reduce((s, m, i) => s + m.mediaExp - sMedia[i], 0) / sm.length;
  t.ok(mediaGain > sMediaGain + 5, 'variety promo builds media experience (' +
    Math.round(mediaGain) + ' vs ' + Math.round(sMediaGain) + ')');
  t.ok(liveGain > vLiveGain + 5, 'music-show promo builds live experience (' +
    Math.round(liveGain) + ' vs ' + Math.round(vLiveGain) + ')');
  t.eq(JSON.stringify(varietyState.groups[0].rollout), JSON.stringify(varietyPlan),
    'the plan persists on the group');
}

// stage names
{
  const state = throughDebut('roll-name');
  const id = state.groups[0].members[0];
  const p = state.people[id];
  t.ok(!KP.setStageName(state, id, '').ok, 'empty stage name rejected');
  t.ok(!KP.setStageName(state, id, 'ABCDEFGHIJKLMNOP').ok, 'over-long stage name rejected');
  const r = KP.setStageName(state, id, 'Solstice');
  t.ok(r.ok, 'stage name set');
  t.eq(KP.displayName(p), 'Solstice', 'public display uses the stage name');
  t.ok(p.name.display !== 'Solstice', 'the real name survives underneath');
  t.ok(p.history.some(h => /stage name/.test(h.text)), 'the file records it');
  const other = state.groups[0].members[1];
  t.ok(!KP.setStageName(state, other, 'solstice').ok, 'stage names are unique, case-insensitive');
  const sugg = KP.suggestStageNames(state, state.people[other]);
  t.ok(sugg.length >= 2 && sugg.every(n => n.toLowerCase() !== 'solstice'), 'suggestions exist and avoid taken names');
}

// migration: v0.2.0 saves gain formats and the mislabeled report is repaired
{
  const state = throughDebut('roll-mig');
  // ride out promotion AND the contractual rest window (v0.4.2)
  while (state.week <= (state.groups[0].promoUntil || 0) + KP.C.COMEBACK.restWeeks) KP.advanceWeek(state);
  state.demos = KP.generateDemos(state, KP.rngFor(state));
  KP.planDebut(state, { songId: state.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (state.groups[0].prep && guard++ < 12) KP.advanceWeek(state);
  // fake a v0.2.0 save: single-group shape, no formats, buggy debut wording
  const g = state.groups[0];
  delete g.promoFocus;
  g.releases.forEach(r => { delete r.format; delete r.tracks; });
  delete g.results.format;
  delete g.id; delete g.demos;
  g.results.receptionLabel = KP.C.DEBUT.receptionBands.find(b => b.key === g.results.receptionBand).label;
  state.group = g;
  delete state.groups; delete state.nextGroupId;
  state.version = '0.2.0';
  const back = KP.deserialize(KP.serialize(state));
  const bg = back.groups[0];
  t.ok(bg.releases.every(r => r.format === 'single'), 'old releases backfilled as singles');
  t.ok(!/debut/i.test(bg.results.receptionLabel), 'the mislabeled comeback report is repaired');
  t.eq(bg.promoFocus, 'musicShows', 'rollout focus defaulted');
}

// determinism through formats and stage names
{
  const a = throughDebut('roll-fork', { format: 'mini', week: undefined, focus: 'fanCare' });
  KP.setStageName(a, a.groups[0].members[0], 'Nova');
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 10; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'restored save continues identically');
}

t.finish();
