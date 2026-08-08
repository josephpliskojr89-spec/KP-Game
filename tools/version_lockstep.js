/* Version lockstep: the version string lives in five places —
     1. js/engine/constants.js  (KP.C.VERSION)
     2. sw.js                   (CACHE key + V)
     3. index.html              (?v= cache-busters on every asset)
     4. index.html              (splash build tag)
     5. sw.js PRECACHE          (every script/css file stamped and precached)
   This tool verifies all of them agree and that no module is missing.
   Runs before every push. Exit code is the verdict. */
'use strict';
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(rootDir, f), 'utf8');
const problems = [];

// 1. source of truth
const constants = read('js/engine/constants.js');
const vMatch = constants.match(/VERSION:\s*'([\d.]+)'/);
if (!vMatch) { console.error('cannot find VERSION in constants.js'); process.exit(1); }
const V = vMatch[1];

// 2. service worker
const sw = read('sw.js');
if (!sw.includes("CACHE = 'kpam-" + V + "'")) problems.push('sw.js CACHE key is not kpam-' + V);
if (!sw.includes("V = '" + V + "'")) problems.push('sw.js V is not ' + V);

// 3+4. index.html cache-busters and splash tag
const html = read('index.html');
const busters = html.match(/\?v=([\d.]+)/g) || [];
busters.forEach(b => {
  if (b !== '?v=' + V) problems.push('index.html stale cache-buster: ' + b);
});
if (!html.includes('build ' + V)) problems.push('index.html splash build tag is not ' + V);

// every script/link asset in index.html must carry a buster
(html.match(/(?:src|href)="((?:js|css)\/[^"?]+)(\?v=[\d.]+)?"/g) || []).forEach(m => {
  if (!m.includes('?v=')) problems.push('asset missing cache-buster: ' + m);
});

// 5. every module on disk is script-tagged and precached
const moduleFiles = [];
['js/engine', 'js/ui'].forEach(dir => {
  fs.readdirSync(path.join(rootDir, dir)).filter(f => f.endsWith('.js'))
    .forEach(f => moduleFiles.push(dir + '/' + f));
});
moduleFiles.forEach(f => {
  if (!html.includes(f + '?v=' + V)) problems.push('module not loaded by index.html: ' + f);
  if (!sw.includes("'" + f + "?v=' + V")) problems.push('module not precached by sw.js: ' + f);
});
const cssFiles = fs.readdirSync(path.join(rootDir, 'css')).filter(f => f.endsWith('.css'));
cssFiles.forEach(f => {
  if (!html.includes('css/' + f + '?v=' + V)) problems.push('stylesheet not loaded: css/' + f);
  if (!sw.includes("'css/" + f + "?v=' + V")) problems.push('stylesheet not precached: css/' + f);
});

if (problems.length) {
  console.error('LOCKSTEP FAILED for v' + V + ':');
  problems.forEach(p => console.error('  ✗ ' + p));
  process.exit(1);
}
console.log('LOCKSTEP OK — v' + V + ' agrees across constants, sw cache, busters, splash, precache (' +
  moduleFiles.length + ' modules, ' + cssFiles.length + ' stylesheets).');
