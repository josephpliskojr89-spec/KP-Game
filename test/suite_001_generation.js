/* Suite 001 — generation invariants.
   No value above the scale, cones are real ranges, the scenario's teaching
   characters exist, determinism holds for equal seeds. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_001_generation');

for (let s = 1; s <= 20; s++) {
  const state = KP.newGame('gen' + s, null, { legacy: false });
  const people = Object.values(state.people);
  t.ok(people.length >= 11, 'seed ' + s + ': world has enough people');
  t.ok(state.roster.length === KP.C.GEN.inheritedCount, 'seed ' + s + ': six inherited trainees');
  // the network (v0.9.35): the board opens near-EMPTY by design — the
  // door's opening batch is all the standing network hands over
  t.ok(state.prospects.length === KP.C.NETWORK.OPENING.current, 'seed ' + s + ': the opening batch, no more');

  people.forEach(p => {
    KP.C.TALENTS.forEach(d => {
      const tal = p.talents[d];
      t.ok(tal.cur >= 1 && tal.cur <= 100, p.id + ' ' + d + ' cur in scale');
      t.ok(tal.ceilLo > tal.cur, p.id + ' ' + d + ' ceiling above current');
      t.ok(tal.ceilHi > tal.ceilLo, p.id + ' ' + d + ' cone is a real range');
      t.ok(tal.ceilHi <= 100, p.id + ' ' + d + ' nothing exists above 100');
    });
    KP.PERSONALITY_TRAITS.forEach(k => {
      t.ok(p.personality[k] >= 0 && p.personality[k] <= 100, p.id + ' personality ' + k + ' in range');
    });
    // the age law governs the scouting pipeline; rival idols are staged
    // performers and run older by design (debut-aged to veteran, v0.4.3)
    if (p.status === 'rival') {
      t.ok(p.age >= KP.C.GEN.ageRange[0] && p.age <= 26, p.id + ' rival idol age plausible (' + p.age + ')');
    } else {
      t.ok(p.age >= KP.C.GEN.ageRange[0] && p.age <= KP.C.GEN.ageRange[1], p.id + ' age in range');
    }
  });

  // scenario teaching characters
  const first = state.people[state.roster[0]];
  t.ok(first.talents.vocals.cur >= 70 && first.talents.dance.cur <= 35,
    'seed ' + s + ': inherited vocalist with poor dance exists');
  const second = state.people[state.roster[1]];
  t.ok(second.talents.charisma.ceilHi >= 85,
    'seed ' + s + ': the everyone-watches-her trainee has hidden charisma upside');

  // hot prospect: rivals circle the most charismatic external prospect
  const hot = state.prospects.filter(id => KP.rivalHeat(state, id).max >= 2);
  t.ok(hot.length >= 1, 'seed ' + s + ': at least one contested prospect at start');
}

// age distribution: 15-16 is the norm, 14-18 the bulk, 19+ uncommon,
// and 14 is a hard floor (owner's law, v0.3.1)
{
  const ages = [];
  for (let s = 0; s < 20; s++) {
    const st = KP.newGame('agedist' + s, null, { legacy: false });
    // the law measures the scouting pipeline — rival idols run older by design
    Object.values(st.people).forEach(p => { if (p.status !== 'rival') ages.push(p.age); });
  }
  const mean = ages.reduce((a, b) => a + b, 0) / ages.length;
  const bulk = ages.filter(a => a >= 14 && a <= 18).length / ages.length;
  const older = ages.filter(a => a >= 19).length / ages.length;
  const norm = ages.filter(a => a === 15 || a === 16).length / ages.length;
  t.ok(ages.every(a => a >= 14), 'NOBODY under 14 — hard floor (min ' + Math.min.apply(null, ages) + ')');
  t.ok(ages.every(a => a <= 22), 'nobody over 22 (max ' + Math.max.apply(null, ages) + ')');
  t.ok(mean >= 16.0 && mean <= 17.2, 'mean age ~16.6 (got ' + mean.toFixed(1) + ')');
  t.ok(bulk >= 0.78, '14-18 is the bulk (got ' + (bulk * 100).toFixed(0) + '%)');
  t.ok(older <= 0.22, '19+ is far more uncommon (got ' + (older * 100).toFixed(0) + '%)');
  t.ok(norm >= 0.35, '15-16 is the norm (got ' + (norm * 100).toFixed(0) + '%)');
}

// determinism: same seed → identical world
const a = KP.newGame('same-seed', null, { legacy: false });
const b = KP.newGame('same-seed', null, { legacy: false });
t.eq(JSON.stringify(a), JSON.stringify(b), 'same seed produces identical state');

// different seeds → different worlds (two saves never tell the same story)
const c = KP.newGame('other-seed', null, { legacy: false });
t.ok(JSON.stringify(a) !== JSON.stringify(c), 'different seeds diverge');

// there is no overall rating anywhere in the person model
const sample = Object.values(a.people)[0];
t.ok(sample.overall === undefined && sample.ovr === undefined, 'no Overall rating exists');

// the five-band ladder (v0.4.1, owner's ranges): clean 20-point bands,
// Capable bridging developing → strong. Boundaries asserted exactly.
{
  t.eq(KP.C.BANDS.length, 5, 'five bands on the ladder');
  const expect = [
    [1, 'raw'], [20, 'raw'],
    [21, 'developing'], [40, 'developing'],
    [41, 'capable'], [60, 'capable'],
    [61, 'strong'], [80, 'strong'],
    [81, 'exceptional'], [100, 'exceptional'],
  ];
  expect.forEach(([v, key]) => {
    t.eq(KP.band(v).key, key, 'value ' + v + ' reads as ' + key);
  });
  t.eq(KP.band(41).label, 'Capable', 'the bridge band carries its name');
}

t.finish();
