/* Suite 001 — generation invariants.
   No value above the scale, cones are real ranges, the scenario's teaching
   characters exist, determinism holds for equal seeds. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_001_generation');

for (let s = 1; s <= 20; s++) {
  const state = KP.newGame('gen' + s);
  const people = Object.values(state.people);
  t.ok(people.length >= 26, 'seed ' + s + ': world has enough people');
  t.ok(state.roster.length === KP.C.GEN.inheritedCount, 'seed ' + s + ': six inherited trainees');
  t.ok(state.prospects.length >= KP.C.GEN.prospectCount[0], 'seed ' + s + ': board is stocked');

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
    t.ok(p.age >= KP.C.GEN.ageRange[0] && p.age <= KP.C.GEN.ageRange[1], p.id + ' age in range');
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

// age distribution: trainees skew young (owner's law, v0.1.1)
{
  const ages = [];
  for (let s = 0; s < 20; s++) {
    const st = KP.newGame('agedist' + s);
    Object.values(st.people).forEach(p => ages.push(p.age));
  }
  const mean = ages.reduce((a, b) => a + b, 0) / ages.length;
  const over20 = ages.filter(a => a >= 20).length / ages.length;
  const under18 = ages.filter(a => a <= 17).length / ages.length;
  t.ok(mean >= 17 && mean <= 18.8, 'mean age skews young (got ' + mean.toFixed(1) + ')');
  t.ok(over20 <= 0.32, '20+ is the rarity, not the norm (got ' + (over20 * 100).toFixed(0) + '%)');
  t.ok(under18 >= 0.32, 'mid-teens dominate the pool (got ' + (under18 * 100).toFixed(0) + '%)');
}

// determinism: same seed → identical world
const a = KP.newGame('same-seed');
const b = KP.newGame('same-seed');
t.eq(JSON.stringify(a), JSON.stringify(b), 'same seed produces identical state');

// different seeds → different worlds (two saves never tell the same story)
const c = KP.newGame('other-seed');
t.ok(JSON.stringify(a) !== JSON.stringify(c), 'different seeds diverge');

// there is no overall rating anywhere in the person model
const sample = Object.values(a.people)[0];
t.ok(sample.overall === undefined && sample.ovr === undefined, 'no Overall rating exists');

t.finish();
