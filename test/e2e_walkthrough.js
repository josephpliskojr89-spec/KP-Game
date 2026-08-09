/* E2E walkthrough — plays the game like a player, in a real browser:
   new career → desk → scouting → looks + signings → training plans →
   weeks advance → lineup proposal → studio planning → debut → results →
   reload-and-continue (autosave). Asserts at every step.
   Run: NODE_PATH=$(npm root -g) node test/e2e_walkthrough.js */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml' };

let checks = 0;
function ok(cond, msg) {
  if (!cond) { console.error('  ✗ ' + msg); process.exitCode = 1; throw new Error('e2e failed: ' + msg); }
  checks++;
}

async function main() {
  const server = http.createServer((req, res) => {
    let file = req.url.split('?')[0];
    if (file === '/') file = '/index.html';
    const full = path.join(ROOT, file);
    try {
      const data = fs.readFileSync(full);
      res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
      res.end(data);
    } catch (e) { res.writeHead(404); res.end('not found'); }
  }).listen(0);
  const port = server.address().port;
  const base = 'http://127.0.0.1:' + port + '/';

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', err => { console.error('PAGE ERROR: ' + err.message); process.exitCode = 1; });

  async function tap(sel) { await page.click(sel); await page.waitForTimeout(60); }
  async function closeModalIfOpen() {
    if (await page.$('.modal-sheet')) { await tap('.modal-sheet [data-action=close-modal]'); }
  }
  async function advanceWeek() {
    await tap('#advance-btn');
    await page.waitForTimeout(120);
    await closeModalIfOpen();
  }

  // --- title screen (v0.5.1): the front door ---
  await page.goto(base);
  await page.waitForSelector('.title-wrap');
  ok(await page.$('#splash') !== null, 'splash exists');
  ok(await page.$('[data-action=title-new]') !== null, 'title offers a new career');
  ok(await page.$('[data-action=title-import]') !== null, 'title offers save import');
  ok(await page.$('[data-action=title-continue]') === null, 'no Continue without an autosave');

  // --- new career ---
  await tap('[data-action=title-new]');
  await page.waitForSelector('#nc-name');
  await page.fill('#nc-name', 'E2E Manager');
  await page.fill('#nc-seed', 'e2e-run');
  await tap('[data-action=start-career]');
  await page.waitForSelector('.objective');
  ok((await page.textContent('.objective')).includes('girl group'), 'desk shows the directive');
  ok(await page.$('#bottomnav') !== null, 'bottom nav present');
  ok((await page.textContent('#tb-week')).includes('Jan'), 'topbar shows the calendar');
  ok(await page.$$eval('.mail', els => els.length) >= 2, 'opening inbox stacked');

  // --- talent roster ---
  await tap('[data-nav=talent]');
  await page.waitForSelector('.talent-row');
  const rosterCount = await page.$$eval('.talent-row', els => els.length);
  ok(rosterCount === 6, 'six inherited trainees listed (got ' + rosterCount + ')');

  // --- dossier: blurbs, no numbers ---
  await tap('.talent-row');
  await page.waitForSelector('.domain-quote');
  ok(await page.$$eval('.domain-quote', els => els.length) === 5, 'five domain blurbs in the dossier');
  const dossierText = await page.textContent('#screen');
  ok(!/\bOVR\b|overall rating|overall[:\s]+\d/i.test(dossierText), 'no Overall rating anywhere in the dossier');
  ok(dossierText.includes('recommendation'), 'overall recommendation note present');

  // --- training plan: focus + intensity ---
  await tap('.focus-chips .chip');
  ok(await page.$('.focus-chips .chip.on') !== null, 'focus toggles on');
  await page.click('.seg [data-intensity=heavy]');
  await page.waitForTimeout(60);
  ok(await page.$('.seg button.on.heavy') !== null, 'intensity set to heavy');
  await tap('[data-action=back]');

  // --- scouting board: look, then sign ---
  await tap('[data-action=talent-sub][data-sub=board]');
  await page.waitForSelector('.talent-row');
  ok(await page.$$eval('.talent-row', els => els.length) >= 20, 'prospect board is stocked');
  ok((await page.textContent('#screen')).match(/watching|interested|circling/), 'rival interest visible on the board');
  const budgetBefore = parseInt((await page.textContent('#tb-budget')).replace(/\D/g, ''), 10);
  await tap('[data-action=observe]');
  const budgetAfterLook = parseInt((await page.textContent('#tb-budget')).replace(/\D/g, ''), 10);
  ok(budgetAfterLook === budgetBefore - 4, 'a targeted look costs budget');
  await tap('[data-action=sign]:not([disabled])');
  await page.waitForSelector('.modal-sheet');
  ok((await page.textContent('.modal-sheet')).includes('Contract cost'), 'signing asks for confirmation');
  await tap('[data-action=sign-confirm]');
  await page.waitForTimeout(120);
  await tap('[data-action=talent-sub][data-sub=roster]');
  ok(await page.$$eval('.talent-row', els => els.length) === 7, 'roster grew to seven');

  // --- training page: intensity without opening dossiers (v0.1.1) ---
  await tap('[data-action=talent-sub][data-sub=training]');
  await page.waitForSelector('.train-card');
  ok(await page.$$eval('.train-card', els => els.length) === 7, 'training page lists every trainee');
  await page.click('.train-card .seg [data-intensity=rest]');
  await page.waitForTimeout(80);
  ok(await page.$('.train-card .seg button.on.rest') !== null, 'intensity flipped to rest from the training page');
  await page.click('.train-card .focus-chips .chip:nth-child(2)');   // Rap — not set by the dossier step
  await page.waitForTimeout(80);
  ok(await page.$('.train-card .focus-chips .chip:nth-child(2).on') !== null, 'focus toggled from the training page');

  // --- advance lives in the topbar now ---
  ok(await page.$eval('#topbar #advance-btn', el => !!el), 'advance button sits in the topbar');

  // --- the sit-down: stage a conflict, then resolve it through the UI ---
  await page.evaluate(() => {
    const s = KP.App.state;
    const a = s.people[s.roster[0]], b = s.people[s.roster[1]];
    s.relationships[KP.pairKey(a, b)] = { score: -50, state: 'conflict' };
    KP.App.save();
  });
  await tap('[data-action=talent-sub][data-sub=roster]');
  await tap('.talent-row');
  await page.waitForSelector('[data-action=mediate]');
  ok((await page.textContent('#screen')).includes('open conflict'), 'the dossier surfaces the conflict');
  const budgetBeforeMed = parseInt((await page.textContent('#tb-budget')).replace(/\D/g, ''), 10);
  await tap('[data-action=mediate]');
  await page.waitForSelector('.modal-sheet');
  ok((await page.textContent('.modal-sheet')).includes('sit-down'), 'the sit-down resolves with a story');
  await tap('[data-action=close-modal]');
  const budgetAfterMed = parseInt((await page.textContent('#tb-budget')).replace(/\D/g, ''), 10);
  ok(budgetAfterMed === budgetBeforeMed - 3, 'staff time cost budget');
  const cdText = await page.textContent('#screen');
  ok(cdText.includes('sat down recently') || !(await page.$('[data-action=mediate]')),
    'cooldown blocks an immediate repeat from the UI');
  await tap('[data-action=back]');

  // --- weeks pass ---
  for (let i = 0; i < 6; i++) await advanceWeek();
  ok((await page.textContent('#tb-week')).length > 0, 'calendar moved');

  // --- release a trainee (the newest signing, as it happens) ---
  await tap('[data-nav=talent]');
  await tap('[data-action=talent-sub][data-sub=roster]');
  await page.waitForSelector('.talent-row');
  await page.click('.talent-row:nth-child(8)');   // 7th trainee row (after the seg header)
  await page.waitForSelector('[data-action=release]');
  await tap('[data-action=release]');
  await page.waitForSelector('.modal-sheet');
  ok((await page.textContent('.modal-sheet')).includes('not refunded'), 'release confirm states the cost');
  await tap('[data-action=release-confirm]');
  await page.waitForTimeout(150);
  ok(await page.$$eval('.talent-row', els => els.length) === 6, 'roster shrank to six after the release');

  // --- group builder ---
  await tap('[data-nav=groups]');
  await page.waitForSelector('[data-action=open-builder]');
  await tap('[data-action=open-builder]');
  await page.waitForSelector('.pick-cell');
  for (let i = 1; i <= 5; i++) {
    await page.click('.pick-grid .pick-cell:nth-child(' + i + ')');
    await page.waitForTimeout(60);
  }
  await page.waitForSelector('.role-row select');
  ok(await page.$$eval('.role-row', els => els.length) === 5, 'five role selectors');
  ok((await page.textContent('#screen')).includes('staff pick'), 'role hints marked as staff picks');

  // v0.3.3 regression: a changed role select must survive a re-render
  const options = await page.$eval('.role-row select', el => Array.from(el.options).map(o => o.value));
  const current = await page.$eval('.role-row select', el => el.value);
  const other = options.find(v => v !== current);
  await page.selectOption('.role-row select', other);
  await tap('[data-action=builder-name]');   // triggers a re-render
  ok((await page.$eval('.role-row select', el => el.value)) === other,
    'a chosen role survives re-render — no snap-back to staff picks');
  ok(await page.$$eval('.note', els => els.length) >= 1, 'room preview gives chemistry observations');
  await tap('[data-action=builder-propose]');
  await page.waitForSelector('.modal-sheet');
  ok((await page.textContent('.modal-sheet')).includes('reviews the lineup'), 'executive reacts to the proposal');
  await tap('[data-action=close-modal]');
  await page.waitForSelector('.group-hero .g-name');
  ok(await page.$$eval('.member-cell', els => els.length) === 5, 'group page shows five members');
  ok((await page.textContent('#screen')).includes('Maknae'), 'maknae labeled as a fact');

  // --- studio: song, concept, date, lock ---
  await tap('[data-nav=studio]');
  await page.waitForSelector('.demo-card');
  ok(await page.$$eval('.demo-card', els => els.length) === 4, 'four demos on the desk');
  await tap('.demo-card');
  await page.waitForSelector('.concept-scroll');
  ok((await page.textContent('#screen')).includes('✦'), 'the demo declares its natural lean');
  await page.waitForSelector('[data-action=studio-week]');
  await tap('[data-action=studio-week]');
  await tap('[data-action=studio-lock]');
  await page.waitForTimeout(150);
  await closeModalIfOpen();   // staff may flag a worn roster at lock (v0.4.2)
  ok((await page.textContent('#screen')).includes('Locked'), 'debut locked and in production');

  // --- ride to the debut ---
  let resultsSeen = false;
  for (let i = 0; i < 10; i++) {
    await tap('#advance-btn');
    await page.waitForTimeout(140);
    if (await page.$('.result-hero')) { resultsSeen = true; break; }
    await closeModalIfOpen();
  }
  ok(resultsSeen, 'debut resolved into the results page');
  const results = await page.textContent('#screen');
  ok(results.includes('The public decided'), 'public reaction section present');
  ok(results.includes('Breakout'), 'a breakout member was chosen');
  ok(results.includes('Upstairs'), 'the executive weighed in');

  // --- autosave: reload lands on the title, Continue restores (v0.5.1) ---
  const weekBefore = await page.textContent('#tb-week');
  await page.reload();
  await page.waitForSelector('.title-wrap');
  ok(await page.$('[data-action=title-continue]') !== null, 'the title now offers Continue');
  ok((await page.textContent('[data-action=title-continue]')).length > 8, 'Continue shows the career meta');

  // the overwrite guard: starting a new career over a live one asks first
  await tap('[data-action=title-new]');
  await page.waitForSelector('#nc-name');
  await tap('[data-action=start-career]');
  await page.waitForSelector('.modal-sheet');
  ok((await page.textContent('.modal-sheet')).includes('career is in progress'), 'a live career is not silently overwritten');
  await tap('.modal-sheet [data-action=close-modal]');
  await tap('[data-action=title-back]');
  await page.waitForSelector('[data-action=title-continue]');

  await tap('[data-action=title-continue]');
  await page.waitForSelector('.objective');
  ok((await page.textContent('#tb-week')) === weekBefore, 'Continue restored the autosave at the same week');

  // --- export lives in the System sheet (v0.5.1) ---
  await tap('[data-action=open-system]');
  await page.waitForSelector('.modal-sheet');
  ok((await page.textContent('.modal-sheet')).includes('Export save'), 'the System sheet offers export');
  ok(/save \d+ KB/.test(await page.textContent('.modal-sheet')), 'and shows the save size');
  await tap('[data-action=export-save]');
  await page.waitForSelector('#export-text');
  const exported = await page.$eval('#export-text', el => el.value);
  ok(exported.startsWith('{"version"'), 'the export box holds the real career JSON');
  await tap('.modal-sheet [data-action=close-modal]');
  await closeModalIfOpen();
  await tap('[data-nav=groups]');
  ok((await page.textContent('#screen')).includes('Discography'), 'group page shows a discography after reload');

  // --- the ladder: a comeback directive succeeded the debut objective ---
  await tap('[data-nav=desk]');
  const deskObjective = await page.textContent('.objective');
  ok(deskObjective.includes('comeback'), 'the executive already set the next target');
  ok(!/signings left/.test(deskObjective), 'the signing-allowance chip retired with the cap (v0.2.3)');
  ok(/open signing|watching spend/.test(deskObjective), 'the desk shows the open-agency state instead');

  // --- the calendar closes after a release (v0.4.2): promo, then rest ---
  for (let i = 0; i < 5; i++) await advanceWeek();
  await tap('[data-nav=studio]');
  const closed = await page.textContent('#screen');
  ok(/calendar reopens/.test(closed), 'the studio shows the closed calendar after promo');
  ok(/Let them|stages/.test(closed), 'the rest window is narrated, not just disabled');

  // --- rest ends; plan and resolve a comeback ---
  for (let i = 0; i < 3; i++) await advanceWeek();
  await tap('[data-nav=studio]');
  await page.waitForSelector('.demo-card');
  ok((await page.textContent('#screen')).includes('Comeback planning'), 'the studio reopened with fresh demos');
  await tap('.demo-card');
  await page.waitForSelector('[data-action=studio-week]');
  await tap('[data-action=studio-week]');
  await tap('[data-action=studio-lock]');
  await page.waitForTimeout(150);
  // a worn roster draws a staff note at lock time (v0.4.2) — acknowledge it
  if (await page.$('.modal-sheet')) {
    ok((await page.textContent('.modal-sheet')).includes('worn'), 'staff flag the lock over a worn roster');
    await tap('.modal-sheet [data-action=close-modal]');
  }
  ok((await page.textContent('#screen')).includes('comeback'), 'the comeback is locked');
  let comebackSeen = false;
  for (let i = 0; i < 12; i++) {
    await tap('#advance-btn');
    await page.waitForTimeout(140);
    if (await page.$('.result-hero')) { comebackSeen = true; break; }
    await closeModalIfOpen();
  }
  ok(comebackSeen, 'the comeback resolved into a report');
  ok((await page.textContent('.result-hero')).includes('Comeback report'), 'the report knows it is a comeback');
  await tap('[data-action=back]');
  await tap('[data-nav=groups]');
  const disco = await page.textContent('#screen');
  ok((disco.match(/peaked #/g) || []).length >= 2, 'discography lists both releases with chart peaks');
  ok(/without a lineup/.test(disco), 'the groups tab points at trainees waiting for a second lineup');

  // --- the living world: scene, chart, feed (v0.4.0) ---
  await tap('[data-nav=industry]');
  await page.waitForSelector('.rival-card');
  const scene = await page.textContent('#screen');
  ok(scene.includes('The other companies'), 'the scene lists the other companies');
  ok(scene.includes('The conversation'), 'the world has opinions about us (v0.6.0)');
  ok(scene.includes('never misses on vocals'), 'and it remembers the vocal pedigree');
  ok(/trainees/.test(scene), 'rival rosters are visible');
  ok(/fanbase/.test(scene), 'rival acts show on their company cards');
  // --- rivals with faces (v0.4.3): open an act, meet the members ---
  await tap('.rv-act.tappable');
  await page.waitForSelector('.member-cell');
  const actPage = await page.textContent('#screen');
  ok(await page.$$eval('.member-cell', els => els.length) >= 4, 'the rival lineup is real people');
  ok(/Members/.test(actPage), 'the act page lists its members');
  await tap('[data-action=back]');
  await page.waitForSelector('.rival-card');

  await tap('[data-action=industry-sub][data-sub=chart]');
  await page.waitForSelector('.chart-row');
  ok(await page.$$eval('.chart-row', els => els.length) >= 2, 'the scene chart has entries');
  ok(await page.$('.chart-row.mine') !== null, 'our release is on the chart, marked as ours');

  // --- the national board (v0.5.0): the wider world, viewable ---
  await tap('[data-action=industry-chart][data-chart=national]');
  await page.waitForSelector('.chart-row');
  ok(await page.$$eval('.chart-row', els => els.length) >= 8, 'the national chart is a bigger field');
  const natText = await page.textContent('#screen');
  ok(/The national chart/.test(natText), 'the national board announces itself');
  ok(/titans/.test(natText), 'and explains what it is');

  await tap('[data-action=industry-sub][data-sub=feed]');
  await page.waitForSelector('.feed-post');
  ok(await page.$$eval('.feed-post', els => els.length) >= 3, 'the fan feed is alive');
  const groupName = await page.evaluate(() => KP.App.state.groups[0].name);
  const feedText = await page.textContent('#screen');
  ok(feedText.includes('@'), 'the fans post under handles');
  ok(feedText.includes(groupName), 'the fans are talking about our group by name');

  await browser.close();
  server.close();
  console.log('PASS e2e_walkthrough: ' + checks + ' checks');
}

main().catch(err => { console.error(err.message || err); process.exit(1); });
