/* E2E — a letter's tag keeps clear of its letter (v0.11.33, §125). In a real
   browser, at phone widths from 320 to 430 px, on the Desk and in the weekly
   report:

   - a letter's tag is never broken, never runs into its letter, and never
     comes within 4 px of it;
   - the letter starts 73 px in on every mail row, and its column is the row's
     width less those 73 px;
   - a tag up to 69 px wide stands beside its letter; a wider one takes the
     line, whole, and the letter starts directly under it, in its own column;
   - the mail rows that carry a date, a year, a record or a save slot keep
     the 62 px column they had.

   The rule is held for the fourteen tags the engine writes and for a ladder
   of made-up words whose widths step across the line, so it holds for a tag
   nobody has written yet. Real weeks by the real button check the rows a
   career really shows.

   Layout cannot be checked in the DOM stub: like the top bar's test this is
   the repo's own guard on the stylesheet. It runs every check and names each
   one that fails.
   Run: NODE_PATH=$(npm root -g) node test/e2e_mail.js */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml' };
const WIDTHS = [320, 360, 375, 390, 412, 430];
// the fourteen tags the engine writes on a letter (the census of v0.11.33)
const KINDS = ['public', 'company', 'development', 'industry', 'scouting', 'debut', 'relationship',
  'executive', 'breakthrough', 'plateau', 'health', 'showcase', 'life', 'talent'];
const START = 73;            // where the letter starts, from the row's own edge
const CLEAR = 4;             // what a tag beside its letter leaves before it
const LINE = START - CLEAR;  // so a tag up to 69 px wide stands beside its letter
const COLUMN = 62;           // the column of every other mail row
const EPS = 0.3;
const WEEKS = 8;             // real weeks by the real button

let passed = 0;
const fails = [];
// a check over measured rows: it passes when no row offends, and names the first few that do
function all(rows, bad, msg) {
  const off = rows.filter(bad);
  if (!off.length) { passed++; return; }
  fails.push(msg + ' (' + off.length + ' of ' + rows.length + ': ' + off.slice(0, 3).map(r => [r.width, r.home, r.tag].join('/')).join(' ') + ')');
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
  await page.fill('#nc-name', 'Mail Manager');
  await page.fill('#nc-seed', 'e2e-mail');
  await tap('[data-action=start-career]');
  await page.waitForSelector('.objective');

  // the page's own reader: every mail row under a host, measured
  await page.evaluate(() => {
    window.readMail = function (host, home) {
      if (!host) return [];
      return Array.from(host.querySelectorAll('.mail')).map(row => {
        const tag = row.querySelector('.m-tag'), txt = tag ? tag.nextElementSibling : null;
        if (!tag || !txt) return null;
        const range = document.createRange(); range.selectNodeContents(tag);
        const rects = Array.from(range.getClientRects()).filter(q => q.width > 0);
        if (!rects.length) return null;
        const tb = tag.getBoundingClientRect(), xb = txt.getBoundingClientRect(), rb = row.getBoundingClientRect(), cs = getComputedStyle(row);
        const tops = {}; rects.forEach(q => { tops[Math.round(q.top)] = true; });
        const right = Math.max.apply(null, rects.map(q => q.right)), left = Math.min.apply(null, rects.map(q => q.left));
        const bottom = Math.max.apply(null, rects.map(q => q.bottom));
        const inL = rb.left + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
        const inR = rb.right - parseFloat(cs.paddingRight) - parseFloat(cs.borderRightWidth);
        return { home, tag: tag.textContent, letter: row.classList.contains('letter'), width: window.innerWidth,
          word: right - left, box: tb.width, lines: Object.keys(tops).length,
          under: xb.top >= bottom - 0.5,            // the letter begins below the tag's last line
          gap: xb.left - right,                     // beside: what stands between the tag and the letter
          drop: xb.top - tb.bottom,                 // under: what stands between the tag's box and the letter
          start: xb.left - inL, col: xb.width, room: inR - inL,
          off: Math.max(right, xb.right, rb.right) - window.innerWidth,   // past the screen's edge
          spill: Math.max(right, xb.right) - inR };                      // past the row's own edge
      }).filter(Boolean);
    };
    window.mailBody = 'The words of the letter, long enough to run onto a second line on any phone there is.';
  });

  // ---- the ladder: made-up words whose widths step across the line ----
  // every mix of five letters from six to twelve long, measured in the tag's own type;
  // one word is kept for each quarter px from 63 to 75
  const ladder = await page.evaluate(([lo, hi]) => {
    const row = document.createElement('div'); row.className = 'mail letter';
    row.style.cssText = 'position:absolute;left:0;top:0;width:900px;visibility:hidden';
    row.innerHTML = '<span class="m-tag"></span><div></div>';
    document.body.appendChild(row);
    const tag = row.firstChild, range = document.createRange();
    const widthOf = s => { tag.textContent = s; range.selectNodeContents(tag); return range.getBoundingClientRect().width; };
    const by = {};
    for (let w = 0; w <= 7; w++) for (let o = 0; o <= 6; o++) for (let e = 0; e <= 6; e++) for (let t = 0; t <= 6; t++) for (let i = 0; i <= 6; i++) {
      const n = w + o + e + t + i;
      if (n < 6 || n > 12) continue;
      const word = 'w'.repeat(w) + 'o'.repeat(o) + 'e'.repeat(e) + 't'.repeat(t) + 'i'.repeat(i);
      const width = widthOf(word);
      if (width < lo || width > hi) continue;
      const slot = Math.floor(width * 4);
      if (!by[slot]) by[slot] = { word, width };
    }
    row.remove();
    return Object.keys(by).map(Number).sort((a, b) => a - b).map(k => by[k]);
  }, [63, 75]);
  ok(ladder.some(r => r.width > LINE - 1 + 0.05 && r.width < LINE - EPS) && ladder.some(r => r.width > LINE + EPS && r.width < LINE + 1 - 0.05),
    'the ladder has a rung within a px under the line and one within a px over it (' + ladder.length + ' rungs)');
  ok(ladder.length >= 30, 'the ladder has a rung for most quarter px from 63 to 75 (' + ladder.length + ' of 49)');

  // ---- the grid: the fourteen tags and the ladder, in the Desk's inbox and in the weekly report, at six widths ----
  const words = KINDS.concat(ladder.map(r => r.word));
  const grid = async home => page.evaluate(([home, words]) => {
    const UI = KP.UI, s = KP.App.state;
    const html = words.map(k => UI.mailRow(s, { kind: k, text: window.mailBody, week: s.week, read: true })).join('');
    let host = null;
    if (home === 'desk') {
      KP.App.render();
      const kicker = Array.from(document.querySelectorAll('#screen .kicker')).find(e => e.textContent === 'Inbox');
      host = kicker ? kicker.nextElementSibling : null;
      if (host) host.innerHTML = html;
    } else {
      UI.modal('The week', '<div class="report-list">' + html + '</div>',
        '<button class="btn primary" data-action="close-modal" style="flex:1">Noted</button>');
      host = document.querySelector('#modal-root .report-list');
    }
    const out = window.readMail(host, home);
    if (home === 'desk') KP.App.render(); else UI.closeModal();
    return out;
  }, [home, words]);

  // the other mail rows, written as their pages write them: a date, a year, a record, a save slot
  const others = () => page.evaluate(() => {
    const UI = KP.UI, body = UI.esc(window.mailBody), rows = [];
    [1, 48 * 11 + 47, 0].forEach(w => rows.push('<div class="mail"><span class="m-tag">' + UI.esc(KP.weekLabel(w).text) + '</span><div>' + body + '</div></div>'));
    [1, 12].forEach(y => rows.push('<div class="mail yr-row"><span class="m-tag">Y' + y + '</span><div>' + body + '</div></div>'));
    ['debut', 'single'].forEach(t => rows.push('<div class="mail"><span class="m-tag">' + t + '</span><div style="flex:1">' + body + '</div></div>'));
    rows.push('<div class="mail"><span class="m-tag">Slot 1</span><div style="flex:1">A label · v0.11.33</div><button class="btn small">Save</button><button class="btn small">Load</button></div>');
    const box = document.createElement('div');
    box.innerHTML = rows.join('');
    document.getElementById('screen').appendChild(box);
    const out = window.readMail(box, 'other');
    box.remove();
    return out;
  });

  const rows = [], plain = [];
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 844 });
    for (const home of ['desk', 'report']) (await grid(home)).forEach(r => rows.push(r));
    (await others()).forEach(r => plain.push(r));
  }
  const beside = rows.filter(r => !r.under), under = rows.filter(r => r.under);
  const named = rows.filter(r => KINDS.includes(r.tag)), rungs = rows.filter(r => !KINDS.includes(r.tag));

  // ---- nothing breaks, runs into the letter or runs off ----
  ok(rows.length === WIDTHS.length * 2 * words.length, 'every letter of the grid was measured, on the Desk and in the weekly report (' + rows.length + ' of ' + WIDTHS.length * 2 * words.length + ')');
  all(rows, r => !r.letter, 'every row the mail row builds is marked as a letter’s');
  all(rows, r => r.lines !== 1, 'a letter’s tag is never broken onto a second line');
  all(beside, r => r.gap < -EPS, 'a tag beside its letter never runs into it');
  all(beside, r => r.gap < CLEAR - EPS, 'a tag beside its letter leaves at least 4 px before it');
  all(rows, r => r.off > EPS, 'no letter and no tag runs off the screen');
  all(rows, r => r.spill > EPS, 'no letter and no tag runs past the row’s own edge');

  // ---- the letter's column ----
  all(rows, r => Math.abs(r.start - START) > EPS, 'the letter starts 73 px in, beside its tag or under it');
  all(rows, r => Math.abs(r.col - (r.room - START)) > EPS, 'the letter’s column is the row’s width less those 73 px');
  all(under, r => Math.abs(r.drop) > EPS, 'under its tag, the letter starts directly below the tag’s line');
  all(rows, r => Math.abs(r.box - r.word) > EPS, 'the tag’s box is as wide as its word and no wider');

  // ---- which tags take the line ----
  all(rows.filter(r => r.word <= LINE - EPS), r => r.under, 'a tag up to 69 px wide stands beside its letter');
  all(rows.filter(r => r.word >= LINE + EPS), r => !r.under, 'a tag wider than 69 px takes the line');
  ok(rungs.some(r => r.under) && rungs.some(r => !r.under), 'the ladder holds both: a word beside its letter, and a word that takes the line');
  ok(named.some(r => r.under) && named.some(r => !r.under), 'so do the fourteen tags');
  all(named.filter(r => ['development', 'relationship', 'breakthrough'].includes(r.tag)), r => !r.under, 'the three long tags take the line: development, relationship, breakthrough');
  all(named.filter(r => ['public', 'company', 'debut', 'health', 'life', 'talent', 'plateau'].includes(r.tag)), r => r.under, 'the seven short tags stand beside their letters');
  ok(KINDS.every(k => new Set(named.filter(r => r.tag === k).map(r => r.under)).size === 1), 'each of the fourteen sits the same way at every width, on the Desk and in the report');

  // ---- the other mail rows are as they were ----
  ok(plain.length === WIDTHS.length * 8, 'every other mail row was measured (' + plain.length + ' of ' + WIDTHS.length * 8 + ')');
  all(plain, r => r.letter, 'a row with a date, a year, a record or a save slot is not marked as a letter’s');
  all(plain, r => Math.abs(r.box - COLUMN) > EPS, 'their tags keep the 62 px column');
  all(plain, r => r.under, 'their tags stand beside what they tag');
  all(plain, r => r.gap < CLEAR - EPS, 'and leave at least 4 px before it');
  all(plain, r => Math.abs(r.start - START) > EPS, 'and what they tag starts 73 px in, as a letter does');
  all(plain.filter(r => r.tag.includes('·')), r => r.lines !== 2, 'a date in the column still takes two lines');

  // ---- real weeks, by the real button ----
  await page.setViewportSize({ width: 360, height: 844 });
  const real = [];
  let reports = 0;
  for (let i = 0; i < WEEKS + 4 && reports < WEEKS; i++) {
    await tap('#advance-btn');
    const got = await page.evaluate(() => {
      const list = document.querySelector('#modal-root .report-list');
      const out = list ? window.readMail(list, 'report') : null;
      if (document.getElementById('modal-root').innerHTML) KP.UI.closeModal();
      return out;
    });
    if (!got) continue;
    reports++;
    got.forEach(r => real.push(r));
    (await page.evaluate(() => {
      const kicker = Array.from(document.querySelectorAll('#screen .kicker')).find(e => e.textContent === 'Inbox');
      return window.readMail(kicker ? kicker.nextElementSibling : null, 'desk');
    })).forEach(r => real.push(r));
  }
  const realReport = real.filter(r => r.home === 'report'), realDesk = real.filter(r => r.home === 'desk');
  ok(reports === WEEKS, WEEKS + ' real weeks each showed a weekly report (' + reports + ')');
  ok(realReport.length >= WEEKS * 2 && realDesk.length >= WEEKS * 2, 'the real weeks showed letters in the report and on the Desk (' + realReport.length + ' and ' + realDesk.length + ')');
  all(real, r => !r.letter, 'every real row in the report and the inbox is a letter’s');
  all(real, r => !KINDS.includes(r.tag), 'every tag a real week showed is one of the fourteen');
  all(real, r => r.lines !== 1, 'no real tag is broken');
  all(real.filter(r => !r.under), r => r.gap < CLEAR - EPS, 'no real tag comes within 4 px of its letter');
  all(real, r => Math.abs(r.start - START) > EPS, 'every real letter starts 73 px in');
  all(real, r => r.off > EPS || r.spill > EPS, 'no real letter runs off');
  ok(realReport.some(r => r.under) && realReport.some(r => !r.under), 'the real reports showed both: a tag that took the line, and a tag beside its letter');

  // ---- the pages that list other mail rows, as a real career shows them ----
  const pages = await page.evaluate(() => {
    const out = {};
    const s = KP.App.state;
    KP.App.view = { type: 'company', id: 'company' }; KP.App.render();
    out.company = window.readMail(document.getElementById('screen'), 'company');
    const first = Object.keys(s.people).find(id => (s.people[id].history || []).length);
    if (first) {
      const tab = KP.App.dossierTab;
      KP.App.view = { type: 'dossier', id: first }; KP.App.dossierTab = 'history'; KP.App.render();
      out.dossier = window.readMail(document.getElementById('screen'), 'dossier');
      KP.App.dossierTab = tab;
    }
    KP.App.view = null; KP.App.render();
    return out;
  });
  await tap('.tb-menu');
  const slots = await page.evaluate(() => { const out = window.readMail(document.getElementById('modal-root'), 'system'); KP.UI.closeModal(); return out; });
  const listed = (pages.company || []).concat(pages.dossier || [], slots);
  ok((pages.company || []).length >= 1 && (pages.dossier || []).length >= 1 && slots.length === 3, 'the company’s page, a file and the system sheet each list mail rows (' + (pages.company || []).length + ', ' + (pages.dossier || []).length + ', ' + slots.length + ')');
  all(listed, r => r.letter, 'none of them is a letter’s row');
  all(listed, r => Math.abs(r.box - COLUMN) > EPS || r.under || r.gap < CLEAR - EPS, 'on those pages every tag keeps its 62 px column and stands clear of what it tags');
  all(listed, r => r.off > EPS, 'and nothing on them runs off the screen');

  ok(pageErrors.length === 0, 'no page errors (' + pageErrors.slice(0, 2).join(' | ') + ')');

  await browser.close();
  server.close();
}

main().then(() => {
  if (fails.length) {
    console.log('FAIL e2e_mail: ' + passed + ' passed, ' + fails.length + ' failed');
    fails.forEach(f => console.log('  ✗ ' + f));
    process.exit(1);
  }
  console.log('PASS e2e_mail: ' + passed + ' checks');
}).catch(err => {
  console.log('FAIL e2e_mail: ' + (err && err.message ? err.message.split('\n')[0] : err));
  process.exit(1);
});
