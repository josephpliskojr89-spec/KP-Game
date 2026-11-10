/* Loads the engine modules into a vm sandbox — the same files the browser
   runs, no build step, no test framework. Exit code is the verdict. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ENGINE_FILES = [
  'constants.js', 'kernel.js', 'rng.js', 'data.js', 'person.js', 'blurbs.js',
  'development.js', 'relationships.js', 'scouting.js', 'network.js', 'floor.js', 'publiceye.js', 'fame.js', 'bookings.js', 'product.js', 'money.js', 'commerce.js', 'sheet.js', 'stage.js', 'promo.js', 'pair.js', 'mirror.js', 'pipeline.js', 'medical.js', 'market.js', 'hires.js', 'rituals.js', 'japan.js', 'circuit.js', 'broadcast.js', 'contentdesk.js', 'finance.js', 'scandal.js', 'schools.js', 'practice.js', 'verdict.js', 'songs.js',
  'group.js', 'posting.js', 'debut.js', 'events.js', 'career.js', 'gen.js', 'memory.js', 'social.js', 'discourse.js', 'industry.js', 'risefall.js', 'calendar.js', 'shows.js', 'regions.js', 'tongue.js', 'sagas.js', 'tour.js', 'era.js', 'farewell.js', 'ending.js', 'across.js', 'fandom.js', 'outside.js', 'hiatus.js', 'catalog.js', 'gravity.js', 'badblood.js', 'festivals.js', 'military.js', 'absence.js', 'awards.js', 'life.js', 'scenes.js', 'meeting.js', 'mandate.js', 'persona.js', 'secret.js', 'door.js', 'friction.js', 'scars.js', 'knock.js', 'staff.js', 'tenure.js', 'contracts.js', 'society.js', 'year.js', 'constituency.js', 'credits.js', 'studio.js', 'founding.js', 'estate.js', 'tracks.js', 'season.js', 'sim.js', 'newgame.js', 'save.js',
];

function loadEngine() {
  // the determinism law, enforced: the engine never draws Math.random
  // (audit v0.11.3) — the sandbox's Math throws on it
  const SafeMath = Object.create(Math);
  SafeMath.random = function () { throw new Error('Math.random inside the engine — the determinism law (hash01 or the tick rng)'); };
  const sandbox = { console, Math: SafeMath, JSON, Date };
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
