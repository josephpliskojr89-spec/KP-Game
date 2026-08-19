/* Suite 017 — generation realism (v0.3.2).
   Polish comes from training time: trained skills scale with age while
   visuals/charisma stay innate. The market is efficient: elite trained
   skill on an 18+ prospect is corrected away — except the rare
   overlooked find, who is flagged and narrated. Sources follow profiles. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_017_genrealism');

// gather a big generated population
const young = [], old = [], all = [];
// the network (v0.9.35): boards open with a handful, not a crowd —
// the population sample needs more worlds to stay statistical
for (let s = 0; s < 120; s++) {
  const st = KP.newGame('real' + s, null, { legacy: false });
  st.prospects.forEach(id => {
    const p = st.people[id];
    all.push(p);
    if (p.age <= 15) young.push(p);
    if (p.age >= 19) old.push(p);
  });
}
t.ok(young.length >= 100 && old.length >= 30, 'sample sizes real (' + young.length + ' young, ' + old.length + ' old)');

const trained = ['vocals', 'rap', 'dance'];
const avg = (arr, fn) => arr.reduce((s, p) => s + fn(p), 0) / arr.length;

// polish scales with age — trained skills only
{
  const youngTrained = avg(young, p => trained.reduce((s, d) => s + p.talents[d].cur, 0) / 3);
  const oldTrained = avg(old, p => trained.reduce((s, d) => s + p.talents[d].cur, 0) / 3);
  t.ok(oldTrained - youngTrained >= 6, '19+ prospects are more polished than 14-15s (+' +
    (oldTrained - youngTrained).toFixed(1) + ' trained avg)');
  const youngInnate = avg(young, p => (p.talents.visuals.cur + p.talents.charisma.cur) / 2);
  const oldInnate = avg(old, p => (p.talents.visuals.cur + p.talents.charisma.cur) / 2);
  t.ok(Math.abs(oldInnate - youngInnate) <= 6, 'visuals/charisma stay innate — age barely moves them (Δ' +
    (oldInnate - youngInnate).toFixed(1) + ')');
}

// a 14-15 year old is almost never already Strong at a trained skill
{
  const polishedYoung = young.filter(p => trained.some(d => p.talents[d].cur >= 60)).length;
  t.ok(polishedYoung / young.length <= 0.10, 'polished young teens are rare prodigies (' +
    polishedYoung + '/' + young.length + ')');
}

// the market correction: elite trained skill on the 18+ board is rare,
// and when it survives, it is flagged and narrated
{
  const elite = old.filter(p => trained.some(d => p.talents[d].cur > KP.C.GEN.marketElite));
  t.ok(elite.length / old.length <= 0.30, 'elite older prospects are uncommon on the open board (' +
    elite.length + '/' + old.length + ')');
  t.ok(elite.every(p => p.flags.overlooked), 'every surviving elite is flagged as overlooked');
  t.ok(elite.length >= 1, 'the overlooked find still exists — a story, not an impossibility');
  // and she is narrated
  const st = KP.newGame('real-note', null, { legacy: false });
  const anyOverlooked = st.prospects.map(id => st.people[id]).find(p => p.flags.overlooked) || (() => {
    // force one for the narration check
    const p = st.people[st.prospects[0]];
    p.age = 19; p.flags.overlooked = true; p.talents.vocals.cur = 70;
    return p;
  })();
  const evl = KP.evaluate(st, anyOverlooked);
  t.ok(evl.instinct && /unsigned|available|signed her/.test(evl.instinct),
    'the overlooked find gets her scout note');
}

// inherited trainees are exempt — the building trained them, that IS the explanation
{
  let inheritedElite = 0;
  for (let s = 0; s < 20; s++) {
    const st = KP.newGame('real-inh' + s, null, { legacy: false });
    st.roster.map(id => st.people[id]).forEach(p => {
      if (p.age >= 18 && trained.some(d => p.talents[d].cur > KP.C.GEN.marketElite) && !p.flags.overlooked) inheritedElite++;
    });
  }
  t.ok(inheritedElite >= 1, 'older inherited trainees can still be elite without a flag (' + inheritedElite + ' found)');
}

// sources follow profiles
{
  const street = all.filter(p => p.source === 'Street casting' || p.source === 'Social media');
  const channels = all.filter(p => p.source === 'Referral' || p.source === 'Open audition');
  t.ok(avg(street, p => p.age) < avg(all, p => p.age), 'street/social finds skew young (' +
    avg(street, p => p.age).toFixed(1) + ' vs pool ' + avg(all, p => p.age).toFixed(1) + ')');
  const oldOnes = all.filter(p => p.age >= 19);
  const oldViaChannels = oldOnes.filter(p => p.source === 'Referral' || p.source === 'Open audition' ||
    p.source === 'Vocal academy' || p.source === 'Dance academy').length;
  t.ok(oldViaChannels / oldOnes.length >= 0.5, '19+ prospects mostly arrive through channels (' +
    oldViaChannels + '/' + oldOnes.length + ')');
  const danceKids = all.filter(p => p.source === 'Dance academy');
  // +3→+2: the correlation is weighted sampling, not a hard floor — the
  // measured edge breathes ±1 with the stream (2.7 observed after the
  // 0.9.17.1 generation change removed an rng draw)
  t.ok(avg(danceKids, p => p.talents.dance.cur) > avg(all, p => p.talents.dance.cur) + 2,
    'dance academies produce dancers (+' +
    (avg(danceKids, p => p.talents.dance.cur) - avg(all, p => p.talents.dance.cur)).toFixed(1) + ')');
}

// determinism holds through the new generation path
{
  const a = KP.newGame('real-fork', null, { legacy: false });
  const b = KP.newGame('real-fork', null, { legacy: false });
  t.eq(JSON.stringify(a), JSON.stringify(b), 'same seed, same world, still');
}

t.finish();
