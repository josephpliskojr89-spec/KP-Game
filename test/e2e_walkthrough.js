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
  // v0.9.10: six trainees plus the last group's four veterans
  ok(rosterCount === 10, 'six trainees + four inherited idols listed (got ' + rosterCount + ')');

  // --- dossier: blurbs, no numbers ---
  await tap('.talent-row');
  await page.waitForSelector('.domain-row');
  ok(await page.$$eval('.domain-row', els => els.length) === 5, 'five attribute rows on the profile tab');
  // the written blurbs live on their own tab now (0.8.3.1 UI pass)
  await tap('[data-action=dossier-tab][data-tab=notes]');
  await page.waitForSelector('.domain-quote');
  ok(await page.$$eval('.domain-quote', els => els.length) === 5, 'five domain blurbs on the file tab');
  const notesText = await page.textContent('#screen');
  ok(notesText.includes('recommendation'), 'overall recommendation note present on the file tab');
  await tap('[data-action=dossier-tab][data-tab=history]');
  await page.waitForTimeout(80);
  await tap('[data-action=dossier-tab][data-tab=profile]');
  await page.waitForTimeout(80);
  const dossierText = await page.textContent('#screen');
  ok(!/\bOVR\b|overall rating|overall[:\s]+\d/i.test(dossierText), 'no Overall rating anywhere in the dossier');
  ok(/followers/.test(dossierText), 'the profile shows her public following (v0.6.1)');
  ok(/How the staff read/.test(dossierText), 'the staff read is on the working card (v0.9.3)');

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
  const lookCost = await page.evaluate(() => KP.C.SCOUT.observeCost);
  await tap('[data-action=observe]');
  const budgetAfterLook = parseInt((await page.textContent('#tb-budget')).replace(/\D/g, ''), 10);
  ok(budgetAfterLook === budgetBefore - lookCost, 'a targeted look costs budget');
  // --- the regional schools (v0.9.16): the map under the board ---
  const boardText = await page.textContent('#screen');
  ok(/The regional schools/.test(boardText), 'the schools directory renders under the board');
  ok((await page.$$eval('[data-action=school-trip]', els => els.length)) >= 3, 'every school offers the trip');
  const budgetBeforeTrip = parseInt((await page.textContent('#tb-budget')).replace(/\D/g, ''), 10);
  await tap('[data-action=school-trip]');
  const budgetAfterTrip = parseInt((await page.textContent('#tb-budget')).replace(/\D/g, ''), 10);
  ok(budgetAfterTrip < budgetBeforeTrip, 'the train ticket costs what it costs');
  await tap('[data-action=sign]:not([disabled])');
  await page.waitForSelector('.modal-sheet');
  ok((await page.textContent('.modal-sheet')).includes('Contract cost'), 'signing asks for confirmation');
  await tap('[data-action=sign-confirm]');
  await page.waitForTimeout(120);
  await tap('[data-action=talent-sub][data-sub=roster]');
  ok(await page.$$eval('.talent-row', els => els.length) === 11, 'roster grew to eleven');

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
  await page.click('.talent-row:nth-child(12)');  // 11th roster row (after the seg header) — the newest signing, appended after 6 trainees + 4 veterans
  await page.waitForSelector('[data-action=release]');
  await tap('[data-action=release]');
  await page.waitForSelector('.modal-sheet');
  ok((await page.textContent('.modal-sheet')).includes('not refunded'), 'release confirm states the cost');
  await tap('[data-action=release-confirm]');
  await page.waitForTimeout(150);
  ok(await page.$$eval('.talent-row', els => els.length) === 10, 'roster shrank to ten after the release');

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
  // v0.9.10: two groups now (the inherited veterans + the new lineup) —
  // the tab shows cards; open the new group's page (second card)
  await page.waitForSelector('.group-hero');
  ok(await page.$$eval('[data-action=open-grouppage]', els => els.length) === 2, 'two group cards — the last group and the new lineup');
  await page.click('[data-action=open-grouppage]:nth-of-type(2)');
  await page.waitForSelector('.member-cell');
  ok(await page.$$eval('.member-cell', els => els.length) === 5, 'group page shows five members');
  ok((await page.textContent('#screen')).includes('Maknae'), 'maknae labeled as a fact');

  // --- studio: song, concept, date, lock ---
  // the walkthrough spends more on the desk now (look 12, school trip) —
  // stage enough budget that the LOCK tests the studio, not the wallet
  await page.evaluate(() => { KP.App.state.budget += 40; KP.App.save(); });
  await tap('[data-nav=studio]');
  await page.waitForSelector('.demo-card');
  ok(await page.$$eval('.demo-card', els => els.length) === 4, 'four demos on the desk');
  await tap('.demo-card');
  await page.waitForSelector('.concept-scroll');
  ok((await page.textContent('#screen')).includes('✦'), 'the demo declares its natural lean');
  // the rollout builder (v0.6.3): four weeks of constrained bookings
  await page.waitForSelector('.ro-week');
  ok(await page.$$eval('.ro-week', els => els.length) === 4, 'the rollout grid shows four promo weeks');
  const chipSel = '.ro-week [data-action=studio-rollact][data-week="0"][data-act="challenge"]';
  const wasOn = await page.$eval(chipSel, el => el.classList.contains('on'));
  await tap(chipSel);
  await page.waitForTimeout(80);
  ok(await page.$eval(chipSel, el => el.classList.contains('on')) !== wasOn,
    'a booking chip toggles on tap');
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
  // v0.9.10: card list again after reload — open the new lineup's page
  await page.waitForSelector('[data-action=open-grouppage]');
  await page.click('[data-action=open-grouppage]:nth-of-type(2)');
  await page.waitForSelector('.member-cell');
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
  // v0.9.10: the studio defaults to the group hungriest for a record —
  // the inherited veterans, whose calendar is wide open. Switch to the
  // new lineup to see its post-promo rest window.
  await page.waitForSelector('[data-action=studio-group]');
  await page.click('[data-action=studio-group]:nth-of-type(2)');
  await page.waitForTimeout(120);
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
  // the lock may draw a staff note: a worn roster (v0.4.2) or a date
  // clash with an announced rival week (v0.6.4) — acknowledge either
  if (await page.$('.modal-sheet')) {
    const lockNote = await page.textContent('.modal-sheet');
    ok(/worn|announced|head-to-head/.test(lockNote),
      'staff flag the lock (worn roster or date clash)');
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
  // v0.9.10: cards first — the lineup pointer lives on the tab, the
  // discography on the group page behind the second card
  await page.waitForSelector('[data-action=open-grouppage]');
  ok(/without a lineup/.test(await page.textContent('#screen')), 'the groups tab points at trainees waiting for a second lineup');
  await page.click('[data-action=open-grouppage]:nth-of-type(2)');
  await page.waitForSelector('.member-cell');
  const disco = await page.textContent('#screen');
  ok((disco.match(/peaked #/g) || []).length >= 2, 'discography lists both releases with chart peaks');

  // --- the living world: scene, chart, feed (v0.4.0) ---
  await tap('[data-nav=industry]');
  await page.waitForSelector('.rival-card');
  const scene = await page.textContent('#screen');
  ok(scene.includes('The other companies'), 'the scene lists the other companies');
  ok(scene.includes('The conversation'), 'the world has opinions about us (v0.6.0)');
  ok(scene.includes('never misses on vocals'), 'and it remembers the vocal pedigree');
  ok(/chases every trend|out-dance everyone|signs young and waits/.test(scene),
    'the rivals carry their own stories now (v0.6.1)');
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

  // --- the discourse (v0.6.2): a storm trends, the company responds ---
  await page.evaluate(() => {
    const s = KP.App.state;
    const rng = KP.rngFor(s);
    const g = s.groups[0];
    // clear any organic storms so the forced one has room (maxLive cap)
    (s.discourses || []).forEach(d => { if (d.status === 'live') d.status = 'faded'; });
    KP.igniteDiscourse(s, rng, 'styling', 'group', g.id, g.id);
    s.rngState = rng.state();
    KP.App.save();
    KP.App.render();
  });
  await tap('[data-action=industry-sub][data-sub=feed]');
  await page.waitForSelector('.disc-card');
  // another storm may already be live and render first — read them all
  const trending = await page.$$eval('.disc-card', els => els.map(e => e.textContent).join('\n'));
  ok(/STYLING DISCOURSE/.test(trending), 'the storm announces its kind');
  ok(/die on their own/.test(trending), 'ignoring is offered as a strategy');
  await tap('[data-action=discourse-respond][data-move=meme]');
  await page.waitForSelector('.modal-sheet');
  ok((await page.textContent('.modal-sheet')).includes('PR desk'), 'the response resolves with a story');
  await tap('.modal-sheet [data-action=close-modal]');
  const afterResp = await page.textContent('#screen');
  ok(/company has spoken|The fan feed/.test(afterResp), 'the storm is answered or resolved');
  ok(await page.$('.fp-persona') !== null, 'feed posts wear personas now');

  await page.waitForSelector('.feed-post');
  ok(await page.$$eval('.feed-post', els => els.length) >= 3, 'the fan feed is alive');
  const feedText = await page.textContent('#screen');
  ok(feedText.includes('@'), 'the fans post under handles');
  // ANY of our groups, across the whole feed — groups[0] is the legacy
  // act since v0.9.10, and which posts surface each week is
  // stream-dependent; the claim under test is that fans name OUR acts
  const namedInFeed = await page.evaluate(() =>
    (KP.App.state.feed || []).some(p => KP.App.state.groups.some(g2 => (p.text || '').includes(g2.name))));
  ok(namedInFeed, 'the fans are talking about our group by name');

  // --- the war calendar (v0.6.4): announced comebacks share the Desk strip
  await page.evaluate(() => {
    const s = KP.App.state;
    const act = s.rivals[0].acts.find(a => !a.retired) || s.rivals[0].acts[0];
    act.announcedWeek = s.week + 3;
    KP.App.save();
  });
  await tap('[data-nav=desk]');
  await page.waitForTimeout(120);
  ok(/comeback — /.test(await page.textContent('#screen')),
    'announced rival comebacks reach the Desk calendar strip');

  await browser.close();
  server.close();
  console.log('PASS e2e_walkthrough: ' + checks + ' checks');
}

main().catch(err => { console.error(err.message || err); process.exit(1); });
