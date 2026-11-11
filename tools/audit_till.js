#!/usr/bin/env node
/* The till audit (v0.11.35, §127) — the till's one door in, watched.
   The year's sum counts what comes in at KP.takeIn. A credit that reaches
   the till any other way is a credit the year never counts, and the letter
   the company writes to itself would say less came in than did.

   This audit wraps the engine the way the people audit does and runs the
   soak underneath with the till of every world watched. Every time a till
   rises it asks where from:

   - through the door (KP.takeIn): counted, and nothing to say;
   - a world's opening till, set by one plain line at a new game, a
     founding or a second chance: not income, counted apart;
   - the harness's own top-ups: a tool's hand, counted apart;
   - anything else: a line that raised the till outside the door. It is
     named, and the audit fails.

   It also holds the door to its count: what went through it must be what
   the year's ledgers took.
   Run: node tools/audit_till.js 40
   Required as a module it runs nothing: the suite takes `wrap` and `report`
   and holds them on a small case of its own. */
'use strict';
const fs = require('fs');
const path = require('path');
const ENGINE = path.join(__dirname, '..', 'js', 'engine');

const tally = () => ({ worlds: 0, door: 0, doorSum: 0, openings: 0, openingSum: 0, tool: 0, toolSum: 0, outside: {}, tookSum: 0, miscount: [] });
// the nearest frame that is not this file
const frame = () => {
  const lines = (new Error().stack || '').split('\n').slice(1);
  for (const l of lines) {
    if (/audit_till\.js/.test(l)) continue;
    const m = /([A-Za-z0-9_]+\.js):(\d+):\d+/.exec(l);
    if (m) return { file: m[1], line: Number(m[2]), tool: /[\\/]tools[\\/]/.test(l) };
  }
  return { file: '?', line: 0, tool: true };
};
// a world's opening till: one plain assignment, in one of the three files that open a company
const OPENERS = ['newgame.js', 'founding.js', 'estate.js'];
const source = {};
const isOpening = at => {
  if (!OPENERS.includes(at.file)) return false;
  const src = source[at.file] = source[at.file] || fs.readFileSync(path.join(ENGINE, at.file), 'utf8').split('\n');
  return /^\s*state\.budget = [^;]+;/.test(src[at.line - 1] || '');
};

// the engine, with its door counted and the till of every world it makes watched
function wrap(KP, T) {
  let inDoor = 0;
  const realTake = KP.takeIn;
  KP.takeIn = function (state, amount) {
    const before = state.yearLedger ? state.yearLedger.took : 0;
    inDoor++;
    try { return realTake.apply(this, arguments); }
    finally {
      inDoor--;
      if (amount > 0) {
        T.door++; T.doorSum += amount;
        const counted = (state.yearLedger ? state.yearLedger.took : 0) - before;
        T.tookSum += counted;
        if (Math.abs(counted - amount) > 1e-9 && T.miscount.length < 5) T.miscount.push('a credit of ' + amount + ' was counted as ' + counted + ' (week ' + state.week + ')');
      }
    }
  };
  const watch = state => {
    if (!state || typeof state !== 'object' || !('budget' in state)) return state;
    const d0 = Object.getOwnPropertyDescriptor(state, 'budget');
    if (d0 && d0.get) return state;
    T.worlds++;
    let v = state.budget;
    Object.defineProperty(state, 'budget', { enumerable: true, configurable: true,
      get() { return v; },
      set(n) {
        const d = n - v; v = n;
        if (!(d > 1e-9) || inDoor) return;
        const at = frame();
        if (at.tool) { T.tool++; T.toolSum += d; return; }
        if (isOpening(at)) { T.openings++; T.openingSum += d; return; }
        const k = at.file + ':' + at.line;
        const row = T.outside[k] = T.outside[k] || { n: 0, sum: 0 };
        row.n++; row.sum += d;
      } });
    return state;
  };
  const realNew = KP.newGame;
  KP.newGame = function () { return watch(realNew.apply(this, arguments)); };
  const realLoadSave = KP.deserialize;
  KP.deserialize = function () { return watch(realLoadSave.apply(this, arguments)); };
  return KP;
}

// what the audit found, in lines, and whether it failed
function report(T) {
  const r = n => Math.round(n);
  const off = Object.keys(T.outside).sort((a, b) => T.outside[b].sum - T.outside[a].sum);
  const lines = ['', '=== THE TILL AUDIT: ' + T.worlds + ' tills watched ===',
    'through the door: ' + T.door + ' credits, ' + r(T.doorSum) + ' in all · the year’s ledgers took ' + r(T.tookSum),
    'opening tills (a new game, a founding, a second chance): ' + T.openings + ', ' + r(T.openingSum) + ' in all · the tool’s own top-ups: ' + T.tool + ', ' + r(T.toolSum) + ' in all'];
  off.forEach(k => lines.push('  OUTSIDE THE DOOR: ' + k + ' raised the till ' + T.outside[k].n + ' times, by ' + r(T.outside[k].sum) + ' in all'));
  T.miscount.forEach(m => lines.push('  MISCOUNTED: ' + m));
  if (!T.door) lines.push('  NOTHING CAME THROUGH THE DOOR: the audit watched nothing');
  const bad = off.length > 0 || T.miscount.length > 0 || Math.abs(T.doorSum - T.tookSum) > 1e-6 || !T.door;
  lines.push(bad
    ? '=== TILL AUDIT FAILED: ' + off.length + ' line(s) raise the till outside the door' + (T.miscount.length ? ', and the door miscounts' : '') + ' ==='
    : '=== TILL CLEAN: every credit came through the door, and the year’s ledgers took every one ===');
  return { bad, lines, outside: off };
}

module.exports = { tally, wrap, report };

if (require.main === module) {
  const loader = require(path.join(__dirname, '..', 'test', 'load_engine'));
  const realLoad = loader.loadEngine;
  const T = tally();
  loader.loadEngine = function () { return wrap(realLoad.apply(this, arguments), T); };
  process.on('exit', () => {
    const out = report(T);
    out.lines.forEach(l => console.log(l));
    if (out.bad) process.exitCode = 1;
  });
  process.argv = [process.argv[0], path.join(__dirname, 'harness.js'), process.argv[2] || '40'];
  require(path.join(__dirname, 'harness.js'));
}
