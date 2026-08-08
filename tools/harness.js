/* The soak harness: runs the whole game headless across many seeds using
   the SAME engine code paths the UI calls (advanceWeek, signProspect,
   proposeGroup, planDebut). The auto-player acts only on perceived reads —
   the same fog the human sees.

   On top sits the observatory: census bands that alarm when an archetype
   of outcome goes EXTINCT or FLOODS, plus hard invariant guards that kill
   the run. Usage: node tools/harness.js [seeds=40] */
'use strict';
const { loadEngine } = require('../test/load_engine');

const SEEDS = parseInt(process.argv[2] || '40', 10);
const KP = loadEngine();

// alive-and-plausible bands, as fraction of seeds
const BANDS = {
  sensation:         { lo: 0.02, hi: 0.30, label: 'sensation debuts' },
  strongPlus:        { lo: 0.15, hi: 0.75, label: 'strong-or-better debuts' },
  missOrQuiet:       { lo: 0.05, hi: 0.55, label: 'quiet/miss debuts' },
  nonCenterBreakout: { lo: 0.10, hi: 0.65, label: 'public picked a non-center breakout' },
  rivalSteals:       { lo: 0.30, hi: 1.00, label: 'rivals signed >=1 prospect' },
  burnouts:          { lo: 0.00, hi: 0.45, label: 'orgs with a burnout incident' },
  instinctSigning:   { lo: 0.00, hi: 1.00, label: 'scout instinct notes seen' },
  frictionSeen:      { lo: 0.20, hi: 1.00, label: 'orgs that saw real friction' },
  conflictEndemic:   { lo: 0.00, hi: 0.25, label: 'orgs ending conflict-heavy (>30% pairs)' },
};

const tally = {
  sensation: 0, strongPlus: 0, missOrQuiet: 0, nonCenterBreakout: 0,
  rivalSteals: 0, burnouts: 0, instinctSigning: 0,
  frictionSeen: 0, conflictEndemic: 0,
};
let mediationsRun = 0;
const receptions = [];
const growths = [];
const allAges = [];
let violations = [];

function guard(cond, msg) { if (!cond) violations.push(msg); }

for (let s = 0; s < SEEDS; s++) {
  const seed = 'soak-' + s;
  const state = KP.newGame(seed);
  const scout = KP.DATA.evaluators[2];
  let burnoutSeen = false;

  const startTalent = avgRosterTalent(state);
  Object.values(state.people).forEach(p => allAges.push(p.age));
  let sawFriction = false;

  for (let w = 0; w < 84; w++) {
    // --- auto-player policy (perceived reads only) ---
    if (state.week <= 3 && state.signingsUsed < state.signingsAllowed) {
      const ranked = state.prospects.map(id => state.people[id])
        .map(p => ({ p, v: KP.C.TALENTS.reduce((sum, d) => sum + KP.perceived(state, p, d, scout), 0) }))
        .sort((a, b) => b.v - a.v);
      if (ranked.length && state.budget > KP.signCost(state, ranked[0].p) + 60) {
        KP.signProspect(state, ranked[0].p.id);
      }
    }
    // weekly training: two best perceived domains, rest when tired
    state.roster.forEach(id => {
      const p = state.people[id];
      const best = KP.C.TALENTS.map(d => ({ d, v: KP.perceived(state, p, d, scout) }))
        .sort((a, b) => b.v - a.v).slice(0, 2).map(x => x.d);
      const intensity = p.fatigue > 70 ? 'rest' : p.fatigue > 55 ? 'light' : 'standard';
      KP.setTraining(state, id, best, intensity);
    });
    // conflict management: the auto-player uses the same sit-down tool
    const frictions = KP.frictionPairs(state, state.roster);
    if (frictions.length) sawFriction = true;
    const worst = frictions.find(f => f.state === 'conflict') || frictions[0];
    if (worst && state.budget > 60 && KP.mediationCooldown(state, worst.a.id, worst.b.id) === 0) {
      const m = KP.mediatePair(state, worst.a.id, worst.b.id);
      if (m.ok) mediationsRun++;
    }
    // form the group around week 20
    if (!state.group && state.week >= 20 && state.roster.length >= 5) {
      const members = state.roster.map(id => state.people[id])
        .map(p => ({ p, v: KP.C.TALENTS.reduce((sum, d) => sum + KP.perceived(state, p, d, scout), 0) }))
        .sort((a, b) => b.v - a.v).slice(0, 5).map(x => x.p);
      const hints = KP.roleHints(state, members);
      const name = KP.suggestGroupNames(state, KP.rngFor(state))[0];
      KP.proposeGroup(state, name, members.map(m => m.id), hints);
    }
    // plan the debut once formed
    if (state.group && !state.group.prep && !state.group.debuted) {
      state.demos = state.demos || KP.generateDemos(state, KP.rngFor(state));
      const demo = state.demos.slice().sort((a, b) => b.hook - a.hook)[0];
      KP.planDebut(state, {
        songId: demo.id, conceptId: demo.conceptId, promo: 'standard',
        week: Math.min(state.week + 8, state.objective.deadlineWeek),
        alloc: { vocals: 30, dance: 30, rap: 10, media: 30 },
      });
    }

    const notes = KP.advanceWeek(state);
    notes.forEach(n => { if (n.kind === 'health' && /wall|injur/i.test(n.text)) burnoutSeen = true; });

    // --- hard invariant guards every week ---
    Object.values(state.people).forEach(p => {
      KP.C.TALENTS.forEach(d => {
        const t = p.talents[d];
        guard(!Number.isNaN(t.cur) && t.cur >= 0 && t.cur <= 100, seed + ' ' + p.id + ' ' + d + ' out of scale: ' + t.cur);
        const ceil = p.flags['ceil_' + d];
        if (ceil != null) guard(t.cur <= ceil + 0.001, seed + ' ' + p.id + ' ' + d + ' above resolved ceiling');
      });
      guard(p.fatigue >= 0 && p.fatigue <= 100, seed + ' ' + p.id + ' fatigue out of range');
    });
    guard(state.budget >= 0, seed + ' negative budget: ' + state.budget);
    if (state.group && state.group.prep && !state.group.debuted) {
      guard(state.week <= state.group.prep.scheduledWeek, seed + ' debut sailed past unresolved');
    }
  }

  // --- per-seed observatory tallies ---
  guard(state.objective.status !== 'open', seed + ' objective never resolved by week ' + state.week);
  const g = state.group;
  guard(!!(g && g.debuted && g.results), seed + ' auto-player failed to reach a debut');
  if (g && g.results) {
    const r = g.results;
    receptions.push(r.reception);
    if (r.receptionBand === 'sensation') tally.sensation++;
    if (['sensation', 'strong'].includes(r.receptionBand)) tally.strongPlus++;
    if (['quiet', 'miss'].includes(r.receptionBand)) tally.missOrQuiet++;
    if (r.breakoutId !== g.roles.center) tally.nonCenterBreakout++;
  }
  if (Object.values(state.people).some(p => p.status === 'rival')) tally.rivalSteals++;
  if (burnoutSeen) tally.burnouts++;
  if (state.roster.map(id => state.people[id]).some(p => KP.evaluate(state, p).instinct)) tally.instinctSigning++;
  if (sawFriction) tally.frictionSeen++;
  {
    // end-state conflict census across roster pairs
    let negative = 0, pairCount = 0;
    for (let i = 0; i < state.roster.length; i++) {
      for (let j = i + 1; j < state.roster.length; j++) {
        const rel = state.relationships[
          KP.pairKey(state.people[state.roster[i]], state.people[state.roster[j]])];
        if (!rel) continue;
        pairCount++;
        const st = KP.relState(rel.score).key;
        if (st === 'tense' || st === 'conflict') negative++;
      }
    }
    if (pairCount && negative / pairCount > 0.3) tally.conflictEndemic++;
  }
  growths.push(avgRosterTalent(state) - startTalent);
}

function avgRosterTalent(state) {
  const roster = state.roster.map(id => state.people[id]);
  if (!roster.length) return 0;
  return roster.reduce((s, p) => s + KP.C.TALENTS.reduce((x, d) => x + p.talents[d].cur, 0) / 5, 0) / roster.length;
}

// --- report ---
console.log('=== Observatory — ' + SEEDS + ' seeds, 84 weeks each ===');
receptions.sort((a, b) => a - b);
const med = receptions[Math.floor(receptions.length / 2)] || 0;
console.log('reception: median ' + med +
  ', min ' + (receptions[0] || 0) + ', max ' + (receptions[receptions.length - 1] || 0));
console.log('avg roster talent growth over the run: ' +
  (growths.reduce((a, b) => a + b, 0) / Math.max(1, growths.length)).toFixed(1) + ' pts');

// age census: the pool must skew young (owner's law, v0.1.1)
const ageMean = allAges.reduce((a, b) => a + b, 0) / allAges.length;
const age20frac = allAges.filter(a => a >= 20).length / allAges.length;
console.log('generated-pool age: mean ' + ageMean.toFixed(1) + ', ' +
  Math.round(age20frac * 100) + '% aged 20+');
console.log('sit-downs run by the auto-player: ' + mediationsRun);
let alarms = 0;
if (ageMean < 17 || ageMean > 18.8) { alarms++; console.error('AGE ALARM: mean out of [17, 18.8]'); }
if (age20frac > 0.32) { alarms++; console.error('AGE ALARM: 20+ share floods above 32%'); }
Object.keys(BANDS).forEach(k => {
  const frac = tally[k] / SEEDS;
  const b = BANDS[k];
  const status = frac < b.lo ? 'EXTINCT' : frac > b.hi ? 'FLOOD' : 'ok';
  if (status !== 'ok') alarms++;
  console.log(pad(b.label, 42) + pad((tally[k] + '/' + SEEDS), 8) +
    'band [' + Math.round(b.lo * 100) + '%–' + Math.round(b.hi * 100) + '%]  ' + status);
});
function pad(s, n) { s = String(s); return s + ' '.repeat(Math.max(1, n - s.length)); }

if (violations.length) {
  console.error('\n=== HARD INVARIANT VIOLATIONS (' + violations.length + ') ===');
  violations.slice(0, 20).forEach(v => console.error('  ✗ ' + v));
  process.exit(1);
}
if (alarms) {
  console.error('\n=== ' + alarms + ' CENSUS ALARM(S) — review bands above ===');
  process.exit(1);
}
console.log('\n=== SOAK CLEAN: no invariant violations, all census bands alive ===');
