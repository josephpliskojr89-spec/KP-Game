/* Suite 139 — the company's own file (v0.11.29, §121: the people upstairs and
   down the hall, part three). The company had no history of its own: every
   first was a letter, read once. Most of it is still on the state, in the
   markers the rails leave: a debut week, the first trophy, a record's peak,
   the honors, the settlement, the last bow, the founding, the fold, the
   chair. The file is read off them and never written, the manager's title is
   what the file proves under this desk, and the Desk has a page for it.

   Since v0.11.30 (§122) each chair and this desk's first trophy are read
   off the written record, which suite 140 holds; the checks on them here
   write the mark by hand.

   Laws (§99): a fixture forces every gate and rolls nothing; a missing
   chapter fails by name. */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadEngine, makeT } = require('./load_engine');
const dom = require('./dom_stub');
const KP = loadEngine();
const t = makeT('suite_139_companyfile');
const YEAR = KP.C.WEEKS_PER_YEAR, CEREMONY = KP.C.AWARDS.ceremonyWeek;

// ---- the kit ------------------------------------------------------------------
const say = fn => { try { return fn(); } catch (e) { return 'threw: ' + e.message; } };
const file = s => { const f = say(() => KP.companyFile(s)); return f && typeof f === 'object' ? f : { chapters: [], manager: {}, threw: String(f) }; };
const rows = (s, kind) => file(s).chapters.filter(c => !kind || c.kind === kind).map(c => c.week + (c.before ? ' before ' : ' ') + c.text);
const title = s => say(() => KP.managerTitle(s));
const act = s => KP.groups(s)[0];
// a second act of ours, not yet debuted: a copy of the inherited one with its past removed
function lineup(s, id, name) {
  const g = Object.assign(JSON.parse(JSON.stringify(act(s))), { id, name, members: ['nobody'], releases: [], debuted: false });
  ['debutWeek', 'honors', 'recoup', 'retiredWeek', 'trophies', 'legacy'].forEach(k => { delete g[k]; });
  s.groups.push(g);
  return g;
}
const debut = (g, week, o) => { g.debuted = true; g.debutWeek = week; if (o !== null) g.releases.push(Object.assign({ week, songTitle: 'First ' + g.name, chartPeak: 9, reception: 50 }, o || {})); return g; };
const world = (seed, week) => { const s = KP.newGame(seed, null, {}); s.week = week || 100; return s; };

// ---- A. the shape, and a new career's file -----------------------------------
{
  ['companyFile', 'managerTitle', 'deskSince'].forEach(k => t.ok(typeof KP[k] === 'function', 'the engine carries KP.' + k));
  const s = KP.newGame('file-new', null, {});
  const g = act(s), first = g.releases[0];
  const snap = KP.serialize(s), keys = Object.keys(s).join();
  const f = file(s);
  t.eq([f.name, f.short, f.since, JSON.stringify(f.manager)].join('|'), [s.company.name, s.company.short, 1, '{"name":"' + s.player.name + '","title":"A&R Manager","weeks":0}'].join('|'), 'a new career’s file names the company, this desk’s first week, and the manager');
  t.eq(rows(s).join(' / '), [
    g.debutWeek + ' before ' + g.name + ' debuted with “' + first.songTitle + '”.',
    first.week + ' before “' + first.songTitle + '” by ' + g.name + ' went to number one on the scene chart: the company’s first.',
    s.firstShowWinWeek + ' before The first music-show trophy in the company’s history.',
    '1 You took the A&R desk at ' + s.company.name + '.',
  ].join(' / '), 'what the company did before this desk is its past, and the desk’s own chapter comes after it');
  t.ok(KP.serialize(s) === snap && Object.keys(s).join() === keys, 'reading the file writes nothing');
  t.eq([say(() => KP.deskSince(s)), say(() => KP.deskSince(Object.assign({}, s, { founded: { week: 60 } }))), say(() => KP.deskSince(Object.assign({}, s, { founded: { week: 60 }, chapterSince: 200 })))].join('|'), '1|60|200',
    'this desk began at week one, or at the founding, or at the second chance, the latest of them said');
}

// ---- B. each chapter, from the marker a rail leaves ------------------------------
{
  // a debut
  const s = world('file-debut');
  const a = debut(lineup(s, 'g-a', 'ALPHA'), 30);
  debut(lineup(s, 'g-b', 'BRAVO'), 40, null);
  lineup(s, 'g-c', 'CHARLIE');
  t.eq(rows(s, 'debut').slice(1).join(' / '), '30 ALPHA debuted with “First ALPHA”. / 40 BRAVO debuted.', 'each act that debuted has a chapter, with the record it debuted with when the file has it; a lineup that never debuted has none');
  a.releases.unshift({ week: 20, songTitle: 'Pre-release', chartPeak: 30 });
  t.eq(rows(s, 'debut')[1], '30 ALPHA debuted with “First ALPHA”.', 'the debut record is the one of the debut week');
}
{
  // the first number one: the company's, and this desk's
  const s = world('file-one');
  const a = debut(lineup(s, 'g-a', 'ALPHA'), 30);
  const inherited = act(s).releases[0];
  t.eq(rows(s, 'numberOne').length, 1, 'with no number one under this desk the file has only the company’s first');
  a.releases.push({ week: 50, songTitle: 'Second', chartPeak: 1 }, { week: 60, songTitle: 'Third', chartPeak: 1 });
  t.eq(rows(s, 'numberOne').join(' / '), inherited.week + ' before “' + inherited.songTitle + '” by ' + act(s).name + ' went to number one on the scene chart: the company’s first. / 50 “Second” by ALPHA went to number one on the scene chart: the first under this desk.',
    'this desk’s first number one has its own chapter, and only the first');
  // no number one before this desk: the company's first is this desk's, said once
  const n = world('file-one-new');
  act(n).releases.forEach(r => { r.chartPeak = 5; });
  const b = debut(lineup(n, 'g-b', 'BRAVO'), 30, { chartPeak: 1 });
  debut(lineup(n, 'g-a', 'ALPHA'), 30, { chartPeak: 1 });
  t.eq(rows(n, 'numberOne').join(' / '), '30 “First ALPHA” by ALPHA went to number one on the scene chart: the company’s first.', 'when the company had none before, its first is said once; of two the same week, the same one every time');
  act(n).releases.forEach(r => { r.chartPeak = 5; }); b.releases[0].chartPeak = 2; n.groups[2].releases[0].chartPeak = 2;
  t.eq(rows(n, 'numberOne').length, 0, 'and with no number one at all there is no chapter');
}
{
  // the first trophy
  const s = world('file-trophy');
  const a = debut(lineup(s, 'g-a', 'ALPHA'), 30);
  t.eq(rows(s, 'trophy').join(' / '), s.firstShowWinWeek + ' before The first music-show trophy in the company’s history.', 'a trophy from before this desk is the company’s first');
  act(s).releases[0].trophies = 3;   // the inherited act's wall: not this desk's
  a.releases.push({ week: 50, songTitle: 'Winner', chartPeak: 3, trophies: 2 }, { week: 60, songTitle: 'Again', chartPeak: 3, trophies: 1 });
  t.eq(rows(s, 'trophy').length, 1, 'a record with trophies on it is not a chapter by itself: the night is on the written record');
  s.annals = [{ week: 52, kind: 'trophy', groupId: 'g-a', name: 'ALPHA', show: 'Pop Wave', title: 'Winner' }];
  t.eq(rows(s, 'trophy')[1], '52 ALPHA won Pop Wave with “Winner”: the first under this desk.', 'this desk’s first is the night on the written record, after the company’s');
  s.annals = [];
  s.firstShowWinWeek = 55;
  t.eq(rows(s, 'trophy').join(' / '), '55 The first music-show trophy in the company’s history.', 'when the company’s first is under this desk it is said once, the week it was won');
  s.annals = [{ week: 55, kind: 'trophy', groupId: 'g-a', name: 'ALPHA', show: 'Pop Wave', title: 'Winner' }];
  t.eq(rows(s, 'trophy').join(' / '), '55 ALPHA won Pop Wave with “Winner”: the first music-show trophy in the company’s history.', 'and when the record has the night, the record says it, once');
  s.annals = [];
  s.firstShowWinWeek = 0;
  t.eq(rows(s, 'trophy').length, 0, 'and with none at all there is no chapter');
}
{
  // the honors, the settlement, the last bow
  const s = world('file-honors', 150);
  const a = debut(lineup(s, 'g-a', 'ALPHA'), 30);
  a.honors = [{ year: 1, category: 'rookie' }, { year: 2, category: 'daesang' }, { year: 2, category: 'song' }];
  t.eq(rows(s, 'award').concat(rows(s, 'daesang')).join(' / '), [CEREMONY + ' ALPHA took Rookie of the Year.', (YEAR + CEREMONY) + ' ALPHA took Song of the Year.', (YEAR + CEREMONY) + ' ALPHA took the daesang, the grand prize of the year.'].join(' / '),
    'each honor is a chapter dated by its ceremony, and the daesang is said in its own words');
  t.eq(file(s).chapters.filter(c => c.week === YEAR + CEREMONY).map(c => c.kind).join(), 'award,daesang', 'of two the same night, the daesang comes last');
  a.recoup = { debt: 0, paid: 10, settledWeek: 90 };
  t.eq(rows(s, 'settlement').join(), '90 ALPHA paid back everything the company had spent on them. From that week their share was theirs.', 'the first settlement is a chapter');
  a.recoup.settledWeek = null;
  t.eq(rows(s, 'settlement').length, 0, 'an act not yet settled has none');
  a.retiredWeek = 140;
  const never = lineup(s, 'g-n', 'NEVER'); never.retiredWeek = 120;
  t.eq(rows(s, 'lastBow').join(), '140 ALPHA took a last bow.', 'a last bow is a chapter; a lineup that never debuted takes none');
}
{
  // the desk's own chapter, the chair, and the labels before this one
  const s = world('file-desk', 150);
  t.eq(rows(s, 'desk').join(), '1 You took the A&R desk at ' + s.company.name + '.', 'a salaried desk begins with taking it');
  t.eq(rows(s, 'chair').length, 0, 'the chair who was there when the desk began has no chapter');
  s.executive.since = 60;
  t.eq(rows(s, 'chair').length, 0, 'and a chair who came later has one only on the written record');
  s.annals = [{ week: 60, kind: 'chair', name: s.executive.name }];
  t.eq(rows(s, 'chair').join(), '60 ' + s.executive.name + ' took the chair.', 'which is where the file reads it');
  s.annals = [];
  s.founded = { week: 80, from: 'HCG' };
  s.executive.since = 90;
  t.eq([rows(s, 'desk').join(), rows(s, 'chair').length].join(' | '), '80 ' + s.company.name + ' opened its doors, out of HCG. | 0', 'a founded label begins with its doors, and says where it came out of; its board has no succession to tell');
  s.founded = { week: 80 };
  t.eq(rows(s, 'desk').join(), '80 ' + s.company.name + ' opened its doors.', 'or just its doors');
  t.ok(file(s).chapters.filter(c => c.before).length >= 3 && file(s).chapters.filter(c => c.before).every(c => c.week < 80), 'what came before the founding is before this desk');
  // a second chance: the label that folded is on the file, before this desk
  const c = world('file-fold', 260);
  c.chapterSince = 200;
  c.estate = { folded: [{ name: 'First Label', short: 'First', week: 190, since: 1 }] };
  c.executive.since = 200;
  t.eq([rows(c, 'fold').join(), rows(c, 'desk').join(), rows(c, 'chair').length, file(c).manager.weeks].join(' | '), '190 before First Label was dissolved. | 200 You took the A&R desk at ' + c.company.name + '. | 0 | 60',
    'after a second chance the folded label is the past, and the desk’s weeks are counted from the new one');
}
{
  // in order: by week, then by kind, then by the words
  const s = world('file-order', 150);
  const a = debut(lineup(s, 'g-a', 'ALPHA'), 30, { chartPeak: 1, trophies: 1 });
  act(s).releases.forEach(r => { r.chartPeak = 5; });
  s.firstShowWinWeek = 30; s.annals = [{ week: 30, kind: 'chair', name: s.executive.name }];
  a.honors = [{ year: 1, category: 'song' }, { year: 1, category: 'rookie' }];
  const f = file(s);
  t.ok(f.chapters.every((c, i) => i === 0 || c.week >= f.chapters[i - 1].week), 'the file is in order of the weeks');
  t.eq(f.chapters.filter(c => c.week === 30).map(c => c.kind).join(), 'chair,debut,numberOne,trophy', 'within a week: the chair, the debut, the number one, the trophy');
  t.eq(f.chapters.filter(c => c.kind === 'award').map(c => c.text).join(' / '), 'ALPHA took Rookie of the Year. / ALPHA took Song of the Year.', 'and two of a kind in the order of their words');
  t.ok(f.chapters.every(c => c.before === (c.week < f.since)), 'each chapter knows which side of this desk it is on');
}

// ---- C. what the manager is called -------------------------------------------------
{
  const s = world('file-title', 150);
  t.eq(title(s), 'A&R Manager', 'a desk that has debuted nobody is an A&R manager; the act it inherited is not its debut');
  const a = debut(lineup(s, 'g-a', 'ALPHA'), 30);
  t.eq(title(s), 'Senior A&R Manager', 'a debut under this desk makes a senior one');
  act(s).honors = [{ year: 1, category: 'artist' }];
  t.eq(title(s), 'Head of A&R', 'a year-end honor under this desk, for any of our acts, makes the head of A&R');
  a.honors = [{ year: 2, category: 'daesang' }];
  t.eq(title(s), 'Executive Producer', 'a daesang makes an executive producer');
  // what was won before this desk does not count
  s.chapterSince = 2 * YEAR;
  t.eq([title(s), file(s).manager.title].join('|'), 'A&R Manager|A&R Manager', 'what was won and who debuted before this desk are not this desk’s, and the file says the same');
  s.chapterSince = CEREMONY + YEAR;
  t.eq(title(s), 'Executive Producer', 'an honor given the week the desk began is this desk’s');
  s.founded = { week: 10, from: 'HCG' };
  t.eq(title(s), 'Founder', 'and a founder is a founder');
}

// ---- D. the Desk -------------------------------------------------------------------------
{
  const D = dom.load();
  const { App, el } = D;
  const esc = D.UI.esc;
  // (a file that throws is a page that did not draw: the checks on it fail by name)
  const draw = () => { const r = say(() => App.render()); return typeof r === 'string' ? r : el('screen').innerHTML; };
  const record = s => { App.state = s; App.mode = 'game'; App.tab = 'desk'; App.view = null; App.stack = []; App.deskSub = 'record'; return draw(); };
  const s = world('file-ui', 30);
  let html = record(s);
  t.ok(html.includes('data-action="open-company"') && html.includes('<div style="font-weight:700">' + esc(s.company.name) + '</div>'), 'the record carries a row for the company');
  t.ok(html.includes('A&amp;R Manager · in the first year · 4 chapters on the file'), 'with what the manager is called, how long, and how much is on the file');
  t.ok(html.indexOf('data-action="open-company"') < html.indexOf('Promises on the clock'), 'above the promises');
  s.week = 1 + YEAR;
  t.ok(record(s).includes(' · one year in · '), 'a year in, it says so');
  s.week = 1 + 3 * YEAR + 5;
  t.ok(record(s).includes(' · 3 years in · '), 'and three');
  const lone = world('file-ui-one', 120);
  lone.founded = { week: 100 }; lone.groups = []; lone.firstShowWinWeek = 0;
  t.ok(record(lone).includes('Founder · in the first year · 1 chapter on the file'), 'one chapter is one chapter');
  // the page
  const a = debut(lineup(s, 'g-a', 'ALPHA'), 30, { chartPeak: 1 });
  a.honors = [{ year: 1, category: 'rookie' }];
  t.ok(record(s).includes('Head of A&amp;R · 3 years in · '), 'the row carries the title the file proves');
  say(() => D.click({ action: 'open-company' }));
  html = draw();
  const f = file(s);
  t.ok(App.view && App.view.type === 'company' && html.includes('data-action="back"'), 'the row opens the company’s page, with a way back');
  t.ok(html.includes('<div class="kicker" style="margin-top:0">The company</div>') && html.includes(esc(s.company.name)) && html.includes(esc(s.player.name) + ' · Head of A&amp;R · 3 years in'), 'the page names the company and the manager');
  const iMine = html.indexOf('<div class="kicker">Under this desk</div>'), iPast = html.indexOf('<div class="kicker">Before this desk</div>');
  t.ok(iMine > -1 && iPast > iMine, 'what happened under this desk comes first, and the company’s past after it');
  const at = text => html.indexOf('<div>' + esc(text) + '</div>');
  t.ok(f.chapters.every(c => at(c.text) > -1 && (c.before ? at(c.text) > iPast : at(c.text) > iMine && at(c.text) < iPast)), 'every chapter is on the page, on its side of the desk');
  t.ok(at('ALPHA took Rookie of the Year.') < at('ALPHA debuted with “First ALPHA”.') && at('ALPHA debuted with “First ALPHA”.') < at('You took the A&R desk at ' + s.company.name + '.'), 'the newest first');
  t.ok(html.includes('<span class="m-tag">' + esc(KP.weekLabel(CEREMONY).text) + '</span><div>ALPHA took Rookie of the Year.</div>'), 'each with its date');
  t.ok(at('The first music-show trophy in the company’s history.') < at(act(s).name + ' debuted with “' + act(s).releases[0].songTitle + '”.'), 'and the past the newest first too');
  say(() => D.click({ action: 'back' }));
  t.ok(!App.view && draw().includes('data-action="open-company"'), 'and the way back leads to the record');
  // a founded label with nothing before it has no past to list
  const n = world('file-ui-founded', 120);
  n.founded = { week: 100, from: 'HCG' };
  n.groups = []; n.firstShowWinWeek = 0;
  App.state = n; App.view = { type: 'company', id: 'company' };
  html = draw();
  t.ok(html.includes('Under this desk') && !html.includes('Before this desk') && html.includes(esc(n.player.name) + ' · Founder · in the first year'), 'a label with no past lists none');
}

// ---- E. real weeks, and the tools -----------------------------------------------------------
{
  const s = KP.newGame('file-weeks', null, {});
  s.budget = 1e6;
  const bad = [];
  for (let i = 0; i < 120; i++) {
    const a = say(() => { (s.scenes || []).slice().forEach(sc => { const d = KP.sceneDef(sc.kind); if (d) KP.resolveScene(s, sc.id, d.options(s, sc)[0].id); }); return KP.advanceWeek(s); });
    if (typeof a === 'string') { bad.push('week ' + s.week + ' ' + a); break; }
    const before = KP.serialize(s);
    const f = file(s);
    if (f.threw) { bad.push('week ' + s.week + ' ' + f.threw); break; }
    if (KP.serialize(s) !== before) bad.push('week ' + s.week + ' reading the file changed the save');
    if (!f.chapters.every((c, j) => j === 0 || c.week >= f.chapters[j - 1].week)) bad.push('week ' + s.week + ' out of order');
    if (f.chapters.filter(c => c.kind === 'desk' && c.week === 1).length !== 1) bad.push('week ' + s.week + ' no one desk chapter');
    if (f.chapters.some(c => c.week > s.week)) bad.push('week ' + s.week + ' a chapter from the future');
    if (f.manager.weeks !== s.week - 1) bad.push('week ' + s.week + ' the desk’s weeks are miscounted');
  }
  t.ok(bad.length === 0, 'a hundred and twenty real weeks: the file is in order, has one desk chapter, nothing from the future, and reading it changes nothing (' + (bad[0] || 'clean') + ')');
  const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const h = read('tools/harness.js'), l = read('tools/audit_longhaul.js');
  t.ok(h.includes("console.log('the company’s file: chapters ") && h.includes('fileFirst:') && h.includes('reading the company’s file changed the save') && h.includes('an act that debuted is not on the company’s file'), 'the census prints the file’s line, holds a band on it, and guards it');
  t.ok(l.includes("' | file: '") && l.includes('the company’s file is out of order') && l.includes('the company’s file has no one chapter for this desk'), 'the long haul carries it on each scenario’s line, with its flags');
}

t.finish();
