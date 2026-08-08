/* Suite 015 — content generators (v0.3.0, first phase of the procedural
   mandate). Names are well-formed and world-unique, titles and group
   names come from grammars, blurbs assemble with real variety — and all
   of it stays deterministic per seed (Law 2 holds). */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_015_generators');

// names: well-formed, no doubled syllables, unique within a world
{
  const state = KP.newGame('gen-names');
  const people = Object.values(state.people);
  people.forEach(p => {
    t.ok(/^[A-Z][a-z]+-[a-z]+$/.test(p.name.given), p.id + ' given name well-formed (' + p.name.given + ')');
    const parts = p.name.given.toLowerCase().split('-');
    t.ok(parts[0] !== parts[1], p.id + ' no doubled syllable (' + p.name.given + ')');
  });
  const givens = people.map(p => p.name.given.toLowerCase());
  t.eq(givens.length, new Set(givens).size, 'given names unique within the world');
}

// variety across worlds: far more distinct names than any fixed pool
{
  const seen = new Set();
  for (let s = 0; s < 25; s++) {
    const st = KP.newGame('gen-var' + s);
    Object.values(st.people).forEach(p => seen.add(p.name.given));
  }
  t.ok(seen.size >= 200, 'distinct given names across 25 worlds: ' + seen.size + ' (old pool: 42)');
}

// two seeds barely overlap
{
  const a = new Set(Object.values(KP.newGame('gen-a').people).map(p => p.name.given));
  const b = Object.values(KP.newGame('gen-b').people).map(p => p.name.given);
  const overlap = b.filter(n => a.has(n)).length;
  t.ok(overlap <= b.length * 0.25, 'two worlds share few names (' + overlap + '/' + b.length + ')');
}

// song titles + producers: grammar output, unique per cycle, retired titles stay retired
{
  const state = KP.newGame('gen-songs');
  const titles = new Set();
  for (let i = 0; i < 12; i++) {
    const rng = KP.rngFor(state);
    const demos = KP.generateDemos(state, rng);
    state.rngState = rng.state();
    demos.forEach(d => {
      t.ok(d.title.length >= 3, 'title is a title (' + d.title + ')');
      t.ok(d.producer.length >= 4, 'producer is named (' + d.producer + ')');
      titles.add(d.title);
    });
  }
  t.ok(titles.size >= 30, 'twelve demo cycles produced real variety (' + titles.size + '/48 distinct)');
  // a released title never comes back
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'RETIRE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  g.releases = [{ week: 1, songTitle: 'Neon Heart', conceptId: 'bright', reception: 60, receptionBand: 'strong', chartPeak: 20, chartWeeks: 4, isDebut: true, format: 'single', tracks: 2 }];
  const rng2 = KP.rngFor(state);
  for (let i = 0; i < 10; i++) {
    KP.generateDemos(state, rng2).forEach(d => t.ok(d.title !== 'Neon Heart', 'released titles stay retired'));
  }
}

// group names: generated, unique against existing groups
{
  const state = KP.newGame('gen-groups');
  const names = KP.suggestGroupNames(state, KP.rngFor(state));
  t.eq(names.length, 3, 'three suggestions');
  t.eq(new Set(names.map(n => n.toLowerCase())).size, 3, 'all distinct');
  const seen = new Set();
  const rng = KP.rngFor(state);
  for (let i = 0; i < 60; i++) seen.add(KP.genGroupName(rng, null));
  t.ok(seen.size >= 30, 'group-name grammar has range (' + seen.size + '/60 distinct)');
}

// blurbs: assembled variety, still deterministic per person
{
  const perBandLines = {};
  for (let s = 0; s < 12; s++) {
    const st = KP.newGame('gen-blurb' + s);
    Object.values(st.people).forEach(p => {
      const evl = KP.evaluate(st, p);
      evl.domains.forEach(d => {
        const key = d.domain + '|' + d.band;
        (perBandLines[key] = perBandLines[key] || new Set()).add(d.line);
      });
    });
  }
  const counts = Object.entries(perBandLines).map(([k, v]) => v.size);
  const richCells = counts.filter(c => c >= 6).length;
  t.ok(richCells >= 10, 'most (domain, band) cells show 6+ distinct blurbs in 12 worlds (' + richCells + '/' + counts.length + ')');
  // determinism: same person, same blurbs, forever
  const st = KP.newGame('gen-blurb-det');
  const p = st.people[st.roster[0]];
  const a = JSON.stringify(KP.evaluate(st, p));
  const b = JSON.stringify(KP.evaluate(st, p));
  t.eq(a, b, 'evaluations never re-roll');
}

// headlines: generated, plural
{
  const state = KP.newGame('gen-head');
  const rng = KP.rngFor(state);
  const seen = new Set();
  for (let i = 0; i < 40; i++) seen.add(KP.genHeadline(rng));
  t.ok(seen.size >= 8, 'the wire has range (' + seen.size + ' distinct headlines in 40)');
}

// the whole thing stays deterministic (suite_001 checks identity too;
// this is the generator-specific fork)
{
  const a = KP.newGame('gen-fork');
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 10; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'generated content forks identically');
}

t.finish();
