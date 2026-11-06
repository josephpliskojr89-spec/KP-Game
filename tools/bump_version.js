#!/usr/bin/env node
/* The version bump (v0.11.3): one command moves VERSION across every place
   the lockstep checker reads — constants.js, sw.js (the cache key and V),
   and index.html (every ?v= buster and the splash build tag). It refuses
   to run when the buster count does not equal the modules on disk plus
   the stylesheets, so a module added to the page but not precached is
   caught here before the lockstep. Run: node tools/bump_version.js 0.11.4
   (then node tools/version_lockstep.js). */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const NEW = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(NEW || '')) { console.error('usage: node tools/bump_version.js <x.y.z>'); process.exit(2); }

const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const write = (f, s) => fs.writeFileSync(path.join(root, f), s);
const OLD = (read('js/engine/constants.js').match(/VERSION: '([\d.]+)'/) || [])[1];
if (!OLD) { console.error('constants.js has no VERSION'); process.exit(2); }
if (OLD === NEW) { console.error('already at ' + NEW); process.exit(2); }

function sub(file, pairs) {
  let s = read(file);
  pairs.forEach(([a, b, n]) => {
    const c = s.split(a).length - 1;
    if (c !== n) { console.error(file + ': expected ' + n + ' of ' + JSON.stringify(a) + ', found ' + c); process.exit(1); }
    s = s.split(a).join(b);
  });
  write(file, s);
}
// the busters must cover exactly the modules on disk plus the stylesheets
const modules = ['js/engine', 'js/ui'].reduce((n, d) => n + fs.readdirSync(path.join(root, d)).filter(f => f.endsWith('.js')).length, 0);
const css = fs.readdirSync(path.join(root, 'css')).filter(f => f.endsWith('.css')).length;
const html = read('index.html');
const busters = html.split('?v=' + OLD).length - 1;
if (busters !== modules + css) {
  console.error('index.html carries ' + busters + ' busters for v' + OLD + ' but disk has ' + modules + ' modules + ' + css + ' stylesheets');
  process.exit(1);
}
sub('js/engine/constants.js', [["VERSION: '" + OLD + "'", "VERSION: '" + NEW + "'", 1]]);
sub('sw.js', [["CACHE = 'kpam-" + OLD + "'", "CACHE = 'kpam-" + NEW + "'", 1], ["V = '" + OLD + "'", "V = '" + NEW + "'", 1]]);
sub('index.html', [['?v=' + OLD, '?v=' + NEW, busters], ['build ' + OLD, 'build ' + NEW, 1]]);
console.log('bumped ' + OLD + ' -> ' + NEW + ' (' + busters + ' busters, ' + modules + ' modules, ' + css + ' stylesheets)');
