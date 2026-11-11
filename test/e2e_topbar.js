/* E2E — the top bar holds its line (v0.11.31, §123). In a real browser, at
   phone widths from 320 to 430 px, with short and long label names, tills
   from nothing to six digits, and the first and the twelfth year:

   - the date, the till, the name and the button's words never break onto a
     second line; nothing overlaps; nothing runs off the screen;
   - the bar is never taller than the room the page leaves for it;
   - when the bar is short of room the left block gives: the date drops under
     the name as a whole, then the name is cut with three dots, and only on
     the narrowest screens is the date cut;
   - at 400 px and under the date is always under the name, so the bar does
     not change shape as the till grows; above that it is beside the name
     wherever one line has room.

   Layout cannot be checked in the DOM stub: this is the repo's own guard on
   the stylesheet. Unlike the walkthrough it runs every check and names each
   one that fails.
   Run: NODE_PATH=$(npm root -g) node test/e2e_topbar.js */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml' };
const WIDTHS = [320, 360, 375, 390, 412, 430];
const SHORTS = ['HCG', 'Paper', 'HOMEWARD', 'Neo-Seoul', 'WWWWWWWWW'];   // the house's own, a short one, eight letters, one with a hyphen, the widest nine
const TILLS = [0, 882, 3975, 12345, 123456, -250];
const WEEKS = [1, 48 * 11 + 47];                             // Jan · Wk 1 · Y1 and Dec · Wk 3 · Y12

let passed = 0;
const fails = [];
// a check over the grid: it passes when no case offends, and names the first few that do
function all(rows, bad, msg) {
  const off = rows.filter(bad);
  if (!off.length) { passed++; return; }
  fails.push(msg + ' (' + off.length + ' of ' + rows.length + ': ' + off.slice(0, 3).map(r => [r.width, r.short, r.till, r.week === 1 ? 'Y1' : 'Y12'].join('/')).join(' ') + ')');
}
function ok(cond, msg) { if (cond) passed++; else fails.push(msg); }

async function main() {
  const server = http.createServer((req, res) => {
    let file = req.url.split('?')[0];
    if (file === '/') file = '/index.html';
    try {
      const data = fs.readFileSync(path.join(ROOT, file));
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    } catch (e) { res.writeHead(404); res.end('not found'); }
  }).listen(0);
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));
  const tap = async sel => { await page.click(sel); await page.waitForTimeout(60); };

  // a new career, through the front door
  await page.goto(base);
  await page.waitForSelector('.title-wrap');
  await tap('[data-action=title-new]');
  await page.waitForSelector('#nc-name');
  await page.fill('#nc-name', 'Bar Manager');
  await page.fill('#nc-seed', 'e2e-topbar');
  await tap('[data-action=start-career]');
  await page.waitForSelector('.objective');

  // one case: the name, the till and the week are set on the live state, the app draws, and the bar is measured
  const measure = (short, till, week) => page.evaluate(([short, till, week]) => {
    const x = KP.App.state; x.company.short = short; x.budget = till; x.week = week;
    KP.App.render();
    window.scrollTo(0, 0);
    const q = s => document.querySelector(s);
    const bar = q('#topbar'), left = q('.tb-left'), co = q('.tb-company'), wk = q('#tb-week'), adv = q('#advance-btn'), bd = q('#tb-budget'), menu = q('.tb-menu'), screen = q('#screen');
    const r = e => { const b = e.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width, height: b.height }; };
    const lines = e => { const cs = getComputedStyle(e); const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5; return Math.round((e.getBoundingClientRect().height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - parseFloat(cs.borderTopWidth) - parseFloat(cs.borderBottomWidth)) / lh); };
    const bcs = getComputedStyle(bar);
    return { inner: window.innerWidth, bar: r(bar), left: r(left), co: r(co), wk: r(wk), adv: r(adv), bd: r(bd), menu: r(menu),
      weekLines: lines(wk), tillLines: lines(bd), coLines: lines(co), advLines: lines(adv),
      coCut: co.scrollWidth > co.clientWidth + 1, wkCut: wk.scrollWidth > wk.clientWidth + 1,
      coDots: getComputedStyle(co).textOverflow, wkDots: getComputedStyle(wk).textOverflow,
      coClip: getComputedStyle(co).overflowX, wkClip: getComputedStyle(wk).overflowX,
      stacked: r(wk).top >= r(co).bottom - 2,
      padL: parseFloat(bcs.paddingLeft), padR: parseFloat(bcs.paddingRight),
      room: parseFloat(getComputedStyle(screen).paddingTop), first: screen.firstElementChild ? screen.firstElementChild.getBoundingClientRect().top : null };
  }, [short, till, week]);

  // what each name and each date measures with all the room it wants
  await page.setViewportSize({ width: 560, height: 844 });
  const natural = { co: {}, wk: {}, adv: 0 };
  for (const short of SHORTS) { const wide = await measure(short, 0, 1); natural.co[short] = wide.co.width; natural.adv = wide.adv.width; }
  for (const week of WEEKS) natural.wk[week] = (await measure('HCG', 0, week)).wk.width;

  const rows = [];
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 844 });
    for (const short of SHORTS) for (const till of TILLS) for (const week of WEEKS) {
      rows.push(Object.assign({ width, short, till, week }, await measure(short, till, week)));
    }
  }
  const EPS = 0.6;

  // ---- nothing breaks, overlaps or runs off ----
  ok(rows.length === WIDTHS.length * SHORTS.length * TILLS.length * WEEKS.length, 'every case of the grid was measured');
  all(rows, r => r.weekLines !== 1, 'the date is never broken onto a second line');
  all(rows, r => r.tillLines !== 1, 'the till is never broken onto a second line');
  all(rows, r => r.coLines !== 1, 'the label’s name is never broken onto a second line');
  all(rows, r => r.advLines !== 1, 'the button’s words are never broken onto a second line');
  all(rows, r => r.left.right > r.adv.left + EPS || r.co.right > r.adv.left + EPS || r.wk.right > r.adv.left + EPS || r.adv.right > r.bd.left + EPS || r.bd.right > r.menu.left + EPS, 'no part of the bar overlaps another');
  all(rows, r => r.menu.right > r.inner + EPS || r.co.left < -EPS, 'nothing runs off the screen');
  all(rows, r => r.adv.left - r.left.right < 4 - EPS || r.bd.left - r.adv.right < 4 - EPS, 'at least 4 px stand between the button and its neighbours');
  all(rows, r => r.bar.height > r.room + EPS, 'the bar is never taller than the room the page leaves for it');
  all(rows, r => r.first == null || r.first < r.bar.bottom - EPS, 'the page starts below the bar');

  // ---- where the date sits ----
  all(rows.filter(r => r.width <= 400), r => !r.stacked, 'at 400 px and under the date is always under the name');
  const need = r => natural.co[r.short] + 10 + natural.wk[r.week] + 4 + r.adv.width + 4 + (r.menu.right - r.bd.left) + r.padL + r.padR;
  const wide = rows.filter(r => r.width > 400);
  all(wide.filter(r => need(r) <= r.width - 1.5), r => r.stacked, 'above 400 px the date is beside the name wherever one line has room');
  all(wide.filter(r => need(r) >= r.width + 1.5), r => !r.stacked, 'and under the name wherever it has not');
  ok(wide.some(r => !r.stacked) && wide.some(r => r.stacked), 'the grid holds both: a bar on one line, and a bar with the date under the name');
  all(rows.filter(r => !r.stacked), r => Math.abs(r.wk.left - r.co.right - 10) > EPS, 'beside the name, the date keeps its ten px');
  all(rows.filter(r => r.stacked), r => Math.abs(r.wk.left - r.co.left) > EPS, 'under the name, the date starts where the name does');

  // ---- what is cut, and when ----
  all(rows.filter(r => r.short === 'HCG'), r => r.coCut, 'the house’s own name is never cut');
  all(rows.filter(r => r.short === 'HOMEWARD' && r.width >= 360), r => r.coCut, 'an eight-letter name is whole at 360 px and wider');
  all(rows.filter(r => r.coCut), r => !r.stacked, 'a name is cut only once the date is under it');
  ok(rows.some(r => r.coCut), 'the grid holds a name too wide for its screen, cut');
  all(rows, r => r.coDots !== 'ellipsis' || r.wkDots !== 'ellipsis', 'what is cut ends in three dots');
  all(rows.filter(r => r.coCut || r.wkCut), r => (r.coCut && r.coClip !== 'hidden') || (r.wkCut && r.wkClip !== 'hidden'), 'and is clipped at its own box, not spilled over its neighbour');
  all(rows.filter(r => r.width >= 350), r => r.wkCut, 'the date is whole on every screen of 350 px and wider');
  all(rows.filter(r => r.width < 350 && String(Math.abs(r.till)).length <= 5 && r.week === 1), r => r.wkCut, 'and at 320 px too, up to a five-digit till');

  // ---- the button gives up padding only where the screen is short ----
  all(rows.filter(r => r.width >= 375), r => Math.abs(r.adv.width - natural.adv) > EPS, 'at 375 px and wider the button keeps its full size');
  all(rows.filter(r => r.width >= 350 && r.width < 375), r => Math.abs(r.adv.width - (natural.adv - 6)) > EPS, 'from 350 to 374 px it gives up six px of padding, and no more');
  all(rows.filter(r => r.width < 350), r => r.adv.width > natural.adv - 12, 'under 350 px it gives up more');
  all(rows.filter(r => r.width >= 350), r => Math.abs(r.menu.left - r.bd.right - 12) > EPS, 'at 350 px and wider the till keeps its twelve px from the menu');
  all(rows.filter(r => r.width < 350), r => Math.abs(r.menu.left - r.bd.right - 6) > EPS, 'and under 350 px keeps six');
  all(rows, r => r.adv.width < 88 || r.adv.height < 30, 'at every width the button is still a full-size thing to tap');

  // ---- the bar still works ----
  await page.setViewportSize({ width: 360, height: 844 });
  await measure('HCG', 3975, 30);
  await tap('[data-nav=desk]');
  await page.evaluate(() => { const x = KP.App.state; (x.scenes || []).slice().forEach(sc => { const d = KP.sceneDef(sc.kind); if (d) KP.resolveScene(x, sc.id, d.options(x, sc)[0].id); }); });
  await tap('#advance-btn');
  await page.waitForTimeout(200);
  for (let i = 0; i < 5; i++) { if (await page.$('.modal-sheet [data-action=close-modal]')) await tap('.modal-sheet [data-action=close-modal]'); else break; }
  const after = await page.evaluate(() => ({ week: KP.App.state.week, text: document.getElementById('tb-week').textContent, till: document.getElementById('tb-budget').textContent }));
  ok(after.week === 31 && after.text === 'Aug · Wk 3 · Y1' && /^₩ -?\d+$/.test(after.till), 'from the bar at 360 px the real button still moves the week, and the bar says so (' + JSON.stringify(after) + ')');
  ok(pageErrors.length === 0, 'no page errors (' + pageErrors.slice(0, 2).join(' | ') + ')');

  await browser.close();
  server.close();
  if (fails.length) {
    console.log('FAIL e2e_topbar: ' + passed + ' passed, ' + fails.length + ' failed');
    fails.forEach(f => console.log('  ✗ ' + f));
    process.exit(1);
  }
  console.log('PASS e2e_topbar: ' + passed + ' checks');
}

main().catch(err => { console.error('e2e_topbar threw: ' + (err.message || err)); process.exit(1); });
