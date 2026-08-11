/* Loads the engine modules into a vm sandbox — the same files the browser
   runs, no build step, no test framework. Exit code is the verdict. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ENGINE_FILES = [
  'constants.js', 'kernel.js', 'rng.js', 'data.js', 'person.js', 'blurbs.js',
  'development.js', 'relationships.js', 'scouting.js', 'songs.js',
  'group.js', 'debut.js', 'events.js', 'career.js', 'gen.js', 'memory.js', 'social.js', 'discourse.js', 'industry.js', 'calendar.js', 'shows.js', 'regions.js', 'tour.js', 'fandom.js', 'deals.js', 'awards.js', 'life.js', 'scenes.js', 'meeting.js', 'persona.js', 'tracks.js', 'sim.js', 'newgame.js', 'save.js',
];

function loadEngine() {
  const sandbox = { console, Math, JSON, Date };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  const dir = path.join(__dirname, '..', 'js', 'engine');
  ENGINE_FILES.forEach(f => {
    const code = fs.readFileSync(path.join(dir, f), 'utf8');
    vm.runInContext(code, sandbox, { filename: f });
  });
  return sandbox.KP;
}

// tiny assertion kit shared by all suites
function makeT(suiteName) {
  let passed = 0, failed = 0;
  const fails = [];
  return {
    ok(cond, msg) {
      if (cond) passed++;
      else { failed++; fails.push(msg); }
    },
    eq(a, b, msg) { this.ok(a === b, msg + ' (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')'); },
    finish() {
      const label = suiteName + ': ' + passed + ' passed, ' + failed + ' failed';
      if (failed) {
        console.error('FAIL ' + label);
        fails.forEach(f => console.error('  ✗ ' + f));
        process.exit(1);
      }
      console.log('PASS ' + label);
    },
  };
}

module.exports = { loadEngine, makeT, ENGINE_FILES };
