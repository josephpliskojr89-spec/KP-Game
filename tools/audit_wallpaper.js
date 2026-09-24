/* The wallpaper audit (v0.10.29 audit tooling) — what actually fires.
   Wraps the engine's one note door (trimWeekNotes + note), the scene,
   discourse and claim doors, and every feed reaction, then runs the
   soak harness underneath. Output: per-ind emitted/kept/trimmed counts
   with org coverage, so "wallpaper" is a measured word, not a feeling.
   Run: node tools/audit_wallpaper.js 40 > out.json */
'use strict';
const path = require('path');
const fs = require('fs');
const loader = require(path.join(__dirname, '..', 'test', 'load_engine'));
const realLoad = loader.loadEngine;

const T = {
  notes: {},      // ind -> { emitted, kept, trimmed, orgs:Set, priorities:{} }
  scenes: {},     // kind -> { opened, orgs:Set }
  discourses: {}, // kind -> { ignited, orgs:Set }
  claims: {},     // type -> { opened, orgs:Set }
  feed: {},       // ind -> { reactions, orgs:Set }
  history: {},    // first 6 words of history text -> count
  orgs: 0,
};
let curOrg = 'none';
function bump(map, key, field, extra) {
  const e = map[key] = map[key] || { orgs: new Set() };
  e[field] = (e[field] || 0) + 1;
  e.orgs.add(curOrg);
  if (extra) extra(e);
}

loader.loadEngine = function () {
  const KP = realLoad.apply(this, arguments);
  const realNewGame = KP.newGame;
  KP.newGame = function (seed) {
    curOrg = String(seed);
    T.orgs++;
    return realNewGame.apply(this, arguments);
  };
  const realTrim = KP.trimWeekNotes;
  KP.trimWeekNotes = function (notes, budget) {
    const kept = realTrim.call(this, notes, budget);
    const keptSet = new Set(kept);
    notes.forEach(n => {
      const ind = n.ind || ('kind:' + (n.kind || '?'));
      bump(T.notes, ind, 'emitted', e => {
        e.priorities = e.priorities || {};
        const pr = n.priority || (n.urgent ? 'urgent' : 'normal');
        e.priorities[pr] = (e.priorities[pr] || 0) + 1;
      });
      bump(T.notes, ind, keptSet.has(n) ? 'kept' : 'trimmed');
      // sample texts for the ind-less buckets: first six words identify the template
      if (!n.ind && n.text) {
        const key = ind + '|' + String(n.text).split(/\s+/).slice(0, 6).join(' ');
        T.history[key] = (T.history[key] || 0) + 1;
      }
    });
    return kept;
  };
  const realNote = KP.note;
  KP.note = function (state, n) {
    const ind = n.ind || ('kind:' + (n.kind || '?'));
    bump(T.notes, ind, 'emitted');
    bump(T.notes, ind, 'kept');
    return realNote.call(this, state, n);
  };
  const realOpen = KP.openScene;
  KP.openScene = function (state, sc) { bump(T.scenes, sc.kind, 'opened'); return realOpen.call(this, state, sc); };
  const realIgnite = KP.igniteDiscourse;
  KP.igniteDiscourse = function (state, rng, kind) {
    const d = realIgnite.apply(this, arguments);
    if (d) bump(T.discourses, kind, 'ignited');
    return d;
  };
  const realClaim = KP.openClaim;
  KP.openClaim = function (state, c) { bump(T.claims, c.type, 'opened'); return realClaim.call(this, state, c); };
  const realFor = KP.feedReactionFor;
  KP.feedReactionFor = function (ind) {
    const fn = realFor.call(this, ind);
    if (!fn) return fn;
    return function () {
      const r = fn.apply(this, arguments);
      if (r) bump(T.feed, ind, 'reactions');
      return r;
    };
  };
  return KP;
};

process.on('exit', () => {
  const ser = m => Object.fromEntries(Object.entries(m).map(([k, v]) => {
    const o = Object.assign({}, v, { orgs: v.orgs.size });
    return [k, o];
  }));
  const out = { orgs: T.orgs, notes: ser(T.notes), scenes: ser(T.scenes),
    discourses: ser(T.discourses), claims: ser(T.claims), feed: ser(T.feed),
    templates: Object.fromEntries(Object.entries(T.history).sort((a, b) => b[1] - a[1]).slice(0, 400)) };
  const file = process.env.WALLPAPER_OUT || path.join(__dirname, '..', 'wallpaper.json');
  fs.writeFileSync(file, JSON.stringify(out, null, 1));
  process.stderr.write('wallpaper audit → ' + file + '\n');
});

// run the soak underneath (its own stdout is the census)
require(path.join(__dirname, 'harness.js'));
