#!/usr/bin/env node
/* The repeat census (v0.11.2) — owner: "so we don't see so many repeats".
   Wraps the engine's tick the way the people audit does, runs the 40-seed
   soak underneath, and counts every TEMPLATE the player actually sees:
   the kept inbox notes, the timeline's posts, and the spotlight's lines —
   normalized (names, titles, numbers and quoted strings become tokens) so
   a sentence that only swaps a name counts as the same sentence. Prints
   the templates seen most per org-year, with how many orgs saw each one
   and how many distinct variants its family has (the OPENERS rule: one
   mechanism, a family of sentences). The number to drive down is the
   per-org-year count of the top families, not the total.
   Run: node tools/audit_repeats.js 40 [top=40] */
'use strict';
const path = require('path');
const loader = require(path.join(__dirname, '..', 'test', 'load_engine'));
const realLoad = loader.loadEngine;
const TOP = parseInt(process.argv[3] || '40', 10);

const T = { notes: {}, feed: {}, spot: {}, orgs: new Set(), noteTotal: 0, feedTotal: 0, spotTotal: 0 };
// the ceilings (measure-first, §93): null = unmeasured, no guard
const CEILING = { notes: { top: null, yearly: null }, feed: { top: null, yearly: null }, spot: { top: null, yearly: null } };

function normalizer(KP, state) {
  // every name the world can speak, longest first so compounds go whole
  const names = [];
  Object.values(state.people).forEach(p => {
    if (p.name) { names.push(p.name.display); names.push(p.name.given); if (p.name.family) names.push(p.name.family); }
  });
  (state.groups || []).forEach(g => { names.push(g.name); if (g.fandom && g.fandom.name) names.push(g.fandom.name); });
  (state.rivals || []).forEach(r => { names.push(r.name); names.push(r.short); (r.acts || []).forEach(a => names.push(a.name)); });
  names.push(state.company.name, state.company.short, state.executive.name);
  (state.schools || []).forEach(s => { names.push(s.name); });
  Object.values(state.seats || {}).forEach(st => { if (st) names.push(st.name); });
  (state.groups || []).forEach(g => { if (g.manager) names.push(g.manager.name); });
  const uniq = Array.from(new Set(names.filter(n => n && n.length >= 3))).sort((a, b) => b.length - a.length);
  const re = uniq.length ? new RegExp(uniq.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g') : null;
  return text => {
    let s = String(text || '');
    s = s.replace(/[“"][^”"]{1,80}[”"]/g, '“…”');   // titles, quotes
    if (re) s = s.replace(re, '{N}');
    s = s.replace(/@[a-z0-9_]+/gi, '@handle');
    s = s.replace(/\d[\d,.]*/g, '#');
    return s.slice(0, 160);
  };
}
function bump(store, key, seed) {
  const row = store[key] = store[key] || { n: 0, orgs: new Set(), sample: null };
  row.n++; row.orgs.add(seed);
}

loader.loadEngine = function () {
  const KP = realLoad.apply(this, arguments);
  const realAdvance = KP.advanceWeek;
  const seenFeed = new WeakMap();
  const seenSpot = new WeakMap();
  KP.advanceWeek = function (state) {
    const feedBefore = (state.feed || []).length;
    const spotBefore = (state.spotlight || []).length;
    const kept = realAdvance.call(this, state);
    T.orgs.add(state.seed);
    const norm = normalizer(KP, state);
    (kept || []).forEach(n => {
      if (!n || !n.text) return;
      const key = (n.ind || n.kind || '?') + ' | ' + norm(n.text);
      bump(T.notes, key, state.seed); T.noteTotal++;
      if (!T.notes[key].sample) T.notes[key].sample = n.text.slice(0, 140);
    });
    // the feed is capped and unshifted: new posts are the ones this tick added
    const feed = state.feed || [];
    const added = Math.max(0, feed.length - feedBefore + (feed.length === KP.C.FEED.maxPosts ? 0 : 0));
    feed.slice(0, Math.max(added, 0)).forEach(p => {
      if (!p || !p.text || seenFeed.get(p)) return;
      seenFeed.set(p, 1);
      const key = (p.persona || '?') + ' | ' + norm(p.text);
      bump(T.feed, key, state.seed); T.feedTotal++;
      if (!T.feed[key].sample) T.feed[key].sample = p.text.slice(0, 140);
    });
    // any post this tick minted that the cap already evicted is lost to the
    // census — a fair floor, since the player never saw it either
    (state.spotlight || []).forEach(m => {
      if (!m || !m.text || m.week !== state.week || seenSpot.get(m)) return;
      seenSpot.set(m, 1);
      const key = (m.kind || m.moment || '?') + ' | ' + norm(m.text);
      bump(T.spot, key, state.seed); T.spotTotal++;
      if (!T.spot[key].sample) T.spot[key].sample = m.text.slice(0, 140);
    });
    return kept;
  };
  return KP;
};

process.on('exit', () => {
  const N = T.orgs.size || 1;
  const yrs = (N * 140) / 52;
  const family = key => key.split(' | ')[0];
  const report = (label, store, total) => {
    const rows = Object.entries(store).sort((a, b) => b[1].n - a[1].n);
    const fams = {};
    rows.forEach(([k, v]) => { const f = family(k); fams[f] = fams[f] || { n: 0, variants: 0 }; fams[f].n += v.n; fams[f].variants++; });
    console.log('\n=== REPEAT CENSUS — ' + label + ': ' + total + ' seen, ' + rows.length + ' distinct templates, ' + (total / yrs).toFixed(0) + ' per org-year ===');
    console.log('top templates (per org-year · orgs that saw it · family variants):');
    rows.slice(0, TOP).forEach(([k, v]) => {
      const f = family(k);
      console.log('  ' + (v.n / yrs).toFixed(1).padStart(6) + '  ' + String(v.orgs.size).padStart(3) + '/' + N + '  ' + String(fams[f].variants).padStart(3) + '  ' + f.padEnd(18) + ' ' + (v.sample || '').replace(/\s+/g, ' '));
    });
    const famRows = Object.entries(fams).sort((a, b) => b[1].n - a[1].n).slice(0, 25);
    console.log('top families (per org-year · variants):');
    famRows.forEach(([f, v]) => console.log('  ' + (v.n / yrs).toFixed(1).padStart(6) + '  ' + String(v.variants).padStart(4) + '  ' + f));
  };
  report('inbox notes the player kept', T.notes, T.noteTotal);
  report('timeline posts', T.feed, T.feedTotal);
  report('spotlight lines', T.spot, T.spotTotal);

  // the REPEAT INDEX (v0.11.2): one number per surface — how often the
  // single most repeated template reaches a player in a year, and how many
  // templates reach a player at least once a year. Measure-first bands:
  // before §93 (v0.11.1 text) notes 10.7 / 31, feed 2.1 / 4, spotlight 18.1 / 24
  const index = store => {
    const rows = Object.values(store).map(v => v.n / yrs).sort((a, b) => b - a);
    return { top: rows[0] || 0, yearly: rows.filter(x => x >= 1).length };
  };
  const ix = { notes: index(T.notes), feed: index(T.feed), spot: index(T.spot) };
  console.log('\nREPEAT INDEX — notes: top template ' + ix.notes.top.toFixed(1) + '/org-year, ' + ix.notes.yearly + ' templates at ≥1/org-year' +
    ' · feed: top ' + ix.feed.top.toFixed(1) + ', ' + ix.feed.yearly + ' at ≥1' +
    ' · spotlight: top ' + ix.spot.top.toFixed(1) + ', ' + ix.spot.yearly + ' at ≥1');
  const hot = [];
  Object.keys(CEILING).forEach(k => {
    const c = CEILING[k];
    if (c.top != null && ix[k].top > c.top) hot.push(k + ' top template ' + ix[k].top.toFixed(1) + ' > ' + c.top);
    if (c.yearly != null && ix[k].yearly > c.yearly) hot.push(k + ' yearly templates ' + ix[k].yearly + ' > ' + c.yearly);
  });
  if (hot.length) { console.log('REPEATS HOT: ' + hot.join('; ')); process.exitCode = 1; }
  else console.log('REPEATS CLEAN (ceilings: notes ' + CEILING.notes.top + '/' + CEILING.notes.yearly + ', feed ' + CEILING.feed.top + '/' + CEILING.feed.yearly + ', spotlight ' + CEILING.spot.top + '/' + CEILING.spot.yearly + ')');
});

// run the soak underneath (its own stdout is the census)
require(path.join(__dirname, 'harness.js'));
