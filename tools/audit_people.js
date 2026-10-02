#!/usr/bin/env node
/* The people audit (v0.10.31, §90 B6) — one world of people, measured.
   Wraps the engine's doors (stampBorn, advanceWeek) the way the
   wallpaper audit wraps its notes, runs the 40-seed soak underneath,
   and prints per org-year: births by door, the floor ledger, people by
   status at career end, rival floor sizes — and the two numbers that
   must be ZERO: births with no door stamp, and rival acts cast with a
   member minted that same week.
   Run: node tools/audit_people.js 40 */
'use strict';
const path = require('path');
const loader = require(path.join(__dirname, '..', 'test', 'load_engine'));
const realLoad = loader.loadEngine;

const T = { births: {}, undoored: 0, orgs: new Set(), byStatus: {}, floors: [], ledger: {}, ghostCasts: 0, kept: 0 };
loader.loadEngine = function () {
  const KP = realLoad.apply(this, arguments);
  const realStamp = KP.stampBorn;
  KP.stampBorn = function (state, p, door, extra) {
    const had = !!p.born;
    const r = realStamp.call(this, state, p, door, extra);
    if (!had) T.births[door] = (T.births[door] || 0) + 1;
    return r;
  };
  const realAdvance = KP.advanceWeek;
  KP.advanceWeek = function (state) {
    const before = new Set(Object.keys(state.people));
    const actsBefore = new Set(), rivalsBefore = new Set();
    (state.rivals || []).forEach(r => { rivalsBefore.add(r.short); (r.acts || []).forEach(a => actsBefore.add(a.id)); });
    const out = realAdvance.call(this, state);
    Object.values(state.people).forEach(p => {
      if (!before.has(p.id) && !p.born) { T.undoored++; p.born = { door: '?', city: '?', week: state.week }; }
    });
    (state.rivals || []).forEach(r => (r.acts || []).forEach(a => {
      if (actsBefore.has(a.id) || !rivalsBefore.has(r.short)) return;   // a company arriving WITH its act is a door
      (a.members || []).forEach(id => { const p = state.people[id]; if (!before.has(id) && !(p && p.born && p.born.door === 'abroad')) { T.ghostCasts++; if (T.ghostCasts <= 5) console.log('  ghost cast: ' + r.short + ' / ' + a.name + ' wk ' + state.week + ' member born via ' + (p && p.born ? p.born.door : '?') + ' seed ' + state.seed); } });
    }));
    if (state.week === 140 && !T.orgs.has(state.seed)) {
      T.orgs.add(state.seed);
      Object.values(state.people).forEach(p => {
        T.byStatus[p.status] = (T.byStatus[p.status] || 0) + 1;
        if (p.status === 'gone') T.kept++;
      });
      (state.rivals || []).forEach(r => T.floors.push(KP.rivalFloor(state, r).length));
      Object.entries(state.floorLedger || {}).forEach(([k, v]) => { T.ledger[k] = (T.ledger[k] || 0) + v; });
    }
    return out;
  };
  return KP;
};

process.on('exit', () => {
  const N = T.orgs.size || 1;
  const yrs = (N * 140) / 52;
  console.log('\n=== PEOPLE AUDIT: ' + N + ' orgs, ' + yrs.toFixed(0) + ' org-years ===');
  console.log('births per org-year by door:');
  Object.entries(T.births).sort((a, b) => b[1] - a[1]).forEach(([k, v]) =>
    console.log('  ' + String(k).padEnd(16) + (v / yrs).toFixed(1)));
  console.log('births with NO door (must be 0): ' + T.undoored);
  console.log('rival acts cast with a member minted that week (must be 0): ' + T.ghostCasts);
  console.log('floor ledger per org-year: ' + Object.entries(T.ledger).map(([k, v]) => k + ' ' + (v / yrs).toFixed(1)).join(' · '));
  console.log('people by status at career end (avg per org): ' + Object.entries(T.byStatus).map(([k, v]) => k + ' ' + (v / N).toFixed(1)).join(' · '));
  if (T.floors.length) {
    const fs = T.floors.slice().sort((a, b) => a - b);
    console.log('rival floor sizes at career end: min ' + fs[0] + ' median ' + fs[Math.floor(fs.length / 2)] + ' max ' + fs[fs.length - 1]);
  }
});

// run the soak underneath (its own stdout is the census)
require(path.join(__dirname, 'harness.js'));
