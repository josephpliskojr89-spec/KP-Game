/* The battery: runs every test suite, exit code is the verdict.
   Suites accrete — this list only grows. */
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const testDir = path.join(__dirname, '..', 'test');
const suites = fs.readdirSync(testDir).filter(f => /^suite_\d+.*\.js$/.test(f)).sort();

console.log('=== K-Pop Agency Manager battery: ' + suites.length + ' suites ===');
let failed = 0;
for (const suite of suites) {
  try {
    const out = execFileSync(process.execPath, [path.join(testDir, suite)], { encoding: 'utf8' });
    process.stdout.write(out);
  } catch (err) {
    failed++;
    process.stdout.write(err.stdout || '');
    process.stderr.write(err.stderr || String(err));
  }
}
if (failed) {
  console.error('=== BATTERY FAILED: ' + failed + '/' + suites.length + ' suites ===');
  process.exit(1);
}
console.log('=== BATTERY GREEN: ' + suites.length + '/' + suites.length + ' ===');
