/* Suite 021 — the schedule breathes (v0.4.2).
   The calendar closes after promo (contractual rest, boosted recovery),
   locking over a worn roster draws a staff warning, pushing a gassed
   member is a real overwork gamble with a real bench, the benched cost
   the stage at release, the migration repairs pinned rosters, and the
   tightest legal pace no longer pins anyone at 100. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_021_fatigue');

function debuted(seed) {
  const state = KP.newGame(seed);
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'RESTLINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  g.demos = KP.generateDemos(state, KP.rngFor(state));
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  return state;
}
function planFor(state, g) {
  if (!g.demos) g.demos = KP.generateDemos(state, KP.rngFor(state));
  return KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
}

// ---- the rail: no lock during promo or rest; open after ----
{
  const state = debuted('fx-rail');
  const g = state.groups[0];
  const CB = KP.C.COMEBACK;
  // mid-promotion
  t.ok(state.week <= g.promoUntil, 'fixture: release week is inside promo');
  let r = planFor(state, g);
  t.ok(!r.ok && /mid-promotion/.test(r.reason), 'no lock mid-promotion, narrated');
  // rest window
  while (state.week <= g.promoUntil) KP.advanceWeek(state);
  t.ok(state.week <= g.promoUntil + CB.restWeeks, 'fixture: inside the rest window');
  r = planFor(state, g);
  t.ok(!r.ok && /scheduled rest/.test(r.reason), 'no lock during contractual rest, narrated');
  // calendar reopens
  while (state.week <= g.promoUntil + CB.restWeeks) KP.advanceWeek(state);
  r = planFor(state, g);
  t.ok(r.ok, 'the calendar reopens after the rest window');
}

// ---- rest window: boosted recovery, exactly ----
{
  const state = debuted('fx-rest');
  const g = state.groups[0];
  while (state.week <= g.promoUntil) KP.advanceWeek(state);   // promo over
  const p = state.people[g.members[0]];
  p.fatigue = 80; p.flags.burnout = 0;
  const before = p.fatigue;
  KP.advanceWeek(state);
  t.eq(p.fatigue, before - KP.C.COMEBACK.restRecovery, 'rest-window recovery runs at the boosted rate');
}

// ---- staff warning when locking over a worn roster ----
{
  const state = debuted('fx-warn');
  const g = state.groups[0];
  while (state.week <= g.promoUntil + KP.C.COMEBACK.restWeeks) KP.advanceWeek(state);
  g.members.forEach(id => { state.people[id].fatigue = 75; });
  const r = planFor(state, g);
  t.ok(r.ok && /still worn/.test(r.warning || ''), 'locking over a worn roster is allowed, and flagged');
  // fresh roster forks quietly
  const s2 = debuted('fx-warn2');
  const g2 = s2.groups[0];
  while (s2.week <= g2.promoUntil + KP.C.COMEBACK.restWeeks) KP.advanceWeek(s2);
  g2.members.forEach(id => { s2.people[id].fatigue = 20; });
  const r2 = planFor(s2, g2);
  t.ok(r2.ok && !r2.warning, 'a rested roster locks without a lecture');
}

// ---- overwork: pushing gassed members eventually benches one ----
{
  let incidents = 0, benchedSkippedGains = 0;
  for (let s = 0; s < 12 && !incidents; s++) {
    const state = debuted('fx-ow-' + s);
    const g = state.groups[0];
    while (state.week <= g.promoUntil + KP.C.COMEBACK.restWeeks) KP.advanceWeek(state);
    planFor(state, g);
    g.members.forEach(id => { state.people[id].fatigue = 95; });
    for (let w = 0; w < 6 && !incidents; w++) {
      KP.advanceWeek(state);
      g.members.forEach(id => {
        const p = state.people[id];
        if (p.flags.burnout > 0) incidents++;
      });
    }
    if (incidents) {
      t.ok(state.inbox.some(m => m.urgent && /pulled from/i.test(m.text)),
        'the incident lands urgent in the inbox');
      const benched = g.members.map(id => state.people[id]).find(p => p.flags.burnout > 0);
      const before = benched.talents.vocals.cur;
      const fatBefore = benched.fatigue;
      KP.advanceWeek(state);
      if (benched.talents.vocals.cur === before) benchedSkippedGains++;
      t.ok(benched.fatigue < fatBefore, 'the benched member recovers while benched');
      t.ok(benched.history.some(h => /Pulled from the schedule/.test(h.text)), 'her file remembers');
    }
  }
  t.ok(incidents >= 1, 'overwork incidents actually fire on a gassed rehearsal (12-seed search)');
  t.ok(benchedSkippedGains >= 1, 'a benched member sits rehearsal out');
}

// ---- a benched member costs the stage at release ----
{
  const mk = () => {
    const state = KP.newGame('fx-bench');
    const ids = state.roster.slice(0, 5);
    KP.proposeGroup(state, 'BENCHLINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
    const g = state.groups[0];
    g.demos = KP.generateDemos(state, KP.rngFor(state));
    KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
      week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
    g.prep.progress = 6; state.week = g.prep.scheduledWeek;
    return state;
  };
  const a = mk(), b = mk();
  b.people[b.groups[0].members[1]].flags.burnout = 2;
  const ra = KP.resolveDebut(a, KP.rngFor(a), a.groups[0]);
  const rb = KP.resolveDebut(b, KP.rngFor(b), b.groups[0]);
  t.ok(rb.performance <= ra.performance - KP.C.COMEBACK.OVERWORK.perfPenalty + 1,
    'the missing member shows on stage (' + ra.performance + ' vs ' + rb.performance + ')');
  t.ok(rb.publicNotes.some(n => /medical advice/.test(n)), 'and the public counted heads');
}

// ---- the tightest legal pace never pins at 100 again ----
{
  const state = debuted('fx-equilibrium');
  const g = state.groups[0];
  const samples = [];
  for (let w = 0; w < 90; w++) {
    KP.advanceWeek(state);
    if (!g.prep) planFor(state, g);   // refused during promo/rest — that IS the rail
    samples.push(g.members.reduce((s, id) => s + state.people[id].fatigue, 0) / g.members.length);
  }
  const late = samples.slice(-40);
  const pinned = late.filter(f => f >= 99.5).length;
  t.ok(pinned <= 4, 'no perpetual 100 under maximal legal pace (' + pinned + '/40 late weeks pinned)');
  t.ok(late.some(f => f < 60), 'every cycle contains real recovery (min late ' + Math.min.apply(null, late).toFixed(0) + ')');
}

// ---- migration: the v0.2.0 promise, finally kept ----
{
  const old = debuted('fx-mig');
  const g = old.groups[0];
  g.members.forEach(id => { old.people[id].fatigue = 100; });
  old.version = '0.4.1';
  const json = KP.serialize(old);
  const migrated = KP.deserialize(json);
  t.ok(g.members.every(id => migrated.people[id].fatigue === 50), 'pinned idols were sent home to sleep');
  t.ok(migrated.inbox.some(m => /rest days it promised/.test(m.text)), 'the audit is narrated');
  const m2 = KP.deserialize(json);
  for (let w = 0; w < 8; w++) { KP.advanceWeek(migrated); KP.advanceWeek(m2); }
  t.eq(KP.serialize(migrated), KP.serialize(m2), 'the repaired world stays deterministic');
}

// ---- determinism ----
{
  const a = debuted('fx-fork');
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 20; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the fatigue economy forks clean');
}

t.finish();
