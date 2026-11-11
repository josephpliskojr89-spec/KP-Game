/* Suite 143 — the label's birthday (v0.11.36, §128: the people upstairs and
   down the hall, part six). A founded label has a week it opened its doors.
   When that week comes round the company sets down what it started with and
   what stands there now. Everything is read off the state; one thing is
   kept, which opening was used, so next year's is another. A salaried desk
   has no founding on file and no birthday.

   Laws (§99): a fixture forces every gate and rolls nothing; a missing
   letter fails by name; nothing here can crash or hang under a broken
   engine. */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_143_birthday');
const YEAR = KP.C.WEEKS_PER_YEAR, CEREMONY = KP.C.AWARDS.ceremonyWeek;

// ---- the kit ------------------------------------------------------------------
const say = fn => { try { return fn(); } catch (e) { return 'threw: ' + e.message; } };
const js = x => JSON.stringify(x);
const obj = x => (x && typeof x === 'object' ? x : { threw: String(x) });
const act = s => KP.groups(s)[0] || { name: 'no act', id: 'none', releases: [], members: [] };
const age = s => say(() => KP.labelAge(s));
const standing = s => obj(say(() => KP.labelStanding(s)));
const letter = (s, st, last) => obj(say(() => KP.birthdayLetter(s, st, last)));
const phase = name => KP.weeklyPipeline([]).filter(p => p.name === name)[0] || { fn: () => { throw new Error('no phase ' + name); } };
const turn = s => { const inbox = []; const r = say(() => phase('labelBirthday').fn(s, KP.rngFor(s), inbox, s.roster, KP.groups(s))); return typeof r === 'string' ? [{ ind: r, text: r }] : inbox; };
const answerAll = s => (s.scenes || []).slice().forEach(sc => { const d = KP.sceneDef(sc.kind); if (d) KP.resolveScene(s, sc.id, d.options(s, sc)[0].id); });
const play = (s, weeks) => { for (let i = 0; i < weeks && !KP.chapterPending(s); i++) { const r = say(() => { answerAll(s); KP.advanceWeek(s); return 'ok'; }); if (r !== 'ok') return r; } return 'ok'; };
const mail = (s, ind) => (s.inbox || []).filter(m => m.ind === ind && m.week === s.week);
// a salaried desk's world, and the same world made a label founded in a given week
const desk = (seed, week) => { const s = KP.newGame(seed, null, {}); s.week = week; return s; };
const label = (seed, founded, week, more) => { const s = desk(seed, week); s.founded = Object.assign({ week: founded, warChest: 300 }, more || {});
  Object.values(KP.staffSeats(s)).forEach(st => { st.since = founded; });   // a label's chairs are its own, sat since its doors opened (v0.11.40, §132)
  return s; };
function lineup(s, id, name) {
  const g = Object.assign(JSON.parse(JSON.stringify(act(s))), { id, name, releases: [], debuted: false });
  ['debutWeek', 'honors', 'recoup', 'retiredWeek', 'trophies', 'legacy', 'lastShowWinWeek', 'eraBreakthrough'].forEach(k => { delete g[k]; });
  s.groups.push(g);
  return g;
}
const rec = (g, week, trophies) => { g.releases.push({ week, songTitle: 'Song ' + week, chartPeak: 9, reception: 50, trophies }); return g; };
const AT = { years: 2, from: 'HCG', chest: 300, acts: 2, people: 11, trophies: 9, honors: 0, till: 4120 };
const said = (s, more, last) => String(letter(s, Object.assign({}, AT, more || {}), last).text);

// ---- A. the age ---------------------------------------------------------------
{
  t.eq([YEAR, 2 * YEAR, 2 * YEAR + 7].map(w => age(desk('bd-desk', w))).join('|'), '0|0|0', 'a salaried desk has no founding on file, and no birthday in any week');
  const blank = w => age(label('bd-blank', 0, w));
  t.eq([1, YEAR - 1, YEAR, YEAR + 1, 2 * YEAR, 12 * YEAR].map(blank).join('|'), '0|0|1|0|2|12', 'a label founded before its first week is one at the end of its first year, two at the end of its second, and so on');
  const mid = w => age(label('bd-mid', 30, w));
  t.eq([30, 30 + YEAR - 1, 30 + YEAR, 30 + YEAR + 1, 30 + 3 * YEAR].map(mid).join('|'), '0|0|1|0|3', 'a label founded in week 30 has its birthday in the week its doors opened, a year on, and never in the week of the founding itself');
}

// ---- B. what stands there now -----------------------------------------------------------------------
{
  t.eq(js(say(() => KP.labelStanding(desk('bd-none', YEAR)))), 'null', 'a salaried desk has no standing to read');
  const s = label('bd-stand', 100, 100 + 2 * YEAR, { from: 'HCG' });
  s.budget = 1234.6;
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
  t.eq(js(standing(s)), js({ years: 2, from: 'HCG', chest: 300, acts: 1, people: s.roster.length, trophies: 9, honors: 2, till: 1235 }),
    'the standing: the age, where the label came out of, what it opened with, the acts on stage, the people under contract, the trophies and honors since the doors opened, and the till');
  t.ok(ceremonyIn(first - 1) <= 100 && ceremonyIn(first) > 100, 'the fixture: one ceremony fell before the founding and one after');
  const bare = label('bd-bare', 0, YEAR);
  delete bare.founded.warChest;
  bare.groups.forEach(x => { x.releases = []; x.honors = []; x.debuted = false; });
  bare.roster = [];
  t.eq(js(standing(bare)), js({ years: 1, from: null, chest: null, acts: 0, people: 0, trophies: 0, honors: 0, till: Math.round(bare.budget) }),
    'a label that came out of nowhere, on an old file that does not say what it opened with, with nothing yet: the standing says so');
  const frac = label('bd-frac', 0, YEAR, { warChest: 239.6 });
  t.eq(standing(frac).chest, 240, 'what it opened with is read to the whole number');
}

// ---- C. the letter ------------------------------------------------------------------------------------
{
  const s = desk('bd-letter', YEAR);
  const name = s.company.name;
  const OPEN = [name + ' is two years old this week.', 'It is two years to the week since ' + name + ' opened its doors.', 'The week ' + name + ' opened its doors has come round again: two years.'];
  const CLOSE = ['Somebody left a cake at the front desk, and nobody has admitted to it.', 'The first lease is framed by the lift now. The staff signed the back of it.',
    'The founding desk is still in the corner office. Nobody will let it be replaced.'];
  // the three openings, each with its own last line: found over a year of weeks
  const seen = {};
  for (let w = 1; w <= YEAR; w++) { s.week = w; const l = letter(s, AT, null); if (typeof l.line === 'number') seen[l.line] = l.text; }
  t.eq(Object.keys(seen).sort().join(','), '0,1,2', 'the letter has three openings, and a year of weeks finds each');
  [0, 1, 2].forEach(i => t.ok(String(seen[i]).startsWith(OPEN[i] + ' ') && String(seen[i]).endsWith(' ' + CLOSE[i]), 'opening ' + (i + 1) + ' is said with its own last line (' + String(seen[i]).slice(0, 44) + ' … ' + String(seen[i]).slice(-34) + ')'));
  // never last year's
  const repeat = [];
  for (let w = 1; w <= YEAR; w++) { s.week = w; const plain = letter(s, AT, null).line; const next = letter(s, AT, plain).line; if (next === plain || typeof next !== 'number') repeat.push(w); }
  t.eq(repeat.join(','), '', 'whatever was said last year, this year’s opening is another');
  // the body, in order: where it started, and what stands there today
  s.week = YEAR;
  const body = more => { const x = said(s, more, null); const i = x.indexOf(' It started'), j = x.indexOf(' Today'); return (i >= 0 ? x.slice(i + 1) : x.slice(j + 1)).replace(/ (Somebody left|The first lease|The founding desk).*$/, ''); };
  t.eq(body(), 'It started out of HCG with 300 in the till. Today it has 2 acts, 11 under contract, 9 trophies on the shelf, and 4120 in the till.', 'then and now, for a label out of a house: what it started with, and its acts, people, trophies and till today');
  t.eq(body({ from: null }), 'It started with 300 in the till. Today it has 2 acts, 11 under contract, 9 trophies on the shelf, and 4120 in the till.', 'a label out of nowhere says only what it started with');
  t.eq(body({ chest: null }), 'It started out of HCG. Today it has 2 acts, 11 under contract, 9 trophies on the shelf, and 4120 in the till.', 'a file that does not say what the label opened with says only where it came out of');
  t.eq(body({ from: null, chest: null }), 'Today it has 2 acts, 11 under contract, 9 trophies on the shelf, and 4120 in the till.', 'and with neither on file the letter goes straight to today');
  t.eq(body({ acts: 1, people: 1, trophies: 1, honors: 1 }), 'It started out of HCG with 300 in the till. Today it has one act, 1 under contract, one trophy on the shelf, one honor, and 4120 in the till.', 'one of each is said as one, and an honor has its place after the trophies');
  t.eq(body({ acts: 0, people: 0, trophies: 0, honors: 3 }), 'It started out of HCG with 300 in the till. Today it has no acts, nobody under contract, no trophies on the shelf, 3 honors, and 4120 in the till.', 'none of a thing is said as none, and nobody as nobody');
  t.eq(body({ till: -250 }), 'It started out of HCG with 300 in the till. Today it has 2 acts, 11 under contract, 9 trophies on the shelf, and a till 250 short.', 'a till below nothing is a till that many short');
  t.eq(body({ till: 0 }), 'It started out of HCG with 300 in the till. Today it has 2 acts, 11 under contract, 9 trophies on the shelf, and 0 in the till.', 'and an empty till is nothing in the till');
  // the age, in words up to twelve
  const ageOf = n => (/(\w+ years?)( old this week\.| to the week| *\.$|\.)/.exec(said(s, { years: n, from: null, chest: null }, null).split(' Today')[0]) || [])[1];
  t.eq([1, 2, 12, 13].map(ageOf).join('|'), 'one year|two years|twelve years|13 years', 'the age is said in words up to twelve, and one year is one year');
}

// ---- D. the week it comes round -----------------------------------------------------------------------
{
  const s = label('bd-turn', 100, 100 + YEAR, { from: 'HCG' });
  const first = turn(s);
  t.eq([first.length, (first[0] || {}).kind, (first[0] || {}).ind, (first[0] || {}).priority, (first[0] || {}).years].join('|'), '1|company|labelBirthday|critical|1', 'on its birthday a founded label writes one letter, the company’s, critical, with its age');
  t.ok(first[0] && first[0].text === letter(s, standing(s), null).text && /one year/.test(first[0].text) && /It started out of HCG with 300 in the till\./.test(first[0].text), 'the letter is the one the standing gives (' + String(first[0] && first[0].text).slice(0, 70) + ')');
  const line1 = (s.founded || {}).said;
  t.ok(typeof line1 === 'number' && line1 === letter(Object.assign({}, s), standing(s), null).line, 'and the label keeps which opening it used');
  s.week = 100 + 2 * YEAR;
  const second = turn(s);
  t.ok(second.length === 1 && second[0].years === 2 && typeof s.founded.said === 'number' && s.founded.said !== line1, 'a year on the letter opens another way, and that is kept in its turn');
  // every week that is not the birthday
  const quiet = [];
  for (let w = 100 + 2 * YEAR + 1; w < 100 + 3 * YEAR; w++) { s.week = w; if (turn(s).length) quiet.push(w); }
  t.eq(quiet.join(','), '', 'no other week of the year writes one');
  t.eq(s.founded.said, second.length ? letter(Object.assign({}, s, { week: 100 + 2 * YEAR }), standing(s), line1).line : 'none', 'and those weeks leave what was kept alone');
  // a salaried desk
  const d = desk('bd-turn-desk', 2 * YEAR);
  t.eq(turn(d).length, 0, 'a salaried desk writes none, in any week');
  // a label waiting at its last statement
  const dead = label('bd-turn-dead', 0, YEAR);
  dead.dissolved = { week: YEAR, name: 'Gone', short: 'Gone', door: null };
  t.eq([turn(dead).length, String(dead.founded.said)].join('|'), '0|undefined', 'a label waiting at its last statement writes none, and keeps nothing');
  // after the year's own close
  const names = KP.weeklyPipeline([]).map(p => p.name);
  t.ok(names.indexOf('labelBirthday') > names.indexOf('yearClose') && names.indexOf('yearClose') >= 0, 'the birthday comes after the year’s own close in the week');
}

// ---- E. real weeks ------------------------------------------------------------------------------------
{
  // a blank page: its first birthday is the week its first year closes, and both letters land
  const s = KP.newGame('bd-real-blank', null, { door: 'blank', companyName: 'Paper Label' });
  t.eq(js(s.founded), js({ week: 0, warChest: KP.C.BLANK.warChest }), 'the fixture: the blank page is a label founded before its first week');
  const stray = [];
  let r = 'ok';
  // forty-seven real weeks take the label from week 1 to its birthday; every week before that one is watched
  for (let i = 0; i < YEAR - 1 && r === 'ok'; i++) { r = play(s, 1); if (s.week < YEAR && (mail(s, 'labelBirthday').length || (KP.lastTickNotes || []).some(n => n.ind === 'labelBirthday'))) stray.push(s.week); }
  t.eq([r, s.week, stray.join(',')].join('|'), 'ok|' + YEAR + '|', 'the real weeks before a blank page’s first birthday write no birthday letter');
  const b1 = mail(s, 'labelBirthday')[0], y1 = mail(s, 'yearEnd')[0];
  t.ok(!!b1 && b1.priority === 'critical' && b1.years === 1 && /one year/.test(b1.text) && b1.text.includes('It started with ' + KP.C.BLANK.warChest + ' in the till.') &&
    b1.text.includes('and ' + Math.round(s.budget) + ' in the till.'), 'the forty-eighth lands the birthday letter: one year, what it started with, and the till as it stands (' + String(b1 && b1.text).slice(0, 90) + ')');
  t.ok(!!y1 && !!b1 && (s.inbox || []).indexOf(y1) >= 0, 'beside the year’s own letter, which lands too');
  const kept1 = s.founded.said;
  r = play(s, YEAR);
  const b2 = mail(s, 'labelBirthday')[0];
  t.ok(r === 'ok' && s.week === 2 * YEAR && !!b2 && b2.years === 2 && /two years/.test(b2.text) && s.founded.said !== kept1, 'a real year on, the second birthday lands and opens another way (' + String(b2 && b2.text).slice(0, 60) + ')');

  // a label founded in the middle of a career
  const f = desk('bd-real-found', 3 * YEAR);
  f.trust = 80;
  f.awardHistory = [{ year: 2, category: 'daesang', name: act(f).name, company: f.company.short, isPlayer: true }];
  const old = f.company.short;
  const fr = say(() => KP.foundLabel(f, 'HOMEWARD'));
  t.ok(fr && fr.ok === true && f.founded && f.founded.week === 3 * YEAR && f.founded.from === old, 'the fixture: the founding goes through, dated and out of the old house');
  r = play(f, YEAR);
  const fb = mail(f, 'labelBirthday')[0];
  t.ok(r === 'ok' && f.week === 4 * YEAR && !!fb && fb.years === 1 && fb.text.includes('HOMEWARD') && fb.text.includes('It started out of ' + old + ' with ' + Math.round(f.founded.warChest) + ' in the till.'),
    'a year of real weeks on, the label’s first birthday lands and says what it came out of (' + String(fb && fb.text).slice(0, 100) + ')');

  // a second chance: the birthday counts from the door, and a salaried door has none
  const d = desk('bd-real-door', 2 * YEAR - 10);
  say(() => KP.dissolveLabel(d, 'read'));
  const door = say(() => KP.nextChapter(d, 'blank', { companyName: 'Second Paper' }));
  t.ok(door && door.ok === true && d.founded && d.founded.week === 2 * YEAR - 10, 'the fixture: a second chance through the blank door founds a label that week (' + js(door).slice(0, 60) + ')');
  r = play(d, YEAR);
  const db = mail(d, 'labelBirthday')[0];
  t.ok(r === 'ok' && d.week === 3 * YEAR - 10 && !!db && db.years === 1 && db.text.includes('Second Paper'), 'its birthday comes a year after the door, not with the calendar (' + String(db && db.text).slice(0, 60) + ')');
  const sal = desk('bd-real-salaried', 2 * YEAR - 10);
  say(() => KP.dissolveLabel(sal, 'read'));
  const sd = say(() => KP.nextChapter(sal, 'salaried'));
  const none = [];
  if (sd && sd.ok === true) { for (let i = 0; i < YEAR + 2 && play(sal, 1) === 'ok'; i++) if ((KP.lastTickNotes || []).some(n => n.ind === 'labelBirthday')) none.push(sal.week); }
  t.ok(sd && sd.ok === true && !sal.founded && none.length === 0, 'a second chance at a salaried desk has no founding and no birthday (' + js(sd).slice(0, 40) + ' ' + none.join(',') + ')');
}

// ---- F. the file ---------------------------------------------------------------------------------------
{
  const s = label('bd-save', 100, 100 + YEAR, { from: 'HCG' });
  turn(s);
  const kept = s.founded.said;
  const back = obj(say(() => KP.deserialize(KP.serialize(s))));
  t.eq(js(back.founded), js(s.founded), 'the save keeps the founding and which opening was used');
  t.ok(typeof kept === 'number' && js(say(() => KP.validateState(back))) === '[]', 'and a label that has kept one is a valid state');
  // a file saved before this release has kept nothing, and its next birthday is said as any first
  const older = label('bd-older', 100, 100 + 2 * YEAR, { from: 'HCG' });
  const raw = JSON.parse(KP.serialize(older)); raw.version = '0.11.35';
  const old = obj(say(() => KP.deserialize(JSON.stringify(raw))));
  t.eq([old.version, js(old.founded)].join(' '), KP.C.VERSION + ' ' + js({ week: 100, warChest: 300, from: 'HCG' }), 'a file from before the birthday loads with its founding as it was');
  const first = old.founded ? turn(old) : [];
  t.ok(first.length === 1 && first[0].years === 2 && typeof (old.founded || {}).said === 'number', 'and its next birthday is written and kept');
}

// ---- G. the list of letters said once, and the tools -------------------------------------------------------
{
  const read = f => say(() => fs.readFileSync(path.join(__dirname, '..', f), 'utf8'));
  t.ok(/'labelBirthday',/.test(read('tools/desk_count.js')), 'the birthday is on the list of letters said once');
  const src = read('js/engine/tenure.js');
  const push = (src.split('\n').filter(l => /ind: 'labelBirthday'/.test(l))[0] || '');
  t.ok(/priority: 'critical'/.test(push), 'and its letter is critical on the line that writes it, so the inbox always keeps it');
  const haul = read('tools/audit_longhaul.js');
  t.ok(/\| birthdays: /.test(haul) && /a founded label’s birthday came round with/.test(haul) && /a birthday letter was written and did not land/.test(haul), 'the long haul counts the birthdays due, written and landed, and flags one that is missed');
}

t.finish();
