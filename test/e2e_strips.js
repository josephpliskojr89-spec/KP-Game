/* E2E — a strip of tabs never runs off (v0.11.34, §126). In a real browser,
   at widths from 280 to 430 px, on every strip of tabs a new career shows and
   on made-up strips of three to nine tabs:

   - no tab runs off the screen or out of its strip's box, no word spills out
     of its tab, and the page is never wider than the screen;
   - a strip is on one line wherever its tabs fit one at their narrowest, and
     the last of them take the next line wherever they do not;
   - under 360 px a tab gives up 2 px of padding each side and most of its
     letter-spacing; at 360 px and wider it has what it had;
   - so the Desk's five tabs are on one line at 320 px and wider, with room to
     spare, whether Offers carries a count or not.

   Layout cannot be checked in the DOM stub: like the top bar's test and the
   mail rows' this is the repo's own guard on the stylesheet. It runs every
   check and names each one that fails.
   Run: NODE_PATH=$(npm root -g) node test/e2e_strips.js */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml' };
const WIDTHS = [280, 300, 320, 340, 359, 360, 390, 430];
const NARROW = 360;          // under this a tab is tighter
const COUNTS = [0, 3, 8];    // on the Offers tab: none, and the range a career shows
const EPS = 0.3;

let passed = 0;
const fails = [];
// a check over measured strips: it passes when none offends, and names the first few that do
function all(rows, bad, msg) {
  const off = rows.filter(bad);
  if (!off.length) { passed++; return; }
  fails.push(msg + ' (' + off.length + ' of ' + rows.length + ': ' + off.slice(0, 3).map(r => r.width + '/' + r.where + '/' + r.labels.slice(0, 28)).join(' ') + ')');
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
  const tap = async sel => { await page.click(sel); };   // the app draws inside the click

  // a new career, through the front door
  await page.goto(base);
  await page.waitForSelector('.title-wrap');
  await tap('[data-action=title-new]');
  await page.waitForSelector('#nc-name');
  await page.fill('#nc-name', 'Strip Manager');
  await page.fill('#nc-seed', 'e2e-strips');
  await tap('[data-action=start-career]');
  await page.waitForSelector('.objective');

  // the page's own reader: every strip on the screen, measured
  await page.evaluate(() => {
    window.readStrips = function (where) {
      const W = window.innerWidth;
      return Array.from(document.querySelectorAll('#screen .seg')).map(seg => {
        const tabs = Array.from(seg.children);
        if (!tabs.length) return null;
        const sb = seg.getBoundingClientRect(), cs = getComputedStyle(seg);
        const inL = sb.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
        const inR = sb.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight);
        const read = tabs.map(b => {
          const r = b.getBoundingClientRect();
          const range = document.createRange(); range.selectNodeContents(b);
          const rects = Array.from(range.getClientRects()).filter(q => q.width > 0);
          const right = rects.length ? Math.max.apply(null, rects.map(q => q.right)) : r.right;
          const left = rects.length ? Math.min.apply(null, rects.map(q => q.left)) : r.left;
          const bcs = getComputedStyle(b);
          return { left: r.left, right: r.right, top: Math.round(r.top), spill: Math.max(right - r.right, r.left - left),
            pad: parseFloat(bcs.paddingLeft), padR: parseFloat(bcs.paddingRight), spacing: parseFloat(bcs.letterSpacing) / parseFloat(bcs.fontSize) };
        });
        // what the strip needs for one line: each tab at its narrowest, and the gaps between them
        const mins = tabs.map(b => { const old = b.style.cssText; b.style.cssText = 'flex: none; width: min-content;'; const w = b.getBoundingClientRect().width; b.style.cssText = old; return w; });
        return { where, width: W, labels: tabs.map(b => b.textContent.trim().replace(/\s+/g, ' ')).join(' | '), n: tabs.length,
          rows: new Set(read.map(t => t.top)).size,
          need: mins.reduce((a, b) => a + b, 0) + (tabs.length - 1) * parseFloat(cs.columnGap), room: inR - inL,
          off: Math.max.apply(null, read.map(t => t.right)) - W,                                              // past the screen's edge
          out: Math.max(Math.max.apply(null, read.map(t => t.right)) - inR, inL - Math.min.apply(null, read.map(t => t.left))),   // past the strip's own box
          spill: Math.max.apply(null, read.map(t => t.spill)),                                               // a word past its tab
          page: document.documentElement.scrollWidth - W,
          pad: read.map(t => t.pad), padR: read.map(t => t.padR), spacing: read.map(t => t.spacing) };
      }).filter(Boolean);
    };
    // the count on the Offers tab, set for the test
    window.offersCount = function (n) {
      KP.offersReadReal = KP.offersReadReal || KP.offersRead;
      KP.offersRead = n == null ? KP.offersReadReal : s => Object.assign({}, KP.offersReadReal(s), { count: n });
    };
  });

  const rows = [];
  const read = async where => { (await page.evaluate(where => window.readStrips(where), where)).forEach(r => rows.push(r)); };
  // every tab of a strip, in turn: the page it opens is read
  const each = async (sel, where) => {
    const n = await page.$$eval(sel, els => els.length);
    for (let i = 0; i < n; i++) {
      const els = await page.$$(sel);
      if (!els[i]) break;
      await els[i].click();
      await read(where);
    }
    return n;
  };
  // made-up strips: three to nine tabs, of short, middling and long words, written as the pages write theirs
  const made = () => page.evaluate(() => {
    const words = { short: ['Now', 'All', 'Top', 'New', 'Mine', 'Ours', 'Live', 'Past', 'Next'],
      middling: ['Roster', 'Charts', 'Record', 'Offers', 'Studio', 'Career', 'Awards', 'People', 'Rivals'],
      long: ['Development', 'Relationship', 'Breakthrough', 'Discography', 'Conversation', 'Appointments', 'Broadcasters', 'Endorsements', 'Showcases'] };
    const html = [];
    [3, 5, 7, 9].forEach(n => Object.keys(words).forEach(k =>
      html.push('<div class="pad" style="margin-top:2px"><div class="seg">' + words[k].slice(0, n).map((w, i) => '<button class="' + (i ? '' : 'on') + '">' + w + '</button>').join('') + '</div></div>')));
    const screen = document.getElementById('screen'), keep = screen.innerHTML;
    screen.innerHTML = html.join('');
    const out = window.readStrips('made');
    screen.innerHTML = keep;
    return out;
  });

  let seen = { desk: 0, talent: 0, dossier: 0, industry: 0 };
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 844 });
    for (const count of COUNTS) {
      await page.evaluate(n => window.offersCount(n), count);
      await tap('[data-nav=desk]');
      seen.desk = await each('[data-action=desk-sub]', 'desk, a count of ' + count);
    }
    await page.evaluate(() => window.offersCount(null));
    await tap('[data-nav=talent]');
    seen.talent = await each('[data-action=talent-sub]', 'talent');
    await tap('[data-nav=talent]');
    if (await page.$('[data-action=open-dossier]')) {
      await tap('[data-action=open-dossier]');
      seen.dossier = await each('[data-action=dossier-tab]', 'file');
    }
    await tap('[data-nav=groups]'); await read('groups');
    await tap('[data-nav=studio]'); await read('studio');
    await tap('[data-nav=industry]');
    seen.industry = await each('[data-action=industry-sub]', 'industry');
    await each('[data-action=industry-chart]', 'industry');
    await tap('[data-nav=industry]');
    const feed = (await page.$$('[data-action=industry-sub]'))[2];
    if (feed) { await feed.click(); await each('[data-action=feed-filter]', 'industry'); }
    await tap('[data-nav=desk]');
    (await made()).forEach(r => rows.push(r));
  }
  const real = rows.filter(r => r.where !== 'made'), synth = rows.filter(r => r.where === 'made');
  const desk = rows.filter(r => r.where.startsWith('desk') && r.n === 5);
  const file = rows.filter(r => r.where === 'file' && r.n === 5);
  const distinct = new Set(real.map(r => r.labels.replace(/\d+/g, ''))).size;

  // ---- what was measured ----
  ok(seen.desk === 5 && seen.talent === 3 && seen.dossier === 5 && seen.industry === 3, 'the Desk’s five tabs, the talent page’s three, a file’s five and the industry page’s three were each walked (' + [seen.desk, seen.talent, seen.dossier, seen.industry].join(', ') + ')');
  ok(distinct >= 7, 'a new career shows seven strips of tabs or more (' + distinct + ')');
  ok(desk.length === WIDTHS.length * COUNTS.length * 5 && file.length === WIDTHS.length * 5, 'the Desk’s strip was measured on each of its tabs with each count, and a file’s on each of its tabs, at every width (' + desk.length + ', ' + file.length + ')');
  ok(synth.length === WIDTHS.length * 12, 'the twelve made-up strips were measured at every width (' + synth.length + ')');

  // ---- nothing runs off ----
  all(rows, r => r.off > EPS, 'no tab runs off the screen');
  all(rows, r => r.out > EPS, 'no tab runs out of its strip’s box');
  all(rows, r => r.page > 0, 'the page is never wider than the screen');
  all(rows, r => r.spill > EPS, 'no word spills out of its tab');

  // ---- one line where one line fits ----
  all(rows.filter(r => r.need <= r.room - EPS), r => r.rows !== 1, 'a strip is on one line wherever its tabs fit one at their narrowest');
  all(rows.filter(r => r.need >= r.room + EPS), r => r.rows < 2, 'and the last of them take the next line wherever they do not');
  ok(synth.some(r => r.rows === 1) && synth.some(r => r.rows === 2) && synth.some(r => r.rows >= 3), 'the made-up strips hold all three: one line, two, and three or more');
  ok(real.some(r => r.rows === 1) && real.some(r => r.rows >= 2), 'the real strips hold both: one line, and more than one on the narrowest screens');

  // ---- what a tab gives up on a narrow screen ----
  const narrow = rows.filter(r => r.width < NARROW), wide = rows.filter(r => r.width >= NARROW);
  // a reading that is not a number is not near anything: a spacing of none reads as the word "normal"
  const near = (v, want, by) => Math.abs(v - want) <= by;
  all(narrow, r => !r.pad.concat(r.padR).every(p => near(p, 2, 0.01)), 'under 360 px a tab has 2 px of padding on each side');
  all(narrow, r => !r.spacing.every(s => near(s, 0.02, 0.002)), 'under 360 px its letters stand .02em apart');
  all(wide, r => !r.pad.concat(r.padR).every(p => near(p, 4, 0.01)), 'at 360 px and wider a tab has the 4 px of padding it had');
  all(wide, r => !r.spacing.every(s => near(s, 0.08, 0.002)), 'at 360 px and wider its letters stand the .08em apart they did');
  ok(narrow.some(r => r.width === NARROW - 1) && wide.some(r => r.width === NARROW), 'both sides of the line were measured: 359 px and 360 px');

  // ---- the Desk's five tabs ----
  all(desk.filter(r => r.width >= 320), r => r.rows !== 1, 'the Desk’s five tabs are on one line at 320 px and wider, with a count on Offers or without');
  all(desk.filter(r => r.width === 320), r => r.room - r.need < 6, 'at 320 px they have 6 px or more to spare');
  ok(WIDTHS.every(w => new Set(desk.filter(r => r.width === w).map(r => r.rows)).size === 1), 'a count on Offers never changes how many lines the Desk’s strip takes');
  ok(WIDTHS.every(w => new Set(desk.filter(r => r.width === w).map(r => Math.round(r.need * 10))).size === 1), 'nor what the strip needs for one line');
  all(file.filter(r => r.width >= 320), r => r.rows !== 1, 'a file’s five tabs are on one line at 320 px and wider');

  ok(pageErrors.length === 0, 'no page errors (' + pageErrors.slice(0, 2).join(' | ') + ')');

  await browser.close();
  server.close();
}

main().then(() => {
  if (fails.length) {
    console.log('FAIL e2e_strips: ' + passed + ' passed, ' + fails.length + ' failed');
    fails.forEach(f => console.log('  ✗ ' + f));
    process.exit(1);
  }
  console.log('PASS e2e_strips: ' + passed + ' checks');
}).catch(err => {
  console.log('FAIL e2e_strips: ' + (err && err.message ? err.message.split('\n')[0] : err));
  process.exit(1);
});
