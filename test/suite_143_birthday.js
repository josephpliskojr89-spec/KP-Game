/* Suite 143 — the house's own birthday (v0.11.36, §128; written again for
   v0.11.48, §141, on the owner's ruling, §136: 14, 15 and 30). Every house
   has a week its doors opened. A label this desk founded has it on its
   founding. A house that was there before the desk has its own, from before
   the desk came, and keeps it whoever sits there. When the week comes round
   everyone under contract is given a small lift, and the house writes one
   short line; on its first birthday and every fifth it writes a letter. The
   date is read and never kept, nothing is drawn, and no two years running
   read alike.

   Laws (§99): a fixture forces every gate and rolls nothing; a missing
   letter fails by name; nothing here can crash or hang under a broken
   engine. */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadEngine, makeT } = require('./load_engine');
const dom = require('./dom_stub');
const KP = loadEngine();
const t = makeT('suite_143_birthday');
const YEAR = KP.C.WEEKS_PER_YEAR, CEREMONY = KP.C.AWARDS.ceremonyWeek;
const H = KP.C.HOUSE || { age: { current: [0, 1], major: [0, 1], salaried: [0, 1] }, every: 5, lift: 0, liftMilestone: 0 };

// ---- the kit ------------------------------------------------------------------
const say = fn => { try { return fn(); } catch (e) { return 'threw: ' + e.message; } };
const js = x => JSON.stringify(x);
const obj = x => (x && typeof x === 'object' ? x : { threw: String(x) });
const num = x => (typeof x === 'number' && isFinite(x) ? x : NaN);
const act = s => KP.groups(s)[0] || { name: 'no act', id: 'none', releases: [], members: [] };
const born = s => num(say(() => KP.houseFounded(s)));
const age = s => say(() => KP.houseAge(s));
const next = s => obj(say(() => KP.houseNext(s)));
const standing = s => say(() => KP.houseStanding(s));
const letter = (s, years) => obj(say(() => KP.birthdayLetter(s, years)));
const text = (s, years) => String(letter(s, years).text);
const phase = name => KP.weeklyPipeline([]).filter(p => p.name === name)[0] || { fn: () => { throw new Error('no phase ' + name); } };
// a stream that refuses every draw: the birthday rolls nothing
const NO_DRAW = new Proxy({}, { get: (o, k) => { throw new Error('the birthday drew ' + String(k)); } });
const turn = s => { const inbox = []; const r = say(() => phase('houseBirthday').fn(s, NO_DRAW, inbox, s.roster, KP.groups(s))); return typeof r === 'string' ? [{ ind: r, text: r }] : inbox; };
const answerAll = s => (s.scenes || []).slice().forEach(sc => { const d = KP.sceneDef(sc.kind); if (d) KP.resolveScene(s, sc.id, d.options(s, sc)[0].id); });
const play = (s, weeks) => { for (let i = 0; i < weeks && !KP.chapterPending(s); i++) { const r = say(() => { answerAll(s); KP.advanceWeek(s); return 'ok'; }); if (r !== 'ok') return r; } return 'ok'; };
const wire = () => (KP.lastTickNotes || []).filter(n => n.ind === 'labelBirthday' || n.ind === 'houseBirthday');
const mail = (s, ind) => (s.inbox || []).filter(m => m.ind === ind && m.week === s.week);
// an established house's desk, and the same world made a label founded in a given week
const desk = (seed, week, opts) => { const s = KP.newGame(seed, null, opts || {}); s.week = week; return s; };
const label = (seed, founded, week, more) => { const s = desk(seed, week); s.founded = Object.assign({ week: founded, warChest: 300 }, more || {});
  Object.values(KP.staffSeats(s)).forEach(st => { st.since = founded; });   // a label's chairs are its own, sat since its doors opened (§132)
  return s; };
function lineup(s, id, name) {
  const g = Object.assign(JSON.parse(JSON.stringify(act(s))), { id, name, releases: [], debuted: false });
  ['debutWeek', 'honors', 'recoup', 'retiredWeek', 'trophies', 'legacy', 'lastShowWinWeek', 'eraBreakthrough'].forEach(k => { delete g[k]; });
  s.groups.push(g);
  return g;
}
const rec = (g, week, trophies) => { g.releases.push({ week, songTitle: 'Song ' + week, chartPeak: 9, reception: 50, trophies }); return g; };
// this suite's own copy of what a house may say, and its own way with a number
const ONES = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const spell = n => (n < 20 ? ONES[n] : n < 100 ? TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '') : String(n));
const TURNS = [(n, a) => n + ' turns ' + a + ' this week.', (n, a) => n + ' is ' + a + ' years old this week.', (n, a) => 'It is ' + a + ' years this week since ' + n + ' opened its doors.'];
const DAYS = ['The floor got cake and an early finish, and went home lighter for it.', 'Somebody left a cake at the front desk. Nobody has admitted to it, and everybody had a slice.',
  'The practice rooms closed at six, for once, and nobody argued.', 'Lunch was on the house, and the whole floor turned up for it.',
  'There was a toast in the corridor, in paper cups, and it did the building good.', 'The old photographs came out for the afternoon, and the room laughed at the haircuts.'];
const MARKED = ['The whole building stopped for an afternoon, and nobody minded.', 'There was a dinner, and speeches nobody will admit to enjoying.',
  'Everyone under contract signed one card, and it is pinned by the lift.'];
const ALONE = ['The rooms are empty, and the day passed quietly.', 'The desk bought itself a coffee and got on with it.', 'The lease was renewed, which is a kind of party.'];
const opens = (s, years) => TURNS.findIndex(f => text(s, years).startsWith(f(s.company.name, spell(years)) + ' '));
const closes = (s, years, list) => list.findIndex(x => text(s, years).endsWith(' ' + x));
const ordinary = n => !(n === 1 || n % 5 === 0);

// ---- A. the week a house's doors opened ---------------------------------------------------------
{
  ['houseFounded', 'houseAge', 'houseNext', 'houseMilestone', 'houseFoundedSaid', 'houseTurnsSaid', 'houseStanding', 'birthdayLetter'].forEach(k => t.ok(typeof KP[k] === 'function', 'the engine carries KP.' + k));
  t.eq([born(label('bd-l0', 0, 60)), born(label('bd-l30', 30, 60)), born(label('bd-l200', 200, 260))].join('|'), '0|30|200', 'a label this desk founded opened its doors the week of its founding');
  t.eq(born(desk('bd-fresh', 20, { door: 'fresh' })), 0, 'a new label the desk is the first to run opened the month before the career');
  // how old a house of each kind is the week the desk comes, by this suite's own figures: the first house has gone
  // six years without a hit and was not new then; a top-three house is older; a small salaried label has an act
  // two and a half years old and trained it first
  t.eq(js(H.age), js({ current: [12, 13], major: [22, 14], salaried: [6, 7] }), 'the first house is twelve years old and more, a top-three house twenty-two and more, and a salaried label six and more');
  // an established house: from before the desk came, by the spread its kind allows
  const yearsBefore = s => (1 - born(s)) / YEAR;
  const cur = Array.from({ length: 40 }, (x, i) => yearsBefore(desk('bd-cur-' + i, 1)));
  t.ok(cur.every(y => y > H.age.current[0] && y < H.age.current[0] + H.age.current[1] + 1) && new Set(cur.map(Math.floor)).size >= 6,
    'the first house was there ' + H.age.current[0] + ' years and more before the desk came, and forty careers find it at many ages (' + Math.min.apply(null, cur).toFixed(1) + ' to ' + Math.max.apply(null, cur).toFixed(1) + ')');
  const maj = Array.from({ length: 40 }, (x, i) => yearsBefore(desk('bd-maj-' + i, 1, { door: 'major' })));
  t.ok(maj.every(y => y > H.age.major[0] && y < H.age.major[0] + H.age.major[1] + 1) && Math.min.apply(null, maj) > H.age.current[0] + 5, 'a top-three house is older (' + Math.min.apply(null, maj).toFixed(1) + ' to ' + Math.max.apply(null, maj).toFixed(1) + ')');
  // it keeps its date whatever week it is, whoever looks, and through a save
  const s = desk('bd-keeps', 1);
  const at1 = born(s);
  const later = [2, 47, 48, 300, 2000].map(w => { s.week = w; return born(s); });
  const back = obj(say(() => KP.deserialize(KP.serialize(s))));
  t.eq(later.join('|') + ' · ' + born(back) + ' · ' + js(s.company.foundedWeek), [at1, at1, at1, at1, at1].join('|') + ' · ' + at1 + ' · undefined', 'the date is the same in every week and through a save, and nothing is written to keep it');
  t.ok(born(desk('bd-other', 1)) !== at1 || born(desk('bd-other-2', 1)) !== at1, 'another career’s house has another date');
  // never the week the desk came: no week's run begins in it
  const firsts = Array.from({ length: 200 }, (x, i) => next(desk('bd-first-' + i, 1)).week);
  t.ok(firsts.every(w => w >= 2 && w <= YEAR) && new Set(firsts).size >= 30, 'its first birthday under the desk falls in the first year and never in the week the desk came (' + Math.min.apply(null, firsts) + ' to ' + Math.max.apply(null, firsts) + ')');
  // a salaried house, joined in the middle of a career
  // joined twelve years into a career, so a date counted from the career's first week would be twelve years out
  const sal = desk('bd-sal', 12 * YEAR - 10);
  say(() => KP.dissolveLabel(sal, 'read'));
  const sd = obj(say(() => KP.nextChapter(sal, 'salaried')));
  const came = sal.chapterSince, there = born(sal);
  sal.week = came + 100;
  t.ok(sd.ok === true && !sal.founded && came === 12 * YEAR - 10 && (came - there) / YEAR > H.age.salaried[0] && (came - there) / YEAR < H.age.salaried[0] + H.age.salaried[1] + 1 && born(sal) === there,
    'a house joined at a salaried desk was there years before the desk came, and its date does not move with the weeks the desk stays (' + ((came - there) / YEAR).toFixed(1) + ' years)');
  // where the company's page says it from
  const c = desk('bd-said', 1), yb = Math.floor((1 - born(c)) / YEAR);
  t.eq(String(say(() => KP.houseFoundedSaid(c))), 'Opened its doors ' + spell(yb) + ' years before your first week', 'the page says when: an established first house, in years before the career');
  // a house joined early in a career opened before the career's first week; one joined late opened inside its calendar
  const early = desk('bd-sal-early', 2 * YEAR - 10);
  say(() => KP.dissolveLabel(early, 'read'));
  say(() => KP.nextChapter(early, 'salaried'));
  const ec = early.chapterSince, et = born(early);
  t.eq(String(say(() => KP.houseFoundedSaid(desk('bd-said-f', 9, { door: 'fresh' })))) + ' | ' + String(say(() => KP.houseFoundedSaid(label('bd-said-l', 100, 130)))) + ' | ' + String(say(() => KP.houseFoundedSaid(early))) + ' | ' +
    String(say(() => KP.houseFoundedSaid(sal))) + ' | ' + (et < 1) + (there >= 1),
    'Opened its doors the month before your first week | Opened its doors ' + KP.weekLabel(100).text + ' | Opened its doors ' + spell(Math.floor((ec - et) / YEAR)) + ' years before you came | Opened its doors ' + KP.weekLabel(there).text + ' | truetrue',
    'a new label, a label founded in week 100, a house joined early, in years before the desk came, and a house joined late, by the week its doors opened');
  const n = next(c);
  t.eq(String(say(() => KP.houseTurnsSaid(c))), 'turns ' + spell(n.years) + ' ' + KP.weekLabel(n.week).text, 'and when the week next comes round, and what age it will be');
}

// ---- B. the age -------------------------------------------------------------------------------------
{
  const blank = w => age(label('bd-blank', 0, w));
  t.eq([1, YEAR - 1, YEAR, YEAR + 1, 2 * YEAR, 12 * YEAR].map(blank).join('|'), '0|0|1|0|2|12', 'a label founded before its first week is one at the end of its first year, two at the end of its second, and so on');
  const mid = w => age(label('bd-mid', 30, w));
  t.eq([30, 30 + YEAR - 1, 30 + YEAR, 30 + YEAR + 1, 30 + 3 * YEAR].map(mid).join('|'), '0|0|1|0|3', 'a label founded in week 30 has its birthday in the week its doors opened, a year on, and never in the week of the founding itself');
  // an established house: one week in each year, the same week, a year older each time
  const s = desk('bd-est', 1);
  const hits = [];
  for (let w = 1; w <= 5 * YEAR; w++) { s.week = w; const a = age(s); if (a) hits.push([w, a]); }
  const first = hits[0] || [0, 0];
  t.eq(hits.length + ' · ' + hits.map(h => h[0] - first[0]).join() + ' · ' + hits.map(h => h[1] - first[1]).join(), '5 · 0,' + [1, 2, 3, 4].map(k => k * YEAR).join() + ' · 0,1,2,3,4',
    'an established house has one birthday a year, in the same week of each, and is a year older at each (' + first[1] + ' at the first)');
  s.week = 1;
  const n1 = next(s);
  s.week = first[0];
  const n2 = next(s);
  t.eq([n1.week, n1.years, n2.week, n2.years].join('|'), [first[0], first[1], first[0] + YEAR, first[1] + 1].join('|'), 'the next birthday is this year’s until the week comes, and next year’s from that week on');
  t.eq([0, 1, 2, 4, 5, 6, 9, 10, 15, 24, 25, 50, 51].map(y => (say(() => KP.houseMilestone(y)) === true ? 'M' : '-')).join(''), '-M--M--MM-MM-', 'a milestone is the first birthday and every fifth: no other year, and no birthday at all at nought');
}

// ---- C. what stands there now --------------------------------------------------------------------
{
  t.eq(js(standing(desk('bd-none', YEAR))), 'null', 'a house that was there before the desk has no then-and-now of this desk’s');
  const s = label('bd-stand', 100, 100 + 2 * YEAR, { from: 'HCG' });
  const g = act(s);
  g.releases = []; g.honors = []; g.debuted = true; delete g.retiredWeek;
  rec(g, 100, 9); rec(g, 101, 2); rec(g, 100 + 2 * YEAR, 3);
  // an act that has taken its last bow: no longer an act, and its trophies still on the shelf
  const gone = lineup(s, 'bd-gone', 'GONE'); gone.debuted = true; gone.retiredWeek = 180; rec(gone, 150, 4);
  // a lineup that has not debuted is no act yet
  lineup(s, 'bd-soon', 'SOON');
  // honors by their ceremony: the year the label was founded in, and the year before it
  const yearOf = w => Math.ceil(w / YEAR);
  const ceremonyIn = y => (y - 1) * YEAR + CEREMONY;
  const first = ceremonyIn(yearOf(100)) > 100 ? yearOf(100) : yearOf(100) + 1;   // the first ceremony after the founding
  g.honors = [{ year: first, category: 'rookie' }, { year: first - 1, category: 'song' }, { year: first + 1, category: 'daesang' }];
  t.eq(js(standing(s)), js({ years: 2, from: 'HCG', chest: 300, acts: 1, people: s.roster.length, trophies: 9, honors: 2 }),
    'the standing of a label the desk founded: the age, where it came out of, what it opened with, the acts on stage, the people under contract, and the trophies and honors since the doors opened');
  t.ok(ceremonyIn(first - 1) <= 100 && ceremonyIn(first) > 100, 'the fixture: one ceremony fell before the founding and one after');
  const bare = label('bd-bare', 0, YEAR);
  delete bare.founded.warChest;
  bare.groups.forEach(x => { x.releases = []; x.honors = []; x.debuted = false; });
  bare.roster = [];
  t.eq(js(standing(bare)), js({ years: 1, from: null, chest: null, acts: 0, people: 0, trophies: 0, honors: 0 }), 'a label that came out of nowhere, on an old file that does not say what it opened with, with nothing yet: the standing says so');
  t.eq(obj(standing(label('bd-frac', 0, YEAR, { warChest: 239.6 }))).chest, 240, 'what it opened with is read to the whole number');
  const fresh = desk('bd-stand-fresh', YEAR, { door: 'fresh' });
  t.eq(js(Object.keys(obj(standing(fresh)))) + ' · ' + obj(standing(fresh)).from + ' · ' + obj(standing(fresh)).chest, js(['years', 'from', 'chest', 'acts', 'people', 'trophies', 'honors']) + ' · null · null',
    'a new label the desk was the first to run has a now, and no then: nothing on file says what it opened with');
}

// ---- D. an ordinary year’s line -------------------------------------------------------------------
{
  const s = desk('bd-line', 1);
  const name = s.company.name;
  const years = Array.from({ length: 30 }, (x, i) => i + 2).filter(ordinary);
  t.ok(years.every(y => letter(s, y).milestone === false && letter(s, y).years === y), 'a year that is not a milestone is said as an ordinary year');
  const o = years.map(y => opens(s, y)), c = years.map(y => closes(s, y, DAYS));
  t.ok(o.every(i => i >= 0) && c.every(i => i >= 0), 'each is one opening of three and one closing of six, by this suite’s own copy of them, and nothing else (' + text(s, 2) + ')');
  const none = () => 'no such opening';   // an opening that is not one of the three reads as nothing here
  t.ok(years.every((y, k) => text(s, y) === (TURNS[o[k]] || none)(name, spell(y)) + ' ' + DAYS[c[k]]), 'the whole line is the opening and the closing, and no more');
  // the wordings take the years in turn
  const step = (list, n) => years.every((y, k) => k === 0 || (list[k] - list[k - 1] + 10 * n) % n === (y - years[k - 1]) % n);
  t.ok(step(o, TURNS.length) && step(c, DAYS.length), 'the openings and the closings take the years in turn, a step a year');
  t.ok(years.every((y, k) => k === 0 || y - years[k - 1] > 1 || (o[k] !== o[k - 1] && c[k] !== c[k - 1])), 'so no year opens or closes as the year before did');
  t.eq(new Set(o).size + ' · ' + new Set(c).size, '3 · 6', 'and thirty years use every one of them');
  // short
  const longest = Math.max.apply(null, years.map(y => text(s, y).length));
  t.ok(longest <= 170 && name.length >= 20, 'the longest of them, for a house with a name of ' + name.length + ' letters, is ' + longest + ' characters');
  // the age in words
  const said = y => (/ (?:turns|is) ([a-z-]+|\d+) (?:this week|years)/.exec(text(s, y).split('. ')[0] + '.') || [])[1];
  t.eq([2, 13, 19, 21, 44, 99, 101].map(said).join('|'), 'two|thirteen|nineteen|twenty-one|forty-four|ninety-nine|101', 'the age is said in words up to ninety-nine');
  // a house with nobody under contract marks the day alone
  const e = desk('bd-line-empty', 1);
  e.roster = [];
  const alone = Array.from({ length: 12 }, (x, i) => closes(e, i + 1, ALONE));
  t.ok(alone.every(i => i >= 0) && alone.every((i, k) => k === 0 || i === (alone[k - 1] + 1) % ALONE.length) && Array.from({ length: 12 }, (x, i) => i + 1).every(y => !/cake|floor|card|dinner|toast|photograph|Lunch/.test(text(e, y))),
    'a house with nobody under contract marks the day alone, in an ordinary year and on a milestone: three ways, a step a year, and no cake for a floor that is not there');
  // another house starts elsewhere in the wordings
  const starts = Array.from({ length: 30 }, (x, i) => { const d = desk('bd-line-' + i, 1); return closes(d, 2, DAYS); });
  t.ok(new Set(starts).size >= 4 && starts.every(i => i >= 0), 'and another house starts elsewhere in them (' + new Set(starts).size + ' of six among thirty houses)');
}

// ---- E. a milestone’s letter ---------------------------------------------------------------------
{
  const e = desk('bd-mark', 1);
  const name = e.company.name;
  const head = (s, y) => text(s, y).split(' ago this week.')[0] + ' ago this week.';
  t.eq([1, 5, 10, 15, 25, 50].map(y => head(e, y)).join(' | '), ['One year. ' + name + ' opened its doors a year', 'Five years. ' + name + ' opened its doors five years', 'A decade. ' + name + ' opened its doors ten years',
    name + ' opened its doors fifteen years', 'A quarter of a century. ' + name + ' opened its doors twenty-five years', 'Half a century. ' + name + ' opened its doors fifty years'].map(x => x + ' ago this week.').join(' | '),
    'a milestone says what the number is called, where it has a name, and how long ago the doors opened');
  t.ok([1, 5, 10, 15, 20, 25, 50].every(y => letter(e, y).milestone === true && letter(e, y).years === y), 'and is marked as one');
  // a house that was there before the desk: the desk's own years of them
  const mid = (s, y) => { const x = text(s, y); const a = x.indexOf(' ago this week. '); const b = MARKED.concat(ALONE).map(m => x.lastIndexOf(' ' + m)).filter(i => i >= 0)[0]; return a >= 0 && b >= 0 ? x.slice(a + 16, b) : 'no middle: ' + x; };
  e.week = 10;
  const m0 = mid(e, 20);
  e.week = 1 + YEAR;
  const m1 = mid(e, 20);
  e.week = 3 * YEAR + 30;
  t.eq([m0, m1, mid(e, 20)].join(' | '), 'You came to its desk this year. | You have sat at its desk for one of them. | You have sat at its desk for three of them.', 'at an established house the letter counts the desk’s own years there');
  // a label the desk founded: then and now
  const f = label('bd-mark-label', 100, 100 + 5 * YEAR, { from: 'HCG' });
  const g = act(f);
  f.groups = [g]; g.debuted = true; delete g.retiredWeek; g.releases = []; g.honors = []; rec(g, 150, 9);
  const N = f.roster.length;
  const now = (s, y) => mid(s, y);
  t.eq(now(f, 5), 'It started out of HCG with 300 in the till. Today it has one act, ' + N + ' under contract and 9 trophies on the shelf.', 'at a label the desk founded: what it started out of and with, and what stands there today');
  delete f.founded.from;
  const a = now(f, 5);
  delete f.founded.warChest;
  const b = now(f, 5);
  f.founded.from = 'HCG';
  t.eq(N + ' · ' + [a, b, now(f, 5)].join(' | '), N + ' · It started with 300 in the till. Today it has one act, ' + N + ' under contract and 9 trophies on the shelf. | Today it has one act, ' + N + ' under contract and 9 trophies on the shelf. | ' +
    'It started out of HCG. Today it has one act, ' + N + ' under contract and 9 trophies on the shelf.', 'a label out of nowhere, a file that says neither, and a file that does not say what it opened with');
  g.releases = []; g.debuted = false; f.roster = [];
  const none = now(f, 5);
  g.debuted = true; rec(g, 150, 1); f.roster = [Object.keys(f.people)[0]];
  const y5 = Math.ceil((100 + 2 * YEAR) / YEAR);
  g.honors = [{ year: y5, category: 'rookie' }, { year: y5 + 1, category: 'song' }, { year: y5 + 2, category: 'daesang' }];
  t.eq([none, now(f, 5)].join(' | '), 'It started out of HCG. Today it has no acts, nobody under contract and no trophies on the shelf. | It started out of HCG. Today it has one act, 1 under contract and one trophy on the shelf, with 3 honors.',
    'nothing is said as nothing, one as one, and the honors after the shelf');
  // how the building marked it: three ways, taking the milestones in turn
  const ends = [5, 10, 15, 20, 25, 30].map(y => closes(e, y, MARKED));
  t.ok(ends.every(i => i >= 0) && ends.every((i, k) => k === 0 || i === (ends[k - 1] + 1) % MARKED.length), 'the last line is one of three, and the milestones take them in turn, so no two running end alike (' + ends.join() + ')');
  const longest = Math.max.apply(null, [1, 5, 10, 25].map(y => Math.max(text(e, y).length, text(f, y).length)));
  t.ok(longest <= 280, 'the longest milestone letter is ' + longest + ' characters');
}

// ---- F. the week it comes round ---------------------------------------------------------------------
{
  // an ordinary year at an established house
  const s = desk('bd-turn', 1);
  const n = next(s);
  const ord = ordinary(n.years) ? n : { week: n.week + YEAR, years: n.years + 1 };   // the first ordinary birthday
  s.week = ord.week;
  const ids = s.roster.slice(0, 4);
  [50, 99, 100, 7].forEach((m, i) => { if (s.people[ids[i]]) s.people[ids[i]].morale = m; });
  const out = Object.keys(s.people).filter(id => !s.roster.includes(id))[0];
  const outWas = (s.people[out] || {}).morale;
  const others = s.roster.slice(4).map(id => s.people[id].morale);
  const first = turn(s);
  t.eq([first.length, (first[0] || {}).kind, (first[0] || {}).ind, (first[0] || {}).priority, (first[0] || {}).years].join('|'), '1|company|houseBirthday|flavor|' + ord.years,
    'in an ordinary year the house writes one line, the company’s, which the week may set below the fold');
  t.eq(String((first[0] || {}).text), text(s, ord.years), 'the line is the one the house would say');
  t.eq(ids.map(id => s.people[id].morale).join('|') + ' · ' + (s.people[out] || {}).morale + ' · ' + s.roster.slice(4).every((id, i) => s.people[id].morale === Math.min(100, others[i] + H.lift)),
    [50 + H.lift, 100, 100, 7 + H.lift].join('|') + ' · ' + outWas + ' · true', 'everyone under contract is ' + H.lift + ' the better for it, nobody past a hundred, and nobody outside the house');
  t.ok(H.lift >= 1 && H.lift <= 2 && H.liftMilestone > H.lift && H.liftMilestone <= 3, 'the lift is small, and a milestone’s a little more');
  // a milestone
  const m = desk('bd-turn-mark', 1);
  const nm = next(m);
  const big = { years: Math.ceil(nm.years / 5) * 5 };
  big.week = nm.week + (big.years - nm.years) * YEAR;
  m.week = big.week;
  const was = m.roster.map(id => m.people[id].morale);
  const mark = turn(m);
  t.eq([mark.length, (mark[0] || {}).kind, (mark[0] || {}).ind, (mark[0] || {}).priority, (mark[0] || {}).years].join('|'), '1|company|labelBirthday|critical|' + big.years, 'on a milestone it writes a letter the week cannot cut');
  t.ok(m.roster.length > 3 && m.roster.every((id, i) => m.people[id].morale === Math.min(100, was[i] + H.liftMilestone)) && String((mark[0] || {}).text) === text(m, big.years), 'and the lift is ' + H.liftMilestone);
  // every other week
  const quiet = [];
  const still = s.roster.map(id => s.people[id].morale).join();
  for (let w = ord.week + 1; w < ord.week + YEAR; w++) { s.week = w; if (turn(s).length) quiet.push(w); }
  t.eq(quiet.join(',') + ' · ' + (s.roster.map(id => s.people[id].morale).join() === still), ' · true', 'no other week of the year writes anything or lifts anyone');
  // a label this desk founded, on its first birthday
  const f = label('bd-turn-label', 100, 100 + YEAR, { from: 'HCG' });
  const one = turn(f);
  t.ok(one.length === 1 && one[0].ind === 'labelBirthday' && one[0].years === 1 && /^One year\. /.test(one[0].text) && one[0].text.includes('It started out of HCG with 300 in the till.'), 'a founded label’s first birthday is a milestone, and says what it started with');
  t.eq(js(f.founded), js({ week: 100, warChest: 300, from: 'HCG' }), 'and the founding is left as it was: nothing is kept of what was said');
  // a house waiting at its last statement
  const dead = desk('bd-turn-dead', 1);
  dead.week = next(dead).week;
  dead.dissolved = { week: dead.week, name: 'Gone', short: 'Gone', door: null };
  const dm = dead.roster.map(id => dead.people[id].morale).join();
  t.eq(turn(dead).length + ' · ' + (dead.roster.map(id => dead.people[id].morale).join() === dm), '0 · true', 'a house waiting at its last statement writes nothing and lifts nobody');
  // after the year's own close
  const names = KP.weeklyPipeline([]).map(p => p.name);
  t.ok(names.indexOf('houseBirthday') > names.indexOf('yearClose') && names.indexOf('yearClose') >= 0, 'the birthday comes after the year’s own close in the week');
}

// ---- G. real weeks ------------------------------------------------------------------------------------
{
  // an established first house: one birthday in its first year, in the week the page said
  const c = KP.newGame('bd-real-current', null, {});
  const said = next(c);
  const stray = [];
  let r = 'ok';
  while (r === 'ok' && c.week < said.week && !KP.chapterPending(c)) { r = play(c, 1); if (c.week < said.week && wire().length) stray.push(c.week); }
  const got = wire();
  t.eq([r, c.week, stray.join(','), got.length, (got[0] || {}).years].join('|'), ['ok', said.week, '', 1, said.years].join('|'), 'real weeks at an established house: no birthday before the week the page said, and one that week, at the age it said (' + said.years + ')');
  t.ok(got.length === 1 && (ordinary(said.years) ? got[0].ind === 'houseBirthday' && got[0].priority === 'flavor' : got[0].ind === 'labelBirthday' && got[0].priority === 'critical') && got[0].text.includes(c.company.name),
    'said as its kind of year is said (' + String((got[0] || {}).text).slice(0, 90) + ')');

  // a blank page: its first birthday is the week its first year closes, and both letters land
  const s = KP.newGame('bd-real-blank', null, { door: 'blank', companyName: 'Paper Label' });
  t.eq(js(s.founded), js({ week: 0, warChest: KP.C.BLANK.warChest }), 'the fixture: the blank page is a label founded before its first week');
  const early = [];
  r = 'ok';
  for (let i = 0; i < YEAR - 1 && r === 'ok'; i++) { r = play(s, 1); if (s.week < YEAR && wire().length) early.push(s.week); }
  t.eq([r, s.week, early.join(',')].join('|'), 'ok|' + YEAR + '|', 'the real weeks before a blank page’s first birthday write nothing of it');
  const b1 = mail(s, 'labelBirthday')[0], y1 = mail(s, 'yearEnd')[0];
  t.ok(!!b1 && b1.priority === 'critical' && b1.years === 1 && /^One year\. Paper Label opened its doors a year ago this week\. /.test(b1.text) && b1.text.includes('It started with ' + KP.C.BLANK.warChest + ' in the till.'),
    'the forty-eighth lands the letter: one year, and what it started with (' + String(b1 && b1.text).slice(0, 110) + ')');
  t.ok(!!y1 && !!b1 && (s.inbox || []).indexOf(y1) >= 0, 'beside the year’s own letter, which lands too');
  r = play(s, YEAR);
  const w2 = wire();
  t.ok(r === 'ok' && s.week === 2 * YEAR && w2.length === 1 && w2[0].ind === 'houseBirthday' && w2[0].years === 2 && w2[0].priority === 'flavor' && mail(s, 'labelBirthday').length === 0,
    'a real year on, the second birthday is one ordinary line and no letter (' + String((w2[0] || {}).text) + ')');

  // a label founded in the middle of a career
  const f = desk('bd-real-found', 3 * YEAR);
  f.trust = 80;
  f.awardHistory = [{ year: 2, category: 'daesang', name: act(f).name, company: f.company.short, isPlayer: true }];
  const old = f.company.short, oldBorn = born(f);
  const fr = say(() => KP.foundLabel(f, 'HOMEWARD'));
  t.ok(fr && fr.ok === true && f.founded && f.founded.week === 3 * YEAR && f.founded.from === old && born(f) === 3 * YEAR && oldBorn < 1, 'the fixture: the founding goes through, and the label’s date is its own and not the old house’s');
  r = play(f, YEAR);
  const fb = mail(f, 'labelBirthday')[0];
  t.ok(r === 'ok' && f.week === 4 * YEAR && !!fb && fb.years === 1 && fb.text.includes('HOMEWARD') && fb.text.includes('It started out of ' + old + ' with ' + Math.round(f.founded.warChest) + ' in the till.'),
    'a year of real weeks on, the label’s first birthday lands and says what it came out of (' + String(fb && fb.text).slice(0, 100) + ')');

  // a second chance: the blank door counts from the door, and a salaried house keeps its own date
  const d = desk('bd-real-door', 2 * YEAR - 10);
  say(() => KP.dissolveLabel(d, 'read'));
  const door = say(() => KP.nextChapter(d, 'blank', { companyName: 'Second Paper' }));
  t.ok(door && door.ok === true && d.founded && d.founded.week === 2 * YEAR - 10, 'the fixture: a second chance through the blank door founds a label that week (' + js(door).slice(0, 60) + ')');
  r = play(d, YEAR);
  const db = mail(d, 'labelBirthday')[0];
  t.ok(r === 'ok' && d.week === 3 * YEAR - 10 && !!db && db.years === 1 && db.text.includes('Second Paper'), 'its birthday comes a year after the door, not with the calendar (' + String(db && db.text).slice(0, 80) + ')');
  const sal = desk('bd-real-salaried', 2 * YEAR - 10);
  say(() => KP.dissolveLabel(sal, 'read'));
  const sd = obj(say(() => KP.nextChapter(sal, 'salaried')));
  const there = born(sal), due = next(sal), seen = [];
  r = 'ok';
  // forced: the till, so the house stands the year (a second chance on first answers folds again before its birthday)
  for (let i = 0; i < YEAR && r === 'ok' && !KP.chapterPending(sal); i++) { sal.budget = Math.max(sal.budget, 5000); r = play(sal, 1); wire().forEach(x => seen.push(sal.week + ':' + x.years)); }
  t.ok(sd.ok === true && !sal.founded && r === 'ok' && seen.join() === due.week + ':' + due.years && born(sal) === there && due.years > H.age.salaried[0],
    'a second chance at a salaried desk: the house has its own birthday in its first year under the desk, at its own age, and its date has not moved (' + seen.join() + ', ' + due.years + ' years)');
}

// ---- H. the file, and the page -------------------------------------------------------------------------
{
  // a file saved before this release kept which opening a label used: it loads, and nothing reads that any more
  const older = label('bd-older', 100, 100 + 2 * YEAR, { from: 'HCG', said: 1 });
  const raw = JSON.parse(KP.serialize(older)); raw.version = '0.11.47';
  const old = obj(say(() => KP.deserialize(JSON.stringify(raw))));
  t.eq([old.version, js(old.founded)].join(' '), KP.C.VERSION + ' ' + js({ week: 100, warChest: 300, from: 'HCG', said: 1 }), 'a file from before loads with its founding as it was');
  const first = old.founded ? turn(old) : [];
  t.ok(first.length === 1 && first[0].years === 2 && first[0].ind === 'houseBirthday' && js(say(() => KP.validateState(old))) === '[]', 'its next birthday is an ordinary year’s line, and the file is whole');
  // an established house on an older file has a date too, and the same one however often it is asked
  const est = desk('bd-older-est', 60);
  const raw2 = JSON.parse(KP.serialize(est)); raw2.version = '0.11.47';
  const old2 = obj(say(() => KP.deserialize(JSON.stringify(raw2))));
  t.ok(born(old2) === born(est) && born(old2) < 1 - H.age.current[0] * YEAR, 'an older file’s established house has its date, the same as a new career of that seed would read');
  // the company's page
  const D = dom.load();
  const { App, el } = D;
  const page = s => { App.state = s; App.mode = 'game'; App.tab = 'desk'; App.stack = []; App.view = { type: 'company', id: 'company' }; const r = say(() => App.render()); return typeof r === 'string' ? r : el('screen').innerHTML; };
  const c = desk('bd-page', 1);
  t.ok(page(c).includes('<div class="co-born" style="font-size:.76rem;color:var(--ink-dim);margin-top:4px">' + KP.houseFoundedSaid(c) + ' · ' + KP.houseTurnsSaid(c) + '</div>'), 'the company’s page says when its doors opened and when the week next comes round');
  const l = label('bd-page-label', 100, 130);
  t.ok(page(l).includes('Opened its doors ' + KP.weekLabel(100).text + ' · turns one ' + KP.weekLabel(100 + YEAR).text + '</div>'), 'and for a label the desk founded, the week of the founding and its first birthday');
}

// ---- I. the list of letters said once, and the tools ---------------------------------------------------
{
  const read = f => String(say(() => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')));
  const list = read('tools/desk_count.js');
  t.ok(/'labelBirthday',/.test(list) && !/'houseBirthday'/.test(list), 'a milestone’s letter is on the list of letters said once, and an ordinary year’s line is not');
  const src = read('js/engine/tenure.js').split('\n');
  const big = src.filter(x => /ind: 'labelBirthday'/.test(x))[0] || '', small = src.filter(x => /ind: 'houseBirthday'/.test(x))[0] || '';
  t.ok(/priority: 'critical'/.test(big) && /priority: 'flavor'/.test(small), 'the letter is critical on the line that writes it, and the line is the lowest mail there is');
  const haul = read('tools/audit_longhaul.js');
  t.ok(/the house’s birthdays \(v0\.11\.48\)/.test(haul) && /a house’s birthday came round with/.test(haul) && /a milestone’s letter was written and did not land/.test(haul), 'the long haul counts the birthdays by its own books, and that each milestone’s letter lands');
  t.ok(/bd\.salaried \? \[7, 13\]/.test(haul) && /\[1, 1\] : .*\[23, 36\] : \[13, 25\]/.test(haul) && /HAUL_SALARIED/.test(haul),
    'and it holds each kind of house to its own age by its own copy of the figures, a salaried one among them');
}

t.finish();
