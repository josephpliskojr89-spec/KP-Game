/* Suite 145 — the review's own year (v0.11.38, §130: a repair of §120's
   annual review). When the directors have gone the executive says one fact
   about the year. Two kinds of executive hold the year against the review
   before it: the profit hunter the till, the micromanager the evaluation
   sheets. The review before it is the last one given under THIS desk. A
   review the last house gave is not this house's to hold a year against,
   and the sheets the last house's floor was read on are not this house's
   year.

   Laws (§99): a fixture forces every gate and rolls nothing; a missing
   sentence fails by name; nothing here can crash or hang under a broken
   engine. */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_145_reviewyear');
const YEAR = KP.C.WEEKS_PER_YEAR;

// ---- the kit ------------------------------------------------------------------
const say = fn => { try { return fn(); } catch (e) { return 'threw: ' + e.message; } };
const js = x => JSON.stringify(x);
const obj = x => (x && typeof x === 'object' ? x : { threw: String(x), ok: false });
const chair = k => KP.DATA.executives.find(e => e.personality === k) || {};
const seat = (s, kind) => { const e = chair(kind); s.executive = { name: e.name, gender: e.gender, personality: e.personality, intro: e.intro, since: 1 }; return s; };
const act = s => KP.groups(s)[0] || { name: 'no act', id: 'none' };
// a world in a given week under one kind of executive, trust in the middle of "watched"
const world = (seed, kind, week) => { const s = seat(KP.newGame(seed, null, {}), kind); s.week = week; s.trust = 50; return s; };
const WATCHED = ' I still read everything of yours twice.';
// the fact alone: what she says before where the desk stands
const fact = s => { const r = say(() => KP.annualReview(s)); const text = r && typeof r === 'object' ? String(r.said) : String(r); const cut = text.indexOf(WATCHED); return cut < 0 ? text : text.slice(0, cut); };
// a review on the file, as one was filed
const filed = (s, week, o) => { s.reviews = (s.reviews || []).concat([Object.assign({ year: Math.ceil(week / YEAR), week, exec: 'CEO Of That Week', trust: 50, band: 'watched', till: 500, sheets: 0, said: 'x' }, o || {})]); return s; };
const sheets = (s, n, before) => { s.evalLedger = Object.assign({ sheets: n, climbs: 0, slides: 0, talks: 0 }, before == null ? {} : { before }); return s; };
const ours = s => s.roster.map(id => s.people[id]).filter(p => p.status === 'trainee');
const top = (p, weeks) => { p.evalHistory = weeks.map(w => ({ week: w, rank: 1, of: 4 })); return p; };
// a house the desk can be walked out of: the founding's gates, forced
const founder = (seed, week) => { const s = world(seed, 'patient', week); s.trust = 80; s.awardHistory = [{ year: 2, category: 'daesang', name: act(s).name, company: s.company.short, isPlayer: true }]; return s; };
const NEXT = 'The till holds 700. Next year I will have a number to hold it against.';
const NONE = 'No evaluation sheet reached my desk this year. I noticed.';

// ---- A. the till, held against this desk's own last review ----------------------------
{
  t.ok(typeof KP.evalDeskOpens === 'function', 'the engine carries KP.evalDeskOpens');
  const mk = (seed, set) => { const s = world(seed, 'profitHunter', 142); s.budget = 700; set(s); return s; };
  // a desk that has never moved: the review before this one, as it always was
  t.eq(fact(mk('ry-first', () => {})), NEXT, 'a profit hunter with no review on the file has no number to hold the till against');
  t.eq(fact(mk('ry-up', s => filed(s, 94, { till: 500 }))), 'The till holds 700. At the last review it held 500. That is the direction I am paid to like.', 'with one on the file the till is held against it, and up is up');
  t.eq(fact(mk('ry-down', s => filed(s, 94, { till: 900 }))), 'The till holds 700. At the last review it held 900. I am paid to notice the direction.', 'down is down');
  t.eq(fact(mk('ry-flat', s => filed(s, 94, { till: 700 }))), 'The till holds 700. At the last review it held 700. A year, and the number did not move.', 'and the same is the same');
  t.eq(fact(mk('ry-latest', s => filed(filed(s, 46, { till: 100 }), 94, { till: 500 }))).includes('it held 500.'), true, 'the review it is held against is the newest on the file');
  // a founded label: the old house's reviews are on the file, and are not this house's
  const label = set => mk('ry-label', s => { s.founded = { week: 100, from: 'HCG', warChest: 300 }; set(s); });
  t.eq(fact(label(s => filed(filed(s, 46, { till: 100 }), 94, { till: 652 }))), NEXT, 'at a founded label the first review holds the till against nothing: the review before it was the old house’s');
  t.eq(fact(label(s => filed(s, 100, { till: 652 }))), NEXT, 'a review given in the very week the label opened was the old house’s too');
  t.eq(fact(label(s => filed(filed(s, 94, { till: 652 }), 101, { till: 300 }))), 'The till holds 700. At the last review it held 300. That is the direction I am paid to like.', 'a review given the week after is the label’s own, and the next is held against it');
  t.eq(fact(label(s => filed(filed(filed(s, 94, { till: 652 }), 101, { till: 300 }), 120, { till: 450 }))).includes('it held 450.'), true, 'and of the label’s own, the newest');
  // a second chance, by the desk's first week
  t.eq(fact(mk('ry-chapter', s => { s.chapterSince = 100; filed(s, 94, { till: 652 }); })), NEXT, 'after a second chance the first review holds the till against nothing either');
  const before = KP.serialize(label(s => filed(s, 94, { till: 652 })));
  const again = KP.deserialize(before);
  fact(again);
  t.eq(js(again.reviews) === js(JSON.parse(before).reviews) && !('before' in (again.evalLedger || {})), true, 'saying it writes nothing, and the old house’s reviews stay on the file as they were');
}

// ---- B. the sheets, counted from this desk's own year ----------------------------------
{
  const mk = (seed, set) => { const s = world(seed, 'micromanager', 142); ours(s).forEach(p => { p.evalHistory = []; }); set(s); return s; };
  const read = n => 'I read ' + n + ' evaluation sheets this year. Nobody who was first on one is still in this building.';
  // a desk that has never moved
  t.eq(fact(mk('rs-none', s => sheets(s, 0))), NONE, 'a micromanager who was sent no sheet says so');
  t.eq(fact(mk('rs-noledger', s => { delete s.evalLedger; })), NONE, 'and so does one whose house has never held a showcase at all');
  t.eq(fact(mk('rs-first', s => sheets(s, 5))), read(5), 'with no review on the file every sheet so far is this year’s');
  t.eq(fact(mk('rs-since', s => filed(sheets(s, 9), 94, { sheets: 5 }))), read(4), 'with one on the file, the sheets since it');
  t.eq(fact(mk('rs-one', s => filed(sheets(s, 6), 94, { sheets: 5 }))), 'I read one evaluation sheet this year. Nobody who was first on one is still in this building.', 'one is one');
  // a desk that has moved: the sheets the career had seen when it began are not its year
  const moved = set => mk('rs-moved', s => { s.chapterSince = 100; set(s); });
  t.eq(fact(moved(s => sheets(s, 11, 7))), read(4), 'at a desk that has moved, with no review under it yet, the count begins where the desk began');
  t.eq(fact(moved(s => filed(sheets(s, 11, 11), 94, { sheets: 5 }))), NONE, 'the old house’s review is not where the count begins: a desk that has been sent nothing says so');
  t.eq(fact(moved(s => filed(filed(sheets(s, 20, 11), 94, { sheets: 5 }), 118, { sheets: 13 }))), read(7), 'once the desk has a review of its own, the count begins there');
  t.eq(fact(moved(s => sheets(s, 11))), read(11), 'a file that does not say what the career had seen counts from nothing');
  // who was first on them: this house's sheets, and no older than the year
  const named = (seed, since, set) => fact(mk(seed, s => { if (since) s.chapterSince = since; sheets(s, 30, 20); set(s, ours(s)); }));
  const who = text => (String(text).split('this year. ')[1] || '').split(' was first on more of them')[0];
  const a = named('rs-who', 100, (s, tr) => { top(tr[0], [96, 100]); top(tr[1], [104]); });
  const w = world('rs-who', 'micromanager', 142);
  t.eq(who(a), KP.displayName(ours(w)[1]), 'a first on the old house’s sheets is not a first on these: the one named was first under this desk (' + a.slice(0, 70) + ')');
  const b = named('rs-year', 0, (s, tr) => { top(tr[0], [90, 93]); top(tr[1], [100]); });
  t.eq(who(b), KP.displayName(ours(world('rs-year', 'micromanager', 142))[1]), 'and at a desk that has not moved, a first more than a year old is not counted (' + b.slice(0, 70) + ')');
}

// ---- C. the wall notes what the career had seen -----------------------------------------
{
  const s = sheets(world('rw-stamp', 'micromanager', 142), 7);
  say(() => KP.evalDeskOpens(s));
  t.eq(s.evalLedger.before + ' of ' + s.evalLedger.sheets, '7 of 7', 'when the desk moves, the sheets the career has seen are noted');
  s.evalLedger.sheets = 12;
  say(() => KP.evalDeskOpens(s));
  t.eq(s.evalLedger.before, 12, 'and noted again at the next move');
  const bare = world('rw-bare', 'micromanager', 142);
  delete bare.evalLedger;
  t.eq(String(say(() => KP.evalDeskOpens(bare))) + ' ' + js(bare.evalLedger && bare.evalLedger.before), 'undefined 0', 'a career that was never read on a sheet moves with nothing noted against it');

  // a real founding
  const f = sheets(founder('rw-found', 3 * YEAR), 9);
  filed(f, 3 * YEAR - 2, { till: 652, sheets: 9 });
  const fr = obj(say(() => KP.foundLabel(f, 'HOMEWARD')));
  t.ok(fr.ok === true && f.founded && f.founded.week === 3 * YEAR, 'the fixture: the founding goes through (' + js(fr).slice(0, 60) + ')');
  t.eq(f.evalLedger.before, 9, 'a founding notes the sheets the old house’s floor was read on');
  f.week += 1; f.trust = 50; f.budget = 700;
  t.eq(fact(seat(f, 'profitHunter')), NEXT, 'the week after, a profit hunter’s first review at the label holds the till against nothing');
  t.eq(fact(seat(f, 'micromanager')), NONE, 'and a micromanager’s says no sheet has reached the desk');
  f.evalLedger.sheets = 12;
  t.eq(fact(f).startsWith('I read 3 evaluation sheets this year. '), true, 'three showcases on, three sheets (' + fact(f).slice(0, 50) + ')');

  // a second chance, by each door
  ['blank', 'salaried'].forEach(door => {
    const x = sheets(world('rw-door-' + door, 'patient', 2 * YEAR - 10), 8);
    filed(x, YEAR - 2, { till: 652, sheets: 4 });
    say(() => KP.dissolveLabel(x, 'read'));
    const dr = obj(say(() => KP.nextChapter(x, door, door === 'blank' ? { companyName: 'Second Paper' } : undefined)));
    x.week += 1; x.trust = 50; x.budget = 700;
    t.ok(dr.ok === true && x.evalLedger.before === 8 && fact(seat(x, 'profitHunter')) === NEXT && fact(seat(x, 'micromanager')) === NONE,
      'a second chance by the ' + door + ' door notes the dead label’s sheets, and the next house’s first review holds nothing against the dead label’s (' + js(dr).slice(0, 40) + ' ' + js(x.evalLedger.before) + ' ' + fact(x).slice(0, 50) + ')');
  });
}

// ---- D. through the real board season ----------------------------------------------------
{
  const s = sheets(world('rr-real', 'profitHunter', 142), 9, 9);
  s.founded = { week: 141, from: 'HCG', warChest: 278 };
  s.budget = 278;
  filed(filed(s, 46, { till: 300, sheets: 4 }), 94, { till: 652, sheets: 9 });
  KP.openScene(s, { kind: 'boardSeason', popSum: 0, year: 3, expiresWeek: 144 });
  const sc = (s.scenes || []).find(x => x.kind === 'boardSeason') || {};
  const def = KP.sceneDef('boardSeason');
  const r = say(() => KP.resolveScene(s, sc.id, def.options(s, sc)[0].id));
  const mine = (s.reviews || [])[(s.reviews || []).length - 1] || {};
  const letter = (s.inbox || []).find(n => n.ind === 'annualReview') || {};
  t.ok((s.reviews || []).length === 3 && mine.week === 142 && mine.exec === s.executive.name, 'the real board season files the label’s first review (' + String(typeof r === 'string' ? r : 'answered') + ', ' + (s.reviews || []).length + ' on the file)');
  t.ok(String(mine.said).startsWith('The till holds ' + mine.till + '. Next year I will have a number to hold it against.') && !/At the last review/.test(String(mine.said)), 'and what it says holds the till against nothing (' + String(mine.said).slice(0, 80) + ')');
  t.ok(String(letter.text).includes('Next year I will have a number to hold it against.'), 'the letter says the same');
  t.eq(mine.sheets, 9, 'the review notes the sheets the career has seen, as every review does');
  // a year on, the second is held against the first of the label's own
  s.week = 190; s.budget = 304;
  t.eq(fact(s), 'The till holds 304. At the last review it held ' + mine.till + '. ' + (304 > mine.till ? 'That is the direction I am paid to like.' : 'I am paid to notice the direction.'), 'a year on, the label’s second review is held against its first');
}

// ---- E. old files ---------------------------------------------------------------------------
{
  const old = (seed, set) => {
    const s = world(seed, 'micromanager', 142);
    Object.keys(s.people).forEach(id => { delete s.people[id].evalHistory; });
    set(s, ours(s));
    s.version = '0.11.37';
    const r = say(() => KP.deserialize(KP.serialize(s)));
    return r && typeof r === 'object' ? r : { evalLedger: { threw: String(r) }, reviews: [], threw: String(r) };
  };
  const hist = (p, weeks) => { p.evalHistory = weeks.map((w, i) => ({ week: w, rank: i + 2, of: 4 })); };
  // a founded label: three showcases since its doors opened, on two trainees' histories
  const a = old('ro-label', (s, tr) => { s.founded = { week: 100, from: 'HCG', warChest: 300 }; sheets(s, 12); hist(tr[0], [96, 100, 104, 108]); hist(tr[1], [104, 108, 112]); filed(s, 94, { till: 652, sheets: 9 }); });
  t.eq(a.evalLedger.before, 9, 'an old file at a founded label: twelve sheets, three of them since its doors opened, so nine were the old house’s');
  t.eq(fact(a).startsWith('I read 3 evaluation sheets this year. '), true, 'and its first review counts the label’s own three (' + fact(a).slice(0, 50) + ')');
  t.eq(js(a.reviews.map(r => [r.week, r.till, r.sheets, r.said])), js([[94, 652, 9, 'x']]), 'the reviews already on the file keep what they said');
  // a desk that never moved is left alone
  const b = old('ro-plain', (s, tr) => { sheets(s, 12); hist(tr[0], [104, 108]); });
  t.eq(js(b.evalLedger.before), undefined, 'an old file at a desk that has never moved has nothing noted against it');
  // a moved desk whose career was never read on a sheet
  const c = old('ro-bare', s => { s.chapterSince = 100; delete s.evalLedger; });
  t.eq(js(c.evalLedger) + ' ' + String(c.threw), 'undefined undefined', 'an old file with no sheets at all loads as it is');
  // a file of this version is not worked out again
  const now = sheets(world('ro-now', 'micromanager', 142), 12, 5);
  now.chapterSince = 100;
  hist(ours(now)[0], [104, 108, 112]);
  const back = say(() => KP.deserialize(KP.serialize(now)));
  t.eq(back && back.evalLedger && back.evalLedger.before, 5, 'a save of this version keeps what it noted');
}

// ---- F. the tools -----------------------------------------------------------------------------
{
  const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const l = read('tools/audit_longhaul.js');
  t.ok(["' | reviews: '", "console.log('the reviews (v0.11.38): '", 'a chair who counts sheets said ', 'a review notes '].every(x => l.includes(x)),
    'the long haul counts the reviews of every career and holds a chair’s count of sheets to its own books');
}

t.finish();
