/* Suite 141 — the year's close (v0.11.32, §124: the people upstairs and down
   the hall, part five). In the last week of the year the company writes to
   itself: the year's headline, the work, the people, the books. The tallies
   are read off the state, for this year or any before it. Two things are
   kept as they happen: what came in, and the till the year opened with. A
   closed year is filed, the company's page lists the last twelve, and an old
   file gets the years it had already closed.

   Laws (§99): a fixture forces every gate and rolls nothing; a missing
   letter fails by name; nothing here can crash or hang under a broken
   engine. */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadEngine, makeT } = require('./load_engine');
const dom = require('./dom_stub');
const KP = loadEngine();
const t = makeT('suite_141_yearclose');
const YEAR = KP.C.WEEKS_PER_YEAR, CEREMONY = KP.C.AWARDS.ceremonyWeek;

// ---- the kit ------------------------------------------------------------------
const say = fn => { try { return fn(); } catch (e) { return 'threw: ' + e.message; } };
const js = x => JSON.stringify(x);
const obj = x => (x && typeof x === 'object' ? x : { threw: String(x) });
const account = (s, year) => obj(say(() => KP.yearAccount(s, year)));
const act = s => KP.groups(s)[0] || { name: 'no act', id: 'none', releases: [], members: [] };
// a world at the end of a year, with nothing in that year yet: the inherited act's past is all before it
const world = (seed, year) => { const s = KP.newGame(seed, null, {}); s.week = (year || 2) * YEAR; return s; };
function lineup(s, id, name) {
  const g = Object.assign(JSON.parse(JSON.stringify(act(s))), { id, name, releases: [], debuted: false });
  ['debutWeek', 'honors', 'recoup', 'retiredWeek', 'trophies', 'legacy', 'lastShowWinWeek', 'eraBreakthrough'].forEach(k => { delete g[k]; });
  s.groups.push(g);
  return g;
}
const rec = (g, week, o) => { g.releases.push(Object.assign({ week, songTitle: 'Song ' + week, chartPeak: 9, reception: 50 }, o || {})); return g; };
const person = (s, i) => s.people[Object.keys(s.people)[i]];
const chapter = (p, week, kind, co) => { p.chapters = (p.chapters || []).concat([{ week, kind, co }]); };
const phase = name => KP.weeklyPipeline([]).filter(p => p.name === name)[0];
const close = s => { const inbox = []; const r = say(() => phase('yearClose').fn(s, KP.rngFor(s), inbox, [], KP.groups(s))); return typeof r === 'string' ? [{ ind: r, text: r }] : inbox; };
const letter = (s, a, last) => obj(say(() => KP.yearLetter(s, a, last)));
// an old file's closed years, as the backfill returns them (a throw is one year that says so)
const fill = s => { const r = say(() => KP.yearBackfill(s)); return Array.isArray(r) ? r : [{ year: String(r), records: String(r) }]; };
// the n-th closed year on the file, or nothing with no fields
const yr = (s, i) => (s.years || [])[i] || {};
// the letter's parts, after its opening sentence: the year, the headline, the work, the people, the books
const parts = text => { const i = String(text).indexOf('Year '); return i < 0 ? String(text) : String(text).slice(i); };
const blank = { year: 2, week: 2 * YEAR, records: 0, best: null, trophies: 0, honors: 0, daesang: false, debuts: 0, bows: 0, signed: 0, left: 0, chapters: 0, headline: null, till: 500, was: null, took: null };
const said = (s, over, last) => parts(letter(s, Object.assign({}, blank, over), last).text);

// ---- A. the shape -----------------------------------------------------------------
{
  ['yearLedger', 'yearAccount', 'yearLetter', 'closeYear', 'yearBackfill'].forEach(k => t.ok(typeof KP[k] === 'function', 'the engine carries KP.' + k));
  t.eq(KP.C.YEAR && KP.C.YEAR.kept, 12, 'the company’s page keeps twelve closed years');
  const s = KP.newGame('year-new', null, {});
  t.eq(js(s.yearLedger) + ' ' + js(s.years), js({ took: 0, open: { week: 1, budget: s.budget } }) + ' []', 'a new career opens its first year’s books with its first till, and has closed no year');
  const twin = JSON.parse(KP.serialize(s));
  delete twin.yearLedger; delete twin.years; twin.week = 30; twin.budget = 777;
  say(() => KP.ensureLedgers(twin));
  t.eq(js(twin.yearLedger) + ' ' + js(twin.years), '{"took":0,"open":{"week":30,"budget":777}} []', 'a state without them is given books that open today and an empty list');
  const kept = JSON.parse(KP.serialize(s));
  kept.yearLedger = { took: 40, open: { week: 3, budget: 99 } }; kept.years = [{ year: 1 }];
  say(() => KP.ensureLedgers(kept));
  t.eq(js(kept.yearLedger) + ' ' + js(kept.years), '{"took":40,"open":{"week":3,"budget":99}} [{"year":1}]', 'and what is there is kept');
}

// ---- B. what came in ----------------------------------------------------------------
// counted at the till's one door in since v0.11.35 (§127, suite_142): the books missed part of it
{
  const s = KP.newGame('year-flows', null, {});
  say(() => KP.takeIn(s, 300));
  say(() => KP.takeIn(s, -120));
  say(() => KP.takeIn(s, 50.5));
  say(() => KP.takeIn(s, 0));
  t.eq((s.yearLedger || {}).took, 350.5, 'the year’s sum takes everything that came into the till, and nothing that went out');
  say(() => KP.ledgerFlow(s, 'albums', 300));
  say(() => KP.ledgerFlow(s, 'production', -120));
  say(() => KP.ledgerFlow(s, 'tours', 50.5));
  say(() => KP.ledgerFlow(s, 'financing', 0));
  t.eq(js(s.books.cur), '{"albums":300,"production":-120,"tours":50.5,"financing":0}', 'and the quarter’s own books take every flow, as they did');
}

// ---- C. the account, each tally from what the state shows ---------------------------
{
  // an empty year
  const s = world('year-empty', 2);
  const snap = KP.serialize(s);
  t.eq(js(account(s)), js({ year: 2, week: 2 * YEAR, records: 0, best: null, trophies: 0, honors: 0, daesang: false, debuts: 0, bows: 0, signed: 0, left: 0, chapters: 0, headline: null,
    till: Math.round(s.budget), was: null, took: null }), 'a year with nothing in it tallies nothing, and what the company did before it is not this year’s');
  t.ok(KP.serialize(s) === snap, 'reading the account writes nothing');
  const bare = JSON.parse(snap); delete bare.yearLedger;
  account(bare);
  t.ok(!('yearLedger' in bare), 'and it opens no books of its own');
}
{
  // the work: records, the best of them, their trophies
  const s = world('year-work', 2);
  const a = lineup(s, 'g-a', 'ALPHA');
  rec(a, YEAR, { chartPeak: 1, trophies: 9 });            // the last week of last year
  rec(a, YEAR + 1, { chartPeak: 7, trophies: 2 });
  rec(a, YEAR + 20, { chartPeak: 3 });
  rec(act(s), 2 * YEAR, { chartPeak: 5, trophies: 1 });    // the last week of this one
  rec(a, 2 * YEAR + 1, { chartPeak: 1, trophies: 4 });    // next year's
  const got = account(s);
  t.eq([got.records, got.best, got.trophies].join('|'), '3|3|3', 'the year’s records are those that came out in it, from its first week to its last; the best is the highest any reached; the trophies are theirs');
  a.releases[1].chartPeak = undefined; a.releases[2].chartPeak = undefined; act(s).releases[act(s).releases.length - 1].chartPeak = undefined;
  t.eq(account(s).best, null, 'records that never charted have no best');
  // the year before, read back
  const last = account(s, 1);
  t.eq([last.year, last.week, last.records, last.best, last.trophies, last.till, last.took].join('|'), '1|' + YEAR + '|1|1|9||', 'any year before can be read the same way, and its till is on no file');
}
{
  // the honors, the debuts, the last bows
  const s = world('year-honors', 2);
  const a = lineup(s, 'g-a', 'ALPHA');
  a.honors = [{ year: 1, category: 'rookie' }, { year: 2, category: 'song' }, { year: 2, category: 'artist' }, { year: 3, category: 'daesang' }];
  t.eq([account(s).honors, account(s).daesang, account(s, 1).honors].join('|'), '2|false|1', 'the year’s honors are those of its own ceremony');
  a.honors.push({ year: 2, category: 'daesang' });
  t.eq([account(s).honors, account(s).daesang].join('|'), '3|true', 'and a daesang among them is marked');
  a.debuted = true; a.debutWeek = YEAR + 5;
  const b = lineup(s, 'g-b', 'BRAVO'); b.debuted = true; b.debutWeek = YEAR;
  lineup(s, 'g-c', 'CHARLIE');
  t.eq(account(s).debuts, 1, 'an act that debuted in the year is the year’s debut; last year’s is not, and a lineup that never debuted is none');
  a.retiredWeek = 2 * YEAR; b.retiredWeek = YEAR - 3;
  t.eq(account(s).bows, 1, 'and a last bow counts in the year it was taken');
}
{
  // the people: who signed with us and who left us
  const s = world('year-people', 2);
  const co = s.company.short;
  chapter(person(s, 0), YEAR + 3, 'signed', co);
  chapter(person(s, 1), YEAR + 9, 'signed', co);
  chapter(person(s, 1), YEAR + 30, 'released', co);
  chapter(person(s, 2), YEAR + 12, 'departed', co);
  chapter(person(s, 3), YEAR + 5, 'signed', 'ELSEWHERE');   // another house's signing
  chapter(person(s, 4), YEAR, 'signed', co);                // last year's
  chapter(person(s, 5), YEAR + 7, 'graduated', co);         // not a leaving
  chapter(person(s, 6), YEAR + 8, 'released', co);
  chapter(person(s, 6), YEAR + 9, 'released', co);          // one person, counted once
  t.eq([account(s).signed, account(s).left, account(s, 1).signed].join('|'), '2|3|1', 'a signing or a leaving counts when it was ours and in the year: a release or a departure, and each person once');
}
{
  // the headline: the first kind in a fixed order, and the last chapter of that kind
  const s = world('year-headline', 2);
  const a = lineup(s, 'g-a', 'ALPHA');
  a.debuted = true; a.debutWeek = 20; rec(a, 20, { songTitle: 'Early' });   // an act of ours, debuted the year before
  const head = () => account(s).headline;
  s.annals = [{ week: YEAR + 2, kind: 'red' }];
  t.eq([head(), account(s).chapters].join(' | '), 'The red weeks. The company fell far enough behind on what it owed that the staff held a meeting nobody called. | 1', 'a year whose only chapter is the red weeks is headed by them');
  s.annals.push({ week: YEAR + 6, kind: 'redCleared', rung: 2 });
  t.eq(head(), 'The arrears cleared. The red weeks had gone as far as the staff meeting.', 'their clearing outranks them');
  a.retiredWeek = YEAR + 40;
  t.eq(head(), 'ALPHA took a last bow.', 'a last bow outranks the clearing');
  s.annals.push({ week: YEAR + 8, kind: 'chair', name: 'CEO New', after: 'CEO Old', years: 5 });
  t.eq(head(), 'CEO New took the chair. CEO Old had held it 5 years.', 'a new chair outranks a last bow');
  a.recoup = { debt: 0, paid: 9, settledWeek: YEAR + 9 };
  t.eq(head(), 'ALPHA paid back everything the company had spent on them. From that week their share was theirs.', 'a settlement outranks a new chair');
  a.debutWeek = YEAR + 10; a.releases = []; rec(a, YEAR + 10, { songTitle: 'First', chartPeak: 4 });
  t.eq(head(), 'ALPHA debuted with “First”.', 'a debut outranks a settlement');
  s.annals.push({ week: YEAR + 11, kind: 'breakthrough', groupId: 'g-a', name: 'ALPHA', title: 'First' });
  t.eq(head(), 'The breakthrough: “First” by ALPHA charted from a label nobody had heard of.', 'the breakthrough outranks a debut');
  s.annals.push({ week: YEAR + 12, kind: 'trophy', groupId: 'g-a', name: 'ALPHA', show: 'Pop Wave', title: 'First' });
  t.eq(head(), 'ALPHA won Pop Wave with “First”: the first under this desk.', 'this desk’s first trophy outranks the breakthrough');
  rec(a, YEAR + 20, { songTitle: 'Peak', chartPeak: 1 });
  t.eq(head(), '“Peak” by ALPHA went to number one on the scene chart: the first under this desk.', 'this desk’s first number one outranks its first trophy');
  a.honors = [{ year: 2, category: 'rookie' }, { year: 2, category: 'song' }];
  t.eq(head(), 'ALPHA took Song of the Year.', 'an honor outranks a first, and of two the same night the file’s last is the headline');
  a.honors.push({ year: 2, category: 'daesang' });
  t.eq(head(), 'ALPHA took the daesang, the grand prize of the year.', 'and the daesang outranks everything');
  t.eq(account(s).chapters, 12, 'every chapter of the year is counted: five from the record, the bow, the settlement, the debut, the number one, three honors');
  // the desk's own chapter and a folded label are not the year's news
  const d = world('year-desk', 1);
  d.estate = { folded: [{ name: 'First Label', short: 'First', week: 10, since: 1 }] };
  t.eq([account(d).headline, account(d).chapters].join('|'), '|0', 'taking the desk, and a label that folded, are not the year’s chapters');
}
{
  // the window: a desk that began inside the year answers for its own weeks only
  const s = world('year-window', 3);
  const a = lineup(s, 'g-a', 'ALPHA');
  rec(a, 2 * YEAR + 5, { trophies: 2 }); rec(a, 2 * YEAR + 20, { trophies: 1 });
  s.chapterSince = 2 * YEAR + 10;
  t.eq([account(s).records, account(s).trophies].join('|'), '1|1', 'a desk that began inside the year answers for the weeks since it began');
  s.chapterSince = 2 * YEAR + 20;
  t.eq(account(s).records, 1, 'and the week it began is its own');
  // a year still running is read up to today
  s.chapterSince = 1; s.week = 2 * YEAR + 12;
  t.eq([account(s).week, account(s).records].join('|'), (2 * YEAR + 12) + '|1', 'a year still running is read up to today');
}
{
  // the books: the till, what it was, what came in
  const s = world('year-books', 2);
  s.budget = 812.4;
  s.yearLedger = { took: 2400.6, open: { week: YEAR, budget: 500.2 } };
  t.eq([account(s).till, account(s).was, account(s).took].join('|'), '812|500|2401', 'with books that opened when the year did, the account has the till, the till it opened with, and what came in');
  s.yearLedger.open.week = YEAR + 1;
  t.eq(account(s).was, 500, 'books opened in the year’s first week opened with the year');
  s.yearLedger.open.week = YEAR + 2;
  t.eq([account(s).till, account(s).was, account(s).took].join('|'), '812||', 'books opened later have no whole year to give: the till, and no more');
  s.yearLedger.open.week = 1;
  t.eq([account(s, 1).till, account(s, 1).was, account(s, 1).took].join('|'), '||', 'and a year before this one has neither, whenever today’s books opened');
  s.yearLedger.open.week = YEAR;
  // a label founded in the year: its first year opens with its doors
  const f = world('year-founded', 3);
  f.founded = { week: 2 * YEAR + 10 };
  f.yearLedger = { took: 90, open: { week: 2 * YEAR + 10, budget: 240 } };
  t.eq([account(f).was, account(f).took].join('|'), '240|90', 'a label founded inside the year has a whole first year from its doors');
}

// ---- D. the letter ------------------------------------------------------------------------
{
  const s = world('year-letter', 2);
  const name = s.company.name;
  const openings = [
    'The year closes, and ' + name + ' writes to itself, as it does once a year.',
    name + ', to its own file, in the last week of the year.',
    'The last week of the year. ' + name + ' sets it down for the file.',
  ];
  const first = letter(s, blank, null);
  t.ok(openings.includes(String(first.text).slice(0, String(first.text).indexOf(' Year '))) && first.line === openings.indexOf(String(first.text).slice(0, String(first.text).indexOf(' Year '))), 'the letter opens one of three ways, and says which');
  const seen = {};
  for (let w = 1; w <= 40; w++) { s.week = w * YEAR; const l = letter(s, blank, null); seen[l.line] = 1; }
  t.eq(Object.keys(seen).sort().join(), '0,1,2', 'over forty years each opening is used');
  let same = 0, prev = null;
  for (let w = 1; w <= 40; w++) { s.week = w * YEAR; const l = letter(s, blank, prev); if (l.line === prev) same++; prev = l.line; }
  t.eq(same, 0, 'and never the one used the year before');
  s.week = 2 * YEAR;
  t.eq(said(s, {}), 'Year 2. No headline: a quiet year on the file. The work: no records out, and no trophies. The people: nobody came and nobody went. The books: the till closes at 500.', 'a quiet year, said plainly');
  t.eq(said(s, { year: 7, headline: 'ALPHA took Song of the Year.' }).slice(0, 51), 'Year 7. The headline: ALPHA took Song of the Year. ', 'the year and its headline');
  t.ok(said(s, { records: 1, best: 4, trophies: 1 }).includes('The work: one record out, the best at number 4, and one trophy.'), 'one record, its place, one trophy');
  t.ok(said(s, { records: 3, best: 1, trophies: 14 }).includes('The work: 3 records out, the best at number 1, and 14 trophies.'), 'several of each');
  t.ok(said(s, { records: 2, best: null, trophies: 0 }).includes('The work: 2 records out, and no trophies.'), 'records that never charted have no best to name');
  t.ok(said(s, { debuts: 1, signed: 3, left: 1, bows: 2 }).includes('The people: one act debuted, 3 signed, 1 left, 2 acts took a last bow.'), 'the people, in order: who debuted, who signed, who left, who bowed');
  t.ok(said(s, { left: 2 }).includes('The people: 2 left.') && said(s, { debuts: 2 }).includes('The people: 2 acts debuted.'), 'and only those there were');
  // the books
  t.ok(said(s, { till: 812, was: 500, took: 2401 }).endsWith('The books: 2401 came in and 2089 went out. The till closes at 812, up 312.'), 'a whole year’s books: what came in, what went out, the till, and how far it moved');
  t.ok(said(s, { till: 400, was: 500, took: 900 }).endsWith('The books: 900 came in and 1000 went out. The till closes at 400, down 100.'), 'a year that closed lower says so');
  t.ok(said(s, { till: 500, was: 500, took: 70 }).endsWith('The books: 70 came in and 70 went out. The till closes at 500, where it opened.'), 'and one that closed level');
  t.ok(said(s, { till: 812, was: 500, took: 312 }).endsWith('The books: 312 came in and 0 went out. The till closes at 812, up 312.'), 'a till that gained exactly what came in adds up');
  t.ok(said(s, { till: 812, was: 500, took: 311 }).endsWith('The books: the till closes at 812, up 312.'), 'a till that gained more than came in was fed from outside the books: the sum is not given');
  t.ok(said(s, { till: 812, was: null, took: null }).endsWith('The books: the till closes at 812.'), 'and books with no whole year give the till alone');
  t.ok(said(s, { till: -250, was: null, took: null }).endsWith('The books: the till closes at -250.'), 'even a till below nothing');
}

// ---- E. the close -----------------------------------------------------------------------------
{
  const s = world('year-close', 2);
  const a = lineup(s, 'g-a', 'ALPHA');
  rec(a, YEAR + 4, { chartPeak: 2, trophies: 3 });
  s.budget = 640; s.yearLedger = { took: 1000, open: { week: YEAR, budget: 400 } };
  s.week = 2 * YEAR - 1;
  t.eq([close(s).length, js(s.years)].join(' '), '0 []', 'a week that is not the year’s last closes nothing');
  s.week = 2 * YEAR;
  const out = close(s);
  const filed = (s.years || [])[0] || {};
  t.eq([out.length, out[0] && out[0].kind, out[0] && out[0].ind, out[0] && out[0].priority, out[0] && out[0].year].join('|'), '1|company|yearEnd|critical|2', 'the last week of the year writes one letter, the company’s, and it is critical');
  t.ok(out[0] && out[0].text === filed.said && parts(filed.said) === 'Year 2. No headline: a quiet year on the file. The work: one record out, the best at number 2, and 3 trophies. The people: nobody came and nobody went. The books: 1000 came in and 760 went out. The till closes at 640, up 240.',
    'the letter is the year’s account in words (' + parts(filed.said) + ')');
  t.eq([s.years.length, filed.year, filed.week, filed.records, filed.till, filed.was, filed.took, typeof filed.line].join('|'), '1|2|' + (2 * YEAR) + '|1|640|400|1000|number', 'and the account is filed with what was said');
  t.eq(js(s.yearLedger), js({ took: 0, open: { week: 2 * YEAR, budget: 640 } }), 'the next year’s books open at the close, with the till it closed at');
  // the next year: its account is whole, and its letter opens another way
  s.week = 3 * YEAR; s.budget = 700; s.yearLedger.took = 300;
  const next = close(s);
  t.ok(next[0] && /300 came in and 240 went out\. The till closes at 700, up 60\.$/.test(next[0].text) && (s.years || []).length === 2 && typeof yr(s, 1).line === 'number' && yr(s, 1).line !== yr(s, 0).line,
    'the year after reads its own books from that close, and opens its letter another way');
  // the epilogue closes no year
  const dead = world('year-epilogue', 2);
  dead.dissolved = { week: 2 * YEAR, name: 'Gone', short: 'Gone', door: null };
  t.eq([close(dead).length, js(dead.years)].join(' '), '0 []', 'a label waiting at its last statement closes no year');
  // twelve are kept
  const long = world('year-twelve', 1);
  for (let y = 1; y <= 14; y++) { long.week = y * YEAR; close(long); }
  t.eq((long.years || []).map(x => x.year).join(), '3,4,5,6,7,8,9,10,11,12,13,14', 'the file keeps the last twelve closed years');
}
{
  // through the real weeks: the letter lands, with the till the week ended on
  const s = KP.newGame('year-weeks', null, {});
  s.budget = 5e4; s.yearLedger = { took: 0, open: { week: 1, budget: 5e4 } };   // the fixture's till is the till the year opens with
  const bad = [];
  let landed = null, tillAfter = null;
  for (let i = 0; i < 50; i++) {
    const a = say(() => { (s.scenes || []).slice().forEach(sc => { const d = KP.sceneDef(sc.kind); if (d) KP.resolveScene(s, sc.id, d.options(s, sc)[0].id); }); return KP.advanceWeek(s); });
    if (typeof a === 'string') { bad.push('week ' + s.week + ' ' + a); break; }
    const before = KP.serialize(s);
    const got = account(s);
    if (got.threw) { bad.push('week ' + s.week + ' ' + got.threw); break; }
    if (KP.serialize(s) !== before) bad.push('week ' + s.week + ' reading the account changed the save');
    if (!s.yearLedger || !(s.yearLedger.took >= 0)) bad.push('week ' + s.week + ' the year’s books are not open');
    if (s.week === YEAR) { landed = (s.inbox || []).find(m => m.ind === 'yearEnd' && m.week === YEAR) || null; tillAfter = Math.round(s.budget); }
  }
  t.ok(bad.length === 0, 'fifty real weeks: the books stay open and reading the account changes nothing (' + (bad[0] || 'clean') + ')');
  t.ok(!!landed && landed.priority === 'critical' && landed.text.includes('Year 1.') && landed.text.includes('The till closes at ' + tillAfter + ', '), 'the letter lands in the inbox in the year’s last week, with the till that week ended on');
  t.ok(landed && /\d+ came in and \d+ went out\./.test(landed.text), 'and a career’s first year has a whole year’s books');
  t.eq([(s.years || []).length, s.yearLedger && s.yearLedger.open.week].join('|'), '1|' + YEAR, 'the year is on the file and the next one’s books are open');
}

// ---- F. a move closes the years with the house ------------------------------------------------
{
  const s = world('year-found', 3);
  s.trust = 80;
  s.awardHistory = [{ year: 2, category: 'daesang', name: act(s).name, company: s.company.short, isPlayer: true }];
  s.years = [{ year: 1 }, { year: 2 }]; s.yearLedger = { took: 900, open: { week: 2 * YEAR, budget: 300 } };
  const r = say(() => KP.foundLabel(s, 'HOMEWARD'));
  t.ok(r && r.ok === true, 'the fixture: the founding goes through');
  t.eq(js(s.years) + ' ' + js(s.yearLedger), '[] ' + js({ took: 0, open: { week: 3 * YEAR, budget: s.budget } }), 'a founded label has closed no year, and its first year’s books open with its war chest');
  const d = world('year-fold', 2);
  d.years = [{ year: 1 }]; d.yearLedger = { took: 900, open: { week: YEAR, budget: 300 } };
  say(() => KP.dissolveLabel(d, 'read'));
  t.eq(js(d.years) + ' ' + js(d.yearLedger), '[] ' + js({ took: 0, open: { week: 2 * YEAR, budget: 0 } }), 'a dissolved label’s years close with it');
  const door = say(() => KP.nextChapter(d, 'salaried'));
  t.ok(door && door.ok === true && js(d.yearLedger) === js({ took: 0, open: { week: 2 * YEAR, budget: d.budget } }), 'and the next label’s first year opens with what its door gave it');
}

// ---- G. an old file ---------------------------------------------------------------------------
{
  const s = world('year-old', 3);
  s.week = 3 * YEAR + 20;
  const a = lineup(s, 'g-a', 'ALPHA');
  a.debuted = true; a.debutWeek = -30;   // an act of ours from before this desk
  rec(a, 10, { chartPeak: 6 }); rec(a, YEAR + 10, { chartPeak: 2, trophies: 5 }); rec(a, 3 * YEAR + 5, { chartPeak: 1 });
  a.honors = [{ year: 2, category: 'song' }];
  delete s.years;
  const got = fill(s);
  const list = got;
  t.eq(list.map(x => [x.year, x.week, x.records, x.best, x.trophies, x.honors, x.till, x.took, x.said].join('/')).join(' '),
    ['1/' + YEAR + '/1/6/0/0///', '2/' + (2 * YEAR) + '/1/2/5/1///', '3/' + (3 * YEAR) + '/0//0/0///'].join(' '),
    'an old file gets each year it had already closed, tallied from what it still shows, with no till and nothing said');
  t.ok(s.years === got && list.every(x => x.headline === (x.year === 2 ? 'ALPHA took Song of the Year.' : null)), 'they are on the state, each with its headline');
  s.chapterSince = YEAR + 30;
  t.eq(fill(s).map(x => x.year + ':' + x.records).join(), '2:0,3:0', 'a desk that began in the second year has no first one, and answers for its own weeks');
  delete s.chapterSince;
  s.week = 15 * YEAR + 3;
  t.eq(fill(s).map(x => x.year).join(), '4,5,6,7,8,9,10,11,12,13,14,15', 'and only the last twelve are kept');
  s.week = 30;
  t.eq(js(fill(s)), '[]', 'a career still in its first year has closed none');
}
{
  // through the real load, and the first close after it
  const s = world('year-load', 2);
  s.week = 2 * YEAR + 30; s.budget = 900;
  rec(lineup(s, 'g-a', 'ALPHA'), YEAR + 10, { chartPeak: 2, trophies: 5 });
  const old = JSON.parse(KP.serialize(s));
  old.version = '0.11.31'; delete old.years; delete old.yearLedger;
  const back = say(() => KP.deserialize(JSON.stringify(old)));
  const ok = back && typeof back === 'object';
  t.eq(ok ? [(back.years || []).map(x => x.year + ':' + x.records + ':' + x.trophies).join(), js(back.yearLedger), back.version].join(' ') : String(back),
    '1:0:0,2:1:5 ' + js({ took: 0, open: { week: 2 * YEAR + 30, budget: 900 } }) + ' ' + KP.C.VERSION, 'an old save opens with its closed years on the file, and its books open from today');
  if (ok && back.yearLedger) {
    back.week = 3 * YEAR; back.budget = 1000; back.yearLedger.took = 400;
    const out = close(back);
    t.ok(out[0] && /The books: the till closes at 1000\.$/.test(out[0].text) && back.years.length === 3, 'its first close gives the till and not the sum: the books missed the start of that year');
    back.week = 4 * YEAR; back.budget = 1100; back.yearLedger.took = 500;
    t.ok(/The books: 500 came in and 400 went out\. The till closes at 1100, up 100\.$/.test((close(back)[0] || {}).text || ''), 'and the year after is whole');
  } else { t.ok(false, 'its first close gives the till and not the sum (the old save did not load, or loaded with no books)'); t.ok(false, 'and the year after is whole (the old save did not load, or loaded with no books)'); }
  const now = say(() => KP.deserialize(KP.serialize(Object.assign(JSON.parse(KP.serialize(s)), { years: [{ year: 9, records: 4 }] }))));
  t.eq(js(now && now.years), '[{"year":9,"records":4}]', 'a save of this version keeps the years it has');
}

// ---- H. the Desk -----------------------------------------------------------------------------------
{
  const D = dom.load();
  const { App, el } = D;
  const draw = () => { const r = say(() => App.render()); return typeof r === 'string' ? r : el('screen').innerHTML; };
  const s = world('year-ui', 3);
  App.state = s; App.mode = 'game'; App.tab = 'desk'; App.stack = []; App.view = { type: 'company', id: 'company' };
  t.ok(!draw().includes('<div class="kicker">The years</div>'), 'a company that has closed no year lists none');
  s.years = [
    { year: 1, week: YEAR, records: 1, trophies: 0, honors: 0, daesang: false, debuts: 0, till: null },
    { year: 2, week: 2 * YEAR, records: 3, trophies: 14, honors: 2, daesang: true, debuts: 1, till: 3975 },
  ];
  const html = draw();
  const iYears = html.indexOf('<div class="kicker">The years</div>'), iMine = html.indexOf('<div class="kicker">Under this desk</div>');
  t.ok(iYears > -1 && iYears < iMine, 'the company’s page lists the years it has closed, above this desk’s chapters');
  const y2 = html.indexOf('<span class="m-tag">Y2</span><div>3 records · 14 trophies · 2 honors, the daesang among them · 1 debut · till 3975</div>');
  const y1 = html.indexOf('<span class="m-tag">Y1</span><div>1 record · 0 trophies</div>');
  t.ok(y2 > iYears && y1 > y2 && y1 < iMine, 'the newest first, each with its work, its honors, its debuts and its till; a year filed from an old save has no till to show');
}

// ---- I. the tools ------------------------------------------------------------------------------------
{
  const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const h = read('tools/harness.js'), l = read('tools/audit_longhaul.js'), d = read('tools/desk_count.js');
  t.ok(/'yearEnd',/.test(d), 'the letter is on the list of letters said once');
  t.ok(h.includes("console.log('the year’s close: years closed ") && h.includes('yearClosed:') && h.includes('yearHeadline:') && h.includes('tally.yearClosed++') && h.includes('tally.yearHeadline++'), 'the census prints the year’s line and holds two bands on it');
  t.ok(['the closed years do not follow one another', 'a year is closed on a week that is not its last', 'a closed year has no letter, or its letter has not its till', 'a year’s letter gives a sum that does not add up',
    'the company opened its letter the same way two years running', ' closed years on the file', 'the books of the year in hand are not open', 'reading the year’s account changed the save'].every(x => h.includes(x)), 'and guards it eight ways');
  t.ok(l.includes("' | years: '") && ['the closed years do not follow one another', 'a year is closed on a week that is not its last', 'a year’s letter gives a sum that does not add up', 'the books of the year in hand are not open'].every(x => l.includes(x)), 'the long haul carries it on each scenario’s line, with its flags');
}

t.finish();
